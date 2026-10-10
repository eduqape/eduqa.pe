/**
 * Escenas 3D que un curso puede embeber con la valla ```escena.
 *
 * Solo nombres y títulos, sin dependencias: el lector de Markdown valida contra
 * esta lista sin cargar three.js. El guion de cada escena vive en
 * `src/components/guiones-variables.ts` y se descarga al lanzarla.
 */
export const ESCENAS = {
  "variables-definicion": { titulo: "Un nombre ligado a un valor" },
  "variables-reasignacion": { titulo: "Nombres que señalan valores" },
} as const;

export type NombreEscena = keyof typeof ESCENAS;

export const esEscena = (nombre: string): nombre is NombreEscena => Object.hasOwn(ESCENAS, nombre);
