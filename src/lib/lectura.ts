import type { Bloque } from "@/lib/curso-tipos";

/**
 * Velocidad de lectura silenciosa de referencia, en palabras por minuto.
 *
 * Brysbaert (2019), «How many words do we read per minute? A review and
 * meta-analysis of reading rate», Journal of Memory and Language 109, estima
 * 238 palabras por minuto para textos expositivos (no ficción) en adultos.
 * Se usa como piso: un texto técnico con código se lee más despacio, así que
 * el tiempo mínimo nunca excede lo que tarda alguien que lee de verdad.
 */
export const PALABRAS_POR_MINUTO = 238;

/** Ninguna sesión se da por leída en menos de esto, por corta que sea. */
export const SEGUNDOS_MINIMOS_ABSOLUTOS = 30;

function contarPalabras(texto: string | null | undefined): number {
  if (!texto) return 0;
  return texto.split(/\s+/).filter(Boolean).length;
}

/** Palabras que el alumno tiene delante: teoría, notas, código y salidas. */
export function palabrasDeLeccion(bloques: Bloque[]): number {
  let total = 0;
  for (const bloque of bloques) {
    if (bloque.tipo === "teoria") {
      total += contarPalabras(bloque.contenido) + contarPalabras(bloque.nota);
    } else if (bloque.tipo === "codigo") {
      total += contarPalabras(bloque.contenido) + contarPalabras(bloque.salida) + contarPalabras(bloque.nota);
    }
  }
  return total;
}

/** Tiempo mínimo, en segundos, para que una sesión se marque sola como leída. */
export function segundosMinimosDeLectura(bloques: Bloque[]): number {
  const segundos = Math.round((palabrasDeLeccion(bloques) / PALABRAS_POR_MINUTO) * 60);
  return Math.max(SEGUNDOS_MINIMOS_ABSOLUTOS, segundos);
}
