-- Firmas y responsables visibles en certificados.
alter table public.cohortes
  add column if not exists docente_firma_url text,
  add column if not exists director_academico text,
  add column if not exists director_firma_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'firmas-certificados',
  'firmas-certificados',
  true,
  2097152,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin sube firmas certificados" on storage.objects;
create policy "admin sube firmas certificados"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'firmas-certificados'
  and public.es_admin_actual()
);

drop policy if exists "admin actualiza firmas certificados" on storage.objects;
create policy "admin actualiza firmas certificados"
on storage.objects
for update to authenticated
using (
  bucket_id = 'firmas-certificados'
  and public.es_admin_actual()
)
with check (
  bucket_id = 'firmas-certificados'
  and public.es_admin_actual()
);

drop policy if exists "firmas certificados publicas" on storage.objects;
create policy "firmas certificados publicas"
on storage.objects
for select to public
using (bucket_id = 'firmas-certificados');
