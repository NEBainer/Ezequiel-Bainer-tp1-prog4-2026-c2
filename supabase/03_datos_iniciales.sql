-- Datos iniciales para probar la aplicación (películas ficticias).

insert into public.configuracion (id, precio_entrada, precio_vip, porcentaje_primera_compra, puntos_entrada)
values (1, 6000, 9000, 20, 500);

insert into public.salas (nombre) values ('Sala 1'), ('Sala 2'), ('Sala 3'), ('Sala 4');

insert into public.generos (nombre) values
  ('Drama'), ('Comedia'), ('Ciencia ficción'), ('Terror'), ('Aventura'),
  ('Animación'), ('Suspenso'), ('Romance'), ('Documental');

insert into public.peliculas (nombre, sinopsis, duracion, edad_minima, fecha_estreno, precio_preventa) values
  ('La Marea de Cobre', 'Una familia de pescadores del sur enfrenta la llegada de una minera que promete trabajo y amenaza todo lo que conocen.', 118, 13, current_date - 20, null),
  ('Órbita Baja', 'La tripulación de una estación de reciclaje espacial descubre que la basura que recogen no es humana.', 132, null, current_date - 12, null),
  ('El Último Tranvía a Bernal', 'Un conductor a punto de jubilarse y una pasajera insoportable comparten el viaje más largo de sus vidas.', 96, null, current_date - 30, null),
  ('Ceniza Blanca', 'En un pueblo cubierto por la ceniza de un volcán, los vecinos empiezan a desaparecer cada vez que deja de nevar.', 104, 18, current_date - 8, null),
  ('Pampa Salvaje', 'Un carpincho curioso y un hornero gruñón cruzan la llanura para salvar la laguna donde nacieron.', 88, null, current_date - 15, null),
  ('Contraluz', 'Una fotógrafa forense encuentra en sus negativos a una persona que no estaba en la escena del crimen.', 121, 13, current_date - 5, null),
  ('Los Relojeros del Sur', 'Dos hermanos heredan una relojería en Ushuaia y un reloj que adelanta exactamente un día.', 110, null, current_date + 5, 4500),
  ('Nebulosa 9', 'Una astrónoma aficionada recibe una señal que solo ella puede escuchar.', 125, 13, current_date + 20, 5000);

insert into public.pelicula_generos (pelicula_id, genero_id)
select p.id, g.id from public.peliculas p join public.generos g on
  (p.nombre = 'La Marea de Cobre' and g.nombre in ('Drama')) or
  (p.nombre = 'Órbita Baja' and g.nombre in ('Ciencia ficción', 'Aventura', 'Suspenso')) or
  (p.nombre = 'El Último Tranvía a Bernal' and g.nombre in ('Comedia', 'Drama')) or
  (p.nombre = 'Ceniza Blanca' and g.nombre in ('Terror', 'Suspenso')) or
  (p.nombre = 'Pampa Salvaje' and g.nombre in ('Animación', 'Aventura', 'Comedia')) or
  (p.nombre = 'Contraluz' and g.nombre in ('Suspenso', 'Drama')) or
  (p.nombre = 'Los Relojeros del Sur' and g.nombre in ('Drama', 'Romance')) or
  (p.nombre = 'Nebulosa 9' and g.nombre in ('Ciencia ficción', 'Drama'));

-- Funciones de los próximos 8 días: 4 horarios por sala separados 3 h
-- (la película más larga dura 132 min + 30 min de limpieza = 162 min, así que nunca se pisan).
insert into public.funciones (pelicula_id, sala_id, inicio, fin, formato, idioma)
select
  p.id,
  s.id,
  ((current_date + d) + h) at time zone 'America/Argentina/Buenos_Aires',
  ((current_date + d) + h) at time zone 'America/Argentina/Buenos_Aires' + make_interval(mins => p.duracion),
  (array['2D', '3D', '2D', '4D'])[1 + ((s.id + d) % 4)],
  (array['Castellano', 'Subtitulada'])[1 + ((s.id + extract(hour from h)::int) % 2)]
from generate_series(0, 7) d
cross join (values (time '14:00'), (time '17:00'), (time '20:00'), (time '23:00')) as horarios(h)
cross join public.salas s
join lateral (
  -- rota las películas ya estrenadas ese día ("Los Relojeros del Sur" entra desde su estreno;
  -- "Nebulosa 9" todavía no tiene funciones)
  select id, duracion from public.peliculas
  where fecha_estreno <= current_date + d and nombre <> 'Nebulosa 9'
  order by id
  offset ((s.id * 4 + extract(hour from h)::int / 3 + d)
          % (select count(*) from public.peliculas where fecha_estreno <= current_date + d and nombre <> 'Nebulosa 9'))
  limit 1
) p on true;

insert into public.cupones (nombre, porcentaje, solo_mayores_50) values ('Mayores de 50', 15, true);

insert into public.categorias (nombre) values ('Pochoclos'), ('Bebidas'), ('Snacks');

insert into public.productos (nombre, precio, categoria_id, puntos)
select v.nombre, v.precio, c.id, v.puntos from (values
  ('Pochoclo chico', 3500, 'Pochoclos', 100),
  ('Pochoclo grande', 5500, 'Pochoclos', 150),
  ('Pochoclo acaramelado', 6000, 'Pochoclos', null),
  ('Gaseosa 500 ml', 2800, 'Bebidas', 80),
  ('Agua saborizada', 2200, 'Bebidas', 60),
  ('Nachos con cheddar', 4800, 'Snacks', 140),
  ('Alfajor de maicena', 1500, 'Snacks', 40)
) as v(nombre, precio, categoria, puntos)
join public.categorias c on c.nombre = v.categoria;

insert into public.combos (nombre, descripcion, precio) values
  ('Combo Clásico', 'Entrada + pochoclo chico + gaseosa 500 ml', 10500),
  ('Combo Fotograma', 'Entrada + pochoclo grande + gaseosa 500 ml + alfajor', 12900);
