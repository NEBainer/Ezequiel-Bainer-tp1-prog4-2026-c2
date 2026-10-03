-- Modelo de datos del cine: catálogo, funciones, compras, candy, fidelización, reseñas, alertas y log.
-- Roles: el rol está en app_metadata (lo asigna el admin desde el dashboard) y viaja en el JWT.
--   admin    -> (auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin'
--   empleado -> (auth.jwt() -> 'app_metadata' ->> 'rol') = 'empleado'
-- Sin rol = cliente.

-- =========================================================
-- Catálogo
-- =========================================================

create table public.generos (
  id bigint generated always as identity primary key,
  nombre text not null unique
);

create table public.peliculas (
  id bigint generated always as identity primary key,
  nombre text not null,
  sinopsis text not null,
  duracion integer not null check (duracion > 0),          -- en minutos
  imagen text,                                              -- ruta en Storage (bucket "imagenes"), no la URL
  edad_minima integer check (edad_minima in (13, 18)),      -- null = apta todo público
  fecha_estreno date not null,
  precio_preventa numeric,                                  -- null = sin preventa
  en_cartelera boolean not null default true,               -- el admin elige qué se muestra
  created_at timestamptz not null default now()
);

-- Una película puede tener varios géneros (muchos a muchos)
create table public.pelicula_generos (
  pelicula_id bigint not null references public.peliculas (id) on delete cascade,
  genero_id bigint not null references public.generos (id) on delete cascade,
  primary key (pelicula_id, genero_id)
);

create table public.salas (
  id bigint generated always as identity primary key,
  nombre text not null unique
);

-- "fin" = inicio + duración. Se guarda para poder chequear solapamientos fácil.
create table public.funciones (
  id bigint generated always as identity primary key,
  pelicula_id bigint not null references public.peliculas (id) on delete cascade,
  sala_id bigint not null references public.salas (id),
  inicio timestamptz not null,
  fin timestamptz not null,
  formato text not null check (formato in ('2D', '3D', '4D', '5D')),
  idioma text not null check (idioma in ('Castellano', 'Subtitulada')),
  created_at timestamptz not null default now(),
  unique (sala_id, inicio)
);

-- Una sola fila con los valores que el admin configura
create table public.configuracion (
  id integer primary key default 1 check (id = 1),
  precio_entrada numeric not null,
  precio_vip numeric not null,
  porcentaje_primera_compra integer not null,
  puntos_entrada integer not null           -- cuántos puntos cuesta una entrada gratis
);

create table public.cupones (
  id bigint generated always as identity primary key,
  nombre text not null,
  porcentaje integer not null check (porcentaje between 1 and 100),
  solo_mayores_50 boolean not null default true,
  activo boolean not null default true
);

-- =========================================================
-- Candy bar
-- =========================================================

create table public.categorias (
  id bigint generated always as identity primary key,
  nombre text not null unique
);

create table public.productos (
  id bigint generated always as identity primary key,
  nombre text not null,
  precio numeric not null,
  categoria_id bigint not null references public.categorias (id),
  puntos integer,                            -- costo en puntos para canjearlo (null = no canjeable)
  activo boolean not null default true
);

create table public.combos (
  id bigint generated always as identity primary key,
  nombre text not null,
  descripcion text not null,                 -- qué incluye (entrada + pochoclos + bebida)
  precio numeric not null,
  activo boolean not null default true
);

-- =========================================================
-- Compras
-- =========================================================

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,               -- el código del QR (también se puede tipear)
  usuario_id uuid references auth.users (id) on delete set null,   -- null = compra anónima
  funcion_id bigint not null references public.funciones (id),
  pelicula_id bigint not null references public.peliculas (id),
  cantidad_entradas integer not null,
  subtotal numeric not null,
  descuento numeric not null default 0,
  cupon text,
  total numeric not null,
  pagado_credito numeric not null default 0,
  pagado_puntos integer not null default 0,
  pagado_tarjeta numeric not null default 0,
  puntos_ganados integer not null default 0,
  estado text not null default 'activa' check (estado in ('activa', 'cancelada')),
  credito_otorgado numeric not null default 0,
  entrada_validada boolean not null default false,
  candy_validado boolean,                    -- null = la compra no tiene candy
  requiere_adulto boolean not null default false,
  created_at timestamptz not null default now()
);

