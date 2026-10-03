import { Component, inject, OnDestroy, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Html5Qrcode } from 'html5-qrcode';
import { ComprasService } from '../../services/compras.service';
import { LogService } from '../../services/log.service';
import { Compra } from '../../interfaces/Compra';

// Pantalla de empleados: validar la entrada (sala) y el candy con el mismo QR
@Component({
  selector: 'app-validar',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './validar.html',
  styleUrl: './validar.css',
})
export class Validar implements OnDestroy {
  private comprasS = inject(ComprasService);
  private logS = inject(LogService);

  codigo = new FormControl('', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{8}$/)]);
  // Con [formGroup] Angular intercepta el submit (si no, el navegador recarga la página)
  formulario = new FormGroup({ codigo: this.codigo });
  compra = signal<Compra | null>(null);
  mensaje = signal<{ texto: string; tipo: 'ok' | 'error' } | null>(null);
  buscando = signal(false);
  escaneando = signal(false);

  private lector?: Html5Qrcode;

  // conservarMensaje: después de validar se vuelve a buscar la compra sin borrar el "✔ validada"
  async buscar(codigo = this.codigo.value ?? '', conservarMensaje = false) {
    if (!/^[A-Za-z0-9]{8}$/.test(codigo.trim())) {
      this.codigo.markAsTouched();
      return;
    }
    this.buscando.set(true);
    if (!conservarMensaje) {
      this.mensaje.set(null);
    }
    const compra = await this.comprasS.buscarPorCodigo(codigo);
    this.buscando.set(false);
    this.compra.set(compra);
    if (!compra) {
      this.mensaje.set({ texto: 'No existe ninguna compra con ese código.', tipo: 'error' });
    }
  }

  esDeHoy(compra: Compra) {
    return new Date(compra.funciones!.inicio).toDateString() === new Date().toDateString();
  }

  async validarEntrada() {
    const compra = this.compra();
    if (!compra) {
      return;
    }
    const ok = await this.comprasS.validarEntrada(compra.id);
    if (ok) {
      this.mensaje.set({ texto: `Entrada validada: ${compra.cantidad_entradas} persona(s) a ${compra.funciones?.salas?.nombre}.`, tipo: 'ok' });
      await this.logS.registrar('Validó entrada', `Código ${compra.codigo} · ${compra.peliculas?.nombre}`);
    } else {
      this.mensaje.set({ texto: 'Esta entrada ya fue usada (o la compra está cancelada).', tipo: 'error' });
    }
    await this.buscar(compra.codigo, true);
  }

  async validarCandy() {
    const compra = this.compra();
    if (!compra) {
      return;
    }
    const ok = await this.comprasS.validarCandy(compra.id);
    if (ok) {
      this.mensaje.set({ texto: 'Candy entregado.', tipo: 'ok' });
      await this.logS.registrar('Entregó candy', `Código ${compra.codigo}`);
    } else {
      this.mensaje.set({ texto: 'El candy de esta compra ya fue retirado.', tipo: 'error' });
    }
    await this.buscar(compra.codigo, true);
  }

  // ---------- Lector de QR con la cámara (librería html5-qrcode) ----------

  async escanear() {
    this.escaneando.set(true);
    this.mensaje.set(null);
    // Espera a que Angular dibuje el <div id="lector"> antes de prender la cámara
    setTimeout(async () => {
      this.lector = new Html5Qrcode('lector');
      try {
        await this.lector.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 220 },
          async (texto) => {
            await this.detenerEscaneo();
            this.codigo.setValue(texto);
            await this.buscar(texto);
          },
          () => {}, // cuadros sin QR: se ignoran
        );
      } catch {
        this.escaneando.set(false);
        this.mensaje.set({ texto: 'No se pudo usar la cámara. Ingresá el código a mano.', tipo: 'error' });
      }
    });
  }

  async detenerEscaneo() {
    if (this.lector?.isScanning) {
      await this.lector.stop();
    }
    this.escaneando.set(false);
  }

  limpiar() {
    this.compra.set(null);
    this.mensaje.set(null);
    this.codigo.reset('');
  }

  ngOnDestroy() {
    this.detenerEscaneo();
  }
}
