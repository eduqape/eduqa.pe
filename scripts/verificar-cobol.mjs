// Ejecuta cada bloque `cobol` de los cursos en el mismo motor que usa el
// navegador (los bytes fijados en public/vendor/cobol) y compara su salida con
// la valla `salida` del temario y cada archivo que deja con su valla
// `escrito`. También comprueba los ejercicios `ejercicio cobol` con la
// respuesta correcta y con una incorrecta, y que los guiones de las escenas 3D
// de memoria (src/components/guiones-cobol.ts) dicen lo que hace GnuCOBOL.
//
//   node scripts/verificar-cobol.mjs                 comprueba todos los cursos
//   node scripts/verificar-cobol.mjs --curso=slug    solo uno
//   node scripts/verificar-cobol.mjs --curso=slug --escribir
//        reescribe las vallas `salida` y `escrito` con lo que produce la ejecución
//   node scripts/verificar-cobol.mjs --nativo
//        además compila cada bloque con el cobc instalado y exige la misma
//        salida; los bloques `cobol !sin-consola` solo se comprueban así
//
// Reglas del temario que comprueba: ningún bloque compila con avisos, en
// formato fijo ninguna línea pasa de la columna 72 (lo que sigue se ignora
// sin aviso) y un bloque sin valla `salida` no imprime nada.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cargar } from './validar-iconos-cursos.mjs';

const { cargarCurso } = cargar(path.resolve('src/lib/curso-markdown-local.ts'));

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
const escribir = process.argv.includes('--escribir');
const nativo = process.argv.includes('--nativo');
const seleccion = arg('curso');
// Los cursos de src/content y, primero, el paquete de regresión del motor:
// casos que ningún curso tiene por qué cubrir (EXTEND, archivos binarios,
// copybooks, programas anidados) y que tienen que seguir funcionando.
const contenido = path.resolve('src/content');
const carpetas = [
  { carpeta: 'cobol-motor', raiz: path.resolve('scripts/fixtures') },
  ...fs.readdirSync(contenido, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.includes('cobol') && fs.existsSync(path.join(contenido, e.name, 'curso.md')))
    .map((e) => ({ carpeta: e.name, raiz: contenido }))
    .sort((a, b) => a.carpeta.localeCompare(b.carpeta)),
].filter(({ carpeta }) => !seleccion || carpeta === seleccion);
if (escribir) assert.ok(seleccion, 'Con --escribir hay que elegir un curso con --curso=slug');
assert.ok(carpetas.length, `No hay ningún curso de COBOL llamado ${seleccion}`);

// El motor pide sus assets por HTTP; aquí se leen del disco, después de
// comprobar que son los bytes fijados.
const VENDOR = path.resolve('public/vendor/cobol');
const huellas = JSON.parse(fs.readFileSync(path.join(VENDOR, 'SHA256.json'), 'utf8'));
for (const [relativo, esperada] of Object.entries(huellas)) {
  const real = crypto.createHash('sha256').update(fs.readFileSync(path.join(VENDOR, relativo))).digest('hex');
  assert.equal(real, esperada, `public/vendor/cobol/${relativo} no coincide con SHA256.json`);
}
const ORIGEN = 'https://cobol.eduqa.invalid/';
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const texto = String(url?.url ?? url);
  if (!texto.startsWith(ORIGEN)) return fetchOriginal(url, init);
  return new Response(fs.readFileSync(path.join(VENDOR, texto.slice(ORIGEN.length))));
};
const { crearMotorCobol, comoTexto } = await import(path.join(VENDOR, 'motor.mjs'));
const motor = await crearMotorCobol({ base: ORIGEN });

let cobcNativo = null;
if (nativo) {
  try {
    cobcNativo = execFileSync('cobc', ['--version'], { encoding: 'utf8' }).split('\n')[0];
  } catch {
    console.error('--nativo necesita cobc en el PATH (sudo apt install gnucobol3).');
    process.exit(1);
  }
}

