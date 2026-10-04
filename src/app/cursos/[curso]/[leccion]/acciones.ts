"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { idDeCurso } from "@/lib/curso-id";

export type EstadoVista = { ok: boolean };

/**
 * Deja constancia de que el usuario terminó de leer una lección.
 *
 * Quién puede escribir qué fila lo decide RLS: la política de `progreso` solo
 * admite filas cuyo `usuario_id` sea el de quien pide.
 */
export async function marcarVista(
  curso: string,
  leccion: string,
): Promise<EstadoVista> {
  const usuario = await usuarioActual();
  if (!usuario) return { ok: false };

  const cursoId = await idDeCurso(curso);
  if (!cursoId) return { ok: false };

  const supabase = await clienteServidor();
  // upsert y no insert: releer una lección ya marcada no debe fallar con
  // violación de clave primaria.
  const { error } = await supabase.from("progreso").upsert(
    { usuario_id: usuario.id, curso_id: cursoId, leccion_slug: leccion },
    { onConflict: "usuario_id,curso_id,leccion_slug" },
  );

  if (error) {
    console.error("[marcarVista]", error);
    return { ok: false };
  }

  revalidatePath("/cursos");
  return { ok: true };
}

export type EstadoValoracion = { ok: boolean; error?: string; estrellas?: number };

/**
 * Guarda la valoración de quien está cursando.
 *
 * Que solo pueda valorar un matriculado lo exige la política de la tabla, no
 * esta función: aquí únicamente se comprueba la forma y se traduce el error de
 * la base a algo que una persona pueda leer.
 */
export async function valorarCurso(
  _prev: EstadoValoracion | null,
  formData: FormData,
): Promise<EstadoValoracion> {
  const curso = String(formData.get("curso") ?? "");
  const estrellas = Number(formData.get("estrellas"));

  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) {
    return { ok: false, error: "Elige entre una y cinco estrellas." };
  }

  const usuario = await usuarioActual();
  if (!usuario) return { ok: false, error: "Entra a tu cuenta para valorar." };

  const cursoId = await idDeCurso(curso);
  if (!cursoId) return { ok: false, error: "Ese curso no existe." };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("valoraciones")
    .upsert(
      { curso_id: cursoId, usuario_id: usuario.id, estrellas },
      { onConflict: "curso_id,usuario_id" },
    );

  if (error) {
    // El caso normal es que no esté matriculado: la política lo rechaza y el
    // mensaje que devuelve la base no sirve para enseñárselo a nadie.
    return { ok: false, error: "Solo puedes valorar un curso en el que estés matriculado." };
  }

  revalidatePath("/cursos");
  revalidatePath(`/cursos/${curso}`, "layout");
  return { ok: true, estrellas };
}
