import { inject, Service } from '@angular/core';
import { SupabaseService } from './supabase';
import { Categoria, Combo, ComboPorCrear, Producto, ProductoPorCrear } from '../interfaces/Candy';

@Service()
export class CandyService {
  private supS = inject(SupabaseService);

  async traerCategorias() {
    const { data } = await this.supS.Sup.from('categorias').select('*').order('nombre');
    return (data ?? []) as Categoria[];
  }

  async crearCategoria(nombre: string) {
    const { error } = await this.supS.Sup.from('categorias').insert({ nombre });
    return { error };
  }

  async borrarCategoria(id: number) {
    const { error } = await this.supS.Sup.from('categorias').delete().eq('id', id);
    return { error };
  }

  async traerProductos() {
    const { data } = await this.supS.Sup.from('productos').select('*').order('nombre');
    return (data ?? []) as Producto[];
  }

  async crearProducto(producto: ProductoPorCrear) {
    const { error } = await this.supS.Sup.from('productos').insert(producto);
    return { error };
  }

  async modificarProducto(id: number, cambios: Partial<ProductoPorCrear>) {
    const { error } = await this.supS.Sup.from('productos').update(cambios).eq('id', id);
    return { error };
  }

  async borrarProducto(id: number) {
    const { error } = await this.supS.Sup.from('productos').delete().eq('id', id);
    return { error };
  }

  async traerCombos() {
    const { data } = await this.supS.Sup.from('combos').select('*').order('precio');
    return (data ?? []) as Combo[];
  }

  async crearCombo(combo: ComboPorCrear) {
    const { error } = await this.supS.Sup.from('combos').insert(combo);
    return { error };
  }

  async modificarCombo(id: number, cambios: Partial<ComboPorCrear>) {
    const { error } = await this.supS.Sup.from('combos').update(cambios).eq('id', id);
    return { error };
  }

  async borrarCombo(id: number) {
    const { error } = await this.supS.Sup.from('combos').delete().eq('id', id);
    return { error };
  }
}
