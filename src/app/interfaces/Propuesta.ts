export type EstadoPropuesta = 'pendiente' | 'aceptada' | 'rechazada';

// Fila de "propuestas": una película que un cliente pide que se agregue a la cartelera
export interface Propuesta {
  id: number;
  usuario_id: string;
  titulo: string;
  descripcion: string;
  motivo: string; // por qué la quiere ver en el cine
  estado: EstadoPropuesta;
  created_at: string;
}

// El estado no se manda: la base pone 'pendiente' por defecto
export type PropuestaPorCrear = Omit<Propuesta, 'id' | 'estado' | 'created_at'>;