/** Compila con el cobc instalado y ejecuta en una carpeta temporal. */
function ejecutarNativo(codigo, { entrada = '', archivos = {}, formatoLibre = false } = {}) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'eduqa-cobol-'));
  try {
    for (const [nombre, texto] of Object.entries(archivos)) fs.writeFileSync(path.join(carpeta, nombre), texto);
    fs.writeFileSync(path.join(carpeta, 'programa.cob'), codigo);
    const compilado = spawnSync('cobc', ['-x', formatoLibre ? '-free' : '-fixed', '-o', 'programa', 'programa.cob'], {
      cwd: carpeta,
      encoding: 'utf8',
      env: { ...process.env, LANG: 'C', LC_ALL: 'C' },
    });
    const diagnosticos = `${compilado.stdout}${compilado.stderr}`.trim();
    if (compilado.status !== 0) return { compilo: false, salida: '', diagnosticos, archivos: {} };
    // Las dos salidas comparten descriptor, como en la terminal: quedan en el orden en que se escribieron.
    const destino = path.join(carpeta, '.salida');
    const fd = fs.openSync(destino, 'w');
    const r = spawnSync('./programa', [], {
      cwd: carpeta,
      input: entrada,
      stdio: ['pipe', fd, fd],
      timeout: 10000,
      env: { PATH: process.env.PATH, LANG: 'C', LC_ALL: 'C', TERM: 'dumb' },
    });
    fs.closeSync(fd);
    const escritos = {};
    for (const nombre of fs.readdirSync(carpeta)) {
      if (['programa', 'programa.cob', '.salida'].includes(nombre)) continue;
      const bytes = fs.readFileSync(path.join(carpeta, nombre));
      if (archivos[nombre] !== undefined && Buffer.from(archivos[nombre]).equals(bytes)) continue;
      escritos[nombre] = comoTexto(new Uint8Array(bytes)).texto;
    }
    // libcob de Debian enlaza una libxml2 más nueva que la instalada y esta
    // lo avisa al arrancar cada programa; no es salida del programa.
    const salida = fs.readFileSync(destino, 'utf8').replace(/^Warning: program compiled against libxml \d+ using older \d+\n/gm, '');
    return { compilo: true, salida, diagnosticos, codigo: r.status, archivos: escritos };
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
}

// Las vallas guardan el texto sin el salto de línea final ni los blancos al
// final de cada línea: DISPLAY de un PIC X rellena con espacios hasta su
// longitud, son invisibles y un editor los borraría al guardar.
const sinFinal = (s) => s.replace(/[ \t]+$/gm, '').replace(/\n$/, '');
// DISPLAY de un PIC X imprime sus espacios de relleno; Esperado no puede mostrarlos.
const sinBlancosFinales = (s) => s.replace(/[ \t]+$/gm, '').trim();

/**
 * Reescribe, en orden, las vallas `salida` y `escrito` de los bloques
 * `cobol` que se ejecutaron. `resultados[k]` es { salida, archivos } del
 * bloque k, o null para dejarlo como está.
 */
function reescribir(texto, resultados) {
  const lineas = texto.split('\n');
  const fuera = [];
  let i = 0;
  let k = 0;
  while (i < lineas.length) {
    const linea = lineas[i];
    fuera.push(linea);
    i++;
    if (!/^```cobol\b/.test(linea)) continue;
    while (i < lineas.length && !/^```\s*$/.test(lineas[i])) fuera.push(lineas[i++]);
    fuera.push(lineas[i++]);
    const resultado = resultados[k++];
    for (;;) {
      const blancos = [];
      let j = i;
      while (j < lineas.length && lineas[j].trim() === '') blancos.push(lineas[j++]);
      const cabecera = lineas[j] ?? '';
      const valla = cabecera.match(/^```(entrada|archivo|salida|escrito)\b\s*(\S*)\s*$/);
      if (!valla) break;
      const [, tipo, nombre] = valla;
      let fin = j + 1;
      while (fin < lineas.length && !/^```\s*$/.test(lineas[fin])) fin++;
      const nuevo = !resultado || tipo === 'entrada' || tipo === 'archivo'
        ? null
        : tipo === 'salida' ? resultado.salida : resultado.archivos[nombre];
      fuera.push(...blancos, cabecera, ...(nuevo === null || nuevo === undefined ? lineas.slice(j + 1, fin) : sinFinal(nuevo).split('\n')), lineas[fin]);
      i = fin + 1;
    }
  }
  return fuera.join('\n');
}

