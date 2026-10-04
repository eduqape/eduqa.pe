import type { CursoCatalogoPublico } from "@/lib/catalogo-publico";

const produccionVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : null;

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  produccionVercel ??
  "https://eduqape.vercel.app"
).replace(/\/+$/, "");

export function urlAbsoluta(ruta: string) {
  return new URL(ruta, `${SITE_URL}/`).toString();
}

/**
 * Una URL solo entra al índice cuando tiene una ficha útil y un temario real.
 * No se inventa copy para rellenar páginas incompletas: esas URLs pueden
 * seguir existiendo y pasando enlaces, pero no consumen espacio en el sitemap.
 */
export function esCursoIndexable(
  curso: Pick<CursoCatalogoPublico, "titulo" | "resumen" | "lecciones">,
) {
  return (
    curso.titulo.trim().length > 0 &&
    curso.resumen.trim().length > 0 &&
    curso.lecciones.length > 0
  );
}
