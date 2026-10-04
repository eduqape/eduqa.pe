import { clienteServidor } from "@/lib/supabase/servidor";

export const SLUGS_RECURSOS = ["redaccion", "api", "tipos-de-preguntas", "animaciones-ui", "catalogo-svg"] as const;
export type SlugRecurso = (typeof SLUGS_RECURSOS)[number];

export function esSlugRecurso(slug: string): slug is SlugRecurso {
  return (SLUGS_RECURSOS as readonly string[]).includes(slug);
}

export type Recurso = {
  slug: SlugRecurso;
  titulo: string;
  resumen: string;
  destinatarios: string;
  version: number;
  actualizado_en: string;
  busqueda?: string;
};

export type ItemRecurso = {
  id: string;
  recurso_slug: SlugRecurso;
  titulo: string;
  contenido: string;
  posicion: number;
  version: number;
};

export type RevisionRecurso = {
  id: number;
  item_id: string;
  version: number;
  titulo: string;
  contenido: string;
  accion: "crear" | "editar" | "eliminar";
  registrada_en: string;
};

export async function listarRecursos(): Promise<Recurso[]> {
  const supabase = await clienteServidor();
  const [documentos, items] = await Promise.all([
    supabase.from("recurso_documentos").select("*").order("titulo"),
    supabase.from("recurso_items").select("recurso_slug,titulo,contenido"),
  ]);
  if (documentos.error || items.error) throw new Error("No se pudieron cargar los recursos.");
  return ((documentos.data ?? []) as Recurso[]).map((recurso) => ({
    ...recurso,
    busqueda: (items.data ?? []).filter((item) => item.recurso_slug === recurso.slug)
      .map((item) => `${item.titulo} ${item.contenido}`).join(" "),
  }));
}

export async function datosRecurso(slug: SlugRecurso) {
  const supabase = await clienteServidor();
  const [documento, items, revisiones] = await Promise.all([
    supabase.from("recurso_documentos").select("*").eq("slug", slug).single(),
    supabase.from("recurso_items").select("*").eq("recurso_slug", slug).order("posicion").order("creado_en"),
    supabase.from("recurso_item_revisiones").select("id, item_id, version, titulo, contenido, accion, registrada_en")
      .eq("recurso_slug", slug).order("id", { ascending: false }).limit(100),
  ]);
  if (documento.error || items.error || revisiones.error) {
    throw new Error("No se pudo cargar el recurso.");
  }
  return {
    documento: documento.data as Recurso,
    items: (items.data ?? []) as ItemRecurso[],
    revisiones: (revisiones.data ?? []) as RevisionRecurso[],
  };
}
