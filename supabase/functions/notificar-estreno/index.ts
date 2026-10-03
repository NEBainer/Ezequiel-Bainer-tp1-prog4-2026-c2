// Edge Function: avisa por push a quienes activaron la alerta de una película
// que sus entradas ya están a la venta.
// Secrets necesarios (Dashboard > Edge Functions > Secrets): VAPID_PUBLIC, VAPID_SECRET, VAPID_MAIL (mailto:...)
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY los provee Supabase automáticamente.
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

  // 1) Solo un admin puede disparar el aviso (el rol viene en el JWT, app_metadata)
  const clienteUsuario = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: usuario } = await clienteUsuario.auth.getUser();
  if (usuario.user?.app_metadata?.rol !== 'admin') {
    return responder({ error: 'Solo el admin puede enviar avisos' }, 403);
  }

  const { pelicula_id } = await req.json();

  // 2) Con la service_role (solo existe en el servidor) se leen las alertas de todos los usuarios
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: pelicula } = await admin.from('peliculas').select('nombre').eq('id', pelicula_id).single();
  const { data: alertas } = await admin.from('alertas').select('usuario_id').eq('pelicula_id', pelicula_id);
  const usuarios = (alertas ?? []).map((a) => a.usuario_id);

  if (!pelicula || usuarios.length === 0) {
    return responder({ enviadas: 0 });
  }

  const { data: suscripciones } = await admin
    .from('suscripciones_push')
    .select('*')
    .in('usuario_id', usuarios);

  webpush.setVapidDetails(
    Deno.env.get('VAPID_MAIL')!,
    Deno.env.get('VAPID_PUBLIC')!,
    Deno.env.get('VAPID_SECRET')!,
  );

  // Formato que entiende el Service Worker de Angular. onActionClick abre la película al tocarla.
  const payload = JSON.stringify({
    notification: {
      title: '¡Ya podés sacar tus entradas!',
      body: `${pelicula.nombre} ya está a la venta en Fotograma.`,
      icon: '/icons/icon-192x192.png',
      data: {
        onActionClick: {
          default: { operation: 'navigateLastFocusedOrOpen', url: `/pelicula/${pelicula_id}` },
        },
      },
    },
  });

  // for...of (no forEach) para poder esperar cada envío
  let enviadas = 0;
  for (const s of suscripciones ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { auth: s.auth, p256dh: s.p256dh } },
        payload,
      );
      enviadas++;
    } catch (e) {
      // 404/410: la suscripción ya no existe (el usuario desinstaló o bloqueó), se borra
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await admin.from('suscripciones_push').delete().eq('id', s.id);
      }
    }
  }

  // Ya se avisó: las alertas de esta película se borran
  await admin.from('alertas').delete().eq('pelicula_id', pelicula_id);

  return responder({ enviadas });
});
