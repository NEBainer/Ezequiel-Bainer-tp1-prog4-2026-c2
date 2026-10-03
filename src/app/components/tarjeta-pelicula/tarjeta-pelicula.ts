import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Pelicula } from '../../interfaces/Pelicula';
import { Poster } from '../poster/poster';
import { Estrellas } from '../estrellas/estrellas';
import { DuracionPipe } from '../../pipes/duracion-pipe';
import { enPreventa } from '../../services/peliculas.service';

@Component({
  selector: 'app-tarjeta-pelicula',
  imports: [RouterLink, Poster, Estrellas, DuracionPipe, DatePipe],
  template: `
    <a class="tarjeta" [routerLink]="['/pelicula', pelicula().id]">
      <div class="marco">
        <app-poster [nombre]="pelicula().nombre" [imagen]="pelicula().imagen" />
        <div class="etiquetas">
          @if (pelicula().edad_minima) {
            <span class="etiqueta edad">+{{ pelicula().edad_minima }}</span>
          }
          @if (preventa()) {
            <span class="etiqueta preventa">Preventa</span>
          }
        </div>
      </div>
      <h3>{{ pelicula().nombre }}</h3>
      <p class="suave datos">
        {{ pelicula().duracion | duracion }}
        @if (promedio() !== null) {
          · <app-estrellas [valor]="promedio()!" /> {{ promedio()!.toFixed(1) }}
        }
      </p>
      @if (mostrarEstreno()) {
        <p class="estreno">Estreno {{ pelicula().fecha_estreno + 'T00:00' | date: 'EEEE d/M' }}</p>
      }
    </a>
  `,
  styles: `
    .tarjeta {
      display: block;
      color: inherit;
      text-decoration: none;
    }
    .marco {
      position: relative;
      transition: transform 0.2s;
    }
    .tarjeta:hover .marco {
      transform: translateY(-4px);
    }
    .etiquetas {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      display: flex;
      gap: 0.3rem;
    }
    h3 {
      margin: 0.6rem 0 0.1rem;
      font-size: 1rem;
    }
    .datos {
      font-size: 0.85rem;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      flex-wrap: wrap;
    }
    .estreno {
      font-size: 0.85rem;
      color: var(--acento);
      margin: 0.2rem 0 0;
    }
  `,
})
export class TarjetaPelicula {
  pelicula = input.required<Pelicula>();
  promedio = input<number | null>(null);
  mostrarEstreno = input<boolean>(false);

  preventa() {
    return enPreventa(this.pelicula());
  }
}
