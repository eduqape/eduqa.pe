/**
 * Reglas de seguridad que se comprueban leyendo el código, sin ejecutarlo.
 *
 * Solo se revisan los archivos versionados (`git ls-files`): así el resultado
 * es el mismo en una máquina con trabajo a medias que en CI. Cada lista
 * permitida explica por qué la excepción es segura; ampliarla exige escribir
 * ese motivo.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";

const versionados = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const leer = (ruta) => readFileSync(ruta, "utf8");
// Un archivo versionado borrado en el árbol de trabajo no se lee: en CI no
// pasa, y en local es trabajo a medias de otra tarea.
const fuentes = versionados.filter((r) => /^src\/.*\.(ts|tsx|mjs|js)$/.test(r) && existsSync(r));
const esCliente = (texto) => /^\s*["']use client["']/m.test(texto.slice(0, 400));

/** Texto de los archivos de texto versionados, sin binarios ni recursos enormes. */
function* textos() {
  for (const ruta of versionados) {
    if (/\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|glb|pdf|wasm|zip|gz|mp[34]|webm)$/i.test(ruta)) continue;
    if (/^public\/vendor\//.test(ruta)) continue;
    let tamano = 0;
    try {
      tamano = statSync(ruta).size;
    } catch {
      continue; // borrado en el árbol de trabajo
    }
    if (tamano > 2_000_000) continue;
    yield [ruta, leer(ruta)];
  }
}

test("no hay secretos escritos en el repositorio", () => {
  const patrones = [
    [/eduqa_sk_[A-Za-z0-9_-]{30,}/, "clave de la API de cursos"],
    [/sb_secret_[A-Za-z0-9_-]{20,}/, "clave secreta de Supabase"],
    [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, "clave privada"],
    [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, "token de GitHub"],
    [/\bAKIA[0-9A-Z]{16}\b/, "clave de AWS"],
    [/\bsk-(ant-|proj-)?[A-Za-z0-9_-]{32,}\b/, "clave de API de un proveedor de IA"],
  ];
  const hallazgos = [];
  for (const [ruta, texto] of textos()) {
    for (const [re, nombre] of patrones) {
      if (re.test(texto)) hallazgos.push(`${ruta}: ${nombre}`);
    }
    // Un JWT de Supabase con rol service_role da acceso total a la base.
    for (const jwt of texto.match(/eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g) ?? []) {
      try {
        const carga = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
        if (carga.role === "service_role") hallazgos.push(`${ruta}: JWT service_role`);
      } catch {
        // no era un JWT
      }
    }
  }
  assert.deepEqual(hallazgos, []);
});

test("no se versionan archivos de entorno", () => {
  const entornos = versionados.filter((r) => /(^|\/)\.env(\.|$)/.test(r) && !/\.example$/.test(r));
  assert.deepEqual(entornos, []);
});

test("ninguna variable pública lleva nombre de secreto", () => {
  const malas = new Set();
  for (const ruta of fuentes) {
    for (const [, nombre] of leer(ruta).matchAll(/\bNEXT_PUBLIC_([A-Z0-9_]+)/g)) {
      if (/SECRET|SERVICE|PASSWORD|PRIVATE|TOKEN|CLAVE/.test(nombre)) malas.add(`${ruta}: NEXT_PUBLIC_${nombre}`);
    }
  }
  assert.deepEqual([...malas], []);
});

