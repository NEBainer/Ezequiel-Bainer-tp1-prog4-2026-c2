import { Pelicula } from './Pelicula';

export interface Sala {
  id: number;
  nombre: string;
}

export type Formato = '2D' | '3D' | '4D' | '5D';
export type Idioma = 'Castellano' | 'Subtitulada';

export interface Funcion {
  id: number;
  pelicula_id: number;
  sala_id: number;
  inicio: string; // ISO (timestamptz)
  fin: string; // inicio + duración
  formato: Formato;
  idioma: Idioma;
  cancelada: boolean; // la suspendió el cine (R-48): ver supabase/08_cancelar_funcion.sql
  peliculas?: Pelicula;
  salas?: Sala;
}

// "cancelada" no se manda al crear: la base pone false por defecto
export type FuncionPorCrear = Omit<Funcion, 'id' | 'cancelada' | 'peliculas' | 'salas'>;

// Lo que se arma en el formulario de programación antes de asignar sala
export interface FuncionPedida {
  inicio: Date;
  fin: Date;
}

export interface ResultadoAsignacion {
  creadas: FuncionPorCrear[];
  sinSala: Date[]; // horarios en los que no había ninguna sala libre
}
