# Bash en WebAssembly

Los cursos de Bash ejecutan los bloques `bash` y los ejercicios `ejercicio bash`
en el navegador, con el SDK de Wasmer y paquetes WASIX. Los bytes quedan fijados
en este repositorio; `SHA256.json` permite comprobarlos. No se descarga nada del
registro de Wasmer durante la ejecución del alumno.

| Archivo | Origen | Contenido | Licencia |
|---|---|---|---|
| `sdk/` | npm `@wasmer/sdk` 0.19.0 (sin `.d.ts` ni `.map`) | Runtime Wasmer + WASIX compilado a WebAssembly | MIT (`sdk/LICENSE`) |
| `paquetes/bash-1.0.25.webc` | registro Wasmer, `wasmer/bash@1.0.25` | GNU Bash 5.1.16 (`BASH_VERSION` se muestra como `dist.16(1)`) | GPL-3.0, fuente en https://github.com/wasix-org/bash |
| `paquetes/coreutils-1.0.27.webc` | `wasmer/coreutils@1.0.27` | uutils coreutils 0.13.0 | MIT, fuente en https://github.com/wasix-org/coreutils |
| `paquetes/grep-3.12.0.webc` | `wasmer/grep@3.12.0` | GNU grep 3.12 | GPL-3.0, fuente en https://github.com/wasix-org/grep |
| `paquetes/sed-4.9.0.webc` | `wasmer/sed@4.9.0` | GNU sed 4.9 | GPL-3.0, fuente en https://github.com/wasix-org/sed |
| `paquetes/findutils-0.10.1.webc` | `wasmer/findutils@0.10.1` | uutils findutils 0.10 (`find`, `xargs`) | MIT, fuente en https://github.com/wasix-org/findutils |

Descargados el 6 de octubre de 2026. Carga inicial: unos 27 MB sin comprimir;
después, cada ejecución crea un sandbox nuevo en unas decenas de milisegundos.

## Requisitos del navegador

El runtime reparte los procesos entre Workers que comparten memoria
(`SharedArrayBuffer`), así que la página tiene que estar aislada entre
orígenes. `src/proxy.ts` envía `Cross-Origin-Opener-Policy: same-origin` y
`Cross-Origin-Embedder-Policy: credentialless` en las lecciones de cursos cuyo
slug contiene `bash`; `next.config.ts` añade COEP a los archivos de esta
carpeta. Funciona en Chrome, Edge y Firefox. Safari no admite `credentialless`:
ahí cada bloque muestra su salida de referencia.

## Cómo se ejecuta un bloque

`src/lib/bash-comun.ts` lo define para el navegador y para la verificación:
el bloque se escribe como `/workspace/script.sh` y se lanza con
`bash -c 'bash script.sh 2>&1'`, con `HOME=/workspace`, `USER=alumno`,
`LANG=C.UTF-8` y `NO_COLOR=1`. Límite de 10 s y 256 KiB de salida.

## Diferencias conocidas con una terminal Linux

- Es Bash 5.1: no existen las novedades de 5.2 (`patsub_replacement`) ni de
  5.3 (`${ orden; }`, `GLOBSORT`). Los bloques que las usan llevan `!sin-consola`.
- `ls`, `sort`, `wc`, etc. son uutils, no GNU coreutils; sus mensajes de error
  y algún formato difieren. No hay `awk`, `curl`, `jq`, `tar`, `whoami` ni red.
- `nproc` y la hora reflejan el equipo del alumno: no son deterministas.

Comprobación: `npm run test:bash` ejecuta todos los bloques y ejercicios de los
cursos de Bash con estos mismos bytes, en Node.
