import { Component, input, output } from '@angular/core';
import { Butaca, claveButaca } from '../../interfaces/Butaca';
import { butacasDeFila, FILAS } from '../../services/plano-sala';

// Mapa de la sala. No sabe nada de Supabase: recibe qué está ocupado y qué está elegido,
// y avisa al padre cuando el usuario toca una butaca.
@Component({
  selector: 'app-mapa-butacas',
  templateUrl: './mapa-butacas.html',
  styleUrl: './mapa-butacas.css',
})
export class MapaButacas {
  ocupadas = input.required<Set<string>>();
  seleccionadas = input.required<string[]>();
  alternar = output<Butaca>();

  filas = FILAS.map((fila) => ({ fila, bloques: butacasDeFila(fila) }));

  estaOcupada(b: Butaca) {
    return this.ocupadas().has(claveButaca(b));
  }

  estaSeleccionada(b: Butaca) {
    return this.seleccionadas().includes(claveButaca(b));
  }

  descripcion(b: Butaca) {
    const tipo = b.tipo === 'vip' ? ' VIP' : b.tipo === 'accesible' ? ' accesible' : '';
    const estado = this.estaOcupada(b) ? ', ocupada' : this.estaSeleccionada(b) ? ', seleccionada' : '';
    return `Fila ${b.fila}, butaca ${b.numero}${tipo}${estado}`;
  }
}