function reglasDeFormato(b, donde) {
  const problemas = [];
  if (b.formatoLibre) return problemas;
  b.contenido.split('\n').forEach((linea, n) => {
    if (linea.includes('\t')) problemas.push(`${donde}: línea ${n + 1} con tabulador; en formato fijo las columnas deben ser espacios.`);
    // Un bloque !error puede pasar de la columna 72 a propósito: es el error que
    // enseña. Una línea con número de secuencia (columnas 1 a 6) es la imagen de
    // una tarjeta y puede usar el área de identificación, hasta la columna 80.
    const tarjeta = /^\d{6}/.test(linea) && linea.length <= 80;
    if (linea.length > 72 && !b.errorEsperado && !tarjeta) problemas.push(`${donde}: línea ${n + 1} pasa de la columna 72 (${linea.length}):\n${linea}`);
  });
  return problemas;
}

const respuestas = JSON.parse(fs.readFileSync('scripts/cobol-respuestas.json', 'utf8'));
let bloques = 0;
let nativos = 0;
let ejercicios = 0;
const fallos = [];

for (const { carpeta, raiz } of carpetas) {
  const curso = cargarCurso(carpeta, raiz);
  for (const leccion of curso.lecciones) {
    const archivo = fs.readdirSync(path.join(raiz, carpeta)).find((f) => {
      if (f === 'curso.md' || !f.endsWith('.md')) return false;
      return new RegExp(`^numero:\\s*${leccion.numero}\\s*$`, 'm').test(fs.readFileSync(path.join(raiz, carpeta, f), 'utf8'));
    });
    const donde = `${carpeta}/${archivo}`;
    const resultados = [];
    for (const b of leccion.bloques) {
      if (b.tipo !== 'codigo' || b.lenguaje !== 'cobol') continue;
      fallos.push(...reglasDeFormato(b, donde));
      const opciones = { entrada: b.entrada, archivos: b.archivos ?? {}, formatoLibre: b.formatoLibre };
      const esperados = b.escritos ?? {};

      // `!sin-consola`: el motor web no lo admite (archivos indexados). Su
      // referencia es la de GnuCOBOL nativo y solo se comprueba con --nativo.
      let r;
      if (b.sinConsola) {
        if (!cobcNativo) {
          resultados.push(null);
          continue;
        }
        r = ejecutarNativo(b.contenido, opciones);
        nativos++;
      } else {
        r = await motor.ejecutar(b.contenido, { ...opciones, formato: b.formatoLibre ? 'free' : 'fixed' });
        bloques++;
        if (cobcNativo && r.compilo && !b.salidaVariable) {
          const n = ejecutarNativo(b.contenido, opciones);
          nativos++;
          if (sinFinal(n.salida) !== sinFinal(r.salida)) {
            fallos.push(`${donde}: el motor web y ${cobcNativo} difieren.\n${b.contenido}\n--- web ---\n${r.salida}\n--- nativo ---\n${n.salida}`);
          }
          // Un archivo binario (RELATIVE) no se compara byte a byte: libcob
          // antepone a cada registro su longitud como size_t, 4 bytes en
          // wasm32 y 8 en x86-64 (README.md). Sí se exige que ambos lo escriban.
          const binario = (texto) => /^[0-9a-f]{8} {2}/.test(texto ?? '');
          for (const nombre of new Set([...Object.keys(r.archivos), ...Object.keys(n.archivos)])) {
            if (binario(r.archivos[nombre]) && binario(n.archivos[nombre])) continue;
            if (sinFinal(r.archivos[nombre] ?? '(no escrito)') !== sinFinal(n.archivos[nombre] ?? '(no escrito)')) {
              fallos.push(`${donde}: ${nombre} difiere entre el motor web y ${cobcNativo}.\n--- web ---\n${r.archivos[nombre]}\n--- nativo ---\n${n.archivos[nombre]}`);
            }
          }
        }
      }
      resultados.push(b.salidaVariable ? null : b.errorEsperado ? { salida: r.diagnosticos, archivos: {} } : r);

      // `cobol !error` enseña un error: tiene que fallar y su valla salida es
      // el diagnóstico. El de cobc nativo dice lo mismo con otra ruta de archivo.
      if (b.errorEsperado) {
        if (r.compilo) fallos.push(`${donde}: un bloque !error compila.\n${b.contenido}`);
        else if (!escribir && sinFinal(r.diagnosticos) !== sinFinal(b.salida ?? '')) {
          fallos.push(`${donde}: el diagnóstico no coincide.\n${b.contenido}\n--- esperado ---\n${b.salida}\n--- obtenido ---\n${r.diagnosticos}`);
        }
        continue;
      }
      if (!r.compilo) {
        fallos.push(`${donde}: el bloque no compila.\n${b.contenido}\n--- diagnóstico ---\n${r.diagnosticos}`);
        continue;
      }
      if (r.diagnosticos) fallos.push(`${donde}: el bloque compila con avisos.\n${b.contenido}\n--- avisos ---\n${r.diagnosticos}`);
      if (b.salidaVariable) {
        if (b.salida !== null) fallos.push(`${donde}: un bloque !variable no lleva valla salida:\n${b.contenido}`);
        continue;
      }
      if (escribir) continue;
      if (b.salida === null && r.salida !== '') {
        fallos.push(`${donde}: bloque sin valla salida que imprime:\n${b.contenido}\n--- imprime ---\n${r.salida}`);
      } else if (b.salida !== null && sinFinal(r.salida) !== sinFinal(b.salida)) {
        fallos.push(`${donde}: la salida no coincide.\n${b.contenido}\n--- esperado ---\n${b.salida}\n--- obtenido ---\n${sinFinal(r.salida)}`);
      }
      for (const nombre of new Set([...Object.keys(esperados), ...Object.keys(r.archivos)])) {
        if (!(nombre in esperados)) fallos.push(`${donde}: el programa escribe ${nombre} y el temario no lo declara con una valla escrito.\n${b.contenido}`);
        else if (!(nombre in r.archivos)) fallos.push(`${donde}: el temario declara ${nombre} escrito y el programa no lo modifica.`);
        else if (sinFinal(r.archivos[nombre]) !== sinFinal(esperados[nombre])) {
          fallos.push(`${donde}: ${nombre} no coincide.\n--- esperado ---\n${esperados[nombre]}\n--- obtenido ---\n${r.archivos[nombre]}`);
        }
      }
    }
    if (escribir) {
      const ruta = path.join(raiz, carpeta, archivo);
      const antes = fs.readFileSync(ruta, 'utf8');
      const despues = reescribir(antes, resultados);
      if (despues !== antes) {
        fs.writeFileSync(ruta, despues);
        console.log(`Salidas escritas en ${donde}`);
      }
    }

    for (const [seccion, e] of Object.entries(leccion.ejercicios ?? {})) {
      if ((e.tipo ?? 'codigo') !== 'codigo' || e.lenguaje !== 'cobol') continue;
      const r = respuestas.find((x) => x.curso === carpeta && x.archivo === archivo && x.seccion === seccion);
      if (!r) {
        fallos.push(`${donde}#${seccion}: falta su respuesta en scripts/cobol-respuestas.json`);
        continue;
      }
      const bien = await motor.ejecutar(e.plantilla.replace('___', () => r.respuesta));
      const mal = await motor.ejecutar(e.plantilla.replace('___', () => r.incorrecta));
      ejercicios++;
      const sale = (x) => (x.compilo ? x.salida : x.diagnosticos);
      if (!bien.compilo || bien.anormal || sinBlancosFinales(bien.salida) !== sinBlancosFinales(e.esperado)) {
        fallos.push(`${donde}#${seccion}: la respuesta correcta produce\n${sale(bien)}\nen lugar de\n${e.esperado}`);
      }
      if (bien.diagnosticos) fallos.push(`${donde}#${seccion}: la respuesta correcta compila con avisos:\n${bien.diagnosticos}`);
      if (mal.compilo && !mal.anormal && sinBlancosFinales(mal.salida) === sinBlancosFinales(e.esperado)) {
        fallos.push(`${donde}#${seccion}: la respuesta incorrecta también se da por buena`);
      }
    }
  }
}

