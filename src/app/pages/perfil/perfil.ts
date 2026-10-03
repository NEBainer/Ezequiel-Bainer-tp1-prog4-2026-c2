import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth.service';
import { SupabaseService } from '../../services/supabase';
import { ComprasService, HORAS_LIMITE_CANCELACION, sePuedeCancelar } from '../../services/compras.service';
import { Compra } from '../../interfaces/Compra';
import { EntradaTicket } from '../../components/entrada-ticket/entrada-ticket';

@Component({
  selector: 'app-perfil',
  imports: [CurrencyPipe, DatePipe, RouterLink, EntradaTicket],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  authS = inject(Auth);
  private comprasS = inject(ComprasService);
  private supabaseS = inject(SupabaseService);

  compras = signal<Compra[]>([]);
  puntos = signal(0);
  credito = signal(0);
  canjes = signal<{ descripcion: string; puntos: number; created_at: string }[]>([]);
  cargando = signal(true);
  mensaje = signal<string | null>(null);
  aCancelar = signal<string | null>(null); // id de la compra que pide confirmación
  horasLimite = HORAS_LIMITE_CANCELACION;

  proximas = computed(() =>
    this.compras().filter(
      (c) => c.estado === 'activa' && new Date(c.funciones!.inicio).getTime() > Date.now(),
    ),
  );

  historial = computed(() => this.compras().filter((c) => !this.proximas().includes(c)));

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    // Al recargar la página el signal usuarioActual puede no estar cargado todavía
    const { data } = await this.supabaseS.Auth.getSession();
    const usuario = data.session?.user;
    if (!usuario) {
      return;
    }
    if (!this.authS.perfil()) {
      await this.authS.cargarPerfil(usuario.id);
    }
    const [compras, saldos] = await Promise.all([
      this.comprasS.traerDeUsuario(usuario.id),
      this.comprasS.traerSaldos(usuario.id),
    ]);
    this.compras.set(compras);
    this.puntos.set(saldos.puntos);
    this.credito.set(saldos.credito);
    this.canjes.set(saldos.canjes);
    this.cargando.set(false);
  }

  sePuedeCancelar(compra: Compra) {
    return sePuedeCancelar(compra);
  }

  async cancelar(compra: Compra) {
    // Se vuelve a chequear el horario al confirmar (pudo pasar tiempo con la pantalla abierta)
    if (!sePuedeCancelar(compra)) {
      this.mensaje.set(`Solo se puede cancelar hasta ${HORAS_LIMITE_CANCELACION} horas antes de la función.`);
      return;
    }
    const { error } = await this.comprasS.cancelar(compra);
    this.aCancelar.set(null);
    if (error) {
      this.mensaje.set('No se pudo cancelar la compra.');
      return;
    }
    const credito = Number(compra.pagado_tarjeta) + Number(compra.pagado_credito);
    this.mensaje.set(`Compra cancelada. Se acreditaron $ ${credito.toLocaleString('es-AR')} en tu cuenta.`);
    await this.cargar();
  }
}
