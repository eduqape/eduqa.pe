/**
 * Figuras isométricas que un curso puede embeber con la valla ```figura.
 *
 * Solo nombres y títulos, sin dependencias: el lector de Markdown valida
 * contra esta lista sin cargar la geometría. Cada figura vive en
 * `src/components/figuras/<nombre>/` y se registra en `FiguraCurso`.
 */
export const FIGURAS = {
  "tarjeta-perforada": { titulo: "Formato de referencia" },
} as const;

export type NombreFigura = keyof typeof FIGURAS;

export const esFigura = (nombre: string): nombre is NombreFigura => Object.hasOwn(FIGURAS, nombre);
