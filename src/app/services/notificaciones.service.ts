import { inject, Service } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { SupabaseService } from './supabase';
import { environment } from '../../environments/environment';

@Service()
export class NotificacionesService {
  private swPushS = inject(SwPush);
  private supS = inject(SupabaseService);

  // Igual que en la clase 10: pide permiso, obtiene la suscripción y la guarda en Supabase.
  // Se guarda con el id del usuario para poder avisarle solo a quien activó la alerta.
  async suscribir(usuarioId: string) {
    if (!this.swPushS.isEnabled) {
      return { error: 'Las notificaciones no están disponibles en este navegador (o estás en modo desarrollo).' };
    }

    try {
      const suscripcion = await this.swPushS.requestSubscription({
        serverPublicKey: environment.PUBLIC_VAPID,
      });
      const json = suscripcion.toJSON();

      // upsert por p256dh (UNIQUE): si este navegador ya estaba suscripto no se duplica
      const { error } = await this.supS.Sup.from('suscripciones_push').upsert(
        {
          usuario_id: usuarioId,
          endpoint: json.endpoint,
          auth: json.keys?.['auth'],
          p256dh: json.keys?.['p256dh'],
        },
        { onConflict: 'p256dh' },
      );
      return { error: error ? 'No se pudo guardar la suscripción.' : null };
    } catch {
      return { error: 'Tenés que permitir las notificaciones en el navegador.' };
    }
  }

  async traerAlertas(usuarioId: string) {
    const { data } = await this.supS.Sup.from('alertas').select('pelicula_id').eq('usuario_id', usuarioId);
    return (data ?? []).map((a) => a.pelicula_id as number);
  }

  async activarAlerta(usuarioId: string, peliculaId: number) {
    const suscripcion = await this.suscribir(usuarioId);
    if (suscripcion.error) {
      return suscripcion;
    }
    const { error } = await this.supS.Sup.from('alertas').insert({
      usuario_id: usuarioId,
      pelicula_id: peliculaId,
    });
    return { error: error ? 'No se pudo activar la alerta.' : null };
  }

  async quitarAlerta(usuarioId: string, peliculaId: number) {
    await this.supS.Sup.from('alertas')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('pelicula_id', peliculaId);
  }

  // El envío se hace del lado del servidor: Edge Function "notificar-estreno" con web-push
  async avisarVentaAbierta(peliculaId: number) {
    const { data, error } = await this.supS.Sup.functions.invoke('notificar-estreno', {
      body: { pelicula_id: peliculaId },
    });
    if (error) {
      return { error: 'No se pudo enviar el aviso.', enviadas: 0 };
    }
    return { error: null, enviadas: (data?.enviadas as number) ?? 0 };
  }
}
