-- Datos de prueba para los puntos del recuperatorio (R-43 a R-50).
-- Se puede volver a ejecutar: borra lo que cargó antes y crea todo de nuevo con fechas
-- relativas al día en que se corre (la función agotada queda a 2 días y la que se cancela a 3).
--
-- Escenarios:
--   1) Función AGOTADA de "Contraluz" (Sala 4, 11:00): 518 butacas vendidas. Clara y Carla
--      están en la lista de espera. Si Bruno cancela su compra (2 butacas), se le avisa a Clara.
--   2) Función de "Pampa Salvaje" (Sala 4, 11:00) con compras de Clara (con candy), Bruno y
--      Carla (pagó una parte con crédito), para que el admin la cancele.
--   3) Propuestas pendientes de Bruno y Carla. Clara queda libre para proponer en el momento.
--   4) Rol "Contador" (solo reportes) asignado al usuario contador@fotograma.com.ar.
-- Todos los usuarios nuevos usan la contraseña Fotograma2026.

-- =========================================================
-- Usuarios de prueba extra (si no existen)
-- =========================================================
do $$
declare
  u record;
  nuevo uuid;
begin
  for u in
    select * from (values
      ('bruno@fotograma.com.ar', 'Bruno', 'Ríos', date '1990-07-21', 'A+', 'Marrones', 14),
      ('carla@fotograma.com.ar', 'Carla', 'Méndez', date '2001-03-09', 'O-', 'Verdes', 10),
      ('contador@fotograma.com.ar', 'Celia', 'Paz', date '1979-11-02', 'B+', 'Celestes', 21)
    ) v(email, nombre, apellido, nacimiento, sangre, ojos, vacaciones)
  loop
    if not exists (select 1 from auth.users where email = u.email) then
      nuevo := gen_random_uuid();
      -- Los campos de tokens van en '' (no null): Supabase Auth no acepta null ahí
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                              raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                              confirmation_token, recovery_token, email_change_token_new, email_change)
      values ('00000000-0000-0000-0000-000000000000', nuevo, 'authenticated', 'authenticated', u.email,
              extensions.crypt('Fotograma2026', extensions.gen_salt('bf')), now(),
              '{"provider": "email", "providers": ["email"]}', '{}', now(), now(), '', '', '', '');
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), nuevo, nuevo::text,
              jsonb_build_object('sub', nuevo::text, 'email', u.email, 'email_verified', true),
              'email', now(), now(), now());
      insert into public.usuarios (id, nombre, apellido, fecha_nacimiento, tipo_sangre, color_ojos, dias_vacaciones)
      values (nuevo, u.nombre, u.apellido, u.nacimiento, u.sangre, u.ojos, u.vacaciones);
    end if;
  end loop;
end $$;

-- =========================================================
-- Limpieza de una ejecución anterior
-- =========================================================
delete from public.entradas where compra_id in (select id from public.compras where codigo like 'DEMO%');
delete from public.compras where codigo like 'DEMO%';   -- compra_items se borra en cascada
delete from public.funciones                             -- lista_espera se borra en cascada
where sala_id = (select id from public.salas where nombre = 'Sala 4')
  and (inicio at time zone 'America/Argentina/Buenos_Aires')::time = time '11:00';
delete from public.propuestas
where estado = 'pendiente'
  and usuario_id in (select id from auth.users where email in ('bruno@fotograma.com.ar', 'carla@fotograma.com.ar'));

-- =========================================================
-- Funciones de la demo: 11:00 en la Sala 4 (las del 03 empiezan a las 14:00, no se pisan)
-- =========================================================
insert into public.funciones (pelicula_id, sala_id, inicio, fin, formato, idioma)
select p.id, s.id, v.inicio, v.inicio + make_interval(mins => p.duracion), v.formato, 'Castellano'
from (values
  ('Contraluz', ((current_date + 2) + time '11:00') at time zone 'America/Argentina/Buenos_Aires', '2D'),
  ('Pampa Salvaje', ((current_date + 3) + time '11:00') at time zone 'America/Argentina/Buenos_Aires', '3D')
) v(nombre, inicio, formato)
join public.peliculas p on p.nombre = v.nombre
cross join public.salas s
where s.nombre = 'Sala 4';

-- =========================================================
-- 1) Función agotada
-- =========================================================
-- Todas las butacas de la sala (misma distribución que plano-sala.ts: 18 filas de 28 y la J de 14)
drop table if exists butacas_sala;
create temp table butacas_sala as
select f.fila, n.numero,
       case when f.fila = 'J' then 'accesible' when f.fila in ('R', 'S', 'T') then 'vip' else 'comun' end as tipo
from unnest(array['A','B','C','D','E','F','G','H','I','J','L','M','N','O','P','Q','R','S','T']) as f(fila)
cross join lateral generate_series(1, case when f.fila = 'J' then 14 else 28 end) as n(numero);

-- Compra de Bruno (H14 y H15): es la que se cancela para liberar butacas
insert into public.compras (codigo, usuario_id, funcion_id, pelicula_id, cantidad_entradas, subtotal, total,
                            pagado_tarjeta, puntos_ganados, created_at)
select 'DEMOAG01', u.id, f.id, f.pelicula_id, 2, 12000, 12000, 12000, 12000, now() - interval '1 day'
from public.funciones f join public.peliculas p on p.id = f.pelicula_id
cross join auth.users u
where p.nombre = 'Contraluz' and u.email = 'bruno@fotograma.com.ar'
  and (f.inicio at time zone 'America/Argentina/Buenos_Aires') = (current_date + 2) + time '11:00';

