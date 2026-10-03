import { Butaca, TipoButaca } from '../interfaces/Butaca';

/*
 * Distribución de todas las salas (ver docs/decisiones.md):
 * - Filas A a T sin la K (19 filas). La K se quitó junto con la J original para hacer
 *   una sola fila accesible, que conserva la letra J.
 * - Filas comunes: 3 bloques de 4 + 20 + 4 butacas (28), numeradas de izquierda a derecha.
 * - Fila J (accesible): 2 + 10 + 2 butacas (14).
 * - Filas R, S y T: misma distribución que las comunes, pero son VIP.
 */
export const FILAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
export const FILA_ACCESIBLE = 'J';
export const FILAS_VIP = ['R', 'S', 'T'];

const BLOQUES_COMUNES = [4, 20, 4];
const BLOQUES_ACCESIBLES = [2, 10, 2];

export function tipoDeFila(fila: string): TipoButaca {
  if (fila === FILA_ACCESIBLE) {
    return 'accesible';
  }
  if (FILAS_VIP.includes(fila)) {
    return 'vip';
  }
  return 'comun';
}

// Devuelve las butacas de una fila separadas por bloque (izquierda, centro, derecha)
export function butacasDeFila(fila: string): Butaca[][] {
  const tipo = tipoDeFila(fila);
  const bloques = tipo === 'accesible' ? BLOQUES_ACCESIBLES : BLOQUES_COMUNES;
  let numero = 1;

  return bloques.map((cantidad, bloque) => {
    const butacas: Butaca[] = [];
    for (let i = 0; i < cantidad; i++) {
      butacas.push({ fila, numero: numero++, tipo, bloque: bloque as 0 | 1 | 2 });
    }
    return butacas;
  });
}

// 18 filas de 28 + 1 fila accesible de 14 = 518
export const TOTAL_BUTACAS = FILAS.reduce((total, fila) => total + butacasDeFila(fila).flat().length, 0);
