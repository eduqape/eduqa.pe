-- Catálogo de assets gráficos en base de datos: se cargan desde
-- /recursos/catalogo-svg sin redesplegar la aplicación.
create table if not exists public.recurso_assets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  nombre text not null check (length(trim(nombre)) between 2 and 120),
  -- URL pública del SVG: ruta de /public o URL del bucket assets-svg.
  archivo text not null check (length(archivo) between 2 and 600),
  -- Ruta dentro del bucket; null para los SVG que viven en /public.
  ruta_storage text unique,
  descripcion text not null default '' check (length(descripcion) <= 400),
  etiquetas text[] not null default '{}',
  origen text not null default '' check (length(origen) <= 300),
  usado_en text check (length(usado_en) <= 300),
  posicion integer not null default 0,
  creado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id) on delete set null
);

alter table public.recurso_assets enable row level security;

grant select, insert, update, delete on public.recurso_assets to authenticated;

drop policy if exists "equipo lee assets" on public.recurso_assets;
create policy "equipo lee assets" on public.recurso_assets for select to authenticated
using (exists (select 1 from public.perfiles p where p.id = (select auth.uid())
  and (p.es_admin or p.rol in ('profesor', 'gestor', 'desarrollador', 'agente', 'admin'))));

drop policy if exists "administrador crea assets" on public.recurso_assets;
create policy "administrador crea assets" on public.recurso_assets for insert to authenticated
with check (exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and (p.es_admin or p.rol = 'admin')));

drop policy if exists "administrador edita assets" on public.recurso_assets;
create policy "administrador edita assets" on public.recurso_assets for update to authenticated
using (exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and (p.es_admin or p.rol = 'admin'))) with check (exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and (p.es_admin or p.rol = 'admin')));

drop policy if exists "administrador elimina assets" on public.recurso_assets;
create policy "administrador elimina assets" on public.recurso_assets for delete to authenticated
using (exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and (p.es_admin or p.rol = 'admin')));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assets-svg', 'assets-svg', true, 1048576, array['image/svg+xml'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin sube assets svg" on storage.objects;
create policy "admin sube assets svg" on storage.objects for insert to authenticated
with check (bucket_id = 'assets-svg' and exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and (p.es_admin or p.rol = 'admin')));

drop policy if exists "admin elimina assets svg" on storage.objects;
create policy "admin elimina assets svg" on storage.objects for delete to authenticated
using (bucket_id = 'assets-svg' and exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and (p.es_admin or p.rol = 'admin')));

drop policy if exists "assets svg publicos" on storage.objects;
create policy "assets svg publicos" on storage.objects for select to public
using (bucket_id = 'assets-svg');

-- Los SVG que ya estaban en el catálogo escrito en código.
insert into public.recurso_assets (slug, nombre, archivo, descripcion, etiquetas, origen, usado_en, posicion)
values
  ('llama', 'Llama parada', '/llama.svg',
   'Llama de perfil, de pie, en trazo de línea. Es la llama de la marca.',
   array['llama', 'línea', 'marca'], 'Ilustración de marca de EDUQA.PE.',
   'Barra lateral, certificados, PDF del curso e icono de marca.', 10),
  ('llama-rigor-verificable', 'Llama · rigor verificable', '/llama-rigor-verificable.svg',
   'Llama de pie junto a una escala de medición, en trazo de línea.',
   array['llama', 'línea', 'medición'], 'Vectorizada a partir de una ilustración de línea.',
   'Landing, pilar «Rigor verificable».', 20),
  ('llama-dormida', 'Llama dormida', '/llama-dormida.svg',
   'Llama recostada y dormida sobre su lana, en trazo de línea grueso.',
   array['llama', 'línea', 'descanso'], 'Vectorizada con potrace a partir de una ilustración blanca sobre rojo.',
   null, 30),
  ('llama-pastando', 'Llama pastando', '/llama-pastando.svg',
   'Llama de pie con la cabeza baja, comiendo pasto, en trazo de línea grueso.',
   array['llama', 'línea', 'pasto'], 'Vectorizada con potrace a partir de una ilustración blanca sobre rojo.',
   null, 40)
on conflict (slug) do nothing;
