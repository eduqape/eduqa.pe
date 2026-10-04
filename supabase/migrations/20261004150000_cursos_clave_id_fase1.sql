-- #112 · Fase 1 de 3: el id del curso pasa a ser la clave en todo el esquema.
--
-- Compatible con el código que todavía escribe `curso_slug`: el trigger de
-- sincronización ahora funciona en los dos sentidos (slug → id para el código
-- anterior, id → slug para el nuevo) y los índices únicos por slug se conservan
-- hasta la fase 3 para que sus `upsert` sigan encontrando su conflicto.

begin;

-- Respaldo dentro de la propia base, fuera del esquema expuesto por la API.
create schema if not exists respaldo_slug;
revoke all on schema respaldo_slug from public, anon, authenticated;
create table respaldo_slug.cursos as table public.cursos;
create table respaldo_slug.curso_contenido as table public.curso_contenido;
create table respaldo_slug.curso_creadores as table public.curso_creadores;
create table respaldo_slug.curso_sesiones as table public.curso_sesiones;
create table respaldo_slug.matriculas as table public.matriculas;
create table respaldo_slug.pagos as table public.pagos;
create table respaldo_slug.progreso as table public.progreso;
create table respaldo_slug.valoraciones as table public.valoraciones;
create table respaldo_slug.propuestas_curso as table public.propuestas_curso;
create table respaldo_slug.cohortes as table public.cohortes;
create table respaldo_slug.regalos as table public.regalos;

-- Sincronización en los dos sentidos. Si llega el id, manda el id.
create or replace function public.sincroniza_curso_id_desde_slug()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.curso_id is not null
     and (tg_op = 'INSERT' or new.curso_id is distinct from old.curso_id) then
    select c.slug into new.curso_slug from public.cursos c where c.id = new.curso_id;
    if new.curso_slug is null then
      raise exception 'El curso % no existe.', new.curso_id;
    end if;
  elsif new.curso_slug is not null
     and (tg_op = 'INSERT' or new.curso_slug is distinct from old.curso_slug) then
    select c.id into new.curso_id from public.cursos c where c.slug = new.curso_slug;
    if new.curso_id is null then
      raise exception 'El curso «%» no existe.', new.curso_slug;
    end if;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['cohortes','curso_contenido','curso_creadores','curso_sesiones',
                           'matriculas','pagos','progreso','regalos','valoraciones'] loop
    execute format('drop trigger if exists trg_%s_sync_id on public.%I', t, t);
    execute format('create trigger trg_%s_sync_id before insert or update of curso_slug, curso_id '
                   'on public.%I for each row execute function public.sincroniza_curso_id_desde_slug()', t, t);
  end loop;
end $$;

-- Claves primarias por id. Los índices únicos por id ya existían: se promueven
-- a clave primaria en vez de duplicarlos. El índice por slug queda solo
-- mientras dure la transición.
alter table public.progreso drop constraint progreso_pkey;
create unique index progreso_slug_transicion_uidx on public.progreso (usuario_id, curso_slug, leccion_slug);
alter table public.progreso
  add constraint progreso_pkey primary key using index progreso_usuario_curso_id_leccion_uidx;

alter table public.curso_sesiones drop constraint curso_sesiones_pkey;
create unique index curso_sesiones_slug_transicion_uidx on public.curso_sesiones (curso_slug, archivo);
alter table public.curso_sesiones
  add constraint curso_sesiones_pkey primary key using index curso_sesiones_curso_id_archivo_uidx;

alter table public.curso_contenido drop constraint curso_contenido_pkey;
create unique index curso_contenido_slug_transicion_uidx on public.curso_contenido (curso_slug, archivo);
alter table public.curso_contenido
  add constraint curso_contenido_pkey primary key using index curso_contenido_curso_id_archivo_uidx;

alter table public.valoraciones drop constraint valoraciones_pkey;
create unique index valoraciones_slug_transicion_uidx on public.valoraciones (curso_slug, usuario_id);
alter table public.valoraciones
  add constraint valoraciones_pkey primary key using index valoraciones_curso_id_usuario_uidx;

alter table public.curso_creadores drop constraint curso_creadores_pkey;
create unique index curso_creadores_slug_transicion_uidx on public.curso_creadores (curso_slug, usuario_id);
alter table public.curso_creadores
  add constraint curso_creadores_pkey primary key using index curso_creadores_curso_id_usuario_uidx;

