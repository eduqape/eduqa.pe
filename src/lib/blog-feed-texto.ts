import type { EstadoFeedMedium } from "@/lib/blog-types";

/**
 * Qué decirle a quien administra sobre el feed, y si es un problema.
 *
 * Vive aparte para que el bloque del servidor y el botón del cliente digan
 * exactamente lo mismo tras actualizar.
 */
export function describirFeedMedium(estado: EstadoFeedMedium): { texto: string; problema: boolean } {
  switch (estado.tipo) {
    case "ok":
      return {
        texto: `${estado.articulos} ${estado.articulos === 1 ? "artículo sincronizado" : "artículos sincronizados"}.`,
        problema: false,
      };
    case "vacio":
      return { texto: "El feed responde, pero no trae artículos publicados.", problema: true };
    case "http":
      return {
        texto:
          estado.codigo === 404
            ? "Medium respondió 404: el usuario o la publicación del feed no existe. Revisa MEDIUM_FEED_URL en Vercel."
            : `Medium respondió ${estado.codigo}. Vuelve a intentarlo en unos minutos.`,
        problema: true,
      };
    case "red":
      return { texto: "No se pudo conectar con Medium. Vuelve a intentarlo en unos minutos.", problema: true };
  }
}
