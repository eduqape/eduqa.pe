import { clienteServidor } from "@/lib/supabase/servidor";

// Catálogo de ilustraciones vectoriales de EDUQA.PE. Vive en la tabla
// `recurso_assets` y los archivos nuevos en el bucket `assets-svg`, así que se
// amplía desde /recursos/catalogo-svg sin redesplegar. Los SVG deben salir de
// herramientas de vectorización, nunca dibujados a mano (ver AGENTS.md).
export const BUCKET_ASSETS = "assets-svg";
export const TAMANO_MAXIMO_SVG = 1024 * 1024;

export type AssetSvg = {
  id: string;
  slug: string;
  nombre: string;
  archivo: string;
  ruta_storage: string | null;
  descripcion: string;
  etiquetas: string[];
  origen: string;
  usado_en: string | null;
  posicion: number;
};

export async function listarAssetsSvg(): Promise<AssetSvg[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("recurso_assets")
    .select("id, slug, nombre, archivo, ruta_storage, descripcion, etiquetas, origen, usado_en, posicion")
    .order("posicion")
    .order("creado_en");
  if (error) throw new Error("No se pudo cargar el catálogo de assets.");
  return (data ?? []) as AssetSvg[];
}

export function slugAsset(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Motivo por el que un SVG no se acepta, o null si es válido.
 *
 * El bucket es público y el archivo se puede abrir directo en el navegador,
 * donde un SVG con scripts sí se ejecuta. Por eso se rechaza cualquier cosa
 * activa o que cargue recursos externos, no solo lo que afecta a la máscara.
 */
export function problemaSvg(contenido: string): string | null {
  const texto = contenido.trim();
  if (!/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(texto) || !/<\/svg>\s*$/i.test(texto)) {
    return "El archivo no es un SVG.";
  }
  const prohibidos: [RegExp, string][] = [
    [/<script/i, "scripts"],
    [/<foreignObject/i, "foreignObject"],
    [/<!ENTITY|<!DOCTYPE/i, "DOCTYPE o entidades"],
    [/\son[a-z]+\s*=/i, "atributos de evento"],
    [/javascript:/i, "URLs javascript:"],
    [/(?:xlink:)?href\s*=\s*["']\s*(?!#)/i, "referencias externas"],
    [/url\(\s*["']?\s*(?!#)/i, "url() externas"],
    [/@import/i, "@import"],
  ];
  for (const [patron, nombre] of prohibidos) {
    if (patron.test(texto)) return `El SVG contiene ${nombre}; expórtalo como trazos simples.`;
  }
  return null;
}