// Las escenas 3D de memoria afirman qué queda en cada campo y qué muestra cada
// DISPLAY: se reconstruye el programa de cada guion y se ejecuta.
const guiones = cargar(path.resolve('src/components/guiones-cobol.ts'));
let escenas = 0;
for (const [nombre, guion] of Object.entries(guiones)) {
  const sentencias = [];
  const esperado = [];
  // DISPLAY de un campo con V escribe el punto decimal (pretty-display de
  // GnuCOBOL); el guion guarda los dígitos tal como están en memoria.
  const mostrarCampo = (indice, contenido) => {
    const { nombre: campo, decimales } = guion.campos[indice];
    sentencias.push(`DISPLAY "[" ${campo} "]"`);
    esperado.push(`[${decimales ? `${contenido.slice(0, -decimales)}.${contenido.slice(-decimales)}` : contenido}]`);
  };
  guion.campos.forEach((c, i) => c.inicial !== undefined && mostrarCampo(i, c.inicial));
  const eventos = [
    ...guion.codigo.map((linea, orden) => ({ t: linea.t, orden, linea })),
    ...guion.movimientos.map((mov, orden) => ({ t: mov.t, orden: 1000 + orden, mov })),
  ].sort((a, b) => a.t - b.t || a.orden - b.orden);
  for (const e of eventos) {
    if (e.linea && /^(MOVE|DISPLAY)\b/.test(e.linea.linea)) {
      sentencias.push(e.linea.linea);
      if (e.linea.salida !== undefined) esperado.push(e.linea.salida);
    }
    if (e.mov) mostrarCampo(e.mov.campo, e.mov.valor);
  }
  const programa = [
    '       IDENTIFICATION DIVISION.',
    '       PROGRAM-ID. ESCENA.',
    '       DATA DIVISION.',
    '       WORKING-STORAGE SECTION.',
    ...guion.datos.map((l) => `       ${l}`),
    '       PROCEDURE DIVISION.',
    ...sentencias.map((l) => `           ${l}`),
    '           STOP RUN.',
  ].join('\n');
  const r = await motor.ejecutar(programa);
  escenas++;
  const obtenido = r.compilo ? r.salida.replace(/\n$/, '').split('\n') : [r.diagnosticos];
  if (JSON.stringify(obtenido) !== JSON.stringify(esperado)) {
    fallos.push(`escena ${nombre}: el guion no coincide con GnuCOBOL.\n${programa}\n--- esperado ---\n${esperado.join('\n')}\n--- obtenido ---\n${obtenido.join('\n')}`);
  }
}

if (fallos.length) {
  console.error(fallos.join('\n\n'));
  console.error(`\n${fallos.length} fallos.`);
  process.exit(1);
}
const extra = cobcNativo ? `; ${nativos} contrastados con ${cobcNativo}` : '';
console.log(`${carpetas.length} paquetes de COBOL (el del motor y ${carpetas.filter((c) => c.carpeta !== 'cobol-motor').length} cursos) y ${escenas} escenas 3D: ${bloques} bloques y ${ejercicios} ejercicios verificados en el motor del navegador${extra}.`);
process.exit(0);
