import "server-only";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * El id de un curso a partir del slug de su URL.
 *
 * El slug solo identifica al curso en la dirección; en la base todo se ata a
 * `cursos.id` (#112). Las acciones reciben el slug desde la URL y lo traducen
 * aquí una vez por petición antes de escribir.
 *
 * Devuelve `null` si el curso no existe o si quien pregunta no puede verlo:
 * las políticas de `cursos` deciden, igual que en el resto de lecturas.
 */
export const idDeCurso = cache(async (slug: string): Promise<string | null> => {
  if (!slug) return null;
  const supabase = await clienteServidor();
  const { data } = await supabase.from("cursos").select("id").eq("slug", slug).maybeSingle();
  return (data?.id as string | undefined) ?? null;
});
