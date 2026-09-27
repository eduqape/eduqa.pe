-- Certificación por curso y matrícula; cohortes quedan como contexto opcional.
alter table public.certificados
  alter column cohorte_id drop not null,
  add column if not exists curso_id uuid references public.cursos(id) on delete restrict,
  add column if not exists curso_nombre text,
  add column if not exists horas numeric(5,1),
  add column if not exists dictada_en date,
  add column if not exists docente text,
  add column if not exists docente_firma_url text,
  add column if not exists director_academico text,
  add column if not exists director_firma_url text;

create table if not exists public.certificacion_config_curso (
  curso_id uuid primary key references public.cursos(id) on delete cascade,
  horas numeric(5,1) not null default 0,
  docente text not null default 'Docente EDUQA.PE',
  docente_firma_url text,
  director_academico text not null default 'Director Académico EDUQA.PE',
  director_firma_url text,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users(id) on delete set null
);

alter table public.certificacion_config_curso enable row level security;

drop policy if exists "admin gestiona config certificacion curso" on public.certificacion_config_curso;
create policy "admin gestiona config certificacion curso"
on public.certificacion_config_curso
for all to authenticated
using (public.es_admin_actual())
with check (public.es_admin_actual());

grant select, insert, update, delete on public.certificacion_config_curso to authenticated;

drop index if exists certificados_usuario_cohorte_uidx;
create unique index if not exists certificados_usuario_curso_uidx
  on public.certificados (curso_id, usuario_id)
  where curso_id is not null and usuario_id is not null;

create or replace function public.set_codigo()
returns trigger
language plpgsql
as $$
declare
  v_codigo_base text;
  v_fecha date;
  intento text;
  n int := 0;
begin
  if new.codigo is not null and new.codigo <> '' then return new; end if;

  if new.cohorte_id is not null then
    select coalesce(c.codigo_base, co.curso_legacy_id), co.dictada_en
      into v_codigo_base, v_fecha
    from public.cohortes co
    left join public.cursos c on c.id = co.curso_id
    where co.id = new.cohorte_id;
  elsif new.curso_id is not null then
    select coalesce(c.codigo_base, upper(substr(c.slug, 1, 8))),
           coalesce(new.dictada_en, current_date)
      into v_codigo_base, v_fecha
    from public.cursos c
    where c.id = new.curso_id;
  end if;

  if v_codigo_base is null then
    raise exception 'No se pudo determinar el curso del certificado';
  end if;

  loop
    intento := public.generar_codigo(v_codigo_base, coalesce(v_fecha, current_date));
    exit when not exists (select 1 from public.certificados where codigo = intento);
    n := n + 1;
    if n > 20 then
      raise exception 'No se pudo generar un código único para %', new.alumno;
    end if;
  end loop;

  new.codigo := intento;
  return new;
end;
$$;

