import { inject, Service } from '@angular/core';
import { SupabaseService } from './supabase';
import { EstadoPropuesta, Propuesta, PropuestaPorCrear } from '../interfaces/Propuesta';

@Service()
export class PropuestasService {
  private supS = inject(SupabaseService);

  // Las del cliente logueado (la RLS igual solo le devuelve las suyas)
  async traerDeUsuario(usuarioId: string) {
    const { data } = await this.supS.Sup.from('propuestas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });
    return (data ?? []) as Propuesta[];
  }

  // Para el admin (la RLS solo deja ver todas si el rol es admin)
  async traerTodas() {
    const { data } = await this.supS.Sup.from('propuestas')
      .select('*')
      .order('created_at', { ascending: false });
    return (data ?? []) as Propuesta[];
  }

  async traerUna(id: number) {
    const { data } = await this.supS.Sup.from('propuestas').select('*').eq('id', id).maybeSingle();
    return data as Propuesta | null;
  }

  async crear(propuesta: PropuestaPorCrear) {
    const { error } = await this.supS.Sup.from('propuestas').insert(propuesta);
    // 23505 = violación de UNIQUE: ya tiene una pendiente (índice "una pendiente por usuario")
    if (error?.code === '23505') {
      return { error: 'Ya tenés una propuesta pendiente. Esperá la respuesta para enviar otra.' };
    }
    return { error: error ? 'No se pudo enviar la propuesta.' : null };
  }

  async cambiarEstado(id: number, estado: EstadoPropuesta) {
    const { error } = await this.supS.Sup.from('propuestas').update({ estado }).eq('id', id);
    return { error };
  }
}
