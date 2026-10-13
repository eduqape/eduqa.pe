-- Ataques reales contra la base, como un alumno cualquiera, dentro de una
-- transacción que SIEMPRE se deshace: el bloque termina en una excepción con
-- los resultados, así que nada de lo que intenta queda escrito.
-- Lo ejecuta scripts/seguridad/conducta-db.mjs. No imprime ids de usuarios.
begin;
do $prueba$
declare
  u uuid; c_pub uuid; c_borr uuid; v_precio numeric; m uuid; p uuid;
  res text[] := '{}'; r text; n int;
begin
  select id into u from public.perfiles where not es_admin and rol = 'alumno'
    and id not in (select usuario_id from public.matriculas where estado = 'activa' and not pagada)
    limit 1;
  -- Cursos en los que ese alumno no está matriculado: no se toca nada suyo.
  select id, precio into c_pub, v_precio from public.cursos where estado = 'publico' and precio > 0
    and id not in (select curso_id from public.matriculas where usuario_id = u) limit 1;
  select id into c_borr from public.cursos where estado <> 'publico'
    and id not in (select curso_id from public.matriculas where usuario_id = u) limit 1;
  res := res || format('preparación: alumno=%s curso_publico=%s borrador=%s', u is not null, c_pub is not null, c_borr is not null);

  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  -- #136: el rol no cambia; el nombre sí.
  update public.perfiles set rol = 'admin', nombre = coalesce(nombre, 'x') where id = u;
  select rol into r from public.perfiles where id = u;
  res := res || (case when r = 'alumno' then 'T1 pedir rol admin: sigue alumno' else 'T1 FALLA: ahora es ' || r end);

  -- #137: columnas que el alumno no puede escribir.
  begin
    insert into public.matriculas (usuario_id, curso_id, pagada) values (u, c_pub, true);
    res := res || 'T2 FALLA: insertó pagada';
  exception when others then res := res || ('T2 insertar pagada rechazado: ' || sqlstate); end;

  begin
    insert into public.matriculas (usuario_id, curso_id) values (u, c_borr);
    res := res || 'T3 FALLA: se matriculó en borrador';
  exception when others then res := res || ('T3 borrador rechazado: ' || sqlerrm); end;

  begin
    insert into public.matriculas (usuario_id, curso_id) values (u, c_pub) returning id into m;
    select case when estado = 'activa' and not pagada then 'T4 matrícula normal: activa y sin pagar'
                else format('T4 FALLA: estado %s, pagada %s', estado, pagada) end
      into r from public.matriculas where id = m;
    res := res || r;
  exception when others then res := res || ('T4 FALLA matrícula normal: ' || sqlerrm); end;

  begin
    update public.matriculas set curso_id = c_borr where id = m;
    res := res || 'T5 FALLA: cambió el curso';
  exception when others then res := res || ('T5 cambiar curso rechazado: ' || sqlstate); end;

  begin
    update public.matriculas set estado = 'completada', completada_en = now() where id = m;
    select 'T6 completar: ' || estado into r from public.matriculas where id = m;
    res := res || r;
  exception when others then res := res || ('T6 FALLA completar: ' || sqlerrm); end;

  begin
    update public.matriculas set estado = 'activa' where id = m;
    res := res || 'T7 FALLA: reabrió';
  exception when others then res := res || ('T7 reabrir rechazado: ' || sqlerrm); end;

  -- #138: el importe lo fija la base; el curso no se cambia.
  begin
    insert into public.pagos (usuario_id, curso_id, concepto, monto, vence_en)
      values (u, c_pub, 'curso', 0.01, now() + interval '1 day') returning id into p;
    select case when monto = v_precio then format('T8 pago con monto 0.01 se guarda al precio real (%s)', monto)
                else format('T8 FALLA: se guardó monto %s y el curso cuesta %s', monto, v_precio) end
      into r from public.pagos where id = p;
    res := res || r;
  exception when others then res := res || ('T8 FALLA insertar pago: ' || sqlerrm); end;

  begin
    update public.pagos set curso_id = c_borr where id = p;
    res := res || 'T9 FALLA: cambió el curso del pago';
  exception when others then res := res || ('T9 cambiar curso del pago rechazado: ' || sqlstate); end;

  begin
    update public.pagos set crudo = '{"imagen":"x"}', tag_id = 't' where id = p;
    get diagnostics n = row_count;
    res := res || ('T10 guardar QR filas=' || n);
  exception when others then res := res || ('T10 FALLA guardar QR: ' || sqlerrm); end;

  -- #139: anon no lee regalos.
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
  begin
    perform count(*) from public.regalos;
    res := res || 'T11 FALLA: anon lee regalos';
  exception when others then res := res || ('T11 anon regalos rechazado: ' || sqlstate); end;

  raise exception 'RESULTADOS %', array_to_string(res, ' || ');
end;
$prueba$;
rollback;
