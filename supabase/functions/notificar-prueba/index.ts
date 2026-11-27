// Edge Function: envía una notificación push de prueba al usuario que la pide
// (a todas sus suscripciones). Sirve para comprobar el envío en el momento.
// Secrets necesarios: VAPID_PUBLIC, VAPID_SECRET, VAPID_MAIL (los mismos que notificar-estreno).
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function responder(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  // 1) Cualquier usuario logueado, pero solo se le envía a él mismo
  const clienteUsuario = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: usuario } = await clienteUsuario.auth.getUser(token);
  if (!usuario.user) {
    return responder({ error: 'Tenés que iniciar sesión' }, 401);
  }

  // 2) Con la service_role se leen sus suscripciones (y se pueden borrar las vencidas)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: suscripciones } = await admin
    .from('suscripciones_push')
    .select('*')
    .eq('usuario_id', usuario.user.id);

  webpush.setVapidDetails(
    Deno.env.get('VAPID_MAIL')!,
    Deno.env.get('VAPID_PUBLIC')!,
    Deno.env.get('VAPID_SECRET')!,
  );

  const payload = JSON.stringify({
    notification: {
      title: 'Notificación de prueba',
      body: `Las notificaciones de Fotograma funcionan (${new Date().toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}).`,
      icon: '/icons/icon-192x192.png',
      data: {
        onActionClick: {
          default: { operation: 'navigateLastFocusedOrOpen', url: '/perfil' },
        },
      },
    },
  });

  let enviadas = 0;
  for (const s of suscripciones ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { auth: s.auth, p256dh: s.p256dh } },
        payload,
      );
      enviadas++;
    } catch (e) {
      // 404/410: la suscripción ya no existe, se borra
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await admin.from('suscripciones_push').delete().eq('id', s.id);
      }
    }
  }

  return responder({ enviadas });
});