-- El resto de la sala, vendido en boletería (compra anónima)
insert into public.compras (codigo, usuario_id, funcion_id, pelicula_id, cantidad_entradas, subtotal, total,
                            pagado_tarjeta, created_at)
select 'DEMOAG02', null, c.funcion_id, c.pelicula_id, 516, t.total, t.total, t.total, now() - interval '1 day'
from public.compras c
cross join (
  select sum(case tipo when 'vip' then 9000 else 6000 end) as total
  from butacas_sala where not (fila = 'H' and numero in (14, 15))
) t
where c.codigo = 'DEMOAG01';

insert into public.entradas (compra_id, funcion_id, pelicula_id, fila, numero, tipo, precio)
select c.id, c.funcion_id, c.pelicula_id, b.fila, b.numero, b.tipo,
       case b.tipo when 'vip' then 9000 else 6000 end
from public.compras c
join butacas_sala b
  on (c.codigo = 'DEMOAG01' and b.fila = 'H' and b.numero in (14, 15))
  or (c.codigo = 'DEMOAG02' and not (b.fila = 'H' and b.numero in (14, 15)))
where c.codigo in ('DEMOAG01', 'DEMOAG02');

-- Lista de espera: Clara primera, Carla segunda
insert into public.lista_espera (funcion_id, usuario_id, estado, created_at)
select c.funcion_id, u.id, 'esperando', now() - v.hace
from public.compras c
cross join (values ('cliente@fotograma.com.ar', interval '2 hours'),
                   ('carla@fotograma.com.ar', interval '1 hour')) v(email, hace)
join auth.users u on u.email = v.email
where c.codigo = 'DEMOAG01';

-- =========================================================
-- 2) Función para que la cancele el cine
-- =========================================================
insert into public.compras (codigo, usuario_id, funcion_id, pelicula_id, cantidad_entradas, subtotal, total,
                            pagado_credito, pagado_tarjeta, puntos_ganados, candy_validado, created_at)
select v.codigo, u.id, f.id, f.pelicula_id, v.cantidad, v.total, v.total, v.credito, v.total - v.credito,
       v.total - v.credito, v.candy, now() - interval '2 days'
from (values
  ('DEMOCA01', 'cliente@fotograma.com.ar', 2, 23100, 0, false),  -- 2 entradas + candy (11100)
  ('DEMOCA02', 'bruno@fotograma.com.ar', 3, 27000, 0, null),     -- 3 VIP
  ('DEMOCA03', 'carla@fotograma.com.ar', 1, 6000, 3000, null)    -- mitad con crédito
) v(codigo, email, cantidad, total, credito, candy)
join auth.users u on u.email = v.email
cross join public.funciones f join public.peliculas p on p.id = f.pelicula_id
where p.nombre = 'Pampa Salvaje'
  and (f.inicio at time zone 'America/Argentina/Buenos_Aires') = (current_date + 3) + time '11:00';

insert into public.entradas (compra_id, funcion_id, pelicula_id, fila, numero, tipo, precio)
select c.id, c.funcion_id, c.pelicula_id, v.fila, v.numero, v.tipo, v.precio
from (values
  ('DEMOCA01', 'F', 13, 'comun', 6000), ('DEMOCA01', 'F', 14, 'comun', 6000),
  ('DEMOCA02', 'R', 12, 'vip', 9000), ('DEMOCA02', 'R', 13, 'vip', 9000), ('DEMOCA02', 'R', 14, 'vip', 9000),
  ('DEMOCA03', 'G', 20, 'comun', 6000)
) v(codigo, fila, numero, tipo, precio)
join public.compras c on c.codigo = v.codigo;

insert into public.compra_items (compra_id, producto_id, nombre, cantidad, precio_unitario)
select c.id, pr.id, pr.nombre, v.cantidad, pr.precio
from (values ('Pochoclo grande', 1), ('Gaseosa 500 ml', 2)) v(nombre, cantidad)
join public.productos pr on pr.nombre = v.nombre
cross join public.compras c
where c.codigo = 'DEMOCA01';

-- =========================================================
-- 3) Propuestas pendientes
-- =========================================================
insert into public.propuestas (usuario_id, titulo, descripcion, motivo, created_at)
select u.id, v.titulo, v.descripcion, v.motivo, now() - v.hace
from (values
  ('bruno@fotograma.com.ar', 'Faro del Fin del Mundo',
   'Un guardafaros de Tierra del Fuego recibe a un náufrago que asegura venir del año 1902.',
   'Se estrenó en festivales y nunca llegó a las salas comerciales. Muchos la queremos ver en pantalla grande.',
   interval '3 days'),
  ('carla@fotograma.com.ar', 'Las Chicas del Tango Eléctrico',
   'Una banda de cumbia y tango formada por cuatro abuelas sale de gira por la costa atlántica.',
   'Es una comedia ideal para ir en familia y en cartelera hoy casi no hay opciones así.',
   interval '1 day')
) v(email, titulo, descripcion, motivo, hace)
join auth.users u on u.email = v.email;

-- =========================================================
-- 4) Rol configurable asignado
-- =========================================================
insert into public.roles (nombre, secciones) values ('Contador', array['reportes'])
on conflict (nombre) do nothing;

insert into public.usuario_roles (usuario_id, rol_id)
select u.id, r.id from auth.users u cross join public.roles r
where u.email = 'contador@fotograma.com.ar' and r.nombre = 'Contador'
on conflict do nothing;

drop table butacas_sala;
