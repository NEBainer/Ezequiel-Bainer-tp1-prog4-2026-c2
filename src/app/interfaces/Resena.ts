export interface Resena {
  id: number;
  pelicula_id: number;
  usuario_id: string;
  autor: string;
  estrellas: number;
  comentario: string;
  created_at: string;
}

export type ResenaPorCrear = Omit<Resena, 'id' | 'created_at'>;
