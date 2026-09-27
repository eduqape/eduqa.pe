-- Alertas internas de CI/CD exclusivas para administradores.
create table if not exists public.alertas_admin (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  tipo text not null check (tipo in ('push','deploy')),
  estado text not null default 'info' check (estado in ('info','success','error')),
  titulo text not null,
  cuerpo text not null,
  url text,
  metadata jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

alter table public.alertas_admin enable row level security;

drop policy if exists "admins leen alertas de sistema" on public.alertas_admin;
create policy "admins leen alertas de sistema"
on public.alertas_admin
for select
to authenticated
using (public.es_admin_actual());

grant select on public.alertas_admin to authenticated;

create index if not exists alertas_admin_creado_en_idx
  on public.alertas_admin (creado_en desc);
