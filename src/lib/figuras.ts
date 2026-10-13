/**
 * Figuras isométricas que un curso puede embeber con la valla ```figura.
 *
 * Solo nombre, título y pie, sin dependencias: el lector de Markdown valida
 * contra esta lista y la tarjeta cerrada se dibuja sin cargar la geometría.
 * Cada figura vive en `src/components/figuras/<nombre>/` y se registra en
 * `FiguraIso`. El pie describe el dibujo; no enseña nada que no diga el texto.
 */
export const FIGURAS = {
  "tarjeta-perforada": {
    titulo: "La tarjeta perforada y sus zonas",
    pie: "Tarjeta IBM de 80 columnas con la sentencia DISPLAY perforada en el código de la IBM 029. El carro lee una columna a la vez; los topes de la guía marcan dónde empieza cada zona.",
  },
} as const;

export type NombreFigura = keyof typeof FIGURAS;

export const esFigura = (nombre: string): nombre is NombreFigura => Object.hasOwn(FIGURAS, nombre);
