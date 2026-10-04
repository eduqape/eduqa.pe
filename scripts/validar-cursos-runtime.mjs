import assert from "node:assert/strict";
import fs from "node:fs";

function leer(ruta) {
  return fs.readFileSync(ruta, "utf8");
}

const catalogo = leer("src/lib/catalogo-cursos.ts");
assert.match(catalogo, /from\("cursos"\)\.select\("id, slug"\)/, "El catálogo debe leer los cursos registrados en Supabase.");
// El material se ata al id del curso, nunca a su slug (#112).
assert.doesNotMatch(catalogo, /\bcurso_slug\b/, "El catálogo debe agrupar el material por curso_id, no por slug.");
assert.match(catalogo, /from\("curso_contenido"\)/, "El contenido debe leerse desde Supabase en runtime.");
assert.match(catalogo, /from\("curso_sesiones"\)/, "El índice de sesiones debe leerse desde Supabase en runtime.");
assert.doesNotMatch(catalogo, /cursosDelRepositorio|cargarCursosLocales|curso-markdown-local|return\s+cursosDelRepositorio/, "El catálogo no debe tener una fuente local alternativa.");
assert.doesNotMatch(catalogo, /@\/lib\/cursos/, "El catálogo de runtime no debe importar el catálogo legacy.");

const compatibilidad = leer("src/lib/cursos.ts");
assert.doesNotMatch(compatibilidad, /@\/content\//, "El módulo de compatibilidad no debe cargar cursos desde src/content.");
assert.doesNotMatch(compatibilidad, /export const cursos/, "No debe existir un catálogo de cursos en memoria.");
assert.match(compatibilidad, /export \* from "@\/lib\/curso-tipos";/, "cursos.ts solo debe reexportar tipos y utilidades puras.");

const parser = leer("src/lib/curso-markdown.ts");
assert.doesNotMatch(parser, /node:fs|node:path|cargarCursosLocales|cargarCurso\(/, "El parser usado en runtime no debe leer el sistema de archivos.");
assert.doesNotMatch(catalogo, /curso-markdown-local/, "El catálogo de runtime no debe importar el loader editorial local.");

const nextConfig = leer("next.config.ts");
assert.doesNotMatch(nextConfig, /src\/content\/\*\*\/\*\.md/, "Vercel no debe empaquetar Markdown local como fuente de cursos.");

const rutasDinamicas = [
  "src/app/cursos/page.tsx",
  "src/app/cursos/[curso]/[leccion]/page.tsx",
  "src/app/rutas/[ruta]/page.tsx",
  "src/app/pagar/[curso]/page.tsx",
  "src/app/panel/cursos/page.tsx",
];

for (const ruta of rutasDinamicas) {
  const fuente = leer(ruta);
  assert.match(
    fuente,
    /export const dynamic = "force-dynamic";/,
    `${ruta} debe resolverse en cada petición y no quedar congelada en el build.`,
  );
  assert.doesNotMatch(
    fuente,
    /export\s+(?:async\s+)?function\s+generateStaticParams\b/,
    `${ruta} no debe enumerar cursos o sesiones durante el build.`,
  );
}

const paginaLeccion = leer("src/app/cursos/[curso]/[leccion]/page.tsx");
const sincronizador = leer("src/components/curso/SincronizarCurso.tsx");
const migracionRealtime = leer("supabase/migrations/20260924070000_cursos_realtime.sql");
assert.match(paginaLeccion, /<SincronizarCurso cursoId=\{cursoId\} \/>/, "La sesión abierta debe suscribirse a cambios del curso.");
assert.match(sincronizador, /curso_id=eq\./, "Realtime debe filtrar el material por curso_id.");
assert.doesNotMatch(sincronizador, /curso_slug/, "Realtime no debe filtrar por slug (#112).");
for (const tabla of ["curso_contenido", "curso_sesiones", "cursos"]) {
  assert.match(sincronizador, new RegExp(`table: "${tabla}"`), `Realtime debe observar ${tabla}.`);
  assert.match(migracionRealtime, new RegExp(`add table public\\.${tabla}`), `${tabla} debe estar en supabase_realtime.`);
}
assert.match(sincronizador, /router\.refresh\(\)/, "Los cambios deben refrescar el Server Component sin recargar la pestaña.");

const acciones = leer("src/app/panel/cursos/acciones.ts");for (const tabla of ["cursos", "curso_contenido", "curso_sesiones"]) {
  assert.match(acciones, new RegExp(`from\\("${tabla}"\\)`), `La publicación debe escribir ${tabla}.`);
}
assert.match(acciones, /revalidarCursoPublicado\(slug/, "La publicación debe invalidar las vistas después de escribir en Supabase.");
assert.match(acciones, /Ya está en línea, sin desplegar\./, "El flujo debe confirmar que el curso queda disponible sin un nuevo deploy.");

console.log("Catálogo validado: Supabase es la única fuente de cursos en runtime.");
