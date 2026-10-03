import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { ComprasService } from '../../services/compras.service';
import { ResenasService } from '../../services/resenas.service';
import { Pelicula } from '../../interfaces/Pelicula';
import { Poster } from '../../components/poster/poster';
import { Estrellas } from '../../components/estrellas/estrellas';

interface PeliculaVista {
  pelicula: Pelicula;
  fecha: string; // última vez que la vio
  veces: number;
  calificacion: number | null; // su propia reseña
}

// Historial visual de lo que el usuario vio: funciones ya pasadas de compras activas
@Component({
  selector: 'app-mis-peliculas',
  imports: [DatePipe, RouterLink, Poster, Estrellas],
  template: `
    <div class="contenedor">
      <h1>Mis películas</h1>
      <p class="suave">Todo lo que viste en Fotograma, con tu calificación.</p>

      @if (cargando()) {
        <p class="suave">Cargando…</p>
      } @else {
        <div class="grilla">
          @for (v of vistas(); track v.pelicula.id) {
            <a class="vista" [routerLink]="['/pelicula', v.pelicula.id]">
              <app-poster [nombre]="v.pelicula.nombre" [imagen]="v.pelicula.imagen" />
              <h3>{{ v.pelicula.nombre }}</h3>
              <p class="suave">
                {{ v.fecha | date: 'd/M/yyyy' }}
                @if (v.veces > 1) {
                  · {{ v.veces }} veces
                }
              </p>
              @if (v.calificacion) {
                <app-estrellas [valor]="v.calificacion" />
              } @else {
                <span class="calificar">Calificala ★</span>
              }
            </a>
          } @empty {
            <p class="vacio">Cuando veas tu primera película va a aparecer acá.</p>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .vista {
      color: inherit;
      text-decoration: none;
    }
    h3 {
      margin: 0.6rem 0 0;
      font-size: 1rem;
    }
    p {
      margin: 0;
      font-size: 0.85rem;
    }
    .calificar {
      font-size: 0.85rem;
      color: var(--acento);
    }
  `,
})
export class MisPeliculas implements OnInit {
  private supabaseS = inject(SupabaseService);
  private comprasS = inject(ComprasService);
  private resenasS = inject(ResenasService);

  vistas = signal<PeliculaVista[]>([]);
  cargando = signal(true);

  async ngOnInit() {
    const { data } = await this.supabaseS.Auth.getSession();
    const usuario = data.session?.user;
    if (!usuario) {
      return;
    }

    const [compras, resenas] = await Promise.all([
      this.comprasS.traerDeUsuario(usuario.id),
      this.resenasS.traerDeUsuario(usuario.id),
    ]);

    // Una tarjeta por película (aunque la haya visto más de una vez)
    const porPelicula = new Map<number, PeliculaVista>();
    for (const c of compras) {
      if (c.estado !== 'activa' || new Date(c.funciones!.inicio).getTime() > Date.now()) {
        continue;
      }
      const existente = porPelicula.get(c.pelicula_id);
      if (existente) {
        existente.veces++;
        if (c.funciones!.inicio > existente.fecha) {
          existente.fecha = c.funciones!.inicio;
        }
      } else {
        porPelicula.set(c.pelicula_id, {
          pelicula: c.peliculas!,
          fecha: c.funciones!.inicio,
          veces: 1,
          calificacion: resenas.find((r) => r.pelicula_id === c.pelicula_id)?.estrellas ?? null,
        });
      }
    }

    this.vistas.set([...porPelicula.values()].sort((a, b) => b.fecha.localeCompare(a.fecha)));
    this.cargando.set(false);
  }
}
