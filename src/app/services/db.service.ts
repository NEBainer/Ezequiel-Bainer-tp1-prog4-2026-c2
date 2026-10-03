import { inject, Service } from '@angular/core';
import { SupabaseService } from './supabase';
import { Usuario, UsuarioPorCrear } from '../interfaces/Usuario';

@Service()
export class DbService {
  private supS = inject(SupabaseService);

  async crearUsuario(usuario: UsuarioPorCrear) {
    const { error } = await this.supS.Sup.from('usuarios').insert(usuario);
    return { error };
  }

  async traerPerfil(id: string) {
    const { data } = await this.supS.Sup.from('usuarios').select('*').eq('id', id).maybeSingle();
    return data as Usuario | null;
  }
}
