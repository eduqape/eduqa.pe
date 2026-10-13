import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ESTADOS_CURSO,
  FILTROS_POR_DEFECTO,
  POR_PAGINA,
  hrefListado,
  leerFiltros,
  normalizar,
  paginacion,
  paginasVisibles,
  planConsulta,
} from "../src/lib/cursos-panel-filtro.ts";

test("los estados coinciden con la restricción cursos_estado_valido de la base", () => {
  assert.deepEqual([...ESTADOS_CURSO], ["borrador", "privado", "publico"]);
});

test("la búsqueda se parte en palabras normalizadas como la columna busqueda", () => {
  const plan = planConsulta({ ...FILTROS_POR_DEFECTO, q: "  INTRODUCCIÓN   Ñandú " });
  assert.deepEqual(plan.patrones, ["%introduccion%", "%nandu%"]);
  assert.equal(normalizar("Árbol ÉXITO pingüino"), "arbol exito pinguino");
});

test("los comodines de LIKE escritos por quien busca se buscan literalmente", () => {
  assert.deepEqual(planConsulta({ ...FILTROS_POR_DEFECTO, q: "50% a_b c\\d" }).patrones, ["%50\\%%", "%a\\_b%", "%c\\\\d%"]);
});

test("el orden termina en una columna única para que las páginas no se solapen", () => {
  for (const orden of ["recientes", "titulo", "codigo", "precio"]) {
    const plan = planConsulta({ ...FILTROS_POR_DEFECTO, orden });
    assert.deepEqual(plan.orden.at(-1), { columna: "id", ascendente: true });
  }
  assert.deepEqual(planConsulta(FILTROS_POR_DEFECTO).orden[0], { columna: "actualizado_en", ascendente: false, nulosPrimero: false });
});

test("el rango de la página sale de su número", () => {
  assert.deepEqual(
    { desde: planConsulta(FILTROS_POR_DEFECTO).desde, hasta: planConsulta(FILTROS_POR_DEFECTO).hasta },
    { desde: 0, hasta: POR_PAGINA - 1 },
  );
  const tercera = planConsulta({ ...FILTROS_POR_DEFECTO, pagina: 3 });
  assert.equal(tercera.desde, 2 * POR_PAGINA);
  assert.equal(tercera.hasta, 3 * POR_PAGINA - 1);
});

test("con 2000 cursos, una página fuera de rango se recorta a la última", () => {
  assert.deepEqual(paginacion(2000, 1), { paginas: 84, pagina: 1, desde: 1, hasta: 24 });
  assert.deepEqual(paginacion(2000, 9999), { paginas: 84, pagina: 84, desde: 1993, hasta: 2000 });
  assert.deepEqual(paginacion(0, 3), { paginas: 1, pagina: 1, desde: 0, hasta: 0 });
});

test("la URL guarda solo lo que no es por defecto y vuelve a la página 1 al filtrar", () => {
  const actuales = { ...FILTROS_POR_DEFECTO, pagina: 7, q: "bash" };
  assert.equal(hrefListado(actuales, { estado: "borrador" }), "/panel/cursos?q=bash&estado=borrador");
  assert.equal(hrefListado(actuales, { pagina: 8 }), "/panel/cursos?q=bash&pagina=8");
  assert.equal(hrefListado(actuales, { vista: "grilla" }), "/panel/cursos?q=bash&pagina=7&vista=grilla");
  assert.equal(hrefListado(FILTROS_POR_DEFECTO, {}), "/panel/cursos");
});

test("leer la URL nunca rompe con valores raros", () => {
  assert.deepEqual(leerFiltros({ estado: "archivado", orden: "x", pagina: "-3", vista: "mosaico" }), FILTROS_POR_DEFECTO);
  assert.equal(leerFiltros({ pagina: ["4", "5"] }).pagina, 4);
  assert.equal(leerFiltros({ q: "a".repeat(500) }).q.length, 120);
});

test("la paginación enseña los extremos y los vecinos con saltos", () => {
  assert.deepEqual(paginasVisibles(1, 1), [1]);
  assert.deepEqual(paginasVisibles(1, 84), [1, 2, null, 84]);
  assert.deepEqual(paginasVisibles(40, 84), [1, null, 39, 40, 41, null, 84]);
  assert.deepEqual(paginasVisibles(3, 4), [1, 2, 3, 4]);
});

test("arrastrar una sesión calcula su destino y la lista resultante", async () => {
  const { moverElemento, destinoArrastre, desplazamiento } = await import("../src/lib/ordenar-lista.ts");
  const centros = [10, 30, 50, 70];
  // La primera, soltada entre la tercera y la cuarta.
  assert.equal(destinoArrastre(centros, 0, 55), 2);
  assert.deepEqual(moverElemento(["a", "b", "c", "d"], 0, 2), ["b", "c", "a", "d"]);
  // La última, soltada arriba del todo.
  assert.equal(destinoArrastre(centros, 3, 0), 0);
  assert.deepEqual(moverElemento(["a", "b", "c", "d"], 3, 0), ["d", "a", "b", "c"]);
  // Sin moverse lo bastante, se queda donde estaba.
  assert.equal(destinoArrastre(centros, 1, 35), 1);
  // Las filas intermedias dejan el hueco hacia el lado correcto.
  assert.deepEqual([0, 1, 2, 3].map((i) => desplazamiento(i, 0, 2, 20)), [0, -20, -20, 0]);
  assert.deepEqual([0, 1, 2, 3].map((i) => desplazamiento(i, 3, 1, 20)), [0, 20, 20, 0]);
  // La lista original no se toca.
  const original = ["a", "b"];
  moverElemento(original, 0, 1);
  assert.deepEqual(original, ["a", "b"]);
});
