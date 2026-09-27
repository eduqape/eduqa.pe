-- Persistencia de variante y snapshot completo del certificado.
alter table public.certificados
  add column if not exists variante text not null default 'banda'
    check (variante in ('banda','marco','solido'));

alter table public.certificacion_config_curso
  add column if not exists variante text not null default 'banda'
    check (variante in ('banda','marco','solido'));

create or replace function public.emitir_certificado_curso_usuario(
  p_curso_id uuid,
  p_usuario_id uuid,
  p_solicitar_correo boolean default false,
  p_variante text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_nombre text;
  v_email text;
  v_titulo text;
  v_horas numeric(5,1);
  v_docente text;
  v_docente_firma text;
  v_director text;
  v_director_firma text;
  v_fecha date;
  v_variante text;
  v_id uuid;
begin
  if not public.es_admin_actual() then raise exception 'No autorizado'; end if;

  select
    coalesce(nullif(trim(p.nombre), ''), split_part(u.email, '@', 1)),
    u.email,
    c.titulo,
    cfg.horas,
    cfg.docente,
    cfg.docente_firma_url,
    cfg.director_academico,
    cfg.director_firma_url,
    coalesce(m.completada_en::date, current_date),
    coalesce(nullif(p_variante, ''), cfg.variante, 'banda')
  into
    v_nombre, v_email, v_titulo, v_horas, v_docente, v_docente_firma,
    v_director, v_director_firma, v_fecha, v_variante
  from public.matriculas m
  join public.cursos c on c.id = m.curso_id
  join auth.users u on u.id = m.usuario_id
  left join public.perfiles p on p.id = m.usuario_id
  left join public.certificacion_config_curso cfg on cfg.curso_id = c.id
  where m.curso_id = p_curso_id and m.usuario_id = p_usuario_id
  limit 1;

  if v_email is null then raise exception 'El usuario no está matriculado en ese curso'; end if;
  if v_horas is null then raise exception 'Configura primero la certificación del curso en Preview'; end if;
  if v_variante not in ('banda','marco','solido') then raise exception 'Variante de certificado inválida'; end if;

  insert into public.certificados (
    curso_id, usuario_id, alumno, email, codigo,
    curso_nombre, horas, dictada_en, docente, docente_firma_url,
    director_academico, director_firma_url, variante
  )
  values (
    p_curso_id, p_usuario_id, v_nombre, lower(v_email), '',
    v_titulo, v_horas, v_fecha, v_docente, v_docente_firma,
    v_director, v_director_firma, v_variante
  )
  on conflict (curso_id, usuario_id)
    where curso_id is not null and usuario_id is not null
  do update set
    alumno = excluded.alumno,
    email = excluded.email,
    curso_nombre = excluded.curso_nombre,
    horas = excluded.horas,
    dictada_en = excluded.dictada_en,
    docente = excluded.docente,
    docente_firma_url = excluded.docente_firma_url,
    director_academico = excluded.director_academico,
    director_firma_url = excluded.director_firma_url,
    variante = excluded.variante
  returning id into v_id;

  if p_solicitar_correo and not exists (
    select 1 from public.certificado_envios e
    where e.certificado_id = v_id and e.estado = 'pendiente'
  ) then
    insert into public.certificado_envios (certificado_id, destinatario, solicitado_por)
    values (v_id, lower(v_email), auth.uid());
  end if;

  return v_id;
end;
$$;

revoke all on function public.emitir_certificado_curso_usuario(uuid,uuid,boolean,text) from public, anon;
grant execute on function public.emitir_certificado_curso_usuario(uuid,uuid,boolean,text) to authenticated;

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
      p_curso_id, r.usuario_id, p_solicitar_correo, null
    );
    n := n + 1;
  end loop;
  return n;
end;
$$;
