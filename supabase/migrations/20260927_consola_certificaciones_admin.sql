-- Consola administrativa de certificaciones.
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

alter table public.certificados
  add column if not exists usuario_id uuid references auth.users(id) on delete set null;

drop index if exists public.certificados_alumno_uidx;

create unique index if not exists certificados_usuario_cohorte_uidx
  on public.certificados (cohorte_id, usuario_id)
  where usuario_id is not null;

create unique index if not exists certificados_email_cohorte_uidx
  on public.certificados (cohorte_id, lower(email))
  where usuario_id is null and email is not null;

create table if not exists public.certificacion_reglas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(trim(nombre)) between 3 and 120),
  activa boolean not null default true,
  activador text not null check (activador in ('matricula_completada','cohorte_cerrada')),
  cohorte_id uuid references public.cohortes(id) on delete cascade,
  curso_id uuid references public.cursos(id) on delete cascade,
  enviar_correo boolean not null default false,
  creado_por uuid not null references auth.users(id) on delete restrict,
  creado_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  check (cohorte_id is not null or curso_id is not null)
);

create index if not exists certificacion_reglas_activador_idx
  on public.certificacion_reglas (activador, activa);

create table if not exists public.certificado_envios (
  id uuid primary key default gen_random_uuid(),
  certificado_id uuid not null references public.certificados(id) on delete cascade,
  destinatario text not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','enviado','error')),
  intentos integer not null default 0,
  solicitado_en timestamptz not null default now(),
  enviado_en timestamptz,
  ultimo_error text,
  solicitado_por uuid references auth.users(id) on delete set null
);

create index if not exists certificado_envios_estado_idx
  on public.certificado_envios (estado, solicitado_en);

alter table public.certificacion_reglas enable row level security;
alter table public.certificado_envios enable row level security;

drop policy if exists "admin gestiona reglas certificados" on public.certificacion_reglas;
create policy "admin gestiona reglas certificados"
on public.certificacion_reglas
for all to authenticated
using (public.es_admin_actual())
with check (public.es_admin_actual());

drop policy if exists "admin gestiona envios certificados" on public.certificado_envios;
create policy "admin gestiona envios certificados"
on public.certificado_envios
for all to authenticated
using (public.es_admin_actual())
with check (public.es_admin_actual());

grant select, insert, update, delete on public.certificacion_reglas to authenticated;
grant select, insert, update, delete on public.certificado_envios to authenticated;

