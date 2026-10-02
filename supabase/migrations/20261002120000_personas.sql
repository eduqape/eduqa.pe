-- Altas del equipo: planta y huéspedes.
--
-- Una sola tabla de identidad con los roles aparte, porque una persona puede
-- ser varias cosas a la vez: un profesor que también es ingeniero, un director
-- que además da clases. Con un único campo `rol` habría que elegir uno y perder
-- el resto, y con una tabla por rol la ficha quedaría duplicada en cuanto
-- alguien cruza dos.
--
-- Esto no reemplaza a `perfiles`. Ahí vive el alumno y su cuenta; aquí vive la
-- persona que da clase, tenga cuenta o no. Un ponente invitado no tiene
-- cuenta, y un practicante sí la tiene, pero ninguno de los dos casos obliga a
-- fabricar un `auth.users` para ponerlo en un cartel.

create or replace function public.es_admin_actual()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.es_admin
  );
$$;

revoke all on function public.es_admin_actual() from public, anon;
grant execute on function public.es_admin_actual() to authenticated;

create table if not exists public.personas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null check (char_length(trim(nombre)) between 2 and 120),
  titulo_profesional text check (titulo_profesional is null or char_length(titulo_profesional) <= 160),
  foto_url text,
  correo text check (correo is null or correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telefono text,
  pais text,
  biografia text,
  -- Vincula con la cuenta cuando la persona además es alumno o tiene sesión.
  usuario_id uuid references auth.users(id) on delete set null,
  -- `visible` es la decisión editorial; `activo` es la laboral. Un director que
  -- sale de la empresa sigue estando en `personas` con su historial, pero deja
  -- de salir en la web.
  visible boolean not null default false,
  activo boolean not null default true,
  orden integer not null default 50 check (orden >= 0),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.personas is
  'Personas del equipo. La identidad vive aquí; los roles, en personas_roles.';
comment on column public.personas.visible is
  'Si la persona aparece en las páginas públicas (portada y /equipo).';
comment on column public.personas.activo is
  'Si la persona sigue trabajando aquí. Se puede desactivar sin borrarla.';

create table if not exists public.personas_roles (
  persona_id uuid not null references public.personas(id) on delete cascade,
  rol text not null check (
    rol in ('trabajador','profesor','ingeniero_software','practicante','director','ponente','invitado')
  ),
  orden integer not null default 50 check (orden >= 0),
  primary key (persona_id, rol)
);

comment on table public.personas_roles is
  'Roles de cada persona. Varios por persona: profesor e ingeniero a la vez.';

create table if not exists public.personas_redes (
  persona_id uuid not null references public.personas(id) on delete cascade,
  red text not null check (
    red in ('linkedin','github','instagram','x','youtube','tiktok','substack','medium','researchgate','orcid')
  ),
  url text not null check (url ~ '^https://'),
  orden integer not null default 50 check (orden >= 0),
  primary key (persona_id, red)
);

comment on table public.personas_redes is
  'Redes de cada persona. Las claves son las de RedNombre en src/components/Iconos.tsx.';

create index if not exists personas_orden_idx on public.personas (orden, nombre);
create index if not exists personas_visibles_idx on public.personas (orden) where visible and activo;
create index if not exists personas_roles_rol_idx on public.personas_roles (rol);
create index if not exists personas_redes_persona_idx on public.personas_redes (persona_id);

create or replace function public.tocar_personas_actualizado()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists trg_personas_actualizado on public.personas;
create trigger trg_personas_actualizado
before update on public.personas
for each row execute function public.tocar_personas_actualizado();

alter table public.personas enable row level security;
alter table public.personas_roles enable row level security;
alter table public.personas_redes enable row level security;

-- Admin: todo. El resto solo lee, y lo que lee son las personas publicadas.
drop policy if exists "admin gestiona personas" on public.personas;
create policy "admin gestiona personas"
on public.personas
for all to authenticated
using (public.es_admin_actual())
with check (public.es_admin_actual());

-- La lectura pública va en dos políticas y no en una. `es_admin_actual()` no
-- tiene permiso de ejecución para `anon`, y una política que llama a una
-- función sin permiso falla con "permission denied" en cuanto entra alguien sin
-- sesión, que es justo el caso de /equipo. La de `anon` no llama a la función,
-- y la de `authenticated` sí, porque ese rol sí puede ejecutarla.
drop policy if exists "personas publicadas" on public.personas;
create policy "personas publicadas"
on public.personas
for select to anon
using (visible and activo);

drop policy if exists "personas publicadas autenticadas" on public.personas;
create policy "personas publicadas autenticadas"
on public.personas
for select to authenticated
using (visible and activo or public.es_admin_actual());

drop policy if exists "admin gestiona roles persona" on public.personas_roles;
create policy "admin gestiona roles persona"
on public.personas_roles
for all to authenticated
using (public.es_admin_actual())
with check (public.es_admin_actual());

-- Misma razón que en `personas`: la política de `anon` no llama a
-- `es_admin_actual()` porque ese rol no puede ejecutarla.
drop policy if exists "roles de personas publicadas" on public.personas_roles;
create policy "roles de personas publicadas"
on public.personas_roles
for select to anon
using (
  exists (
    select 1 from public.personas p
    where p.id = personas_roles.persona_id and p.visible and p.activo
  )
);

drop policy if exists "roles de personas publicadas autenticadas" on public.personas_roles;
create policy "roles de personas publicadas autenticadas"
on public.personas_roles
for select to authenticated
using (
  public.es_admin_actual()
  or exists (
    select 1 from public.personas p
    where p.id = personas_roles.persona_id and p.visible and p.activo
  )
);

drop policy if exists "admin gestiona redes persona" on public.personas_redes;
create policy "admin gestiona redes persona"
on public.personas_redes
for all to authenticated
using (public.es_admin_actual())
with check (public.es_admin_actual());

drop policy if exists "redes de personas publicadas" on public.personas_redes;
create policy "redes de personas publicadas"
on public.personas_redes
for select to anon
using (
  exists (
    select 1 from public.personas p
    where p.id = personas_redes.persona_id and p.visible and p.activo
  )
);

drop policy if exists "redes de personas publicadas autenticadas" on public.personas_redes;
create policy "redes de personas publicadas autenticadas"
on public.personas_redes
for select to authenticated
using (
  public.es_admin_actual()
  or exists (
    select 1 from public.personas p
    where p.id = personas_redes.persona_id and p.visible and p.activo
  )
);

grant select on public.personas to anon, authenticated;
grant select, insert, update, delete on public.personas to authenticated;
grant select on public.personas_roles to anon, authenticated;
grant insert, update, delete on public.personas_roles to authenticated;
grant select on public.personas_redes to anon, authenticated;
grant insert, update, delete on public.personas_redes to authenticated;

-- Fotos del equipo. No se reutiliza el bucket `avatares` porque ahí vive la
-- foto del alumno, que tiene otro ciclo de vida y otro tamaño.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'personas-fotos',
  'personas-fotos',
  true,
  2097152,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin sube fotos personas" on storage.objects;
create policy "admin sube fotos personas"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'personas-fotos'
  and public.es_admin_actual()
);

