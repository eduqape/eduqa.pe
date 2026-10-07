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
el bloque se entrega como `/workspace/.eduqa/script.sh`, se mueve a
`/tmp/.eduqa` para que no aparezca entre los archivos del alumno y se lanza con
`bash script.sh 2>&1` precedido, en su misma línea 1, de `cd /workspace;
unset OLDPWD;`. El entorno lleva `HOME=/workspace`, `USER=alumno`,
`LANG=C.UTF-8` y `NO_COLOR=1`. Límite de 10 s y 256 KiB de salida.

## Diferencias conocidas con una terminal Linux

- Es Bash 5.1: no existen las novedades de 5.2 (`patsub_replacement`) ni de
  5.3 (`${ orden; }`, `GLOBSORT`). Los bloques que las usan llevan `!sin-consola`.
- `ls`, `sort`, `wc`, etc. son uutils, no GNU coreutils; sus mensajes de error
  y algún formato difieren. No hay `awk`, `curl`, `jq`, `tar`, `whoami` ni red.
- `nproc` y la hora reflejan el equipo del alumno: no son deterministas.
- **Códigos de salida de procesos hijos:** el runtime WASIX convierte el código
  de salida en un *errno* de WASI, y todo valor de 80 a 255 llega como 79. Un
  comando inexistente da `$?` = 79 (en Linux, 127); `(exit 130)` también da 79.
  Las funciones y los builtins (`return 127`, `false`) no se ven afectados. Los
  bloques que enseñan 126, 127 o 128+n van como `bash !sin-consola`, con la
  salida de GNU Bash en Linux. Ocurre con `@wasmer/sdk` 0.19.0, la última
  publicada al fijar estos archivos.
- `cp -r` copia los directorios, pero escribe un aviso «operation not supported
  on this platform» por cada uno: el sistema de archivos virtual no admite
  copiar sus atributos. `ls` escribe en columnas aunque no haya terminal.
- No están `chmod`, `stat`, `du`, `ps`, `diff`, `less`, `man`, `which`, `tar`
  ni `awk`.

Comprobación: `npm run test:bash` ejecuta todos los bloques y ejercicios de los
cursos de Bash con estos mismos bytes, en Node.