create or replace function public.admin_matriculados_certificacion()
returns table (
  curso_id uuid,
  curso_slug text,
  curso_titulo text,
  usuario_id uuid,
  nombre text,
  email text,
  estado text,
  completada_en timestamptz,
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
    m.curso_id, m.curso_slug, c.titulo, m.usuario_id,
    coalesce(nullif(trim(p.nombre), ''), split_part(u.email, '@', 1)),
    u.email, m.estado, m.completada_en, ce.id, ce.codigo, ce.anulado_en
  from public.matriculas m
  join public.cursos c on c.id = m.curso_id
  join auth.users u on u.id = m.usuario_id
  left join public.perfiles p on p.id = m.usuario_id
  left join public.certificados ce
    on ce.curso_id = m.curso_id and ce.usuario_id = m.usuario_id
  where public.es_admin_actual()
  order by c.titulo, 5, u.email;
$$;

revoke all on function public.admin_matriculados_certificacion() from public, anon;
grant execute on function public.admin_matriculados_certificacion() to authenticated;

create or replace function public.emitir_certificado_curso_usuario(
  p_curso_id uuid,
  p_usuario_id uuid,
  p_solicitar_correo boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_nombre text; v_email text; v_titulo text; v_horas numeric(5,1);
  v_docente text; v_docente_firma text; v_director text; v_director_firma text;
  v_fecha date; v_id uuid;
begin
  if not public.es_admin_actual() then raise exception 'No autorizado'; end if;

  select
    coalesce(nullif(trim(p.nombre), ''), split_part(u.email, '@', 1)),
    u.email, c.titulo, cfg.horas, cfg.docente, cfg.docente_firma_url,
    cfg.director_academico, cfg.director_firma_url,
    coalesce(m.completada_en::date, current_date)
  into
    v_nombre, v_email, v_titulo, v_horas, v_docente, v_docente_firma,
    v_director, v_director_firma, v_fecha
  from public.matriculas m
  join public.cursos c on c.id = m.curso_id
  join auth.users u on u.id = m.usuario_id
  left join public.perfiles p on p.id = m.usuario_id
  left join public.certificacion_config_curso cfg on cfg.curso_id = c.id
  where m.curso_id = p_curso_id and m.usuario_id = p_usuario_id
  limit 1;

  if v_email is null then raise exception 'El usuario no está matriculado en ese curso'; end if;
  if v_horas is null then raise exception 'Configura primero la certificación del curso en Preview'; end if;

  insert into public.certificados (
    curso_id, usuario_id, alumno, email, codigo, curso_nombre, horas, dictada_en,
    docente, docente_firma_url, director_academico, director_firma_url
  ) values (
    p_curso_id, p_usuario_id, v_nombre, lower(v_email), '', v_titulo, v_horas, v_fecha,
    v_docente, v_docente_firma, v_director, v_director_firma
  )
  on conflict (curso_id, usuario_id)
    where curso_id is not null and usuario_id is not null
  do update set
    alumno=excluded.alumno, email=excluded.email, curso_nombre=excluded.curso_nombre,
    horas=excluded.horas, dictada_en=excluded.dictada_en, docente=excluded.docente,
    docente_firma_url=excluded.docente_firma_url,
    director_academico=excluded.director_academico,
    director_firma_url=excluded.director_firma_url
  returning id into v_id;

  if p_solicitar_correo and not exists (
    select 1 from public.certificado_envios e
    where e.certificado_id = v_id and e.estado = 'pendiente'
  ) then
    insert into public.certificado_envios (certificado_id,destinatario,solicitado_por)
    values (v_id,lower(v_email),auth.uid());
  end if;

  return v_id;
end;
$$;

revoke all on function public.emitir_certificado_curso_usuario(uuid,uuid,boolean) from public, anon;
grant execute on function public.emitir_certificado_curso_usuario(uuid,uuid,boolean) to authenticated;

create or replace function public.emitir_certificados_curso_lote(
  p_curso_id uuid,
  p_solo_completadas boolean default false,
  p_solicitar_correo boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare r record; n integer := 0;
begin
  if not public.es_admin_actual() then raise exception 'No autorizado'; end if;

  for r in
    select distinct m.usuario_id
    from public.matriculas m
    where m.curso_id = p_curso_id
      and (not p_solo_completadas or m.estado = 'completada')
  loop
    perform public.emitir_certificado_curso_usuario(
      p_curso_id, r.usuario_id, p_solicitar_correo
    );
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.emitir_certificados_curso_lote(uuid,boolean,boolean) from public, anon;
grant execute on function public.emitir_certificados_curso_lote(uuid,boolean,boolean) to authenticated;

drop view if exists public.v_verificacion;
create view public.v_verificacion as
select
  ce.codigo,
  ce.alumno,
  coalesce(ce.curso_nombre, co.curso_nombre) as curso_nombre,
  coalesce(ce.horas::numeric(4,1), co.horas)::numeric(4,1) as horas,
  coalesce(ce.dictada_en, co.dictada_en) as dictada_en,
  coalesce(ce.docente, co.docente) as docente,
  ce.emitido_en,
  (ce.anulado_en is null) as vigente
from public.certificados ce
left join public.cohortes co on co.id = ce.cohorte_id;

grant select on public.v_verificacion to anon;
