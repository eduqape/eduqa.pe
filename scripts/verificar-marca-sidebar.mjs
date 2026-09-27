import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8");

// Se prueba el HTML que produce el componente, no una copia de sus clases.
const modulo = { exports: {} };
const javascript = ts.transpileModule(leer("src/components/MarcaTextoLateral.tsx"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;
new Function("require", "module", "exports", javascript)(
  createRequire(import.meta.url),
  modulo,
  modulo.exports,
);
const { MarcaTextoLateral } = modulo.exports;

function clasesRenderizadas(props) {
  const html = renderToStaticMarkup(createElement(MarcaTextoLateral, props));
  const coincidencia = html.match(/^<span class="([^"]+)">EDUQA\.PE<\/span>$/);
  assert.ok(coincidencia, `La marca debe renderizar EDUQA.PE en un span: ${html}`);
  return coincidencia[1].split(/\s+/).sort();
}

const tipografia = [
  "text-sm", // 14 px
  "font-bold", // peso 700
  "uppercase",
  "tracking-[0.18em]",
  "text-rojo-acento",
].sort();
assert.deepEqual(clasesRenderizadas({}), tipografia);
assert.deepEqual(
  clasesRenderizadas({ ocultarAlColapsar: true }),
  [...tipografia, "sidebar-etiqueta"].sort(),
);

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

// La familia es heredada del layout; una clase local no debe sustituir Inter.
assert.match(leer("src/app/layout.tsx"), /const inter = Inter\(\{ variable: "--font-inter"/);
assert.match(leer("src/app/layout.tsx"), /<body className="[^"]*\bfont-sans\b/);
assert.match(leer("src/app/globals.css"), /--font-sans:\s*var\(--font-inter\)/);

const barraGeneral = leer("src/components/Isla.tsx");
assert.doesNotMatch(barraGeneral, /Cerrar sesión|LogOut|onSalir/);
assert.match(
  barraGeneral,
  /bg-superficie font-medium text-rojo-acento/,
  "La barra general debe conservar el mismo estado activo que el índice del curso",
);
assert.match(barraGeneral, /hover:bg-superficie/);
assert.match(barraGeneral, /focus-visible:outline-rojo-acento/);

console.log("Marca lateral: Inter, 14 px, peso 700 y espaciado idénticos en ambas barras.");
