-- Roles configurables (R-45): el admin crea roles que habilitan ciertas secciones del panel
-- (ej.: "Contador" -> solo reportes) y se los asigna a usuarios.
-- 'admin' y 'empleado' siguen en app_metadata; estos roles se SUMAN a los permisos de cualquier usuario.

create table public.roles (
  id bigint generated always as identity primary key,
  nombre text not null unique check (char_length(nombre) <= 60),
  -- Secciones del panel que habilita. Solo se aceptan las que existen.
  secciones text[] not null default '{}' check (
    secciones <@ array['reportes', 'peliculas', 'propuestas', 'funciones', 'salas', 'candy', 'precios', 'log']
  ),
  created_at timestamptz not null default now()
);

-- Asignación en tabla aparte (no una columna en "usuarios"): así el usuario no puede
-- darse permisos a sí mismo editando su propio perfil.
create table public.usuario_roles (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  rol_id bigint not null references public.roles (id) on delete cascade,
  primary key (usuario_id, rol_id)
);

alter table public.roles enable row level security;
alter table public.usuario_roles enable row level security;

-- Solo el admin crea, modifica y borra roles y asignaciones
create policy "roles: admin escribe" on public.roles for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');
create policy "usuario_roles: admin escribe" on public.usuario_roles for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');

-- Cada usuario ve sus asignaciones; los roles (nombre + secciones) los puede leer cualquier logueado.
-- Las dos lecturas hacen falta para que funcionen los "exists" de abajo.
create policy "roles: logueados leen" on public.roles for select to authenticated using (true);
create policy "usuario_roles: leer las propias" on public.usuario_roles for select to authenticated
  using (usuario_id = auth.uid());

-- =========================================================
-- Permisos por sección. Todas usan la misma pregunta:
-- "¿el usuario logueado tiene algún rol que incluya esta sección?"
-- Son políticas NUEVAS: las del admin quedan como estaban (las políticas se suman con OR).
-- =========================================================

-- Reportes: leer las compras y sus ítems (facturación, entradas, candy)
create policy "compras: rol reportes lee" on public.compras for select to authenticated
  using (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                 where ur.usuario_id = auth.uid() and 'reportes' = any (r.secciones)));
create policy "compra_items: rol reportes lee" on public.compra_items for select to authenticated
  using (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                 where ur.usuario_id = auth.uid() and 'reportes' = any (r.secciones)));

-- Películas: películas, sus géneros y los pósters en Storage
create policy "peliculas: rol peliculas escribe" on public.peliculas for all to authenticated
  using (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                 where ur.usuario_id = auth.uid() and 'peliculas' = any (r.secciones)))
  with check (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                      where ur.usuario_id = auth.uid() and 'peliculas' = any (r.secciones)));
create policy "pelicula_generos: rol peliculas escribe" on public.pelicula_generos for all to authenticated
  using (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                 where ur.usuario_id = auth.uid() and 'peliculas' = any (r.secciones)))
  with check (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                      where ur.usuario_id = auth.uid() and 'peliculas' = any (r.secciones)));
create policy "imagenes: rol peliculas sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'imagenes' and exists (
    select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = auth.uid() and 'peliculas' = any (r.secciones)));
create policy "imagenes: rol peliculas modifica" on storage.objects for update to authenticated
  using (bucket_id = 'imagenes' and exists (
    select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = auth.uid() and 'peliculas' = any (r.secciones)));
create policy "imagenes: rol peliculas borra" on storage.objects for delete to authenticated
  using (bucket_id = 'imagenes' and exists (
    select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = auth.uid() and 'peliculas' = any (r.secciones)));

-- Propuestas: ver todas y aceptarlas/rechazarlas
create policy "propuestas: rol propuestas lee" on public.propuestas for select to authenticated
  using (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                 where ur.usuario_id = auth.uid() and 'propuestas' = any (r.secciones)));
create policy "propuestas: rol propuestas modifica" on public.propuestas for update to authenticated
  using (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                 where ur.usuario_id = auth.uid() and 'propuestas' = any (r.secciones)))
  with check (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                      where ur.usuario_id = auth.uid() and 'propuestas' = any (r.secciones)));

-- Funciones
create policy "funciones: rol funciones escribe" on public.funciones for all to authenticated
  using (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                 where ur.usuario_id = auth.uid() and 'funciones' = any (r.secciones)))
  with check (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                      where ur.usuario_id = auth.uid() and 'funciones' = any (r.secciones)));

-- Salas
create policy "salas: rol salas escribe" on public.salas for all to authenticated
  using (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                 where ur.usuario_id = auth.uid() and 'salas' = any (r.secciones)))
  with check (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                      where ur.usuario_id = auth.uid() and 'salas' = any (r.secciones)));

-- Candy: categorías, productos y combos
create policy "categorias: rol candy escribe" on public.categorias for all to authenticated
  using (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                 where ur.usuario_id = auth.uid() and 'candy' = any (r.secciones)))
  with check (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                      where ur.usuario_id = auth.uid() and 'candy' = any (r.secciones)));
create policy "productos: rol candy escribe" on public.productos for all to authenticated
  using (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                 where ur.usuario_id = auth.uid() and 'candy' = any (r.secciones)))
  with check (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                      where ur.usuario_id = auth.uid() and 'candy' = any (r.secciones)));
create policy "combos: rol candy escribe" on public.combos for all to authenticated
  using (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                 where ur.usuario_id = auth.uid() and 'candy' = any (r.secciones)))
  with check (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                      where ur.usuario_id = auth.uid() and 'candy' = any (r.secciones)));

-- Precios: configuración general (solo update, como el admin) y cupones
create policy "configuracion: rol precios modifica" on public.configuracion for update to authenticated
  using (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                 where ur.usuario_id = auth.uid() and 'precios' = any (r.secciones)))
  with check (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                      where ur.usuario_id = auth.uid() and 'precios' = any (r.secciones)));
create policy "cupones: rol precios escribe" on public.cupones for all to authenticated
  using (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                 where ur.usuario_id = auth.uid() and 'precios' = any (r.secciones)))
  with check (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                      where ur.usuario_id = auth.uid() and 'precios' = any (r.secciones)));

-- Log: leerlo es una sección; registrar lo que hace lo puede cualquiera con algún rol
create policy "log: rol log lee" on public.log_actividad for select to authenticated
  using (exists (select 1 from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
                 where ur.usuario_id = auth.uid() and 'log' = any (r.secciones)));
create policy "log: con rol registra" on public.log_actividad for insert to authenticated
  with check (usuario_id = auth.uid()
              and exists (select 1 from public.usuario_roles ur where ur.usuario_id = auth.uid()));
