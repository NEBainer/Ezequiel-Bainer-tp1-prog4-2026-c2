-- Cancelación de funciones por parte del cine (R-48, R-49, R-50).
-- Tiene que ser ATÓMICA: se acredita a todos o a nadie. Desde Angular cada llamada de supabase-js
-- es un pedido separado (si se corta a la mitad no hay rollback), por eso los pasos van juntos
-- en una función de la base: Postgres ejecuta una función entera como una sola transacción.
-- Las notificaciones NO van acá: las manda después la Edge Function "notificar-cancelacion".

alter table public.funciones add column cancelada boolean not null default false;

create or replace function public.cancelar_funcion(p_funcion_id bigint)
returns integer                -- cuántas compras se cancelaron
language plpgsql
security definer               -- corre con permisos del dueño: puede tocar compras y entradas de todos
set search_path = public
as $$
declare
  canceladas integer;
begin
  -- Como corre con permisos de dueño, el control de quién la llama se hace a mano:
  -- el admin, o alguien con un rol configurable que incluya la sección "funciones" (R-45).
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'rol', '') <> 'admin'
     and not exists (select 1 from usuario_roles ur join roles r on r.id = ur.rol_id
                     where ur.usuario_id = auth.uid() and 'funciones' = any (r.secciones)) then
    raise exception 'No tenés permiso para cancelar funciones';
  end if;

  -- 1) Marcar la función. Si no existe o ya estaba cancelada, se corta acá (y no se hizo nada).
  update funciones set cancelada = true where id = p_funcion_id and cancelada = false;
  if not found then
    raise exception 'La función no existe o ya estaba cancelada';
  end if;

  -- 2) Cada compra activa pasa a crédito por lo que se pagó (tarjeta + crédito usado).
  --    Eso ya incluye el candy, porque el total de la compra lo incluye.
  --    Es la misma regla que cuando el cliente cancela su compra (compras.service.ts → cancelar).
  update compras
     set estado = 'cancelada',
         credito_otorgado = pagado_tarjeta + pagado_credito
   where funcion_id = p_funcion_id and estado = 'activa';
  get diagnostics canceladas = row_count;

  -- 3) Se liberan las butacas y se descarta la lista de espera de esta función
  delete from entradas where funcion_id = p_funcion_id;
  delete from lista_espera where funcion_id = p_funcion_id;

  -- Si cualquier paso falla, Postgres deshace los anteriores: nadie queda a medias.
  return canceladas;
end;
$$;

-- Solo usuarios logueados pueden llamarla (y adentro se controla que sean admin o tengan el rol)
revoke execute on function public.cancelar_funcion(bigint) from public, anon;
grant execute on function public.cancelar_funcion(bigint) to authenticated;

-- En una función cancelada no se puede comprar (se suma a la regla del turno de lista de espera)
drop policy "entradas: crear si no hay turno ajeno" on public.entradas;
create policy "entradas: crear si no hay turno ajeno" on public.entradas for insert to anon, authenticated
  with check (
    not exists (
      select 1 from public.lista_espera le
      where le.funcion_id = entradas.funcion_id
        and le.estado = 'avisado'
        and le.avisado_at > now() - interval '15 minutes'
        and le.usuario_id is distinct from auth.uid()
    )
    and not exists (
      select 1 from public.funciones f where f.id = entradas.funcion_id and f.cancelada
    )
  );
