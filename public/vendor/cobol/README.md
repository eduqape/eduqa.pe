# COBOL en WebAssembly

Los cursos de COBOL compilan y ejecutan los bloques `cobol` y los ejercicios
`ejercicio cobol` en el navegador con **GnuCOBOL 3.2**: el mismo `cobc` que en
Linux traduce el programa a C, Clang 22 compila ese C a WebAssembly, `wasm-ld`
lo enlaza con libcob y GMP, y el módulo resultante se ejecuta en WASI. Todo
ocurre en un Worker de la página; no se envía código a ningún servidor. Los
bytes quedan fijados en esta carpeta y `SHA256.json` permite comprobarlos.

| Ruta | Origen | Contenido | Licencia |
|---|---|---|---|
| `activos/cobol/` | npm `@live-codes/cobol-wasm` 0.1.0, `assets/cobol` | `cobc.wasm.gz` (frontend de GnuCOBOL 3.2), `rootfs.tar.gz` (configuración, copybooks, `libcob.a`, `libgmp.a` de GMP 6.3.0), `c-sysroot.tar.gz` (wasi-libc) | GPL-3.0-or-later (cobc), LGPL-3.0-or-later (libcob, GMP), Apache-2.0 WITH LLVM-exception y MIT (wasi-libc) |
| `activos/clang/` | npm `@live-codes/clang-wasm` 0.3.0, `assets` | `clang.wasm.gz` y `lld.wasm.gz` (LLVM 22.1.8), `memfs.wasm.gz` | Apache-2.0 WITH LLVM-exception; MIT |
| `js/llvm-core/` | npm `@wasm-idle/llvm-core` 1.1.0, `dist` | El host que arranca Clang y cobc y ejecuta el módulo WASI | MIT AND (Apache-2.0 WITH LLVM-exception) |
| `js/wasm-idle-core/` | npm `@wasm-idle/core` 1.1.0, `dist` | Solo la caché persistente de assets que importa el host | MIT |
| `js/browser_wasi_shim/` | npm `@bjorn3/browser_wasi_shim` 0.4.2, `dist` | Implementación de WASI preview 1 y del sistema de archivos en memoria | MIT OR Apache-2.0 |
| `js/fflate/` | npm `fflate` 0.8.3, `esm/browser.js` | Descompresión de los `.gz` | MIT |
| `motor.mjs`, `worker.mjs` | propios | Envoltorio común al navegador y a la verificación | — |

Los textos de las licencias están en `licencias/`. Descargados el 12 de octubre
de 2026 y copiados con `node scripts/vendorizar-cobol.mjs`, que reescribe los
especificadores de paquete (`@bjorn3/browser_wasi_shim`, `fflate`,
`@wasm-idle/core`) como rutas relativas para que el Worker los importe sin
bundler, y quita los comentarios de mapas de fuente. Del paquete
`@wasm-idle/core` solo se copia la caché de assets; el resto describe otros
lenguajes. Clang trae además su propio sysroot y clangd, que el motor de COBOL
no usa. En total, unos 27 MB; la primera vez el navegador descarga unos 25 MB
de assets comprimidos y después compila cada programa en unas décimas de
segundo.

## Requisitos del navegador

El motor no usa memoria compartida, así que no necesita aislamiento entre
orígenes (COOP/COEP). El envoltorio de memoria del host comprueba
`instanceof SharedArrayBuffer`; en una página no aislada `motor.mjs` define un
sustituto que falla si se construye, igual que `@live-codes/cobol-wasm`.
Comprobado en Chromium. Necesita Workers de módulo (`type: "module"`).

## Cómo se ejecuta un bloque

`motor.mjs` lo define para el navegador y para `scripts/verificar-cobol.mjs`:

- El programa se compila como `programa.cob`, con las opciones de
  `cobc -x programa.cob` (formato fijo; `-free` si el bloque es `cobol !libre`).
  Se le añade el salto de línea final que tiene cualquier archivo fuente.
