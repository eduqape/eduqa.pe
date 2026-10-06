/**
 * Cómo se ejecuta un bloque de Bash. Lo comparten el navegador
 * (`bash-web.ts`) y la verificación de los cursos (`scripts/verificar-bash.mjs`):
 * si cada uno armara la ejecución a su manera, una salida comprobada en un
 * lado podría no coincidir con la que ve el alumno en el otro.
 *
 * Los artefactos están fijados en `public/vendor/bash`; su origen y versiones
 * se documentan en el README de esa carpeta.
 */

export const BASE_BASH = "/vendor/bash";

/** GNU Bash 5.1.16, uutils coreutils 0.13.0, GNU grep 3.12, GNU sed 4.9 y findutils 0.10.1. */
export const PAQUETES_BASH = [
  "bash-1.0.25.webc",
  "coreutils-1.0.27.webc",
  "grep-3.12.0.webc",
  "sed-4.9.0.webc",
  "findutils-0.10.1.webc",
] as const;

export const DIRECTORIO_BASH = "/workspace";
export const SCRIPT_BASH = "script.sh";

export const ENTORNO_BASH: Record<string, string> = {
  HOME: DIRECTORIO_BASH,
  USER: "alumno",
  LANG: "C.UTF-8",
  // uutils colorea sus errores; en la salida del curso solo estorban.
  NO_COLOR: "1",
  TERM: "dumb",
};

/** Retira secuencias de color ANSI que algún programa emita igualmente. */
export const limpiarSalidaBash = (texto: string) =>
  texto.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");

/*
 * El script corre en un segundo `bash` con la salida de error unida a la
 * estándar. Así los mensajes de error aparecen en el orden en que se emiten y
 * con el mismo prefijo que en una terminal (`script.sh: line 3: …`).
 */
export const ORDEN_BASH = ["-c", `bash ${SCRIPT_BASH} 2>&1`];

export const LIMITE_MS_BASH = 10000;
export const LIMITE_SALIDA_BASH = 256 * 1024;

/** Mismo criterio de nombre que los archivos virtuales de Fortran. */
export const RE_ARCHIVO_BASH = /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/;
