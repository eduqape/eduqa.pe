-- Correcciones de la auditoría de base de datos del 2026-10-03.
-- Refs: #84, #85, #87, #91

-- #84 — emitir_certificado_para_usuario no comprueba el rol de quien llama.
-- La usan admin_emitir_certificado, admin_emitir_lote y los triggers de
-- certificación automática, que son SECURITY DEFINER y la ejecutan como su
-- dueño; nadie más tiene por qué invocarla por RPC.
revoke execute on function public.emitir_certificado_para_usuario(uuid, uuid, boolean)
  from public, anon, authenticated;

-- #85 — La verificación pública se hace por código, nunca listando la vista.
-- La versión anterior unía cohortes con INNER JOIN y no encontraba los
-- certificados emitidos por curso, que no tienen cohorte.
create or replace function public.verificar_certificado(p_codigo text)
returns table (
  codigo text,
  alumno text,
  curso_nombre text,
  horas numeric,
  dictada_en date,
  docente text,
  emitido_en timestamptz,
  vigente boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    ce.codigo,
    ce.alumno,
    coalesce(ce.curso_nombre, co.curso_nombre),
    coalesce(ce.horas, co.horas),
    coalesce(ce.dictada_en, co.dictada_en),
    coalesce(ce.docente, co.docente),
    ce.emitido_en,
    (ce.anulado_en is null)
  from public.certificados ce
  left join public.cohortes co on co.id = ce.cohorte_id
  where ce.codigo = upper(trim(p_codigo))
  limit 1;
$$;

revoke all on function public.verificar_certificado(text) from public;
grant execute on function public.verificar_certificado(text) to anon, authenticated;

-- #87 — Publicar por API exige rol vigente, autoría del curso y que el curso
-- siga en borrador. Solo un administrador puede sobrescribir un curso
-- publicado, porque es quien lo aprueba.
create or replace function public.publicar_curso_por_api(
  p_resumen text, p_slug text, p_titulo text, p_resumen_curso text,
  p_archivos jsonb, p_sesiones jsonb, p_codigo_base text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quien uuid;
  v_es_admin boolean;
  v_puede boolean;
  v_existe boolean;
  v_estado text;
  v_codigo_actual text;
  v_archivo text;
  v_sesion jsonb;
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
      where cc.curso_slug = p_slug and cc.usuario_id = v_quien
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
    set titulo = excluded.titulo, resumen = excluded.resumen;

  insert into public.curso_creadores (curso_slug, usuario_id, rol, orden)
  values (p_slug, v_quien, 'autor', 0)
  on conflict do nothing;

  delete from public.curso_contenido where curso_slug = p_slug;
  delete from public.curso_sesiones where curso_slug = p_slug;

  for v_archivo in select jsonb_object_keys(p_archivos) loop
    insert into public.curso_contenido (curso_slug, archivo, contenido)
    values (p_slug, v_archivo, p_archivos ->> v_archivo);
  end loop;

  for v_sesion in select * from jsonb_array_elements(p_sesiones) loop
    insert into public.curso_sesiones (curso_slug, archivo, numero, titulo, slug)
    values (p_slug, v_sesion ->> 'archivo', (v_sesion ->> 'numero')::int,
            v_sesion ->> 'titulo', v_sesion ->> 'slug')
    on conflict (curso_slug, archivo) do nothing;
  end loop;

  return public.registrar_revision_curso(p_slug);
end;
$$;

-- #91 — La base rechaza SVG con capacidad de ejecutar código, aunque se
-- escriban por REST sin pasar por la acción del panel.
alter table public.catalogo_propuestas
  drop constraint if exists catalogo_propuestas_svg_seguro;
alter table public.catalogo_propuestas
  add constraint catalogo_propuestas_svg_seguro check (
    svg is null or (
      char_length(svg) <= 65536
      and svg ~* '^\s*<svg[\s>]'
      and svg !~* '<\s*(script|foreignobject|iframe|object|embed|style|a|use|image|animate|set)\y'
      and svg !~* '[\s/"''](on[a-z]+|href|xlink:href)\s*='
      and svg !~* '(javascript|data|vbscript)\s*:'
      and svg !~* '<!\s*(entity|doctype)'
    )
  );