- Las vallas `archivo` se copian en el directorio de trabajo del programa y
  también junto al fuente, donde `COPY` busca los copybooks.
- La entrada estándar (`entrada`) se entrega entera una vez y después llega fin
  de archivo: `ACCEPT` no es interactivo.
- Las salidas estándar y de error se recogen en el orden en que se escriben.
  Los archivos que el programa crea o modifica se devuelven con su contenido;
  los que no son texto, como volcado hexadecimal con el formato de
  `hexdump -C`.
- Entorno: `LANG=C` y `TERM=dumb`. La hora es la del equipo del alumno, en
  UTC.
- Límites: 60 s para compilar, 10 s para ejecutar y 256 KiB de salida. Al
  vencer un límite o pulsar «Detener», el Worker se termina y el siguiente
  programa arranca otro. Cada 40 compilaciones el compilador se reemplaza,
  porque su sistema de archivos conserva lo compilado.

## Dos correcciones de WASI

`browser_wasi_shim` resuelve dos llamadas de forma distinta a Linux, y
`motor.mjs` las corrige al crear cada ejecución:

- `fd_fdstat_get` de un archivo abierto devuelve permisos 0. wasi-libc, al
  abrir un flujo escribible con `fopen`, llama a `__isatty()`, que en un
  archivo normal deja `errno = ENOTTY`. GnuCOBOL pone `errno` a 0, llama a
  `fopen` y decide por `errno`, no por el puntero devuelto: toma `ENOTTY` por
  un fallo y `OPEN OUTPUT` de un archivo `LINE SEQUENTIAL` termina con estado
  30. El motor declara los archivos como dispositivos de caracteres sin
  desplazamiento, la única forma de que `__isatty()` no modifique `errno`;
  `lseek` y `fstat` usan otras llamadas y no cambian.
- `fd_fdstat_set_flags` no está implementada; `fopen("a+")` la usa para
  `O_APPEND` (`OPEN EXTEND`). El archivo ya se abrió en modo de anexar, así que
  el motor solo coloca el puntero al final.

## Diferencias conocidas con GnuCOBOL en Linux

El perfil del motor declara como no admitidos:

- **Archivos `ORGANIZATION INDEXED`.** libcob se compiló sin Berkeley DB ni
  VBISAM: `cobc` rechaza el programa con «runtime is not configured to support
  ORGANIZATION INDEXED». Los bloques que los usan van como `cobol !sin-consola`
  y su salida se obtiene con GnuCOBOL nativo (`npm run test:cobol -- --nativo`).
  `SEQUENTIAL`, `LINE SEQUENTIAL`, `RELATIVE` y `SORT` sí funcionan.
- **`CALL` dinámico.** Sin `dlopen`, un `CALL` a un programa hermano (otro
  programa del mismo fuente, separado por `END PROGRAM`) termina con «module
  not found». Un programa **anidado** —contenido en el que llama, antes de su
  `END PROGRAM`— sí funciona, porque `cobc` lo llama directamente. Compilar con
  `-fstatic-call` no lo arregla: cobc declara al programa llamado sin
  prototipo y WebAssembly exige firmas exactas, así que la ejecución termina
  con «function signature mismatch».
- **`CALL "SYSTEM"`, `fork` y `SCREEN SECTION`.**

Además:

- Un subíndice fuera de rango no se comprueba, igual que en `cobc` sin
  `-debug`, pero lo que se lee en su lugar depende de la disposición de la
  memoria y puede no coincidir con Linux. El temario no se apoya en ese
  comportamiento indefinido.
- `FUNCTION CURRENT-DATE` y `ACCEPT … FROM DATE` dan la hora del equipo en UTC:
  no son deterministas y sus bloques van como `cobol !variable`.

Comprobación: `npm run test:cobol` ejecuta todos los bloques y ejercicios de
los cursos de COBOL con estos mismos bytes, en Node. Con `-- --nativo` compila
además cada bloque con el `cobc` instalado (`sudo apt install gnucobol3`) y
exige la misma salida.