-- matriculas ya tiene su único por id (matriculas_usuario_curso_id_uidx).

-- Las propuestas apuntan al curso por id.
alter table public.propuestas_curso
  add column curso_id uuid references public.cursos(id) on update cascade on delete set null;
update public.propuestas_curso p set curso_id = c.id from public.cursos c where c.slug = p.curso_slug;
create trigger trg_propuestas_curso_sync_id before insert or update of curso_slug, curso_id
  on public.propuestas_curso for each row execute function public.sincroniza_curso_id_desde_slug();

-- Políticas: misma regla, comparando por id.
alter policy "matriculado ve su curso" on public.cursos using (exists (
  select 1 from public.matriculas m
  where m.curso_id = cursos.id and m.usuario_id = (select auth.uid())));

alter policy "indice visible" on public.curso_sesiones using (exists (
  select 1 from public.cursos c
  where c.id = curso_sesiones.curso_id and c.estado = 'publico'));

alter policy "contenido segun acceso" on public.curso_contenido using (
  exists (select 1 from public.cursos c
          where c.id = curso_contenido.curso_id and c.estado = 'publico'
            and (curso_contenido.archivo = 'curso.md' or c.acceso_libre))
  or exists (select 1 from public.matriculas m
             where m.curso_id = curso_contenido.curso_id and m.usuario_id = (select auth.uid()))
  or exists (select 1 from public.perfiles p
             where p.id = (select auth.uid()) and p.es_admin));

alter policy "valoro lo que curso" on public.valoraciones with check (
  usuario_id = (select auth.uid())
  and exists (select 1 from public.matriculas m
              where m.curso_id = valoraciones.curso_id and m.usuario_id = (select auth.uid())));

-- Funciones que usaban el slug como clave.
create or replace function public.activar_matricula_pagada()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.estado = 'pagado'
     and (old.estado is distinct from 'pagado')
     and new.curso_id is not null then
    new.pagado_en := coalesce(new.pagado_en, now());

    insert into public.matriculas (usuario_id, curso_id, estado, pagada)
    values (new.usuario_id, new.curso_id, 'activa', true)
    on conflict (usuario_id, curso_id)
      do update set estado = 'activa', pagada = true;
  end if;
  return new;
end;
$$;

create or replace function public.autor_por_defecto()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is not null then
    insert into public.curso_creadores (curso_id, usuario_id, rol, orden)
    values (new.id, auth.uid(), 'autor', 0)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.registrar_revision_curso(p_slug text)
returns text
language plpgsql
set search_path to 'public'
as $$
declare
  v_actual public.cursos%rowtype;
  v_hash text;
begin
  select * into v_actual from public.cursos where slug = p_slug for update;
  if not found then
    raise exception 'El curso % no existe', p_slug;
  end if;

  select md5(jsonb_build_object(
    'titulo', v_actual.titulo,
    'resumen', v_actual.resumen,
    'contenido', coalesce(jsonb_object_agg(archivo, contenido order by archivo), '{}'::jsonb)
  )::text)
    into v_hash
  from public.curso_contenido
  where curso_id = v_actual.id;

  if v_actual.revision_hash is null then
    update public.cursos set revision_hash = v_hash where id = v_actual.id;
  elsif v_actual.revision_hash <> v_hash then
    update public.cursos
       set revision = revision + 1, revision_hash = v_hash
     where id = v_actual.id;
  end if;

  return (select codigo from public.cursos where id = v_actual.id);