-- Una fila por butaca vendida. El UNIQUE impide que dos compras se queden con la misma butaca.
-- Se insertan ANTES que la compra: si alguien ganó la butaca, el insert falla y no se crea la compra.
create table public.entradas (
  id bigint generated always as identity primary key,
  compra_id uuid not null,
  funcion_id bigint not null references public.funciones (id) on delete cascade,
  pelicula_id bigint not null references public.peliculas (id) on delete cascade,
  fila text not null,
  numero integer not null,
  tipo text not null check (tipo in ('comun', 'accesible', 'vip')),
  precio numeric not null,
  created_at timestamptz not null default now(),
  unique (funcion_id, fila, numero)
);

create table public.compra_items (
  id bigint generated always as identity primary key,
  compra_id uuid not null references public.compras (id) on delete cascade,
  producto_id bigint references public.productos (id) on delete set null,
  combo_id bigint references public.combos (id) on delete set null,
  nombre text not null,
  cantidad integer not null,
  precio_unitario numeric not null,
  canjeado_puntos boolean not null default false
);

-- Historial de canjes de puntos
create table public.canjes (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  compra_id uuid not null references public.compras (id) on delete cascade,
  descripcion text not null,
  puntos integer not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Reseñas, alertas, push y log
-- =========================================================

create table public.resenas (
  id bigint generated always as identity primary key,
  pelicula_id bigint not null references public.peliculas (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  autor text not null,
  estrellas integer not null check (estrellas between 1 and 5),
  comentario text not null check (char_length(comentario) <= 280),
  created_at timestamptz not null default now(),
  unique (pelicula_id, usuario_id)
);

create table public.alertas (
  id bigint generated always as identity primary key,
  pelicula_id bigint not null references public.peliculas (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (pelicula_id, usuario_id)
);

create table public.suscripciones_push (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  auth text not null,
  p256dh text not null unique
);

create table public.log_actividad (
  id bigint generated always as identity primary key,
  usuario_id uuid references auth.users (id) on delete set null,
  email text not null,
  accion text not null,
  detalle text not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- RLS
-- =========================================================

alter table public.generos enable row level security;
alter table public.peliculas enable row level security;
alter table public.pelicula_generos enable row level security;
alter table public.salas enable row level security;
alter table public.funciones enable row level security;
alter table public.configuracion enable row level security;
alter table public.cupones enable row level security;
alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.combos enable row level security;
alter table public.compras enable row level security;
alter table public.entradas enable row level security;
alter table public.compra_items enable row level security;
alter table public.canjes enable row level security;
alter table public.resenas enable row level security;
alter table public.alertas enable row level security;
alter table public.suscripciones_push enable row level security;
alter table public.log_actividad enable row level security;

-- Tablas de catálogo: todos leen, solo el admin escribe.
create policy "generos: todos leen" on public.generos for select to anon, authenticated using (true);
create policy "generos: admin escribe" on public.generos for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

create policy "peliculas: todos leen" on public.peliculas for select to anon, authenticated using (true);
create policy "peliculas: admin escribe" on public.peliculas for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

create policy "pelicula_generos: todos leen" on public.pelicula_generos for select to anon, authenticated using (true);
create policy "pelicula_generos: admin escribe" on public.pelicula_generos for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

create policy "salas: todos leen" on public.salas for select to anon, authenticated using (true);
create policy "salas: admin escribe" on public.salas for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

create policy "funciones: todos leen" on public.funciones for select to anon, authenticated using (true);
create policy "funciones: admin escribe" on public.funciones for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

create policy "configuracion: todos leen" on public.configuracion for select to anon, authenticated using (true);
create policy "configuracion: admin modifica" on public.configuracion for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

create policy "cupones: todos leen" on public.cupones for select to anon, authenticated using (true);
create policy "cupones: admin escribe" on public.cupones for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

create policy "categorias: todos leen" on public.categorias for select to anon, authenticated using (true);
create policy "categorias: admin escribe" on public.categorias for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

create policy "productos: todos leen" on public.productos for select to anon, authenticated using (true);
create policy "productos: admin escribe" on public.productos for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

create policy "combos: todos leen" on public.combos for select to anon, authenticated using (true);
create policy "combos: admin escribe" on public.combos for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

-- Compras: el anónimo crea compras sin usuario; el registrado, solo a su nombre.
create policy "compras: anonimo crea" on public.compras for insert to anon
  with check (usuario_id is null);
create policy "compras: registrado crea la propia" on public.compras for insert to authenticated
  with check (usuario_id = auth.uid());
create policy "compras: leer las propias" on public.compras for select to authenticated
  using (usuario_id = auth.uid());
create policy "compras: cancelar las propias" on public.compras for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "compras: staff lee todas" on public.compras for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') in ('admin', 'empleado'));
create policy "compras: staff valida" on public.compras for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') in ('admin', 'empleado'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') in ('admin', 'empleado'));

-- Entradas: todos ven qué butacas están ocupadas (no tienen datos personales).
create policy "entradas: todos leen" on public.entradas for select to anon, authenticated using (true);
create policy "entradas: todos crean" on public.entradas for insert to anon, authenticated with check (true);
create policy "entradas: liberar las de una compra propia" on public.entradas for delete to authenticated
  using (exists (select 1 from public.compras c where c.id = compra_id and c.usuario_id = auth.uid()));

create policy "compra_items: anonimo crea" on public.compra_items for insert to anon
  with check (exists (select 1 from public.compras c where c.id = compra_id and c.usuario_id is null));
create policy "compra_items: registrado crea" on public.compra_items for insert to authenticated
  with check (exists (select 1 from public.compras c where c.id = compra_id and c.usuario_id = auth.uid()));
create policy "compra_items: leer los propios" on public.compra_items for select to authenticated
  using (exists (select 1 from public.compras c where c.id = compra_id and c.usuario_id = auth.uid()));
create policy "compra_items: staff lee" on public.compra_items for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') in ('admin', 'empleado'));

create policy "canjes: crear los propios" on public.canjes for insert to authenticated
  with check (usuario_id = auth.uid());
create policy "canjes: leer los propios" on public.canjes for select to authenticated
  using (usuario_id = auth.uid());

create policy "resenas: todos leen" on public.resenas for select to anon, authenticated using (true);
create policy "resenas: crear la propia" on public.resenas for insert to authenticated
  with check (usuario_id = auth.uid());
create policy "resenas: modificar la propia" on public.resenas for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "resenas: borrar la propia" on public.resenas for delete to authenticated
  using (usuario_id = auth.uid());

create policy "alertas: las propias" on public.alertas for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create policy "suscripciones_push: las propias" on public.suscripciones_push for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create policy "log: staff registra" on public.log_actividad for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'rol') in ('admin', 'empleado')
  );
create policy "log: admin lee" on public.log_actividad for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

-- =========================================================
-- Realtime: el mapa de butacas escucha los cambios de "entradas"
-- =========================================================
alter publication supabase_realtime add table public.entradas;

-- =========================================================
-- Storage: bucket público para pósters (solo el admin sube)
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagenes', 'imagenes', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']);

create policy "imagenes: admin sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'imagenes' and (auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');
create policy "imagenes: admin modifica" on storage.objects for update to authenticated
  using (bucket_id = 'imagenes' and (auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');
create policy "imagenes: admin borra" on storage.objects for delete to authenticated
  using (bucket_id = 'imagenes' and (auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

-- Ajuste: un usuario logueado también puede elegir comprar como anónimo (usuario_id null)
drop policy "compras: anonimo crea" on public.compras;
create policy "compras: anonimo crea" on public.compras for insert to anon, authenticated
  with check (usuario_id is null);

drop policy "compra_items: anonimo crea" on public.compra_items;
create policy "compra_items: anonimo crea" on public.compra_items for insert to anon, authenticated
  with check (exists (select 1 from public.compras c where c.id = compra_id and c.usuario_id is null));
