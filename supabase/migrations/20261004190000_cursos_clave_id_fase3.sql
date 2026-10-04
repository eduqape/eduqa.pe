-- #112 · Fase 3 de 3: el slug deja de existir fuera de `cursos`.
--
-- Requiere el código de la fase 2 (lee y escribe por curso_id), ya en
-- producción. `cursos.slug` sigue siendo único: es la URL del curso, no una
-- clave. Las vistas conservan su columna `curso_slug` (ahora sale de `cursos`
-- por el id) para que el código que las lee no cambie, y suman `curso_id`.

begin;

-- Foto de las vistas antes del cambio, para comprobar que no cambia ningún resultado.
create temp table antes_popularidad on commit drop as select curso_slug, matriculas from public.v_popularidad;
create temp table antes_valoraciones on commit drop as select curso_slug, promedio, total from public.v_valoraciones;
create temp table antes_proximos on commit drop as select id, curso_slug, votos from public.v_proximos_cursos;

create or replace view public.v_popularidad as
select c.slug as curso_slug,
       count(*)::integer as matriculas,
       personas.curso_id
from (
  select m.curso_id, m.usuario_id
  from public.matriculas m
  where m.estado = any (array['activa', 'completada'])
  union
  select p.curso_id, p.usuario_id
  from public.pagos p
  where p.estado = 'pagado' and p.curso_id is not null
) personas
join public.cursos c on c.id = personas.curso_id
group by personas.curso_id, c.slug;

create or replace view public.v_valoraciones with (security_invoker = off) as
select c.slug as curso_slug,
       round(avg(v.estrellas), 2) as promedio,
       count(*)::integer as total,
       v.curso_id
from public.valoraciones v
join public.cursos c on c.id = v.curso_id
group by v.curso_id, c.slug;

create or replace view public.v_proximos_cursos with (security_invoker = false) as
select p.id, p.titulo, p.subtitulo, p.precio, p.icono, p.nivel, p.area, p.estado,
       c.slug as curso_slug,
       p.creada_en,
       count(v.propuesta_id)::integer as votos,
       p.curso_id
from public.propuestas_curso p
left join public.cursos c on c.id = p.curso_id
left join public.votos_propuesta_curso v on v.propuesta_id = p.id
where p.estado = any (array['en_votacion', 'priorizado', 'en_desarrollo', 'publicado'])
group by p.id, c.slug;

create or replace view public.v_propuestas_curso_internas with (security_invoker = false) as
select p.id, p.titulo, p.subtitulo, p.precio, p.icono, p.nivel, p.area, p.estado,
       p.prioridad_interna, p.creado_por,
       c.slug as curso_slug,
       p.creada_en, p.actualizada_en,
       count(v.propuesta_id)::integer as votos,
       p.curso_id
from public.propuestas_curso p
left join public.cursos c on c.id = p.curso_id
left join public.votos_propuesta_curso v on v.propuesta_id = p.id
where public.es_usuario_interno()
group by p.id, c.slug;

do $$
begin
  if exists (select * from antes_popularidad except select curso_slug, matriculas from public.v_popularidad)
     or exists (select curso_slug, matriculas from public.v_popularidad except select * from antes_popularidad) then
    raise exception 'v_popularidad cambió de resultado';
  end if;
  if exists (select * from antes_valoraciones except select curso_slug, promedio, total from public.v_valoraciones)
     or exists (select curso_slug, promedio, total from public.v_valoraciones except select * from antes_valoraciones) then
    raise exception 'v_valoraciones cambió de resultado';
  end if;
  if exists (select * from antes_proximos except select id, curso_slug, votos from public.v_proximos_cursos)
     or exists (select id, curso_slug, votos from public.v_proximos_cursos except select * from antes_proximos) then
    raise exception 'v_proximos_cursos cambió de resultado';
  end if;
end $$;

-- Sin sincronización: el slug ya no se copia a ninguna tabla.
do $$
declare t text;
begin
  foreach t in array array['cohortes','curso_contenido','curso_creadores','curso_sesiones',
                           'matriculas','pagos','progreso','regalos','valoraciones','propuestas_curso'] loop
    execute format('drop trigger if exists trg_%s_sync_id on public.%I', t, t);
  end loop;
end $$;
drop function public.sincroniza_curso_id_desde_slug();
drop trigger trg_propaga_slug_curso_legacy on public.cursos;
drop function public.propaga_slug_curso_legacy();

-- Índice por id que reemplaza a curso_creadores_curso_idx (curso_slug, orden).
create index curso_creadores_curso_id_orden_idx on public.curso_creadores (curso_id, orden);

alter table public.propuestas_curso drop constraint propuestas_curso_curso_slug_fkey;

-- Sin cascade: si algo más dependiera de estas columnas, la migración se detiene.
alter table public.cohortes drop column curso_slug;
alter table public.curso_contenido drop column curso_slug;
alter table public.curso_creadores drop column curso_slug;
alter table public.curso_sesiones drop column curso_slug;
alter table public.matriculas drop column curso_slug;
alter table public.pagos drop column curso_slug;
alter table public.progreso drop column curso_slug;
alter table public.regalos drop column curso_slug;
alter table public.valoraciones drop column curso_slug;
alter table public.propuestas_curso drop column curso_slug;

commit;
