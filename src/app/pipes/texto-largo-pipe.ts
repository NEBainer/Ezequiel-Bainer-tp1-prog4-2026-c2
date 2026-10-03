import { Pipe, PipeTransform } from '@angular/core';

// Corta un texto largo (sinopsis en las tarjetas) y le agrega "…"
@Pipe({
  name: 'textoLargo',
})
export class TextoLargoPipe implements PipeTransform {
  transform(valor: string, largoMaximo: number = 90): string {
    if (valor.length > largoMaximo) {
      return valor.slice(0, largoMaximo).trimEnd() + '…';
    }
    return valor;
  }
}
