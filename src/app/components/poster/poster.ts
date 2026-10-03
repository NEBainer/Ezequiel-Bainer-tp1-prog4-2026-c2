import { Component, computed, inject, input } from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { ImagenRespaldo } from '../../directives/imagen-respaldo';

// Póster de una película. Si no tiene imagen, muestra un póster tipográfico con su nombre.
@Component({
  selector: 'app-poster',
  imports: [ImagenRespaldo],
  template: `
    <div class="poster" [style.--tono]="tono()">
      <span class="titulo">{{ nombre() }}</span>
      @if (url()) {
        <img [src]="url()" [alt]="'Póster de ' + nombre()" loading="lazy" appImagenRespaldo />
      }
    </div>
  `,
  styles: `
    .poster {
      position: relative;
      aspect-ratio: 2 / 3;
      border-radius: var(--radio);
      overflow: hidden;
      background:
        linear-gradient(160deg, hsl(var(--tono) 55% 32%), hsl(calc(var(--tono) + 40) 45% 12%));
      display: flex;
      align-items: flex-end;
      box-shadow: var(--sombra);
    }
    .titulo {
      padding: 0.9rem;
      font-family: var(--fuente-titulo);
      font-weight: 800;
      font-size: 1.25rem;
      line-height: 1.05;
      color: var(--texto);
    }
    img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
})
export class Poster {
  private storageS = inject(StorageService);

  nombre = input.required<string>();
  imagen = input<string | null>(null);

  url = computed(() => {
    const ruta = this.imagen();
    return ruta ? this.storageS.urlPublica(ruta) : null;
  });

  // Color del póster de respaldo derivado del nombre (siempre el mismo para la misma película)
  tono = computed(() => {
    let suma = 0;
    for (const letra of this.nombre()) {
      suma += letra.charCodeAt(0);
    }
    return suma % 360;
  });
}
