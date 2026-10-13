import { test } from "node:test";
import assert from "node:assert/strict";
import { commitsDelRango, esContenidoDeCurso, ticketsQueCierra } from "./cerrar-tickets.mjs";

test("cierra con Closes, Fixes y Resolves, con o sin dos puntos", () => {
  assert.deepEqual(ticketsQueCierra("[fix] (ui): algo\n\nCloses: #135\n"), [135]);
  assert.deepEqual(ticketsQueCierra("[fix] (ui): algo\n\nFixes #4\n"), [4]);
  assert.deepEqual(ticketsQueCierra("[fix] (ui): algo\n\nresolved: #9\n"), [9]);
});

test("admite listas", () => {
  assert.deepEqual(ticketsQueCierra("x\n\nCloses: #2, #3\n"), [2, 3]);
  assert.deepEqual(ticketsQueCierra("x\n\nResolves: #5 y #6\n"), [5, 6]);
  assert.deepEqual(ticketsQueCierra("x\n\nCloses: #1\nFixes: #1, #7\n"), [1, 7]);
});

test("Refs solo vincula", () => {
  assert.deepEqual(ticketsQueCierra("x\n\nRefs: #136, #137\n"), []);
  assert.deepEqual(ticketsQueCierra("x\n\nCloses: #146\nRefs: #143\n"), [146]);
});

test("no confunde el tipo del asunto ni frases del cuerpo", () => {
  assert.deepEqual(ticketsQueCierra("[fix] (auth): cerrar la redirección #140\n\nRefs: #140\n"), []);
  assert.deepEqual(ticketsQueCierra("x\n\nFixed the bug that #12 reported last week.\n"), []);
  assert.deepEqual(ticketsQueCierra("x\n\nEsto cierra el hueco de #12.\n"), []);
});

test("reconoce el contenido de un curso", () => {
  assert.equal(esContenidoDeCurso("src/content/cobol-nivelacion/curso.md"), true);
  assert.equal(esContenidoDeCurso("src/content/cobol-nivelacion/sesion-12.md"), true);
  assert.equal(esContenidoDeCurso("src/content/FORMATO-CURSO.md"), false);
  assert.equal(esContenidoDeCurso("src/content/python.ts"), false);
  assert.equal(esContenidoDeCurso("scripts/fixtures/cobol-motor/curso.md"), false);
});

test("un commit que trae un curso no cierra su ticket solo", () => {
  // 0a4534e publicó la Nivelación de COBOL en el repo; 7079f3c solo tocó componentes y FORMATO-CURSO.
  const commits = commitsDelRango("7079f3c^", "0a4534e");
  const curso = commits.find((c) => c.cabecera.includes("nivelación de COBOL"));
  const componentes = commits.find((c) => c.cabecera.includes("figuras y escenas opcionales"));
  assert.deepEqual([curso.tickets, curso.curso], [[153], true]);
  assert.deepEqual([componentes.tickets, componentes.curso], [[152], false]);
});
