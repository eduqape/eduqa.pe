/**
 * Permisos de la base de producción: RLS, privilegios por columna, triggers
 * de protección y funciones SECURITY DEFINER.
 *
 * Solo consulta el catálogo de PostgreSQL (pg_policies, grants, pg_proc); no
 * lee datos de usuarios ni escribe. Se conecta de dos formas:
 *
 * - En CI, con los secretos SUPABASE_ACCESS_TOKEN y SUPABASE_PROJECT_REF, por
 *   la API de administración de Supabase.
 * - En local, con el CLI de Supabase enlazado al proyecto (`supabase link`).
 *
 * Sin ninguna de las dos se omite con un aviso visible: una prueba de
 * seguridad que no corre no puede darse por aprobada en silencio.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;

function cliEnlazado() {
  if (process.env.GITHUB_ACTIONS || !existsSync("supabase/.temp/project-ref")) return false;
  try {
    execFileSync("supabase", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const modo = TOKEN && REF ? "api" : cliEnlazado() ? "cli" : null;
if (!modo) {
  const aviso = "Pruebas de la base omitidas: faltan SUPABASE_ACCESS_TOKEN y SUPABASE_PROJECT_REF.";
  console.log(process.env.GITHUB_ACTIONS ? `::warning::${aviso}` : aviso);
}

async function consultar(sql) {
  if (modo === "api") {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ query: sql, read_only: true }),
    });
    if (!r.ok) throw new Error(`API de Supabase ${r.status}: ${await r.text()}`);
    return r.json();
  }
  const salida = execFileSync("supabase", ["db", "query", "--linked", "--output-format", "json", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return JSON.parse(salida.slice(salida.indexOf("{"))).rows;
}

const prueba = (nombre, fn) => test(nombre, { skip: !modo && "sin acceso a la base" }, fn);
const filas = async (sql) => (await consultar(sql)).map((f) => Object.values(f)[0]);

prueba("todas las tablas públicas tienen RLS", async () => {
  const sinRls = await filas(`
    select c.relname from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and not c.relrowsecurity
    order by 1`);
  assert.deepEqual(sinRls, []);
});

prueba("un usuario no se cambia el rol ni se hace admin (#136)", async () => {
  const [cuerpo] = await filas(`select pg_get_functiondef('public.perfil_campos_protegidos'::regproc)`);
  for (const campo of ["es_admin", "plan", "plan_hasta", "rol"]) {
    assert.match(cuerpo, new RegExp(`new\\.${campo}\\s*:=\\s*old\\.${campo}`), `protege ${campo}`);
  }
  const activo = await filas(`
    select tgname from pg_trigger
    where tgrelid = 'public.perfiles'::regclass and tgfoid = 'public.perfil_campos_protegidos'::regproc
      and tgenabled <> 'D'`);
  assert.equal(activo.length, 1, "el trigger está activo");
});

/** Columnas de `tabla` que `rol` puede escribir con `privilegio`. */
const columnasEscribibles = (tabla, privilegio, rol = "authenticated") =>
  // pg_attribute de la tabla exacta: information_schema mezcla tablas con el
  // mismo nombre en otros esquemas y has_column_privilege falla con ellas.
  filas(`
    select a.attname::text from pg_attribute a
    where a.attrelid = 'public.${tabla}'::regclass and a.attnum > 0 and not a.attisdropped
      and has_column_privilege('${rol}', a.attrelid, a.attnum, '${privilegio}')
    order by 1`);

prueba("el alumno solo escribe en su matrícula lo que le toca (#137)", async () => {
  assert.deepEqual(await columnasEscribibles("matriculas", "INSERT"), ["curso_id", "usuario_id"]);
  assert.deepEqual(await columnasEscribibles("matriculas", "UPDATE"), ["completada_en", "estado"]);
  assert.deepEqual(await columnasEscribibles("matriculas", "INSERT", "anon"), []);
  const triggers = await filas(`
    select tgname from pg_trigger
    where tgrelid = 'public.matriculas'::regclass and not tgisinternal and tgenabled <> 'D' order by 1`);
  assert.ok(triggers.includes("matricula_campos_protegidos"), "trigger de protección");
  // Se dispara antes que el límite de cursos gratis, que mira `pagada`.
  assert.ok(triggers.indexOf("matricula_campos_protegidos") < triggers.indexOf("trg_limite_matriculas"));
});

