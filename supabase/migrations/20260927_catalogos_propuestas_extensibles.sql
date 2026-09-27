-- Catálogos extensibles para la gestión de próximos cursos.
create table if not exists public.catalogo_propuestas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('nivel','area','icono')),
  valor text not null check (char_length(trim(valor)) between 1 and 80),
  svg text null,
  orden integer not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  creado_por uuid null references auth.users(id),
  unique (tipo, valor),
  check ((tipo = 'icono') or svg is null)
);

alter table public.catalogo_propuestas enable row level security;

drop policy if exists catalogo_propuestas_select on public.catalogo_propuestas;
create policy catalogo_propuestas_select
on public.catalogo_propuestas for select
to authenticated
using (true);

drop policy if exists catalogo_propuestas_insert on public.catalogo_propuestas;
create policy catalogo_propuestas_insert
on public.catalogo_propuestas for insert
to authenticated
with check (public.es_usuario_interno());

drop policy if exists catalogo_propuestas_update on public.catalogo_propuestas;
create policy catalogo_propuestas_update
on public.catalogo_propuestas for update
to authenticated
using (public.es_usuario_interno())
with check (public.es_usuario_interno());

revoke all on public.catalogo_propuestas from anon;
grant select, insert, update on public.catalogo_propuestas to authenticated;

alter table public.propuestas_curso
  drop constraint if exists propuestas_curso_nivel_check;

insert into public.catalogo_propuestas (tipo, valor, orden)
values
  ('nivel','INTRODUCCIÓN',10), ('nivel','INTERMEDIO',20), ('nivel','AVANZADO',30),
  ('area','Matemáticas',10), ('area','Bioingeniería',20), ('area','Farmacología',30),
  ('area','Lenguajes',40), ('area','Bases de Datos',50), ('area','Ingeniería de Datos',60),
  ('area','Inteligencia Artificial',70), ('area','Machine Learning',80),
  ('area','DevOps',90), ('area','Backend',100)
on conflict (tipo, valor) do nothing;

insert into public.catalogo_propuestas (tipo, valor, orden)
select 'icono', v, ord
from unnest(array[
  'docker','fastapi','fortran','githubactions','gemini','huggingface',
  'pandas','postgresql','python','pytorch','scikitlearn','opencv',
  'linux','n8n','notebooklm','redis','sqlite','supabase',
  'libro','soa','nube','datos','matematicas','farmacologia','bioingenieria'
]) with ordinality as t(v, ord)
on conflict (tipo, valor) do nothing;
