import { test } from "node:test";
import assert from "node:assert/strict";
import { rutaInterna } from "../../src/lib/ruta-interna.ts";

// Cada destino se resuelve como lo haría el navegador desde una página del
// sitio: si sale del origen, es una redirección abierta.
const ORIGEN = "https://eduqape.vercel.app";
const resolver = (ruta) => new URL(ruta, `${ORIGEN}/acceder`).origin;

test("acepta rutas internas y conserva consulta y ancla", () => {
  assert.equal(rutaInterna("/cursos"), "/cursos");
  assert.equal(rutaInterna("/cursos/python/sesion-1?x=1#y"), "/cursos/python/sesion-1?x=1#y");
});

test("rechaza destinos que el navegador lleva a otro dominio", () => {
  for (const ataque of [
    "//evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "https://evil.com",
    "evil.com",
    "javascript:alert(1)",
    "",
  ]) {
    const destino = rutaInterna(ataque);
    assert.equal(destino, "/panel", JSON.stringify(ataque));
    assert.equal(resolver(destino), ORIGEN);
  }
});

test("sin valor usa el destino por defecto", () => {
  assert.equal(rutaInterna(null), "/panel");
  assert.equal(rutaInterna(undefined, "/cursos"), "/cursos");
});
