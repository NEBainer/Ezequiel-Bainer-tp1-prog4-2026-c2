import { Component, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { Compra } from '../../interfaces/Compra';
import { ComprobanteService } from '../../services/comprobante.service';

// La entrada como la ve el cliente: datos de la función, butacas, candy, QR y botón de PDF
@Component({
  selector: 'app-entrada-ticket',
  imports: [DatePipe, CurrencyPipe],
  template: `
    <article class="ticket" [class.cancelada]="compra().estado === 'cancelada'">
      <div class="datos">
        <p class="marca">Fotograma · Entrada</p>
        <h3>{{ compra().peliculas?.nombre }}</h3>
        <p>
          <strong>{{ compra().funciones?.inicio | date: "EEEE d/M · HH:mm" }} h</strong><br />
          {{ compra().funciones?.salas?.nombre }} · {{ compra().funciones?.formato }} ·
          {{ compra().funciones?.idioma }}
        </p>
        <p class="butacas">
          @for (e of compra().entradas; track e.id) {
            <span class="etiqueta" [class.vip]="e.tipo === 'vip'">
              {{ e.fila }}{{ e.numero }}{{ e.tipo === 'vip' ? ' VIP' : e.tipo === 'accesible' ? ' ♿' : '' }}
            </span>
          }
        </p>
        @if (compra().compra_items?.length) {
          <p class="suave candy">
            Candy:
            @for (i of compra().compra_items; track i.id; let ultimo = $last) {
              {{ i.cantidad }} × {{ i.nombre }}{{ ultimo ? '' : ',' }}
            }
          </p>
        }
        <p>Total {{ compra().total | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</p>
        @if (compra().requiere_adulto) {
          <p class="aviso peligro">Película con restricción de edad: el menor debe asistir acompañado de un adulto.</p>
        }
      </div>

      <div class="qr">
        @if (compra().estado === 'cancelada') {
          <p class="sello">Cancelada</p>
        } @else {
          @if (qr()) {
            <img [src]="qr()" [alt]="'Código QR ' + compra().codigo" width="160" height="160" />
          }
          <code>{{ compra().codigo }}</code>
          <p class="estado">
            Entrada: {{ compra().entrada_validada ? 'usada' : 'sin usar' }}
            @if (compra().candy_validado !== null) {
              <br />Candy: {{ compra().candy_validado ? 'retirado' : 'sin retirar' }}
            }
          </p>
          <button class="btn-chico" (click)="pdf()">Descargar PDF</button>
        }
      </div>
    </article>
  `,
  styles: `
    .ticket {
      display: grid;
      grid-template-columns: 1fr auto;
      background: var(--superficie);
      border: 1px solid var(--borde);
      border-radius: var(--radio);
      overflow: hidden;
    }
    .cancelada {
      opacity: 0.55;
    }
    .datos {
      padding: 1.1rem 1.25rem;
    }
    .marca {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--acento);
      margin-bottom: 0.3rem;
    }
    .butacas {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
    }
    .candy {
      font-size: 0.9rem;
    }
    .qr {
      padding: 1.1rem;
      border-left: 2px dashed var(--borde);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      text-align: center;
    }
    .qr img {
      border-radius: 8px;
    }
    code {
      font-size: 1.15rem;
      letter-spacing: 0.15em;
      font-weight: 700;
    }
    .estado {
      font-size: 0.8rem;
      color: var(--texto-suave);
      margin: 0;
    }
    .sello {
      font-family: var(--fuente-titulo);
      font-size: 1.3rem;
      color: var(--peligro);
      border: 2px solid var(--peligro);
      padding: 0.3rem 0.8rem;
      border-radius: 8px;
      transform: rotate(-8deg);
      margin: auto;
    }
    @media (max-width: 560px) {
      .ticket {
        grid-template-columns: 1fr;
      }
      .qr {
        border-left: none;
        border-top: 2px dashed var(--borde);
      }
    }
  `,
})
export class EntradaTicket implements OnInit {
  private comprobanteS = inject(ComprobanteService);

  compra = input.required<Compra>();
  qr = signal<string | null>(null);

  async ngOnInit() {
    this.qr.set(await this.comprobanteS.generarQr(this.compra().codigo));
  }

  pdf() {
    this.comprobanteS.descargarEntrada(this.compra());
  }
}
