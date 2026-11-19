// Edge Function: avisa por push a los compradores de una función que el cine canceló (R-48).
// Se llama DESPUÉS de cancelar_funcion (la transacción ya acreditó a todos): si un push falla,
// el crédito igual quedó. Las compras anónimas no tienen a quién avisarle.
// Secrets: VAPID_PUBLIC, VAPID_SECRET, VAPID_MAIL (los mismos que notificar-estreno).
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

  const clienteUsuario = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: usuario } = await clienteUsuario.auth.getUser(token);
  if (!usuario.user) {
    return responder({ error: 'Sesión inválida' }, 401);
  }

  // Con la service_role (solo existe en el servidor) se leen compras y suscripciones de todos
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 1) Mismo permiso que cancelar_funcion: admin o rol configurable con la sección "funciones"
  let permitido = usuario.user.app_metadata?.rol === 'admin';
  if (!permitido) {
    const { data: roles } = await admin
      .from('usuario_roles')
      .select('roles(secciones)')
      .eq('usuario_id', usuario.user.id);
    permitido = (roles ?? []).some((r: any) => r.roles?.secciones?.includes('funciones'));
  }
  if (!permitido) {
    return responder({ error: 'No tenés permiso' }, 403);
  }

  const { funcion_id } = await req.json();

  // 2) Solo si la función de verdad quedó cancelada (no se puede usar para mandar avisos falsos)
  const { data: funcion } = await admin
    .from('funciones')
    .select('cancelada, inicio, pelicula_id, peliculas(nombre)')
    .eq('id', funcion_id)
    .single();
  if (!funcion || !funcion.cancelada) {
    return responder({ error: 'La función no está cancelada' }, 400);
  }

  // 3) Crédito acreditado a cada comprador registrado (puede tener más de una compra)
  const { data: compras } = await admin
    .from('compras')
    .select('usuario_id, credito_otorgado')
    .eq('funcion_id', funcion_id)
    .eq('estado', 'cancelada')
    .not('usuario_id', 'is', null);

  const creditoPorUsuario = new Map<string, number>();
  for (const c of compras ?? []) {
    creditoPorUsuario.set(c.usuario_id, (creditoPorUsuario.get(c.usuario_id) ?? 0) + Number(c.credito_otorgado));
  }
  if (creditoPorUsuario.size === 0) {
    return responder({ enviadas: 0 });
  }

  const { data: suscripciones } = await admin
    .from('suscripciones_push')
    .select('*')
    .in('usuario_id', [...creditoPorUsuario.keys()]);

  webpush.setVapidDetails(
    Deno.env.get('VAPID_MAIL')!,
    Deno.env.get('VAPID_PUBLIC')!,
    Deno.env.get('VAPID_SECRET')!,
  );

  const nombre = (funcion.peliculas as unknown as { nombre: string }).nombre;
  const dia = new Date(funcion.inicio).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // for...of (no forEach) para poder esperar cada envío
  let enviadas = 0;
  for (const s of suscripciones ?? []) {
    const credito = creditoPorUsuario.get(s.usuario_id) ?? 0;
    // Formato del Service Worker de Angular. Al tocarla abre la película para elegir otra función (R-49).
    const payload = JSON.stringify({
      notification: {
        title: 'Se canceló tu función',
        body: `${nombre} (${dia}) se suspendió. Te acreditamos $ ${credito.toLocaleString('es-AR')}: tocá para elegir otra función.`,
        icon: '/icons/icon-192x192.png',
        data: {
          onActionClick: {
            default: { operation: 'navigateLastFocusedOrOpen', url: `/pelicula/${funcion.pelicula_id}` },
          },
        },
      },
    });
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { auth: s.auth, p256dh: s.p256dh } }, payload);
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
