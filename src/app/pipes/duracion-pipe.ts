import { Pipe, PipeTransform } from '@angular/core';

// 118 -> "1 h 58 min"
@Pipe({
  name: 'duracion',
})
export class DuracionPipe implements PipeTransform {
  transform(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    if (horas === 0) {
      return `${resto} min`;
    }
    return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
  }
}
