-- #133 — Leer por API los archivos de un curso.
--
-- `publicar_curso_por_api` reemplaza el material completo: borra todo
-- `curso_contenido` del curso e inserta lo que llega. Para cambiar una sola
-- sesión sin perder las demás hace falta partir de lo publicado, y la API no
-- tenía cómo leerlo. Esta función lo devuelve con las mismas reglas que la
-- publicación: clave vigente, rol que permite publicar y autoría del curso,
-- salvo para un administrador.

create or replace function public.leer_curso_por_api(p_resumen text, p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_quien uuid;
  v_es_admin boolean;
  v_puede boolean;
  v_curso_id uuid;
  v_archivos jsonb;
begin
  select c.usuario_id into v_quien
  from public.claves_api c
  where c.resumen = p_resumen and c.revocada_en is null;
  if v_quien is null then
    raise exception 'clave no autorizada';
  end if;

  select coalesce(p.es_admin, false) or p.rol = 'admin',
         coalesce(p.es_admin, false) or p.rol in ('desarrollador', 'agente', 'gestor', 'admin')
    into v_es_admin, v_puede
  from public.perfiles p
  where p.id = v_quien;
  if not coalesce(v_puede, false) then
    raise exception 'Tu rol no permite leer cursos por API';
  end if;

  select id into v_curso_id from public.cursos where slug = p_slug;
  if v_curso_id is null then
    raise exception 'No existe el curso %', p_slug;
  end if;

  if not v_es_admin and not exists (
    select 1 from public.curso_creadores cc
    where cc.curso_id = v_curso_id and cc.usuario_id = v_quien
  ) then
    raise exception 'Solo los autores del curso pueden leerlo por API';
  end if;

  select coalesce(jsonb_object_agg(archivo, contenido), '{}'::jsonb) into v_archivos
  from public.curso_contenido
  where curso_id = v_curso_id;

  return v_archivos;
end;
$$;

revoke all on function public.leer_curso_por_api(text, text) from public;
grant execute on function public.leer_curso_por_api(text, text) to anon, authenticated;