drop policy if exists "admin actualiza fotos personas" on storage.objects;
create policy "admin actualiza fotos personas"
on storage.objects
for update to authenticated
using (
  bucket_id = 'personas-fotos'
  and public.es_admin_actual()
)
with check (
  bucket_id = 'personas-fotos'
  and public.es_admin_actual()
);

drop policy if exists "admin borra fotos personas" on storage.objects;
create policy "admin borra fotos personas"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'personas-fotos'
  and public.es_admin_actual()
);

drop policy if exists "fotos personas publicas" on storage.objects;
create policy "fotos personas publicas"
on storage.objects
for select to public
using (bucket_id = 'personas-fotos');

-- Siembra. La portada y /equipo leen de aquí, así que sin estas filas las dos
-- páginas salen vacías: es el dato que antes vivía hardcodeado en
-- src/lib/catalogo.ts. No hay fallback a propósito; si alguien borra a esta
-- persona del panel, también desaparece de la web, que es lo que se espera.
--
-- Se siembra como profesor e ingeniero de software, que es lo que sostienen su
-- título y su bio. Que además sea director se ajusta desde el panel.
insert into public.personas (
  slug, nombre, titulo_profesional, biografia, visible, activo, orden
)
values (
  'alejandro-seminario',
  'Alejandro Seminario',
  'Ingeniero de Inteligencia Artificial',
  'AI Engineer con experiencia en Computer Vision, sistemas de IA en producción y entornos edge-first.

Desarrollo modelos de visión por computadora, pipelines de datos y APIs de inferencia, integrando prácticas de MLOps, despliegue en cloud y arquitecturas limpias.

Experiencia en investigación aplicada, docencia técnica y proyectos orientados a impacto industrial y académico.',
  true,
  true,
  10
)
on conflict (slug) do nothing;

insert into public.personas_roles (persona_id, rol, orden)
select p.id, v.rol, v.orden
from public.personas p
cross join (values ('profesor', 10), ('ingeniero_software', 20)) as v(rol, orden)
where p.slug = 'alejandro-seminario'
on conflict (persona_id, rol) do nothing;

insert into public.personas_redes (persona_id, red, url, orden)
select p.id, v.red, v.url, v.orden
from public.personas p
cross join (values
  ('linkedin', 'https://www.linkedin.com/in/alejandroseminariomedina/', 10),
  ('github', 'https://github.com/seminarioA', 20)
) as v(red, url, orden)
where p.slug = 'alejandro-seminario'
on conflict (persona_id, red) do nothing;