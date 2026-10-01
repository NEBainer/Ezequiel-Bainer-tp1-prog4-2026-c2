-- Tabla de perfil de usuario (datos del registro).
-- El id es el mismo que el de auth.users: un perfil por cuenta.
-- El rol NO se guarda acá: va en app_metadata (ver docs/decisiones.md).

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  apellido text not null,
  fecha_nacimiento date not null,
  tipo_sangre text not null,
  color_ojos text not null,
  dias_vacaciones integer not null,
  created_at timestamptz not null default now()
);

alter table public.usuarios enable row level security;

-- Cada usuario lee solo su propio perfil.
create policy "usuarios: leer el propio"
  on public.usuarios for select
  to authenticated
  using (auth.uid() = id);

-- Cada usuario crea solo su propio perfil (justo después del signUp).
create policy "usuarios: crear el propio"
  on public.usuarios for insert
  to authenticated
  with check (auth.uid() = id);

-- El admin puede leer todos los perfiles. El rol sale del JWT (app_metadata).
create policy "usuarios: admin lee todos"
  on public.usuarios for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin');
