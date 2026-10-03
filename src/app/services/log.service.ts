import { inject, Service } from '@angular/core';
import { SupabaseService } from './supabase';
import { Auth } from './auth.service';
import { Log } from '../interfaces/Log';

// Log de actividad del panel: quién hizo qué y cuándo (la fecha la pone la base).
@Service()
export class LogService {
  private supS = inject(SupabaseService);
  private authS = inject(Auth);

  async registrar(accion: string, detalle: string) {
    const usuario = this.authS.usuarioActual();
    if (!usuario) {
      return;
    }
    await this.supS.Sup.from('log_actividad').insert({
      usuario_id: usuario.id,
      email: usuario.email,
      accion,
      detalle,
    });
  }

  async traer() {
    const { data } = await this.supS.Sup.from('log_actividad')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    return (data ?? []) as Log[];
  }
}
