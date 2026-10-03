export interface Configuracion {
  id: 1;
  precio_entrada: number;
  precio_vip: number;
  porcentaje_primera_compra: number;
  puntos_entrada: number;
}

export type ConfiguracionPorModificar = Partial<Omit<Configuracion, 'id'>>;

export interface Cupon {
  id: number;
  nombre: string;
  porcentaje: number;
  solo_mayores_50: boolean;
  activo: boolean;
}

export type CuponPorCrear = Omit<Cupon, 'id'>;
