import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8");

// La marca de ambas barras es EDUQA.PE en la letra de calculadora del acceso
// (DSEG14), sin la llama al lado. Se comprueba el código: el componente usa
// `next/font/local`, que no se puede renderizar fuera de Next.
const marca = ts.createSourceFile(
  "MarcaTextoLateral.tsx",
  leer("src/components/MarcaTextoLateral.tsx"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const importaCalculadora = marca.statements.some(
  (s) =>
    ts.isImportDeclaration(s) &&
    ts.isStringLiteral(s.moduleSpecifier) &&
    s.moduleSpecifier.text === "@/components/MarcaCalculadora",
);
assert.ok(importaCalculadora, "MarcaTextoLateral debe usar MarcaCalculadora");
const clasesMarca = [];
(function recorrer(nodo) {
  if (ts.isJsxSelfClosingElement(nodo) && nodo.tagName.getText(marca) === "MarcaCalculadora") {
    clasesMarca.push(nodo.attributes.getText(marca));
  }
  ts.forEachChild(nodo, recorrer);
})(marca);
assert.equal(clasesMarca.length, 1, "La marca lateral debe dibujar una sola MarcaCalculadora");
for (const clase of ["text-lg", "tracking-[0.12em]", "text-rojo-acento", "sidebar-etiqueta"]) {
  assert.ok(clasesMarca[0].includes(clase), `La marca lateral debe llevar ${clase}`);
}
assert.doesNotMatch(clasesMarca[0], /texto=/, "La marca lateral debe decir EDUQA.PE, el texto por omisión");

const calculadora = leer("src/components/MarcaCalculadora.tsx");
assert.match(calculadora, /DSEG14Classic-Bold\.woff2/);
assert.match(calculadora, /texto = "EDUQA\.PE"/);
readFileSync(new URL("../src/fonts/dseg/DSEG14Classic-Bold.woff2", import.meta.url));

function usosDeMarca(ruta) {
  const fuente = ts.createSourceFile(ruta, leer(ruta), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let importada = false;
  const usos = [];
  for (const sentencia of fuente.statements) {
    if (
      ts.isImportDeclaration(sentencia) &&
      ts.isStringLiteral(sentencia.moduleSpecifier) &&
      sentencia.moduleSpecifier.text === "@/components/MarcaTextoLateral"
    ) importada = true;
  }
  function recorrer(nodo) {
    if (ts.isJsxSelfClosingElement(nodo) && nodo.tagName.getText(fuente) === "MarcaTextoLateral") {
      usos.push(nodo);
    }
    ts.forEachChild(nodo, recorrer);
  }
  recorrer(fuente);
  assert.ok(importada, `${ruta} debe importar la marca compartida`);
  assert.equal(usos.length, 1, `${ruta} debe usar exactamente una marca compartida`);
  return usos[0];
}

const general = usosDeMarca("src/components/Isla.tsx");
const leccion = usosDeMarca("src/components/curso/BarraLateral.tsx");
assert.deepEqual(
  general.attributes.properties.map((atributo) => atributo.name?.text),
  ["ocultarAlColapsar"],
  "Solo la barra general oculta el texto al colapsarse",
);
assert.equal(leccion.attributes.properties.length, 0);

// Sin la llama junto al título: la marca es el texto. La barra general solo
// dibuja un SVG si un admin subió uno propio desde el panel.
const barraLeccion = leer("src/components/curso/BarraLateral.tsx");
assert.doesNotMatch(barraLeccion, /from "@\/components\/Llama"/, "La barra de la lección no debe dibujar la llama");
assert.match(
  leer("src/components/Isla.tsx"),
  /\{marcaSidebar \? \(\s*<MarcaInline/,
  "La barra general solo debe dibujar un SVG de marca si hay uno personalizado",
);

const barraGeneral = leer("src/components/Isla.tsx");
assert.doesNotMatch(barraGeneral, /Cerrar sesión|LogOut|onSalir/);
assert.match(
  barraGeneral,
  /bg-superficie font-medium text-rojo-acento/,
  "La barra general debe conservar el mismo estado activo que el índice del curso",
);
assert.match(barraGeneral, /hover:bg-superficie/);
assert.match(barraGeneral, /focus-visible:outline-rojo-acento/);

console.log("Marca lateral: EDUQA.PE en letra de calculadora, sin llama, idéntica en ambas barras.");