end;
$$;
CREATE OR REPLACE FUNCTION public.admin_matriculados_certificacion()
 RETURNS TABLE(curso_id uuid, curso_slug text, curso_titulo text, usuario_id uuid, nombre text, email text, estado text, completada_en timestamp with time zone, certificado_id uuid, codigo text, anulado_en timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select
    m.curso_id,
    c.slug,
    c.titulo,
    m.usuario_id,
    coalesce(nullif(trim(p.nombre), ''), split_part(u.email, '@', 1)) as nombre,
    u.email,
    m.estado,
    m.completada_en,
    ce.id,
    ce.codigo,
    ce.anulado_en
  from public.matriculas m
  join public.cursos c on c.id = m.curso_id
  join auth.users u on u.id = m.usuario_id
  left join public.perfiles p on p.id = m.usuario_id
  left join public.certificados ce
    on ce.curso_id = m.curso_id and ce.usuario_id = m.usuario_id
  where public.es_admin_actual()
  order by c.titulo, nombre, u.email;
$function$

;
CREATE OR REPLACE FUNCTION public.publicar_curso_por_api(p_resumen text, p_slug text, p_titulo text, p_resumen_curso text, p_archivos jsonb, p_sesiones jsonb, p_codigo_base text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_quien uuid;
  v_es_admin boolean;
  v_puede boolean;
  v_existe boolean;
  v_estado text;
  v_codigo_actual text;
  v_archivo text;
  v_sesion jsonb;
  v_curso_id uuid;
begin
  select c.usuario_id into v_quien
  from public.claves_api c
  where c.resumen = p_resumen and c.revocada_en is null;
  if v_quien is null then
    raise exception 'clave no autorizada';
  end if;

  -- El rol se comprueba al usar la clave, no solo al emitirla: una persona
  -- que deja de ser desarrolladora no sigue publicando con su clave antigua.
  select coalesce(p.es_admin, false) or p.rol = 'admin',
         coalesce(p.es_admin, false) or p.rol in ('desarrollador', 'agente', 'gestor', 'admin')
    into v_es_admin, v_puede
  from public.perfiles p
  where p.id = v_quien;
  if not coalesce(v_puede, false) then
    raise exception 'Tu rol no permite publicar cursos por API';
  end if;

  if jsonb_typeof(p_archivos) <> 'object' or not p_archivos ? 'curso.md'
     or jsonb_typeof(p_sesiones) <> 'array' then
    raise exception 'El material del curso no es válido';
  end if;

  select true, codigo_base, estado into v_existe, v_codigo_actual, v_estado
  from public.cursos where slug = p_slug for update;

  if coalesce(v_existe, false) and not v_es_admin then
    if not exists (
      select 1 from public.curso_creadores cc
      join public.cursos c on c.id = cc.curso_id
      where c.slug = p_slug and cc.usuario_id = v_quien
    ) then
      raise exception 'Solo los autores del curso pueden actualizarlo por API';
    end if;
    if v_estado is distinct from 'borrador' then
      raise exception 'El curso está publicado; pásalo a borrador desde el panel antes de enviar cambios por API';
    end if;
  end if;

  if v_codigo_actual is null and p_codigo_base is null then
    raise exception 'Un curso nuevo debe declarar codigo: ABCD en curso.md';
  end if;
  if p_codigo_base is not null and p_codigo_base !~ '^[A-Z]{4}$' then
    raise exception 'El código debe tener cuatro letras mayúsculas';
  end if;
  if v_codigo_actual is not null and p_codigo_base is not null
     and v_codigo_actual <> p_codigo_base then
    raise exception 'El código de un curso existente no se puede cambiar';
  end if;

  insert into public.cursos
    (slug, titulo, resumen, precio, estado, acceso_libre, orden, codigo_base)
  values
    (p_slug, p_titulo, p_resumen_curso, 20, 'borrador', false, 99,
     coalesce(v_codigo_actual, p_codigo_base))
  on conflict (slug) do update
    set titulo = excluded.titulo, resumen = excluded.resumen
  returning id into v_curso_id;

  insert into public.curso_creadores (curso_id, usuario_id, rol, orden)
  values (v_curso_id, v_quien, 'autor', 0)
  on conflict do nothing;

  delete from public.curso_contenido where curso_id = v_curso_id;
  delete from public.curso_sesiones where curso_id = v_curso_id;

  for v_archivo in select jsonb_object_keys(p_archivos) loop
    insert into public.curso_contenido (curso_id, archivo, contenido)
    values (v_curso_id, v_archivo, p_archivos ->> v_archivo);
  end loop;

  for v_sesion in select * from jsonb_array_elements(p_sesiones) loop
    insert into public.curso_sesiones (curso_id, archivo, numero, titulo, slug)
    values (v_curso_id, v_sesion ->> 'archivo', (v_sesion ->> 'numero')::int,
            v_sesion ->> 'titulo', v_sesion ->> 'slug')
    on conflict (curso_id, archivo) do nothing;
  end loop;

  return public.registrar_revision_curso(p_slug);
end;
$function$;

commit;
