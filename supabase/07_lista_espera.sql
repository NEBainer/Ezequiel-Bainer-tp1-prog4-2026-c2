-- Lista de espera para funciones agotadas (R-46, R-47).
-- Cuando se liberan butacas, se avisa por push al primero de la lista, que tiene 15 minutos
-- para comprar; si no compra, el turno pasa al siguiente.
-- Los cambios de estado los hace solo la Edge Function "lista-espera" (con la clave de servicio).

create table public.lista_espera (
  id bigint generated always as identity primary key,
  funcion_id bigint not null references public.funciones (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  -- esperando -> avisado (tiene el turno) -> compro / vencido
  estado text not null default 'esperando' check (estado in ('esperando', 'avisado', 'compro', 'vencido')),
  avisado_at timestamptz,                    -- cuándo empezó su turno de 15 minutos
  created_at timestamptz not null default now(),
  unique (funcion_id, usuario_id)            -- nadie se anota dos veces en la misma función
);

alter table public.lista_espera enable row level security;

-- Todos leen: hace falta para calcular la posición (cuántos se anotaron antes) y para que la
-- política de "entradas" pueda ver si hay un turno vigente. Solo tiene ids, estado y fechas.
create policy "lista_espera: todos leen" on public.lista_espera for select to anon, authenticated
  using (true);

-- Solo registrados, siempre como "esperando" (no se puede dar el turno a sí mismo)
create policy "lista_espera: anotarse" on public.lista_espera for insert to authenticated
  with check (usuario_id = auth.uid() and estado = 'esperando' and avisado_at is null);

-- Salir de la lista (o volver a anotarse al final después de perder el turno)
create policy "lista_espera: salirse" on public.lista_espera for delete to authenticated
  using (usuario_id = auth.uid());

-- =========================================================
-- Turno exclusivo: mientras alguien tiene su turno (avisado hace menos de 15 minutos),
-- nadie más puede comprar butacas de esa función. Vencido el plazo, la condición deja de
-- cumplirse sola, aunque el cron todavía no haya pasado.
-- Reemplaza a "entradas: todos crean" (que dejaba insertar siempre).
-- Ojo: adentro del subquery hay que escribir "entradas.funcion_id"; sin el nombre de la tabla
-- se tomaría la columna funcion_id de lista_espera.
-- =========================================================
drop policy "entradas: todos crean" on public.entradas;
create policy "entradas: crear si no hay turno ajeno" on public.entradas for insert to anon, authenticated
  with check (not exists (
    select 1 from public.lista_espera le
    where le.funcion_id = entradas.funcion_id
      and le.estado = 'avisado'
      and le.avisado_at > now() - interval '15 minutes'
      and le.usuario_id is distinct from auth.uid()   -- "distinct" también cubre al anónimo (uid null)
  ));

-- =========================================================
-- Cron: cada minuto llama a la Edge Function, que cierra los turnos vencidos y avisa al siguiente.
-- pg_cron ya viene instalado; pg_net permite hacer el pedido HTTP desde la base.
-- =========================================================
-- En el schema "extensions" (no en public), como recomienda Supabase. Sus funciones quedan en "net".
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'lista-espera',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://hgvqvlekpxihqorkgffo.supabase.co/functions/v1/lista-espera',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
