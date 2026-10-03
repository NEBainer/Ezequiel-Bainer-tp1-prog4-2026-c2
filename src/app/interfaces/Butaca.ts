export type TipoButaca = 'comun' | 'accesible' | 'vip';

export interface Butaca {
  fila: string;
  numero: number;
  tipo: TipoButaca;
  bloque: 0 | 1 | 2; // columna de la sala: izquierda, centro, derecha
}

// Clave única de una butaca dentro de una función, ej. "F-12"
export function claveButaca(b: { fila: string; numero: number }) {
  return `${b.fila}-${b.numero}`;
}
