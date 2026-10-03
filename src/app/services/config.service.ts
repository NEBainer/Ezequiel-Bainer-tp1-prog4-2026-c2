import { inject, Service } from '@angular/core';
import { SupabaseService } from './supabase';
import {
  Configuracion,
  ConfiguracionPorModificar,
  Cupon,
  CuponPorCrear,
} from '../interfaces/Configuracion';

// Precios, porcentaje del cupón de primera compra, costo en puntos y cupones
@Service()
export class ConfigService {
  private supS = inject(SupabaseService);

  async traer() {
    const { data } = await this.supS.Sup.from('configuracion').select('*').eq('id', 1).single();
    return data as Configuracion;
  }

  async modificar(cambios: ConfiguracionPorModificar) {
    const { error } = await this.supS.Sup.from('configuracion').update(cambios).eq('id', 1);
    return { error };
  }

  async traerCupones() {
    const { data } = await this.supS.Sup.from('cupones').select('*').order('id');
    return (data ?? []) as Cupon[];
  }

  async crearCupon(cupon: CuponPorCrear) {
    const { error } = await this.supS.Sup.from('cupones').insert(cupon);
    return { error };
  }

  async cambiarEstadoCupon(id: number, activo: boolean) {
    const { error } = await this.supS.Sup.from('cupones').update({ activo }).eq('id', id);
    return { error };
  }

  async borrarCupon(id: number) {
    const { error } = await this.supS.Sup.from('cupones').delete().eq('id', id);
    return { error };
  }
}
