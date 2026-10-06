import { clienteServidor } from "@/lib/supabase/servidor";

// La validación vive aparte porque también corre en el navegador.
export { TAMANO_MAXIMO_SVG, problemaSvg, slugAsset } from "@/lib/catalogo-svg-validacion";

// Catálogo de ilustraciones vectoriales de EDUQA.PE. Vive en la tabla
// `recurso_assets` y los archivos nuevos en el bucket `assets-svg`, así que se
// amplía desde /recursos/catalogo-svg sin redesplegar. Los SVG deben salir de
// herramientas de vectorización, nunca dibujados a mano (ver AGENTS.md).
export const BUCKET_ASSETS = "assets-svg";

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
