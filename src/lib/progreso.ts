import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

/**
 * Progreso por lección. Vive en la base y no en el navegador porque el avance
 * de un curso tiene que sobrevivir a cambiar de dispositivo o de sesión.
 */
export type Progreso = { curso_id: string; cursoSlug: string; leccion_slug: string };

export async function miProgreso(): Promise<Progreso[]> {
  const usuario = await usuarioActual();
  if (!usuario) return [];

  const supabase = await clienteServidor();
  const { data } = await supabase.from("progreso").select("curso_id, leccion_slug, cursos(slug)");
  type Fila = { curso_id: string; leccion_slug: string; cursos: { slug: string } | null };
  return ((data ?? []) as unknown as Fila[]).map((f) => ({
    curso_id: f.curso_id,
    cursoSlug: f.cursos?.slug ?? "",
    leccion_slug: f.leccion_slug,
  }));
}

/** Lecciones vistas de un curso, indexadas para consultar en O(1). */
export async function vistasDe(cursoSlug: string): Promise<Set<string>> {
  const usuario = await usuarioActual();
  if (!usuario) return new Set();

  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("progreso")
    .select("leccion_slug, cursos!inner(slug)")
    .eq("cursos.slug", cursoSlug);

  return new Set((data ?? []).map((f) => f.leccion_slug as string));
}

/** Cuántas lecciones vistas hay por curso, para pintar la barra en el listado. */
export function contarPorCurso(progreso: Progreso[]): Map<string, number> {
  const conteo = new Map<string, number>();
  for (const p of progreso) {
    conteo.set(p.cursoSlug, (conteo.get(p.cursoSlug) ?? 0) + 1);
  }
  return conteo;
}
