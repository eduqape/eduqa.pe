// Copia en public/vendor/cobol el motor de COBOL que usan las lecciones: los
// assets de GnuCOBOL 3.2 y de Clang, y el código JavaScript que los ejecuta.
// No forma parte del build: se corre a mano al actualizar el motor, desde una
// instalación aparte del paquete, para que package.json no cambie.
//
//   mkdir /tmp/cobol && cd /tmp/cobol && npm init -y
//   npm install --ignore-scripts @live-codes/cobol-wasm@0.1.0
//   node scripts/vendorizar-cobol.mjs --desde=/tmp/cobol/node_modules
//   node scripts/vendorizar-cobol.mjs --solo-huellas
//
// Del código solo se copia lo que alcanza la ruta de COBOL (el resto del
// paquete @wasm-idle/core describe otros lenguajes) y los especificadores
// desnudos se reescriben como rutas relativas: el Worker los importa sin
// bundler y Node, en la verificación, los mismos archivos.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const destino = path.resolve('public/vendor/cobol');

// Huellas de todo lo publicado, también de motor.mjs y worker.mjs, que son
// propios y no los copia este script. `--solo-huellas` las recalcula sin
// volver a copiar, tras editar esos dos archivos.
function escribirHuellas() {
  const huellas = {};
  const recorrer = (carpeta) => {
    for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
      const ruta = path.join(carpeta, entrada.name);
      if (entrada.isDirectory()) recorrer(ruta);
      else if (!['SHA256.json', 'README.md'].includes(entrada.name)) {
        huellas[path.relative(destino, ruta).split(path.sep).join('/')] =
          crypto.createHash('sha256').update(fs.readFileSync(ruta)).digest('hex');
      }
    }
  };
  recorrer(destino);
  const ordenadas = Object.fromEntries(Object.entries(huellas).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(path.join(destino, 'SHA256.json'), JSON.stringify(ordenadas, null, 2) + '\n');
  return ordenadas;
}

if (process.argv.includes('--solo-huellas')) {
  console.log(`${Object.keys(escribirHuellas()).length} huellas en public/vendor/cobol/SHA256.json.`);
  process.exit(0);
}

const desde = process.argv.find((a) => a.startsWith('--desde='))?.split('=')[1];
assert.ok(desde, 'Falta --desde=<carpeta node_modules con @live-codes/cobol-wasm>');
const nm = path.resolve(desde);

const version = (paquete) => JSON.parse(fs.readFileSync(path.join(nm, paquete, 'package.json'), 'utf8')).version;
const VERSIONES = {
  '@live-codes/cobol-wasm': '0.1.0',
  '@live-codes/clang-wasm': '0.3.0',
  '@wasm-idle/llvm-core': '1.1.0',
  '@wasm-idle/core': '1.1.0',
  '@bjorn3/browser_wasi_shim': '0.4.2',
  fflate: '0.8.3',
};
for (const [paquete, esperada] of Object.entries(VERSIONES)) {
  assert.equal(version(paquete), esperada, `${paquete} debe estar en ${esperada}`);
}

// Assets. Clang lleva además su propio sysroot y clangd, pero el motor de
// COBOL sustituye el sysroot por c-sysroot.tar.gz y nunca arranca clangd.
const ASSETS = {
  'activos/cobol/runtime-manifest.v1.json': '@live-codes/cobol-wasm/assets/cobol/runtime-manifest.v1.json',
  'activos/cobol/cobc.wasm.gz': '@live-codes/cobol-wasm/assets/cobol/cobc.wasm.gz',
  'activos/cobol/rootfs.tar.gz': '@live-codes/cobol-wasm/assets/cobol/rootfs.tar.gz',
  'activos/cobol/c-sysroot.tar.gz': '@live-codes/cobol-wasm/assets/cobol/c-sysroot.tar.gz',
  'activos/clang/runtime-manifest.v1.json': '@live-codes/clang-wasm/assets/runtime-manifest.v1.json',
  'activos/clang/bin/clang.wasm.gz': '@live-codes/clang-wasm/assets/bin/clang.wasm.gz',
  'activos/clang/bin/lld.wasm.gz': '@live-codes/clang-wasm/assets/bin/lld.wasm.gz',
  'activos/clang/bin/memfs.wasm.gz': '@live-codes/clang-wasm/assets/bin/memfs.wasm.gz',
};

