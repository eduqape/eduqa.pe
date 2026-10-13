// Motor de COBOL de las lecciones: compila con GnuCOBOL 3.2 y ejecuta el
// programa en WASI. Lo importan el Worker del navegador (`worker.mjs`) y la
// verificación de los cursos (`scripts/verificar-cobol.mjs`): si cada uno
// armara la ejecución a su manera, una salida comprobada en un lado podría no
// coincidir con la que ve el alumno en el otro.
//
// Origen de cada archivo de esta carpeta y diferencias con un GnuCOBOL nativo:
// README.md.
import { createCobolCompiler } from './js/llvm-core/cobol/src/index.js';
import { createBrowserWasiHost } from './js/llvm-core/clang/src/browser-execution.js';
import { Directory, File, OpenFile, WASI, wasi } from './js/browser_wasi_shim/index.js';

/** Nombre con el que se compila: aparece en los mensajes de error. */
export const NOMBRE_FUENTE = 'programa.cob';
export const LIMITE_SALIDA = 256 * 1024;
/** Programas compilados con un mismo compilador antes de reemplazarlo. */
export const COMPILACIONES_POR_MOTOR = 40;
/** Archivos de datos y copybooks: el mismo criterio que Fortran y Bash. */
export const RE_ARCHIVO = /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/;

class SalidaExcedida extends Error {}

/*
 * El sistema de archivos del compilador escribe un texto con `charCodeAt`, un
 * byte por unidad de UTF-16: la «Ñ» llegaría como el byte D1 de Latin-1 y no
 * como los dos bytes de UTF-8 que `cobc` lee en Linux. Se le entrega una cadena
 * cuyos caracteres son ya los bytes UTF-8, que esa copia deja intactos.
 */
const comoBytesUtf8 = (texto) => {
  let binario = '';
  for (const byte of new TextEncoder().encode(texto)) binario += String.fromCharCode(byte);
  return binario;
};

// GnuCOBOL colorea sus diagnósticos y el host compila cada programa en una
// carpeta `__wasm_cobol_N/` cuyo nombre se filtraría en cada mensaje.
const limpiarDiagnosticos = (texto) =>
  String(texto ?? '')
    .replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/__wasm_cobol_\d+\//g, '')
    .split(/\r?\n/)
    .map((linea) => linea.replace(/\s+$/, ''))
    // Líneas del propio host (pasos del enlazado) y su aviso de salida.
    .filter((linea) => linea && !/^\s*>|^\s*done\.?\s*$|^Error: process exited with code \d+\.$/.test(linea))
    .join('\n');

/*
 * Dos llamadas de WASI que el shim resuelve de forma distinta a Linux:
 *
 * - `fd_fdstat_get` de un archivo abierto devuelve permisos 0. wasi-libc, al
 *   abrir un flujo escribible con fopen, llama a `__isatty()`, que en un
 *   archivo normal deja errno = ENOTTY. GnuCOBOL pone errno a 0, llama a
 *   fopen y decide por errno, no por el puntero: toma ENOTTY por un fallo y
 *   el OPEN OUTPUT de un archivo LINE SEQUENTIAL termina con estado 30. Se
 *   declara el archivo como dispositivo de caracteres sin desplazamiento, la
 *   única forma de que `__isatty()` no toque errno. `lseek` y `fstat` usan
 *   otras llamadas y no cambian.
 * - `fd_fdstat_set_flags` no está implementada; fopen("a+") la usa para
 *   O_APPEND (OPEN EXTEND). El archivo ya se abrió en modo de anexar, así que
 *   basta con colocar el puntero al final.
 */
