-- Propuestas de películas: los clientes proponen películas que no están en cartelera
-- y el admin las acepta (abre el alta precargada) o las rechaza.

create table public.propuestas (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null check (char_length(titulo) <= 120),
  descripcion text not null check (char_length(descripcion) <= 600),
  motivo text not null check (char_length(motivo) <= 600),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada')),
  created_at timestamptz not null default now()
);

-- "Una propuesta a la vez": UNIQUE por usuario, pero solo entre las pendientes.
-- Cuando el admin la acepta o rechaza deja de contar y el cliente puede proponer otra.
create unique index propuestas_una_pendiente_por_usuario
  on public.propuestas (usuario_id) where estado = 'pendiente';

alter table public.propuestas enable row level security;

-- El cliente crea las suyas, siempre como pendientes (no puede auto-aceptarse)
create policy "propuestas: crear la propia" on public.propuestas for insert to authenticated
  with check (usuario_id = auth.uid() and estado = 'pendiente');
create policy "propuestas: leer las propias" on public.propuestas for select to authenticated
  using (usuario_id = auth.uid());

-- El admin ve todas y cambia el estado
create policy "propuestas: admin lee" on public.propuestas for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');
create policy "propuestas: admin modifica" on public.propuestas for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');
