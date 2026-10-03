export interface Genero {
  id: number;
  nombre: string;
}

// Fila de "peliculas". "generos" llega cuando se pide con select('*, generos(*)')
export interface Pelicula {
  id: number;
  nombre: string;
  sinopsis: string;
  duracion: number; // minutos
  imagen: string | null; // ruta dentro del bucket "imagenes"
  edad_minima: 13 | 18 | null;
  fecha_estreno: string; // 'AAAA-MM-DD'
  precio_preventa: number | null;
  en_cartelera: boolean;
  generos?: Genero[];
}

export type PeliculaPorCrear = Omit<Pelicula, 'id' | 'generos'>;

export type PeliculaPorModificar = Partial<PeliculaPorCrear>;
