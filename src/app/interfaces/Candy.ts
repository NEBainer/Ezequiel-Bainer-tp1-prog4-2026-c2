export interface Categoria {
  id: number;
  nombre: string;
}

export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  categoria_id: number;
  puntos: number | null; // costo en puntos para canjearlo (null = no canjeable)
  activo: boolean;
}

export type ProductoPorCrear = Omit<Producto, 'id'>;

export interface Combo {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  activo: boolean;
}

export type ComboPorCrear = Omit<Combo, 'id'>;