function corregirWasi(instancia) {
  const original = instancia.wasiImport.fd_fdstat_get;
  const DERECHOS = BigInt(
    wasi.RIGHTS_FD_READ | wasi.RIGHTS_FD_WRITE | wasi.RIGHTS_FD_DATASYNC | wasi.RIGHTS_FD_SYNC |
      wasi.RIGHTS_FD_ADVISE | wasi.RIGHTS_FD_ALLOCATE | wasi.RIGHTS_FD_FILESTAT_GET |
      wasi.RIGHTS_FD_FILESTAT_SET_SIZE | wasi.RIGHTS_FD_FILESTAT_SET_TIMES,
  );
  instancia.wasiImport.fd_fdstat_get = (fd, puntero) => {
    if (!(instancia.fds[fd] instanceof OpenFile)) return original(fd, puntero);
    const vista = new DataView(instancia.inst.exports.memory.buffer);
    vista.setUint8(puntero, wasi.FILETYPE_CHARACTER_DEVICE);
    vista.setUint16(puntero + 2, 0, true);
    vista.setBigUint64(puntero + 8, DERECHOS, true);
    vista.setBigUint64(puntero + 16, 0n, true);
    return wasi.ERRNO_SUCCESS;
  };
  instancia.wasiImport.fd_fdstat_set_flags = (fd, banderas) => {
    const abierto = instancia.fds[fd];
    if (!(abierto instanceof OpenFile)) return wasi.ERRNO_BADF;
    if (banderas & wasi.FDFLAGS_APPEND) abierto.fd_seek(0n, wasi.WHENCE_END);
    return wasi.ERRNO_SUCCESS;
  };
}

/**
 * Contenido de un archivo para mostrarlo. Un archivo LINE SEQUENTIAL es texto;
 * uno RELATIVE o con campos COMP lleva bytes de control y se presenta como
 * volcado hexadecimal, con el mismo formato que `hexdump -C`.
 */
export function comoTexto(bytes) {
  let texto = null;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    texto = null;
  }
  if (texto !== null && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(texto)) return { texto, binario: false };
  const lineas = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const fila = [...bytes.subarray(i, i + 16)];
    const hex = fila.map((b) => b.toString(16).padStart(2, '0'));
    const izquierda = hex.slice(0, 8).join(' ').padEnd(23);
    const derecha = hex.slice(8).join(' ').padEnd(23);
    const ascii = fila.map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('');
    lineas.push(`${i.toString(16).padStart(8, '0')}  ${izquierda}  ${derecha}  |${ascii}|`);
  }
  lineas.push(bytes.length.toString(16).padStart(8, '0'));
  return { texto: lineas.join('\n') + '\n', binario: true };
}

function leerArbol(directorio, prefijo = '', fuera = {}) {
  for (const [nombre, entrada] of directorio.contents) {
    const ruta = prefijo + nombre;
    if (entrada instanceof Directory) leerArbol(entrada, ruta + '/', fuera);
    else if (entrada instanceof File) fuera[ruta] = entrada.data;
  }
  return fuera;
}

/*
 * El envoltorio de memoria del host hace `buf instanceof SharedArrayBuffer`
 * siempre, y en una página sin aislamiento entre orígenes ese constructor no
 * existe. Clang, lld y memfs usan memoria no compartida, así que basta con un
 * sustituto que falle si alguien llegara a construirlo. Es la misma solución
 * de @live-codes/cobol-wasm (src/runtime.js).
 */
function asegurarSharedArrayBuffer() {
  if (typeof globalThis.SharedArrayBuffer === 'undefined') {
    globalThis.SharedArrayBuffer = class SharedArrayBuffer {
      constructor() {
        throw new Error('SharedArrayBuffer no está disponible en este contexto');
      }
    };
  }
}

/**
 * Prepara el compilador. `base` es la URL de esta carpeta; en Node se pasa
 * una URL ficticia y `fetch` se intercepta para leer del disco.
 */
