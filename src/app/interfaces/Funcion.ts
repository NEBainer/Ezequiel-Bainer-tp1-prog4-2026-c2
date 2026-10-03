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
  peliculas?: Pelicula;
  salas?: Sala;
}

export type FuncionPorCrear = Omit<Funcion, 'id' | 'peliculas' | 'salas'>;

// Lo que se arma en el formulario de programación antes de asignar sala
export interface FuncionPedida {
  inicio: Date;
  fin: Date;
}

export interface ResultadoAsignacion {
  creadas: FuncionPorCrear[];
  sinSala: Date[]; // horarios en los que no había ninguna sala libre
}
