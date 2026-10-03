import { inject, Service } from '@angular/core';
import { SupabaseService } from './supabase';
import { Resena, ResenaPorCrear } from '../interfaces/Resena';

@Service()
export class ResenasService {
  private supS = inject(SupabaseService);

  async traerDePelicula(peliculaId: number) {
    const { data } = await this.supS.Sup.from('resenas')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .order('created_at', { ascending: false });
    return (data ?? []) as Resena[];
  }

  // Solo estrellas y película: alcanza para calcular el promedio de cada una en la cartelera
  async traerPuntajes() {
    const { data } = await this.supS.Sup.from('resenas').select('pelicula_id, estrellas');
    return (data ?? []) as Pick<Resena, 'pelicula_id' | 'estrellas'>[];
  }

  async traerDeUsuario(usuarioId: string) {
    const { data } = await this.supS.Sup.from('resenas').select('*').eq('usuario_id', usuarioId);
    return (data ?? []) as Resena[];
  }

  // upsert: si el usuario ya había reseñado esa película, la reemplaza (UNIQUE pelicula_id + usuario_id)
  async guardar(resena: ResenaPorCrear) {
    const { error } = await this.supS.Sup.from('resenas').upsert(resena, {
      onConflict: 'pelicula_id,usuario_id',
    });
    return { error };
  }

  async borrar(id: number) {
    const { error } = await this.supS.Sup.from('resenas').delete().eq('id', id);
    return { error };
  }
}

export function promedio(puntajes: { estrellas: number }[]) {
  if (puntajes.length === 0) {
    return null;
  }
  return puntajes.reduce((t, r) => t + r.estrellas, 0) / puntajes.length;
}