export async function crearMotorCobol({ base }) {
  asegurarSharedArrayBuffer();
  const raiz = new URL('./', base);
  const crear = () =>
    createCobolCompiler({
      runtimeBaseUrl: new URL('activos/cobol/', raiz).href,
      clangRuntimeBaseUrl: new URL('activos/clang/', raiz).href,
    });
  let compilador = await crear();
  let compilaciones = 0;
  let cola = Promise.resolve();

  /**
   * Compila y ejecuta. Devuelve la salida estándar y la de error en el orden
   * en que se escribieron, los diagnósticos del compilador y los archivos que
   * el programa creó o modificó.
   */
  async function ejecutarUno(codigo, { entrada = '', archivos = {}, formato = 'fixed', alCambiarFase } = {}) {
    // El sistema de archivos del compilador conserva cada compilación; se
    // reemplaza cada cierto número para que la memoria no crezca sin límite.
    if (compilaciones >= COMPILACIONES_POR_MOTOR) {
      compilador = await crear();
      compilaciones = 0;
    }
    compilaciones++;
    for (const nombre of Object.keys(archivos)) {
      if (!RE_ARCHIVO.test(nombre)) throw new Error(`Nombre de archivo inválido: ${nombre}`);
    }
    alCambiarFase?.('compilando');
    const compilado = await compilador.compile({
      // Un bloque del temario llega sin el salto de línea final que tiene
      // cualquier archivo fuente, y cobc avisaría de ello (-Wmissing-newline).
      code: comoBytesUtf8(codigo.endsWith('\n') ? codigo : `${codigo}\n`),
      fileName: NOMBRE_FUENTE,
      sourceFormat: formato,
      // Sin opciones: las mismas de `cobc -x programa.cob`. Un CALL a un
      // programa hermano (separado por END PROGRAM) no se resuelve sin dlopen;
      // los anidados sí, porque cobc los llama directamente (README.md).
      compileArgs: [],
      cCompileArgs: [],
      // Los copybooks se buscan junto al programa: los archivos van también ahí.
      workspaceFiles: Object.entries(archivos).map(([path, content]) => ({ path, content: comoBytesUtf8(content) })),
      log: false,
    });
    const diagnosticos = limpiarDiagnosticos(compilado.stdout || compilado.stderr);
    if (!compilado.success || !compilado.artifact) {
      return { compilo: false, salida: '', diagnosticos: diagnosticos || 'No se pudo compilar el programa.', codigo: null, archivos: {} };
    }

    alCambiarFase?.('ejecutando');
    const trozos = [];
    let bytes = 0;
    const escribir = (trozo) => {
      bytes += trozo.length;
      if (bytes > LIMITE_SALIDA) throw new SalidaExcedida();
      trozos.push(trozo);
    };
    let entregada = false;
    const host = createBrowserWasiHost({
      files: Object.entries(archivos).map(([path, contents]) => ({ path, contents })),
      // La entrada estándar se entrega entera una vez; después, fin de archivo.
      stdin: () => {
        if (entregada || !entrada) return null;
        entregada = true;
        return entrada;
      },
      stdout: escribir,
      stderr: escribir,
      programName: 'programa',
      env: { LANG: 'C', TERM: 'dumb' },
    });
    const instancia = new WASI(host.args, host.envEntries, host.fds, { debug: false });
    corregirWasi(instancia);
    const programa = await WebAssembly.instantiate(compilado.artifact.wasm, {
      wasi_unstable: instancia.wasiImport,
      wasi_snapshot_preview1: instancia.wasiImport,
    });
    let codigoSalida = null;
    let aviso = '';
    try {
      codigoSalida = instancia.start(programa);
    } catch (error) {
      aviso = error instanceof SalidaExcedida
        ? '[Salida recortada: el programa escribió más de 256 KiB]'
        : `[El programa terminó de forma anormal: ${error?.message ?? error}]`;
    }
    const codificador = new TextEncoder();
    const cambiados = {};
    const binarios = [];
    for (const [ruta, bytes] of Object.entries(leerArbol(host.rootDirectory))) {
      const original = archivos[ruta] === undefined ? null : codificador.encode(archivos[ruta]);
      if (original && original.length === bytes.length && original.every((b, i) => b === bytes[i])) continue;
      const { texto, binario } = comoTexto(bytes);
      cambiados[ruta] = texto;
      if (binario) binarios.push(ruta);
    }
    const salida = trozos.join('').replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
    return {
      compilo: true,
      salida: aviso ? `${salida}${salida && !salida.endsWith('\n') ? '\n' : ''}${aviso}\n` : salida,
      diagnosticos,
      codigo: codigoSalida,
      anormal: Boolean(aviso),
      archivos: cambiados,
      binarios,
    };
  }

  return {
    /** Las ejecuciones se encolan: el compilador tiene un único sistema de archivos. */
    ejecutar(codigo, opciones) {
      const turno = cola.then(() => ejecutarUno(codigo, opciones));
      cola = turno.catch(() => {});
      return turno;
    },
  };
}
