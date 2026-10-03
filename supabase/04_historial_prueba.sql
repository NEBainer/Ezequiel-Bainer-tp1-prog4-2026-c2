-- Historial de prueba: dos funciones pasadas que la clienta de prueba ya vio
-- (para "Mis películas", los puntos acumulados y los reportes de días anteriores).

with nuevas as (
  insert into public.funciones (pelicula_id, sala_id, inicio, fin, formato, idioma)
  select p.id, 1, v.inicio, v.inicio + make_interval(mins => p.duracion), v.formato, 'Castellano'
  from (values
    ('El Último Tranvía a Bernal', ((current_date - 6) + time '20:00') at time zone 'America/Argentina/Buenos_Aires', '2D'),
    ('Órbita Baja', ((current_date - 2) + time '20:00') at time zone 'America/Argentina/Buenos_Aires', '3D')
  ) v(nombre, inicio, formato)
  join public.peliculas p on p.nombre = v.nombre
  returning id, pelicula_id, inicio
),
compras_nuevas as (
  insert into public.compras (codigo, usuario_id, funcion_id, pelicula_id, cantidad_entradas, subtotal, descuento,
                              total, pagado_tarjeta, puntos_ganados, entrada_validada, candy_validado, created_at)
  select case when n.inicio < now() - interval '4 days' then 'HIST2X7A' else 'HIST9K4B' end,
         u.id, n.id, n.pelicula_id, 2, 12000, 0, 12000, 12000, 12000, true, null, n.inicio - interval '1 day'
  from nuevas n cross join auth.users u
  where u.email = 'cliente@fotograma.com.ar'
  returning id, funcion_id, pelicula_id
)
insert into public.entradas (compra_id, funcion_id, pelicula_id, fila, numero, tipo, precio)
select c.id, c.funcion_id, c.pelicula_id, 'H', n, 'comun', 6000
from compras_nuevas c cross join (values (14), (15)) as butacas(n);

-- Reseña de una de las dos (la otra queda para que la califique en la demo)
insert into public.resenas (pelicula_id, usuario_id, autor, estrellas, comentario)
select p.id, u.id, 'Clara E.', 4, 'Me reí de principio a fin. El conductor es un personaje inolvidable.'
from public.peliculas p cross join auth.users u
where p.nombre = 'El Último Tranvía a Bernal' and u.email = 'cliente@fotograma.com.ar';
