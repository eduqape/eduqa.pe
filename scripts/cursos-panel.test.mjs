import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FILTROS_POR_DEFECTO,
  POR_PAGINA,
  filtrarCursos,
  hrefListado,
  leerFiltros,
  paginasVisibles,
} from "../src/lib/cursos-panel-filtro.ts";

const AREAS = ["Lenguajes", "DevOps", "Matemáticas", "Bases de Datos"];
const ESTADOS = ["borrador", "privado", "publico", "archivado"];

/** 2000 cursos: el tamaño con el que el listado tiene que seguir respondiendo. */
const cursos = Array.from({ length: 2000 }, (_, i) => ({
  id: `id-${i}`,
  slug: `curso-${i}`,
  codigo: `C${String(i).padStart(3, "0")}-0001`,
  titulo: i === 7 ? "Introducción a Matplotlib" : `Curso número ${i}`,
  resumen: "",
  estado: ESTADOS[i % 4],
  precio: i % 50,
  accesoLibre: false,
  actualizadoEn: i === 1999 ? null : new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString(),
  area: AREAS[i % 4],
  nivel: "INTRODUCCIÓN",
  formato: "curso",
  horas: 10,
  icono: "libro",
  fichaLegible: true,
}));

test("pagina 2000 cursos sin devolverlos todos", () => {
  const r = filtrarCursos(cursos, FILTROS_POR_DEFECTO);
  assert.equal(r.total, 2000);
  assert.equal(r.filas.length, POR_PAGINA);
  assert.equal(r.paginas, Math.ceil(2000 / POR_PAGINA));
  assert.equal(r.desde, 1);
  assert.equal(r.hasta, POR_PAGINA);
  // El más reciente primero; el que no tiene fecha, al final.
  assert.equal(r.filas[0].slug, "curso-1998");
});

test("una página fuera de rango se recorta a la última", () => {
  const r = filtrarCursos(cursos, { ...FILTROS_POR_DEFECTO, pagina: 9999 });
  assert.equal(r.pagina, r.paginas);
  assert.equal(r.hasta, 2000);
  assert.equal(r.filas.at(-1).slug, "curso-1999");
});

test("la búsqueda ignora tildes y mayúsculas y cruza título, código y slug", () => {
  assert.deepEqual(
    filtrarCursos(cursos, { ...FILTROS_POR_DEFECTO, q: "INTRODUCCION matplot" }).filas.map((c) => c.slug),
    ["curso-7"],
  );
  assert.equal(filtrarCursos(cursos, { ...FILTROS_POR_DEFECTO, q: "c042-" }).total, 1);
  assert.equal(filtrarCursos(cursos, { ...FILTROS_POR_DEFECTO, q: "nada-que-exista" }).total, 0);
});

test("los conteos por estado respetan la búsqueda y el área, no el estado elegido", () => {
  const r = filtrarCursos(cursos, { ...FILTROS_POR_DEFECTO, area: "DevOps", estado: "publico" });
  assert.equal(r.porEstado.todos, 500);
  assert.equal(r.porEstado.privado + r.porEstado.publico + r.porEstado.borrador + r.porEstado.archivado, 500);
  assert.equal(r.total, r.porEstado.publico);
  assert.ok(r.filas.every((c) => c.area === "DevOps" && c.estado === "publico"));
});

test("sin resultados, la página sigue siendo coherente", () => {
  const r = filtrarCursos(cursos, { ...FILTROS_POR_DEFECTO, q: "zzz", pagina: 3 });
  assert.equal(r.paginas, 1);
  assert.equal(r.pagina, 1);
  assert.equal(r.desde, 0);
  assert.equal(r.filas.length, 0);
});

test("la URL guarda solo lo que no es por defecto y vuelve a la página 1 al filtrar", () => {
  const actuales = { ...FILTROS_POR_DEFECTO, pagina: 7, q: "bash" };
  assert.equal(hrefListado(actuales, { estado: "borrador" }), "/panel/cursos?q=bash&estado=borrador");
  assert.equal(hrefListado(actuales, { pagina: 8 }), "/panel/cursos?q=bash&pagina=8");
  assert.equal(hrefListado(actuales, { vista: "grilla" }), "/panel/cursos?q=bash&pagina=7&vista=grilla");
  assert.equal(hrefListado(FILTROS_POR_DEFECTO, {}), "/panel/cursos");
});

test("leer la URL nunca rompe con valores raros", () => {
  assert.deepEqual(leerFiltros({ estado: "inventado", orden: "x", pagina: "-3", vista: "mosaico" }), FILTROS_POR_DEFECTO);
  assert.equal(leerFiltros({ pagina: ["4", "5"] }).pagina, 4);
  assert.equal(leerFiltros({ q: "a".repeat(500) }).q.length, 120);
});

test("la paginación enseña los extremos y los vecinos con saltos", () => {
  assert.deepEqual(paginasVisibles(1, 1), [1]);
  assert.deepEqual(paginasVisibles(1, 84), [1, 2, null, 84]);
  assert.deepEqual(paginasVisibles(40, 84), [1, null, 39, 40, 41, null, 84]);
  assert.deepEqual(paginasVisibles(3, 4), [1, 2, 3, 4]);
});