test("los módulos con credenciales de servidor no llegan al navegador", () => {
  const SECRETOS = /SUPABASE_SERVICE_ROLE_KEY|NIUBIZ_CLAVE|NIUBIZ_USUARIO/;
  const sinServerOnly = [];
  const clientesQueImportan = [];
  for (const ruta of fuentes) {
    const texto = leer(ruta);
    if (SECRETOS.test(texto) && !/import\s+["']server-only["']/.test(texto)) sinServerOnly.push(ruta);
    if (esCliente(texto) && /from\s+["']@\/lib\/(supabase|claves-api|api-cursos|niubiz)["']/.test(texto)) {
      clientesQueImportan.push(ruta);
    }
  }
  assert.deepEqual(sinServerOnly, [], "deben importar «server-only»");
  assert.deepEqual(clientesQueImportan, [], "un componente cliente importa un módulo de servidor");
});

test("las redirecciones con destino del usuario pasan por rutaInterna", () => {
  // El filtro antiguo dejaba pasar "/\evil.com" (#140).
  const debil = /startsWith\(\s*["']\/["']\s*\)\s*&&\s*!\s*[\w.?]+\.startsWith\(\s*["']\/\/["']\s*\)/;
  const conFiltroDebil = fuentes.filter((r) => debil.test(leer(r)));
  assert.deepEqual(conFiltroDebil, []);

  // Estos archivos reciben el destino del navegador (volverA, next).
  for (const ruta of [
    "src/app/acceder/acciones.ts",
    "src/app/acceder/page.tsx",
    "src/app/auth/callback/route.ts",
    "src/app/auth/confirmar/route.ts",
  ]) {
    assert.match(leer(ruta), /rutaInterna\(/, ruta);
  }
});

test("el servidor no confía en getSession para autorizar", () => {
  // getSession lee la cookie sin verificar la firma: se falsifica a mano.
  const usos = fuentes.filter((r) => {
    const texto = leer(r);
    return !esCliente(texto) && /auth\.getSession\(/.test(texto);
  });
  assert.deepEqual(usos, []);
});

test("los filtros de PostgREST no se arman con texto interpolado", () => {
  // `.or(\`campo.eq.${x}\`)` permite inyectar condiciones en la consulta.
  const usos = fuentes.filter((r) => /\.(or|filter|not)\(\s*`[^`]*\$\{/.test(leer(r)));
  assert.deepEqual(usos, []);
});

test("el HTML sin escapar solo aparece donde está justificado", () => {
  const PERMITIDOS = {
    "src/app/layout.tsx": "guiones propios de arranque (tema y barra lateral), sin datos externos",
    "src/app/catalogo/page.tsx": "JSON-LD con «<» escapado",
    "src/app/catalogo/[curso]/page.tsx": "JSON-LD con «<» escapado",
    "src/components/curso/BloqueCodigo.tsx": "HTML generado por Shiki, que escapa el código",
    "src/components/LlamaMarca.tsx": "SVG de marca validado por validarSvg y escrito solo por admin",
    "src/app/panel/marca/page.tsx": "vista previa del mismo SVG de marca",
    "src/components/blog/MotorBlog.tsx": "HTML del feed de Medium propio; sanearlo está pendiente en #143",
    "src/components/figuras/tarjeta-perforada/Vivo.tsx": "SVG de la figura, generado en el servidor por su geometría a partir de constantes, sin datos externos",
  };
  const usos = fuentes.filter((r) => /dangerouslySetInnerHTML/.test(leer(r)) && !r.startsWith("src/app/preview/"));
  const sinMotivo = usos.filter((r) => !(r in PERMITIDOS));
  assert.deepEqual(sinMotivo, [], "añade el archivo a PERMITIDOS con el motivo o evita el HTML crudo");
  for (const r of ["src/app/catalogo/page.tsx", "src/app/catalogo/[curso]/page.tsx"]) {
    assert.match(leer(r), /replace\(\/<\/g/, `${r} debe escapar «<» en el JSON-LD`);
  }
});

test("cada ruta de API declara cómo se protege", () => {
  // ruta → texto que tiene que aparecer en el handler.
  const PROTECCION = {
    "src/app/api/v1/cursos/route.ts": /autenticar\(/,
    "src/app/api/v1/cursos/[curso]/route.ts": /autenticar\(/,
    "src/app/api/v1/cursos/[curso]/informacion/pdf/route.ts": /usuarioActual\(|perfilActual\(/,
    "src/app/api/admin/alertas/route.ts": /es_admin/,
    "src/app/api/niubiz/callback/route.ts": /IPS_NIUBIZ/,
    "src/app/api/integraciones/alertas/route.ts": /validarPush\(/,
    // Pública a propósito: solo expone el commit desplegado.
    "src/app/api/deploy/meta/route.ts": /VERCEL_GIT_COMMIT_SHA/,
    "src/app/auth/callback/route.ts": /exchangeCodeForSession/,
    "src/app/auth/confirmar/route.ts": /verifyOtp/,
    // Pública: devuelve el icono de la marca.
    "src/app/icono-marca/route.ts": /./,
  };
  const rutas = versionados.filter((r) => /^src\/app\/.*\/route\.ts$/.test(r));
  const sinDeclarar = rutas.filter((r) => !(r in PROTECCION));
  assert.deepEqual(sinDeclarar, [], "ruta nueva: decláralo en PROTECCION");
  for (const r of rutas) assert.match(leer(r), PROTECCION[r], r);
});
