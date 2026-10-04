import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const [carpeta, destino] = process.argv.slice(2);
assert.match(carpeta ?? "", /^fortran-[a-z-]+$/);
assert.ok(destino?.endsWith(".sql"), "Indica el archivo SQL de destino");
const dir = join(process.cwd(), "src/content", carpeta);
const archivos = readdirSync(dir).filter(a => a.endsWith(".md")).sort();
const textos = new Map(archivos.map(a => [a, readFileSync(join(dir, a), "utf8")]));
function ficha(texto) {
  const m = texto.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(m, "Falta frontmatter");
  return parse(m[1]);
}
const curso = ficha(textos.get("curso.md"));
assert.equal(curso.slug, carpeta);
assert.equal(curso.icono, "fortran");
assert.equal(archivos.length, 5, "La publicación requiere ficha y cuatro sesiones completas");
const literal = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const slug = literal(curso.slug), ruta = curso.ruta;
const sesiones = archivos.filter(a => a !== "curso.md").map(a => ({archivo:a, ...ficha(textos.get(a))}));
assert.deepEqual(sesiones.map(s=>s.numero).sort((a,b)=>a-b), [1,2,3,4]);
const sql = [
  "-- Generado desde los Markdown. Aplicar como una sola transacción.",
  "-- Conserva precio, estado, acceso y matrículas de cursos existentes.",
  "begin;",
  `insert into public.rutas (slug, nombre, descripcion, orden) values (${literal(ruta.slug)}, ${literal(ruta.nombre)}, ${literal(ruta.descripcion)}, ${ruta.orden}) on conflict (slug) do update set nombre=excluded.nombre, descripcion=excluded.descripcion, orden=excluded.orden;`,
  `insert into public.cursos (slug, titulo, resumen, precio, estado, acceso_libre, orden, ruta, posicion, requisitos) values (${slug}, ${literal(curso.titulo)}, ${literal(curso.resumen)}, ${Number(curso.precio)}, ${literal(curso.estado)}, ${Boolean(curso.acceso_libre)}, ${curso.orden}, ${literal(ruta.slug)}, ${ruta.posicion}, array[${ruta.requisitos.map(literal).join(",")}]::text[]) on conflict (slug) do update set titulo=excluded.titulo, resumen=excluded.resumen, orden=excluded.orden, ruta=excluded.ruta, posicion=excluded.posicion, requisitos=excluded.requisitos, actualizado_en=now();`,
  // El material se ata al id del curso, no a su slug (#112).
  ...[...textos].map(([archivo, contenido]) => `insert into public.curso_contenido (curso_id, archivo, contenido) values ((select id from public.cursos where slug = ${slug}), ${literal(archivo)}, ${literal(contenido)}) on conflict (curso_id, archivo) do update set contenido=excluded.contenido, actualizado_en=now();`),
  ...sesiones.map(s => `insert into public.curso_sesiones (curso_id, archivo, numero, titulo, slug) values ((select id from public.cursos where slug = ${slug}), ${literal(s.archivo)}, ${s.numero}, ${literal(s.titulo)}, ${literal(s.slug ?? `sesion-${s.numero}`)}) on conflict (curso_id, archivo) do update set numero=excluded.numero, titulo=excluded.titulo, slug=excluded.slug;`),
  "commit;",
  "",
].join("\n\n");
writeFileSync(destino, sql);
console.log(`${curso.titulo}: actualización transaccional preparada en ${destino}`);