prueba("un pago no cambia de curso ni de importe (#138)", async () => {
  assert.deepEqual(await columnasEscribibles("pagos", "UPDATE"), ["crudo", "tag_id", "vence_en"]);
  for (const col of await columnasEscribibles("pagos", "INSERT")) {
    assert.ok(["concepto", "curso_id", "monto", "usuario_id", "vence_en"].includes(col), `INSERT ${col}`);
  }
  const [cuerpo] = await filas(`select pg_get_functiondef('public.pago_campos_protegidos'::regproc)`);
  assert.match(cuerpo, /new\.monto\s*:=\s*v_precio/, "el importe sale del precio del curso");
});

prueba("los datos privados no son legibles por cualquiera (#139)", async () => {
  // Políticas con `using (true)`: solo en tablas cuyo contenido es público.
  const PUBLICAS = new Set(["configuracion", "marca_recursos", "rutas", "catalogo_propuestas", "reclamaciones"]);
  const abiertas = await consultar(`
    select tablename, policyname, cmd from pg_policies
    where schemaname = 'public' and (qual = 'true' or with_check = 'true') order by 1`);
  const indebidas = abiertas.filter((p) => !PUBLICAS.has(p.tablename)).map((p) => `${p.tablename}: ${p.policyname}`);
  assert.deepEqual(indebidas, []);
  // `reclamaciones` admite INSERT anónimo (libro de reclamaciones), nunca lectura.
  assert.ok(!abiertas.some((p) => p.tablename === "reclamaciones" && p.cmd !== "INSERT"));
});

prueba("las funciones SECURITY DEFINER fijan search_path", async () => {
  // auto_confirm_user queda pendiente con el flujo de registro (#141).
  const PENDIENTES = new Set(["auto_confirm_user"]);
  const sinRuta = (
    await filas(`
      select p.proname from pg_proc p
      where p.pronamespace = 'public'::regnamespace and p.prosecdef
        and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
      order by 1`)
  ).filter((f) => !PENDIENTES.has(f));
  assert.deepEqual(sinRuta, []);
});

prueba("anon solo ejecuta las funciones privilegiadas previstas", async () => {
  const PREVISTAS = new Set([
    "autorizar_clave_api", // API de cursos: la clave se comprueba dentro
    "leer_curso_por_api",
    "publicar_curso_por_api",
    "registrar_reclamacion", // libro de reclamaciones, sin cuenta
    "verificar_certificado", // verificación pública por código
  ]);
  const ejecutables = await filas(`
    select distinct p.proname from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prosecdef
      and p.prorettype <> 'trigger'::regtype
      and has_function_privilege('anon', p.oid, 'execute') order by 1`);
  assert.deepEqual(ejecutables.filter((f) => !PREVISTAS.has(f)), []);
});

prueba("nadie emite certificados por RPC directo (#84)", async () => {
  const roles = await filas(`
    select r from unnest(array['anon', 'authenticated']) r
    where has_function_privilege(r, 'public.emitir_certificado_para_usuario(uuid, uuid, boolean)', 'execute')`);
  assert.deepEqual(roles, []);
});

prueba("las claves de API solo las ve su dueño", async () => {
  const politicas = await consultar(`
    select policyname, cmd, roles::text as roles, coalesce(qual, '') as qual from pg_policies
    where schemaname = 'public' and tablename = 'claves_api'`);
  for (const p of politicas) {
    assert.ok(!p.roles.includes("anon") && !p.roles.includes("public"), `${p.policyname}: ${p.roles}`);
    if (p.cmd === "SELECT") assert.match(p.qual, /usuario_id = \( SELECT auth\.uid\(\)/, p.policyname);
  }
});
