// Edge Function: maneja los turnos de la lista de espera (R-46).
// La llaman el cron (cada minuto, ver supabase/07_lista_espera.sql) y la app cuando alguien
// cancela una compra (para que el aviso sea inmediato).
// Por cada función con gente esperando:
//   1) si el que tenía el turno ya compró o se le venció, se cierra su turno;
//   2) si hay butacas libres, el turno pasa al siguiente y se le avisa por push.
// No recibe datos y repetirla no cambia nada (si no hay nada que hacer, no hace nada),
// por eso se despliega sin verificar JWT: llamarla de más no tiene efecto.
// Secrets: VAPID_PUBLIC, VAPID_SECRET, VAPID_MAIL (los mismos que notificar-estreno).
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Igual que TOTAL_BUTACAS en src/app/services/plano-sala.ts: 18 filas de 28 + la accesible de 14
const TOTAL_BUTACAS = 518;
const MINUTOS_TURNO = 15;

function responder(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

interface FilaEspera {
  id: number;
  funcion_id: number;
  usuario_id: string;
  estado: string;
  avisado_at: string | null;
  funciones: { inicio: string; peliculas: { nombre: string } };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  // Con la service_role (solo existe en el servidor) se leen y modifican las filas de todos
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const ahora = new Date();

  // Turnos abiertos de funciones que todavía no empezaron, en orden de llegada
  const { data } = await admin
    .from('lista_espera')
    .select('*, funciones!inner(inicio, peliculas(nombre))')
    .in('estado', ['esperando', 'avisado'])
    .gt('funciones.inicio', ahora.toISOString())
    .order('created_at');
  const filas = (data ?? []) as FilaEspera[];

  // Se agrupan por función
  const porFuncion = new Map<number, FilaEspera[]>();
  for (const fila of filas) {
    porFuncion.set(fila.funcion_id, [...(porFuncion.get(fila.funcion_id) ?? []), fila]);
  }

  webpush.setVapidDetails(
    Deno.env.get('VAPID_MAIL')!,
    Deno.env.get('VAPID_PUBLIC')!,
    Deno.env.get('VAPID_SECRET')!,
  );

  let avisados = 0;
  for (const [funcionId, lista] of porFuncion) {
    // 1) ¿Hay alguien con el turno? Si compró, se cierra; si sigue en plazo, se respeta.
    const conTurno = lista.find((f) => f.estado === 'avisado');
    if (conTurno) {
      const { count: compras } = await admin
        .from('compras')
        .select('id', { count: 'exact', head: true })
        .eq('funcion_id', funcionId)
        .eq('usuario_id', conTurno.usuario_id)
        .eq('estado', 'activa')
        .gte('created_at', conTurno.avisado_at!);

      const vence = new Date(conTurno.avisado_at!).getTime() + MINUTOS_TURNO * 60 * 1000;
      if ((compras ?? 0) > 0) {
        await admin.from('lista_espera').update({ estado: 'compro' }).eq('id', conTurno.id);
      } else if (ahora.getTime() < vence) {
        continue; // turno vigente: no se toca esta función
      } else {
        await admin.from('lista_espera').update({ estado: 'vencido' }).eq('id', conTurno.id);
      }
    }

    // 2) ¿Quedan butacas libres?
    const { count: ocupadas } = await admin
      .from('entradas')
      .select('id', { count: 'exact', head: true })
      .eq('funcion_id', funcionId);
    if ((ocupadas ?? 0) >= TOTAL_BUTACAS) {
      continue;
    }

    // 3) El turno pasa al primero que sigue esperando.
    // El .eq('estado', 'esperando') evita avisar dos veces si el cron y la app llaman a la vez:
    // el segundo update no encuentra la fila y devuelve una lista vacía (como el QR de un solo uso).
    const siguiente = lista.find((f) => f.estado === 'esperando');
    if (!siguiente) {
      continue;
    }
    const { data: actualizada } = await admin
      .from('lista_espera')
      .update({ estado: 'avisado', avisado_at: ahora.toISOString() })
      .eq('id', siguiente.id)
      .eq('estado', 'esperando')
      .select();
    if (!actualizada || actualizada.length === 0) {
      continue;
    }

    // 4) Push a todos los navegadores donde ese usuario activó las notificaciones
    const { data: suscripciones } = await admin
      .from('suscripciones_push')
      .select('*')
      .eq('usuario_id', siguiente.usuario_id);

    const payload = JSON.stringify({
      notification: {
        title: '¡Se liberó un lugar!',
        body: `${siguiente.funciones.peliculas.nombre}: tenés ${MINUTOS_TURNO} minutos para comprar tu entrada.`,
        icon: '/icons/icon-192x192.png',
        data: {
          onActionClick: {
            default: { operation: 'navigateLastFocusedOrOpen', url: `/comprar/${funcionId}` },
          },
        },
      },
    });

    // for...of (no forEach) para poder esperar cada envío
    for (const s of suscripciones ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { auth: s.auth, p256dh: s.p256dh } }, payload);
      } catch (e) {
        // 404/410: la suscripción ya no existe, se borra
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from('suscripciones_push').delete().eq('id', s.id);
        }
      }
    }
    avisados++;
  }

  return responder({ avisados });
});
