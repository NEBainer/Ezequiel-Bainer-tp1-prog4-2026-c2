import { TipoButaca } from './Butaca';
import { Funcion } from './Funcion';
import { Pelicula } from './Pelicula';

export interface Compra {
  id: string;
  codigo: string;
  usuario_id: string | null; // null = anónima
  funcion_id: number;
  pelicula_id: number;
  cantidad_entradas: number;
  subtotal: number;
  descuento: number;
  cupon: string | null;
  total: number;
  pagado_credito: number;
  pagado_puntos: number;
  pagado_tarjeta: number;
  puntos_ganados: number;
  estado: 'activa' | 'cancelada';
  credito_otorgado: number;
  entrada_validada: boolean;
  candy_validado: boolean | null; // null = no compró candy
  requiere_adulto: boolean;
  created_at: string;
  funciones?: Funcion;
  peliculas?: Pelicula;
  entradas?: Entrada[];
  compra_items?: CompraItem[];
}

export type CompraPorCrear = Omit<
  Compra,
  'created_at' | 'estado' | 'credito_otorgado' | 'entrada_validada' | 'funciones' | 'peliculas' | 'entradas' | 'compra_items'
>;

export interface Entrada {
  id: number;
  compra_id: string;
  funcion_id: number;
  pelicula_id: number;
  fila: string;
  numero: number;
  tipo: TipoButaca;
  precio: number;
}

export type EntradaPorCrear = Omit<Entrada, 'id'>;

export interface CompraItem {
  id: number;
  compra_id: string;
  producto_id: number | null;
  combo_id: number | null;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  canjeado_puntos: boolean;
}

export type CompraItemPorCrear = Omit<CompraItem, 'id'>;

export interface Canje {
  id: number;
  usuario_id: string;
  compra_id: string;
  descripcion: string;
  puntos: number;
  created_at: string;
}

export type CanjePorCrear = Omit<Canje, 'id' | 'created_at'>;