const LICENCIAS = {
  'licencias/cobol-wasm-LICENSE': '@live-codes/cobol-wasm/LICENSE',
  'licencias/cobol-wasm-LICENSE.GPL': '@live-codes/cobol-wasm/LICENSE.GPL',
  'licencias/cobol-wasm-THIRD-PARTY-NOTICES.md': '@live-codes/cobol-wasm/THIRD-PARTY-NOTICES.md',
  'licencias/clang-wasm-LICENSE': '@live-codes/clang-wasm/LICENSE',
  'licencias/llvm-core-LICENSE.llvm.txt': '@wasm-idle/llvm-core/LICENSE.llvm.txt',
  'licencias/browser_wasi_shim-LICENSE-MIT': '@bjorn3/browser_wasi_shim/LICENSE-MIT',
  'licencias/browser_wasi_shim-LICENSE-APACHE': '@bjorn3/browser_wasi_shim/LICENSE-APACHE',
  'licencias/fflate-LICENSE': 'fflate/LICENSE',
};

// Dónde vive cada paquete dentro de js/ y qué archivo representa su entrada.
// `@wasm-idle/core` solo aporta la caché persistente de assets: se apunta
// directamente a ese módulo para no arrastrar los runtimes de otros lenguajes.
const RAICES = [
  { paquete: '@wasm-idle/llvm-core/dist', js: 'js/llvm-core' },
  { paquete: '@wasm-idle/core/dist', js: 'js/wasm-idle-core' },
  { paquete: '@bjorn3/browser_wasi_shim/dist', js: 'js/browser_wasi_shim' },
  { paquete: 'fflate/esm', js: 'js/fflate' },
];
const DESNUDOS = {
  '@wasm-idle/core': '@wasm-idle/core/dist/persistent-asset-cache.js',
  '@bjorn3/browser_wasi_shim': '@bjorn3/browser_wasi_shim/dist/index.js',
  fflate: 'fflate/esm/browser.js',
};

function aDestino(origen) {
  const relativo = path.relative(nm, origen);
  for (const { paquete, js } of RAICES) {
    if (relativo.startsWith(paquete + '/')) return path.join(js, relativo.slice(paquete.length + 1));
  }
  throw new Error(`Fuera de las raíces conocidas: ${relativo}`);
}

// También cubre el código minificado (`}from"./x.js"`) y los import() dinámicos.
const IMPORTACION = /(\b(?:import|export)\b[^'"`;]*?\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])([^'"]+)\2/g;
const codigo = new Map();
function visitar(origen) {
  if (codigo.has(origen)) return;
  codigo.set(origen, null);
  const propio = aDestino(origen);
  const texto = fs.readFileSync(origen, 'utf8').replace(IMPORTACION, (todo, antes, comilla, especificador) => {
    if (!especificador.startsWith('.') && !DESNUDOS[especificador]) {
      throw new Error(`Especificador desconocido «${especificador}» en ${path.relative(nm, origen)}`);
    }
    const objetivo = especificador.startsWith('.')
      ? path.resolve(path.dirname(origen), especificador)
      : path.join(nm, DESNUDOS[especificador]);
    visitar(objetivo);
    let relativo = path.relative(path.dirname(propio), aDestino(objetivo)).split(path.sep).join('/');
    if (!relativo.startsWith('.')) relativo = './' + relativo;
    return `${antes}${comilla}${relativo}${comilla}`;
  });
  // Los mapas de fuente no se publican: el comentario solo produciría un 404.
  codigo.set(origen, { propio, texto: texto.replace(/\n\/\/# sourceMappingURL=\S+\s*$/, '\n') });
}
visitar(path.join(nm, '@wasm-idle/llvm-core/dist/cobol/src/index.js'));
visitar(path.join(nm, '@wasm-idle/llvm-core/dist/clang/src/browser-execution.js'));

for (const sub of ['activos', 'js', 'licencias']) fs.rmSync(path.join(destino, sub), { recursive: true, force: true });
const escribir = (relativo, contenido) => {
  const ruta = path.join(destino, relativo);
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, contenido);
};
for (const [relativo, origen] of Object.entries({ ...ASSETS, ...LICENCIAS })) {
  escribir(relativo, fs.readFileSync(path.join(nm, origen)));
}
for (const { propio, texto } of codigo.values()) escribir(propio, texto);

const ordenadas = escribirHuellas();

const bytes = Object.keys(ordenadas).reduce((suma, r) => suma + fs.statSync(path.join(destino, r)).size, 0);
console.log(`${codigo.size} módulos y ${Object.keys(ASSETS).length} assets en public/vendor/cobol (${(bytes / 1e6).toFixed(1)} MB).`);
