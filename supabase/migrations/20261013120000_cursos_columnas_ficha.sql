-- Ficha del curso en columnas de `cursos`, para que el panel liste, filtre,
-- busque y pagine en la base.
--
-- Área, nivel, formato, horas e icono viven en el frontmatter de curso.md. El
-- panel los leía de ahí bajando la ficha de todos los cursos en cada visita,
-- lo que crece con el catálogo. Aquí se copian a columnas con un disparador
-- sobre `curso_contenido`: cualquier camino que escriba la ficha (panel,
-- editor, API, SQL) las mantiene al día sin tocar su código.
--
-- `busqueda` junta título, código, dirección y área en minúsculas y sin
-- tildes, para buscar con ILIKE sin depender de la extensión unaccent.

begin;

alter table public.cursos
  add column if not exists area text,
  add column if not exists nivel text,
  add column if not exists formato text,
  add column if not exists horas numeric,
  add column if not exists icono text,
  add column if not exists busqueda text;

-- Un escalar del frontmatter. Las claves de la ficha ocupan una sola línea;
-- las comillas que las rodean se quitan.
create or replace function public.campo_de_ficha(cabecera text, clave text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(btrim(substring(cabecera from '(?n)^' || clave || ':[ \t]*(.*?)[ \t]*$'), '"'''), '')
$$;

-- Minúsculas y sin tildes, igual que `normalizar` en src/lib/cursos-panel-filtro.ts.
create or replace function public.normalizar_busqueda(texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(translate(
    coalesce(texto, ''),
    'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãéèëêíìïîóòöôõúùüûñç',
    'AAAAAEEEEIIIIOOOOOUUUUNCaaaaaeeeeiiiiooooouuuunc'
  ))
$$;

-- Copia la ficha a la fila del curso cada vez que curso.md cambia. Es
-- SECURITY DEFINER porque escribe columnas derivadas de un contenido que quien
-- lo guarda ya tenía permiso para escribir; no acepta datos de otra fuente.
create or replace function public.copiar_ficha_a_curso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cabecera text;
  v_horas text;
begin
  if tg_op = 'DELETE' then
    if old.archivo = 'curso.md' then
      update public.cursos
         set area = null, nivel = null, formato = null, horas = null, icono = null
       where id = old.curso_id;
    end if;
    return old;
  end if;

  if new.archivo <> 'curso.md' then
    return new;
  end if;

  v_cabecera := substring(new.contenido from '^\ufeff?---\r?\n(.*?)\r?\n---');
  v_horas := regexp_replace(coalesce(public.campo_de_ficha(v_cabecera, 'horas'), ''), '[^0-9.]', '', 'g');

  update public.cursos
     set area = public.campo_de_ficha(v_cabecera, 'area'),
         nivel = public.campo_de_ficha(v_cabecera, 'nivel'),
         formato = coalesce(public.campo_de_ficha(v_cabecera, 'formato'), public.campo_de_ficha(v_cabecera, 'tipo')),
         horas = case when v_horas ~ '^[0-9]+(\.[0-9]+)?$' then v_horas::numeric end,
         icono = public.campo_de_ficha(v_cabecera, 'icono')
   where id = new.curso_id;
  return new;
end;
$$;

drop trigger if exists trg_curso_contenido_ficha on public.curso_contenido;
create trigger trg_curso_contenido_ficha
  after insert or update of contenido, archivo or delete on public.curso_contenido
  for each row execute function public.copiar_ficha_a_curso();

create or replace function public.preparar_busqueda_curso()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- `codigo` es una columna generada y en un BEFORE todavía no está calculada.
  new.busqueda := public.normalizar_busqueda(concat_ws(' ',
    new.titulo,
    new.codigo_base || '-' || lpad(new.revision::text, 4, '0'),
    new.slug,
    new.area));
  return new;
end;
$$;

drop trigger if exists trg_cursos_busqueda on public.cursos;
create trigger trg_cursos_busqueda
  before insert or update of titulo, codigo_base, revision, slug, area on public.cursos
  for each row execute function public.preparar_busqueda_curso();

-- Relleno de lo que ya existe. El disparador de hitos pondría
-- `actualizado_en = now()` en todos los cursos y borraría el orden de «editados
-- recientemente»; copiar la ficha no es una edición.
alter table public.cursos disable trigger trg_hitos_editoriales_curso;

update public.cursos c
   set area = public.campo_de_ficha(f.cabecera, 'area'),
       nivel = public.campo_de_ficha(f.cabecera, 'nivel'),
       formato = coalesce(public.campo_de_ficha(f.cabecera, 'formato'), public.campo_de_ficha(f.cabecera, 'tipo')),
       horas = case when f.horas ~ '^[0-9]+(\.[0-9]+)?$' then f.horas::numeric end,
       icono = public.campo_de_ficha(f.cabecera, 'icono')
  from (
    select curso_id,
           cabecera,
           regexp_replace(coalesce(public.campo_de_ficha(cabecera, 'horas'), ''), '[^0-9.]', '', 'g') as horas
      from (
        select curso_id, substring(contenido from '^\ufeff?---\r?\n(.*?)\r?\n---') as cabecera
          from public.curso_contenido
         where archivo = 'curso.md'
      ) cc
  ) f
 where f.curso_id = c.id;

-- Los cursos sin ficha también necesitan su texto de búsqueda.
update public.cursos
   set busqueda = public.normalizar_busqueda(concat_ws(' ',
     titulo, codigo_base || '-' || lpad(revision::text, 4, '0'), slug, area));

alter table public.cursos enable trigger trg_hitos_editoriales_curso;

create index if not exists cursos_estado_idx on public.cursos (estado);
create index if not exists cursos_area_idx on public.cursos (area);
create index if not exists cursos_actualizado_en_idx on public.cursos (actualizado_en desc nulls last);

commit;
