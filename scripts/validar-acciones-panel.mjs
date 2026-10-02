import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { ensureServerEntryExports } = require('next/dist/build/webpack/loaders/next-flight-loader/action-validate');

function cargar(archivo) {
  const codigo = ts.transpileModule(fs.readFileSync(archivo, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modulo = { exports: {} };
  const importar = (nombre) => {
    if (nombre === 'next/cache') return { revalidatePath() {} };
    // `server-only` lanza al importarse fuera de un Server Component. Aquí no
    // hay render, así que basta con que el módulo se pueda cargar.
    if (nombre === 'server-only') return {};
    if (nombre.startsWith('@/lib/')) return stubDeLib();
    if (nombre.startsWith('.')) return cargar(path.resolve(path.dirname(archivo), `${nombre}.ts`));
    return require(nombre);
  };
  new Function('require', 'module', 'exports', codigo)(importar, modulo, modulo.exports);
  return modulo.exports;
}

/**
 * Lo que ven las Server Actions en vez de la base de datos.
 *
 * Sin sesión, que es justo el caso que tienen que recuperar las acciones: cada
 * una tiene que devolver `{ ok: false, error }` y no reventar. Lo único que se
 * comprueba aquí es que el módulo sea válido para Next y que el error se pueda
 * mostrar; que escriba bien lo comprueba la base.
 */
function stubDeLib() {
  const Known = {
    // Sin sesión, la comprobación de administrador corta antes de escribir.
    usuarioActual: async () => null,
    perfilActual: async () => null,
    clienteServidor: () => {
      throw new Error('La validación no debe consultar la base.');
    },
    registrarError() {},
    registrarAviso() {},
  };
  // Un import mal escrito no se detecta aquí, pero sí en `npm run typecheck`.
  return new Proxy(Known, {
    get(objeto, propiedad) {
      return propiedad in objeto ? objeto[propiedad] : undefined;
    },
  });
}

for (const [archivo, accion] of [
  ['src/app/panel/acciones.ts', 'guardarCurso'],
  ['src/app/panel/reportes/acciones.ts', 'cambiarEstadoReporte'],
  ['src/app/panel/personas/acciones.ts', 'crearPersona'],
  ['src/app/panel/personas/acciones.ts', 'actualizarPersona'],
]) {
  const acciones = cargar(path.resolve(archivo));
  // Es el validador que Next ejecuta al recibir el POST. Build y tsc no
  // detectaban la lista exportada que provocaba E352 en producción.
  assert.doesNotThrow(() => ensureServerEntryExports(Object.values(acciones)), archivo);
  const resultado = await acciones[accion](null, new FormData());
  assert.equal(resultado.ok, false, `${accion} debe rechazar un formulario vacío`);
  assert.equal(typeof resultado.error, 'string', `${accion} debe explicar el error`);
}

console.log('Acciones del panel: módulos válidos en Next y errores de formulario recuperables.');
