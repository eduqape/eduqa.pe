-- Correcciones de la auditoría de seguridad del 2026-10-12.
-- Hallazgos verificados contra las políticas y funciones de producción.
--
-- Las columnas que un alumno no debe tocar se protegen con triggers que miran
-- el rol de la petición (`auth.role()`): `authenticated` y `anon` son quien
-- llega por PostgREST con su propia sesión. El SQL del panel de Supabase, el
-- service role y las funciones SECURITY DEFINER (pago confirmado por Niubiz,
-- certificación) no llevan ese rol y conservan su comportamiento.

-- #136 — Un usuario se ascendía a sí mismo cambiando `perfiles.rol`.
-- La política "edita su perfil" deja actualizar la fila propia y el trigger
-- solo protegía es_admin y plan. Con rol = 'admin' se emitía una clave de API
-- y publicar_curso_por_api lo trataba como administrador: sobrescribía
-- cualquier curso, incluso publicado, y abría recursos internos y assets.
create or replace function public.perfil_campos_protegidos()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Un usuario no se asciende a administrador ni se cambia el plan a sí
  -- mismo: esos campos conservan siempre su valor anterior.
  new.plan := old.plan;
  new.es_admin := old.es_admin;
  new.plan_hasta := old.plan_hasta;
  new.id := old.id;
  new.creado_en := old.creado_en;
  -- El rol solo se asigna desde el panel de Supabase o con el service role.
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    new.rol := old.rol;
  end if;
  return new;
end;
$$;

-- #137 — Matrículas escritas a mano por la API REST.
-- Con INSERT y UPDATE sobre todas las columnas, un alumno se marcaba
-- `pagada = true` (salta el límite de dos cursos gratis), se matriculaba en
-- cursos en borrador (su contenido queda legible por RLS), cambiaba el curso
-- de una matrícula o le asignaba una cohorte y la daba por completada, que
-- dispara la certificación automática.
create or replace function public.matricula_campos_protegidos()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon')
     or public.es_admin_actual() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.estado := 'activa';
    new.pagada := false;
    new.cohorte_id := null;
    new.completada_en := null;
    if not exists (
      select 1 from public.cursos c
      where c.id = new.curso_id and c.estado = 'publico'
    ) then
      raise exception 'curso_no_disponible'
        using errcode = '42501', hint = 'Solo se puede matricular en cursos publicados.';
    end if;
    return new;
  end if;

  new.id := old.id;
  new.usuario_id := old.usuario_id;
  new.curso_id := old.curso_id;
  new.pagada := old.pagada;
  new.cohorte_id := old.cohorte_id;
  new.creada_en := old.creada_en;
  -- Lo único que decide el alumno es dar un curso por terminado.
  if new.estado is distinct from old.estado
     and not (old.estado = 'activa' and new.estado = 'completada') then
    raise exception 'cambio_de_estado_no_permitido' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists matricula_campos_protegidos on public.matriculas;
-- Se llama así para dispararse antes que trg_limite_matriculas (orden
-- alfabético): el límite tiene que ver la matrícula ya saneada.
create trigger matricula_campos_protegidos
  before insert or update on public.matriculas
  for each row execute function public.matricula_campos_protegidos();

revoke insert, update on public.matriculas from anon, authenticated;
grant insert (usuario_id, curso_id) on public.matriculas to authenticated;
grant update (estado, completada_en) on public.matriculas to authenticated;

-- #138 — Un pago pendiente se podía cambiar de curso o de importe.
-- El QR se genera con el precio del curso A; el alumno cambiaba `curso_id`
-- al curso B antes de pagar y el callback, que compara el importe con la
-- fila, activaba la matrícula de B.
create or replace function public.pago_campos_protegidos()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_precio numeric;
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;
  select c.precio into v_precio
  from public.cursos c
  where c.id = new.curso_id and c.estado = 'publico';
  if v_precio is null or v_precio <= 0 then
    raise exception 'curso_sin_precio' using errcode = '42501';
  end if;
  new.monto := v_precio;
  new.estado := 'pendiente';
  new.tag_id := null;
  new.transaction_id := null;
  new.numero_operacion := null;
  new.purchase_number := null;
  new.pagado_en := null;
  return new;
end;
$$;

drop trigger if exists pago_campos_protegidos on public.pagos;
create trigger pago_campos_protegidos
  before insert on public.pagos
  for each row execute function public.pago_campos_protegidos();

revoke insert, update on public.pagos from anon, authenticated;
grant insert (usuario_id, curso_id, concepto, monto, vence_en) on public.pagos to authenticated;
-- La acción de pago guarda aquí el QR que devuelve Niubiz.
grant update (tag_id, vence_en, crudo) on public.pagos to authenticated;

-- #139 — Códigos de regalo legibles y canjeables por cualquiera.
-- "regalos_legibles" (using true) los listaba a anon, y
-- "regalo_canjeable_por_dueno" dejaba reclamar cualquiera sin conocerlo.
-- La aplicación no usa la tabla todavía: queda solo para administradores.
drop policy if exists regalos_legibles on public.regalos;
drop policy if exists regalo_canjeable_por_dueno on public.regalos;
create policy regalos_admin_leer on public.regalos
  for select to authenticated
  using (public.es_admin_actual());
revoke all on public.regalos from anon;

-- #144 — Cualquier usuario con sesión leía los datos de contacto de
-- `interesados` (nombre, correo, WhatsApp): la política era `using (true)`.
drop policy if exists "autenticados leen interesados" on public.interesados;
create policy "admin lee interesados" on public.interesados
  for select to authenticated
  using (public.es_admin_actual());