create or replace function public.emitir_certificado_para_usuario(
  p_cohorte_id uuid,
  p_usuario_id uuid,
  p_solicitar_correo boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_nombre text;
  v_email text;
  v_id uuid;
begin
  select nullif(trim(p.nombre), ''), u.email
  into v_nombre, v_email
  from auth.users u
  left join public.perfiles p on p.id = u.id
  where u.id = p_usuario_id;

  if v_email is null then
    raise exception 'Usuario no encontrado';
  end if;

  v_nombre := coalesce(v_nombre, split_part(v_email, '@', 1));

  insert into public.certificados (cohorte_id, usuario_id, alumno, email, codigo)
  values (p_cohorte_id, p_usuario_id, v_nombre, lower(v_email), '')
  on conflict (cohorte_id, usuario_id)
    where usuario_id is not null
  do update set alumno = excluded.alumno, email = excluded.email
  returning id into v_id;

  if p_solicitar_correo and not exists (
    select 1 from public.certificado_envios e
    where e.certificado_id = v_id and e.estado = 'pendiente'
  ) then
    insert into public.certificado_envios (
      certificado_id, destinatario, solicitado_por
    ) values (
      v_id, lower(v_email), auth.uid()
    );
  end if;

  return v_id;
end;
$$;

revoke all on function public.emitir_certificado_para_usuario(uuid,uuid,boolean) from public, anon;
grant execute on function public.emitir_certificado_para_usuario(uuid,uuid,boolean) to authenticated;

create or replace function public.admin_emitir_certificado(
  p_cohorte_id uuid,
  p_usuario_id uuid,
  p_solicitar_correo boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin_actual() then
    raise exception 'No autorizado';
  end if;
  return public.emitir_certificado_para_usuario(
    p_cohorte_id, p_usuario_id, p_solicitar_correo
  );
end;
$$;

revoke all on function public.admin_emitir_certificado(uuid,uuid,boolean) from public, anon;
grant execute on function public.admin_emitir_certificado(uuid,uuid,boolean) to authenticated;

create or replace function public.admin_emitir_lote(
  p_cohorte_id uuid,
  p_solo_completadas boolean default false,
  p_solicitar_correo boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n integer := 0;
begin
  if not public.es_admin_actual() then
    raise exception 'No autorizado';
  end if;

  for r in
    select distinct m.usuario_id
    from public.matriculas m
    where m.cohorte_id = p_cohorte_id
      and (not p_solo_completadas or m.estado = 'completada')
  loop
    perform public.emitir_certificado_para_usuario(
      p_cohorte_id, r.usuario_id, p_solicitar_correo
    );
    n := n + 1;
  end loop;

  return n;
end;
$$;

revoke all on function public.admin_emitir_lote(uuid,boolean,boolean) from public, anon;
grant execute on function public.admin_emitir_lote(uuid,boolean,boolean) to authenticated;

create or replace function public.admin_alumnos_cohorte(p_cohorte_id uuid)
returns table (
  usuario_id uuid,
  nombre text,
  email text,
  estado text,
  certificado_id uuid,
  codigo text,
  anulado_en timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    m.usuario_id,
    coalesce(nullif(trim(p.nombre), ''), split_part(u.email, '@', 1)) as nombre,
    u.email,
    m.estado,
    ce.id,
    ce.codigo,
    ce.anulado_en
  from public.matriculas m
  join auth.users u on u.id = m.usuario_id
  left join public.perfiles p on p.id = m.usuario_id
  left join public.certificados ce
    on ce.cohorte_id = m.cohorte_id and ce.usuario_id = m.usuario_id
  where m.cohorte_id = p_cohorte_id
    and public.es_admin_actual()
  order by nombre, u.email;
$$;

revoke all on function public.admin_alumnos_cohorte(uuid) from public, anon;
grant execute on function public.admin_alumnos_cohorte(uuid) to authenticated;

create or replace function public.admin_anular_certificado(
  p_certificado_id uuid,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin_actual() then
    raise exception 'No autorizado';
  end if;

  update public.certificados
  set anulado_en = now(),
      motivo_anulado = nullif(trim(p_motivo), '')
  where id = p_certificado_id;
end;
$$;

revoke all on function public.admin_anular_certificado(uuid,text) from public, anon;
grant execute on function public.admin_anular_certificado(uuid,text) to authenticated;

create or replace function public.certificacion_automatica_matricula()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enviar boolean := false;
begin
  if new.estado <> 'completada'
     or old.estado is not distinct from new.estado
     or new.cohorte_id is null then
    return new;
  end if;

  select coalesce(bool_or(r.enviar_correo), false)
  into v_enviar
  from public.certificacion_reglas r
  where r.activa
    and r.activador = 'matricula_completada'
    and (
      r.cohorte_id = new.cohorte_id
      or (r.curso_id is not null and r.curso_id = new.curso_id)
    );

  if exists (
    select 1
    from public.certificacion_reglas r
    where r.activa
      and r.activador = 'matricula_completada'
      and (
        r.cohorte_id = new.cohorte_id
        or (r.curso_id is not null and r.curso_id = new.curso_id)
      )
  ) then
    perform public.emitir_certificado_para_usuario(
      new.cohorte_id, new.usuario_id, v_enviar
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_certificacion_automatica_matricula on public.matriculas;
create trigger trg_certificacion_automatica_matricula
after update of estado on public.matriculas
for each row execute function public.certificacion_automatica_matricula();

create or replace function public.certificacion_automatica_cohorte()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_enviar boolean := false;
  v_hay_regla boolean := false;
begin
  if new.cerrada_en is null or old.cerrada_en is not null then
    return new;
  end if;

  select
    exists(
      select 1 from public.certificacion_reglas x
      where x.activa and x.activador = 'cohorte_cerrada'
        and (
          x.cohorte_id = new.id
          or (x.curso_id is not null and x.curso_id = new.curso_id)
        )
    ),
    coalesce(bool_or(x.enviar_correo), false)
  into v_hay_regla, v_enviar
  from public.certificacion_reglas x
  where x.activa and x.activador = 'cohorte_cerrada'
    and (
      x.cohorte_id = new.id
      or (x.curso_id is not null and x.curso_id = new.curso_id)
    );

  if not v_hay_regla then
    return new;
  end if;

  for r in
    select distinct m.usuario_id
    from public.matriculas m
    where m.cohorte_id = new.id
      and m.estado = 'completada'
  loop
    perform public.emitir_certificado_para_usuario(
      new.id, r.usuario_id, v_enviar
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_certificacion_automatica_cohorte on public.cohortes;
create trigger trg_certificacion_automatica_cohorte
after update of cerrada_en on public.cohortes
for each row execute function public.certificacion_automatica_cohorte();
