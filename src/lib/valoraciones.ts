import "server-only";

import { cache } from "react";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

export type Valoracion = { promedio: number; total: number };

/**
 * Nota media y número de votos de cada curso.
 *
 * Sale de la vista `v_valoraciones`, que solo expone el agregado: quién votó
 * qué no se puede consultar desde la aplicación ni desde fuera.
 */
export const valoraciones = cache(async (): Promise<Map<string, Valoracion>> => {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("v_valoraciones")
    .select("curso_slug, promedio, total");

  const mapa = new Map<string, Valoracion>();
  for (const v of data ?? []) {
    mapa.set(v.curso_slug, { promedio: Number(v.promedio), total: v.total });
  }
  return mapa;
});

/** La valoración que dejó quien está mirando, si dejó alguna. */
export const miValoracion = cache(async (cursoSlug: string) => {
  const usuario = await usuarioActual();
  if (!usuario) return null;

  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("valoraciones")
    .select("estrellas, comentario, cursos!inner(slug)")
    .eq("cursos.slug", cursoSlug)
    .maybeSingle();

  return data ? { estrellas: data.estrellas, comentario: data.comentario } : null;
});
