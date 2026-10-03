import { Component, input, output } from '@angular/core';

// Muestra de 1 a 5 estrellas. Si es editable, cada estrella es un botón y emite el valor elegido.
@Component({
  selector: 'app-estrellas',
  template: `
    <span class="estrellas" [attr.aria-label]="valor() + ' de 5 estrellas'">
      @for (n of [1, 2, 3, 4, 5]; track n) {
        @if (editable()) {
          <button type="button" [class.llena]="n <= valor()" (click)="cambio.emit(n)" [attr.aria-label]="n + ' estrellas'">★</button>
        } @else {
          <span [class.llena]="n <= redondeado()">★</span>
        }
      }
    </span>
  `,
  styles: `
    .estrellas {
      display: inline-flex;
      gap: 0.1rem;
      color: var(--borde);
      font-size: var(--tam, 1rem);
    }
    .llena {
      color: var(--acento);
    }
    button {
      background: none;
      border: none;
      padding: 0 0.1rem;
      font-size: 1.6rem;
      color: var(--borde);
      border-radius: 4px;
    }
    button.llena {
      color: var(--acento);
    }
  `,
})
export class Estrellas {
  valor = input<number>(0);
  editable = input<boolean>(false);
  cambio = output<number>();

  redondeado() {
    return Math.round(this.valor());
  }
}
