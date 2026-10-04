-- Imágenes de los cursos: se suben desde /panel/cursos junto con el Markdown
-- y las sesiones las citan como imagenes/nombre.png. Publicar un curso con
-- figuras no exige copiarlas a /public ni volver a desplegar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cursos-imagenes', 'cursos-imagenes', true, 2097152,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Solo quien puede publicar cursos (administrador) escribe en el bucket.
drop policy if exists "admin sube imagenes de cursos" on storage.objects;
create policy "admin sube imagenes de cursos" on storage.objects for insert to authenticated
with check (bucket_id = 'cursos-imagenes' and exists (
  select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_admin));

-- Republicar un curso reemplaza la imagen con el mismo nombre (upsert).
drop policy if exists "admin reemplaza imagenes de cursos" on storage.objects;
create policy "admin reemplaza imagenes de cursos" on storage.objects for update to authenticated
using (bucket_id = 'cursos-imagenes' and exists (
  select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_admin))
with check (bucket_id = 'cursos-imagenes' and exists (
  select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_admin));

drop policy if exists "admin elimina imagenes de cursos" on storage.objects;
create policy "admin elimina imagenes de cursos" on storage.objects for delete to authenticated
using (bucket_id = 'cursos-imagenes' and exists (
  select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_admin));

-- El bucket es público: las URL /object/public/ se sirven sin política de
-- lectura. La política select solo permite listar el bucket al administrador,
-- que lo necesita para comprobar las imágenes ya subidas al republicar; nadie
-- más puede enumerar sus archivos.
drop policy if exists "admin lista imagenes de cursos" on storage.objects;
create policy "admin lista imagenes de cursos" on storage.objects for select to authenticated
using (bucket_id = 'cursos-imagenes' and exists (
  select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_admin));
