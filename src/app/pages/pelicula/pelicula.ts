import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../../services/auth.service';
import { aLaVenta, enPreventa, PeliculasService } from '../../services/peliculas.service';
import { FuncionesService } from '../../services/funciones.service';
import { promedio, ResenasService } from '../../services/resenas.service';
import { Pelicula } from '../../interfaces/Pelicula';
import { Funcion } from '../../interfaces/Funcion';
import { Resena } from '../../interfaces/Resena';
import { Poster } from '../../components/poster/poster';
import { Estrellas } from '../../components/estrellas/estrellas';
import { DuracionPipe } from '../../pipes/duracion-pipe';

@Component({
  selector: 'app-pelicula',
  imports: [RouterLink, DatePipe, CurrencyPipe, ReactiveFormsModule, Poster, Estrellas, DuracionPipe],
  templateUrl: './pelicula.html',
  styleUrl: './pelicula.css',
})
export class PeliculaDetalle implements OnInit {
  authS = inject(Auth);
  private peliculasS = inject(PeliculasService);
  private funcionesS = inject(FuncionesService);
  private resenasS = inject(ResenasService);

  // Parámetro :id de la ruta (withComponentInputBinding)
  id = input.required<string>();

  pelicula = signal<Pelicula | null>(null);
  funciones = signal<Funcion[]>([]);
  resenas = signal<Resena[]>([]);
  diaElegido = signal<string | null>(null);
  cargando = signal(true);
  mensajeResena = signal<string | null>(null);

  formResena = new FormGroup({
    estrellas: new FormControl(0, [Validators.min(1)]),
    comentario: new FormControl('', [Validators.required, Validators.maxLength(280)]),
  });

  promedio = computed(() => promedio(this.resenas()));

  // Días que tienen funciones, para los chips (ej. "2026-10-03")
  dias = computed(() => {
    const dias: string[] = [];
    for (const f of this.funciones()) {
      const dia = claveDia(f.inicio);
      if (!dias.includes(dia)) {
        dias.push(dia);
      }
    }
    return dias;
  });

  funcionesDelDia = computed(() =>
    this.funciones().filter((f) => claveDia(f.inicio) === this.diaElegido()),
  );

  miResena = computed(() =>
    this.resenas().find((r) => r.usuario_id === this.authS.usuarioActual()?.id),
  );

  async ngOnInit() {
    const id = Number(this.id());
    const [pelicula, funciones, resenas] = await Promise.all([
      this.peliculasS.traerUna(id),
      this.funcionesS.traerProximasDePelicula(id),
      this.resenasS.traerDePelicula(id),
    ]);
    this.pelicula.set(pelicula);
    this.funciones.set(funciones);
    this.resenas.set(resenas);
    this.diaElegido.set(this.dias()[0] ?? null);
    this.cargando.set(false);

    const mia = this.miResena();
    if (mia) {
      this.formResena.setValue({ estrellas: mia.estrellas, comentario: mia.comentario });
    }
  }

  aLaVenta() {
    const p = this.pelicula();
    return p !== null && aLaVenta(p);
  }

  enPreventa() {
    const p = this.pelicula();
    return p !== null && enPreventa(p);
  }

  // Fecha "de mediodía" para que el DatePipe muestre el día correcto sin problemas de zona horaria
  fechaDeDia(dia: string) {
    return dia + 'T12:00';
  }

  get comentario() {
    return this.formResena.get('comentario');
  }

  async guardarResena() {
    const usuario = this.authS.usuarioActual();
    const pelicula = this.pelicula();
    if (!usuario || !pelicula) {
      return;
    }
    if (this.formResena.invalid || !this.formResena.value.estrellas) {
      this.formResena.markAllAsTouched();
      this.mensajeResena.set('Elegí de 1 a 5 estrellas y escribí un comentario.');
      return;
    }

    const perfil = this.authS.perfil();
    const { error } = await this.resenasS.guardar({
      pelicula_id: pelicula.id,
      usuario_id: usuario.id,
      autor: perfil ? `${perfil.nombre} ${perfil.apellido.charAt(0)}.` : 'Espectador',
      estrellas: this.formResena.value.estrellas,
      comentario: this.formResena.value.comentario!.trim(),
    });

    if (error) {
      this.mensajeResena.set('No se pudo guardar la reseña.');
      return;
    }
    this.mensajeResena.set('¡Gracias por tu reseña!');
    this.resenas.set(await this.resenasS.traerDePelicula(pelicula.id));
  }

  async borrarResena() {
    const mia = this.miResena();
    if (!mia) {
      return;
    }
    await this.resenasS.borrar(mia.id);
    this.resenas.update((lista) => lista.filter((r) => r.id !== mia.id));
    this.formResena.reset({ estrellas: 0, comentario: '' });
    this.mensajeResena.set(null);
  }
}

// 'AAAA-MM-DD' en hora local
function claveDia(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
