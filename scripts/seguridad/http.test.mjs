/**
 * Ataques por HTTP contra el build de producción (`next start`).
 *
 * Sin `BASE_URL` arranca el servidor con el `.next` ya compilado. Supabase
 * apunta a un puerto cerrado: así cada comprobación mide lo que hace la
 * aplicación cuando no puede verificar a nadie, que es justo el caso de un
 * atacante sin credenciales válidas. No escribe en ninguna base.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PUERTO = Number(process.env.PUERTO_SEGURIDAD ?? 3107);
const BASE = process.env.BASE_URL ?? `http://127.0.0.1:${PUERTO}`;
const ORIGEN = new URL(BASE).origin;
// `next start` se ve a sí mismo como localhost aunque se le llame por IP.
const PROPIOS = new Set([ORIGEN, ORIGEN.replace("127.0.0.1", "localhost")]);
const esPropio = (url) => PROPIOS.has(new URL(url, BASE).origin);
let servidor;

before(async () => {
  if (process.env.BASE_URL) return;
  servidor = spawn("node_modules/.bin/next", ["start", "-p", String(PUERTO), "-H", "127.0.0.1"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production" },
  });
  let salida = "";
  servidor.stdout.on("data", (d) => (salida += d));
  servidor.stderr.on("data", (d) => (salida += d));
  const limite = Date.now() + 60_000;
  while (Date.now() < limite) {
    try {
      await fetch(`${BASE}/api/deploy/meta`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`next start no respondió:\n${salida}`);
});

after(() => servidor?.kill());

const pedir = (ruta, opciones = {}) => fetch(`${BASE}${ruta}`, { redirect: "manual", ...opciones });
const destino = (respuesta) => new URL(respuesta.headers.get("location"), BASE);

test("cabeceras de seguridad en páginas y API", async () => {
  for (const ruta of ["/", "/acceder", "/catalogo", "/api/deploy/meta"]) {
    const r = await pedir(ruta);
    const h = (n) => r.headers.get(n) ?? "";
    assert.match(h("content-security-policy"), /frame-ancestors 'self'/, `${ruta}: CSP`);
    assert.equal(h("x-frame-options"), "SAMEORIGIN", `${ruta}: X-Frame-Options`);
    assert.equal(h("x-content-type-options"), "nosniff", `${ruta}: nosniff`);
    assert.match(h("referrer-policy"), /strict-origin/, `${ruta}: Referrer-Policy`);
    assert.match(h("permissions-policy"), /camera=\(\)/, `${ruta}: Permissions-Policy`);
  }
});

test("las rutas privadas piden sesión", async () => {
  for (const ruta of ["/panel", "/panel/cursos", "/perfil", "/ajustes", "/compras", "/certificaciones", "/cursos", "/pagar/python"]) {
    const r = await pedir(ruta);
    assert.ok([302, 303, 307, 308].includes(r.status), `${ruta}: ${r.status}`);
    const d = destino(r);
    assert.ok(esPropio(d), ruta);
    assert.equal(d.pathname, "/acceder", ruta);
  }
});

test("una cookie de sesión falsificada no abre el panel", async () => {
  // JWT sin firma válida que dice ser un administrador autenticado.
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({
    sub: "00000000-0000-0000-0000-000000000001",
    role: "authenticated",
    email: "admin@eduqa.pe",
    exp: Math.floor(Date.now() / 1000) + 3600,
    app_metadata: { es_admin: true },
  })}.firma-falsa`;
  const sesion = b64({
    access_token: jwt,
    refresh_token: "falso",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "00000000-0000-0000-0000-000000000001", email: "admin@eduqa.pe", role: "authenticated" },
  });
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1").hostname.split(".")[0];
  for (const ruta of ["/panel", "/panel/personas", "/compras"]) {
    const r = await pedir(ruta, { headers: { cookie: `sb-${ref}-auth-token=base64-${sesion}` } });
    assert.ok([302, 303, 307, 308].includes(r.status), `${ruta}: ${r.status}`);
    assert.equal(destino(r).pathname, "/acceder", ruta);
  }
});

test("volverA y next no sacan del sitio", async () => {
  const ataques = ["/%5Cevil.com", "/%09/evil.com", "//evil.com", "https://evil.com", "/%5C/evil.com"];
  for (const ataque of ataques) {
    const pagina = await (await pedir(`/acceder?volverA=${ataque}`)).text();
    const valor = pagina.match(/name="volverA" value="([^"]*)"/)?.[1];
    assert.equal(valor, "/panel", `/acceder?volverA=${ataque}`);

    for (const ruta of [
      `/auth/callback?code=falso&next=${ataque}`,
      `/auth/callback?next=${ataque}`,
      `/auth/confirmar?token_hash=falso&type=email&volverA=${ataque}`,
    ]) {
      const r = await pedir(ruta);
      const d = destino(r);
      assert.ok(esPropio(d), `${ruta} → ${d}`);
      const anidado = d.searchParams.get("volverA");
      if (anidado) assert.ok(esPropio(anidado), `${ruta} → volverA=${anidado}`);
    }
  }
});

test("la API de cursos rechaza peticiones sin una clave válida", async () => {
  const casos = [
    ["POST", "/api/v1/cursos", {}],
    ["POST", "/api/v1/cursos", { authorization: "Bearer otra_cosa" }],
    ["POST", "/api/v1/cursos", { authorization: "Bearer eduqa_sk_inventada" }],
    ["POST", "/api/v1/cursos", { authorization: "eduqa_sk_sin_bearer" }],
    ["GET", "/api/v1/cursos/python", {}],
    ["PATCH", "/api/v1/cursos/python", { authorization: "Bearer eduqa_sk_inventada" }],
  ];
  for (const [metodo, ruta, cabeceras] of casos) {
    const r = await pedir(ruta, {
      method: metodo,
      headers: { "content-type": "application/json", ...cabeceras },
      body: metodo === "GET" ? undefined : JSON.stringify({ slug: "python", archivos: { "curso.md": "x" } }),
    });
    assert.equal(r.status, 401, `${metodo} ${ruta} ${JSON.stringify(cabeceras)}`);
  }
  // JSON roto o un payload con __proto__ no pasan de la autenticación.
  for (const cuerpo of ["{roto", '{"__proto__":{"es_admin":true},"slug":"x"}']) {
    const r = await pedir("/api/v1/cursos", { method: "POST", headers: { "content-type": "application/json" }, body: cuerpo });
    assert.equal(r.status, 401, cuerpo);
  }
});

test("las alertas internas exigen administrador", async () => {
  assert.equal((await pedir("/api/admin/alertas")).status, 403);
});

test("el callback de Niubiz solo acepta las IP de Niubiz", async () => {
  const pago = JSON.stringify({ idc: "00000000-0000-0000-0000-000000000000", amount: 20 });
  for (const cabeceras of [{}, { "x-forwarded-for": "203.0.113.9" }]) {
    const r = await pedir("/api/niubiz/callback", {
      method: "POST",
      headers: { "content-type": "application/json", ...cabeceras },
      body: pago,
    });
    assert.equal(r.status, 403, JSON.stringify(cabeceras));
  }
});

test("las alertas de CI validan el evento antes de guardar", async () => {
  const enviar = (cuerpo) =>
    pedir("/api/integraciones/alertas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: cuerpo,
    });
  assert.equal((await enviar("{roto")).status, 400);
  assert.equal((await enviar(JSON.stringify({ tipo: "otro", sha: "a".repeat(40) }))).status, 400);
  assert.equal((await enviar(JSON.stringify({ tipo: "push", sha: "'; drop table x;--" }))).status, 400);
  // Fuera de producción un deploy nunca se da por bueno.
  assert.equal((await enviar(JSON.stringify({ tipo: "deploy", sha: "a".repeat(40) }))).status, 409);
});

test("no se puede salir de la carpeta pública", async () => {
  for (const ruta of ["/..%2f..%2fetc%2fpasswd", "/vendor/..%2f..%2f.env.local", "/_next/static/..%2f..%2f.env.local"]) {
    const r = await pedir(ruta);
    const texto = await r.text();
    assert.ok(r.status >= 300, `${ruta}: ${r.status}`);
    assert.doesNotMatch(texto, /root:x:0:0|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_URL=/, ruta);
  }
});
