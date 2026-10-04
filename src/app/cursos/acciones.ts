"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { buscarCurso } from "@/lib/catalogo-cursos";
import { idDeCurso } from "@/lib/curso-id";

export type EstadoMatricula =
  | { ok: true }
  | { ok: false; error: string; alTope?: boolean };

export async function matricularse(
  _prev: EstadoMatricula | null,
  formData: FormData,
): Promise<EstadoMatricula> {
  const cursoSlug = String(formData.get("curso") ?? "");
  if (!(await buscarCurso(cursoSlug))) return { ok: false, error: "Ese curso no existe." };

  const usuario = await usuarioActual();
  if (!usuario) return { ok: false, error: "Entra a tu cuenta para matricularte." };

  const cursoId = await idDeCurso(cursoSlug);
  if (!cursoId) return { ok: false, error: "Ese curso no existe." };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("matriculas")
    .insert({ usuario_id: usuario.id, curso_id: cursoId });

  if (error) {
    // El límite lo impone un trigger de la base, no esta función.
    if (error.message.includes("limite_plan_gratis")) {
      return {
        ok: false,
        alTope: true,
        error:
          "Solo puedes tener dos cursos gratis abiertos a la vez. Termina uno o compra este por separado.",
      };
    }
    if (error.code === "23505") return { ok: true }; // ya estaba matriculado
    console.error("[matricularse]", error);
    return { ok: false, error: "No pudimos matricularte. Intenta de nuevo." };
  }

  revalidatePath("/cursos");
  revalidatePath("/panel");
  return { ok: true };
}

/** Liberar un cupo: marca el curso como completado y deja de contar para el límite. */
export async function completarCurso(
  _prev: EstadoMatricula | null,
  formData: FormData,
): Promise<EstadoMatricula> {
  const cursoSlug = String(formData.get("curso") ?? "");
  const usuario = await usuarioActual();
  if (!usuario) return { ok: false, error: "Inicia sesión primero." };

  const cursoId = await idDeCurso(cursoSlug);
  if (!cursoId) return { ok: false, error: "Ese curso no existe." };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("matriculas")
    .update({ estado: "completada", completada_en: new Date().toISOString() })
    .eq("usuario_id", usuario.id)
    .eq("curso_id", cursoId);

  if (error) {
    console.error("[completarCurso]", error);
    return { ok: false, error: "No pudimos actualizar el curso." };
  }

  revalidatePath("/cursos");
  revalidatePath("/panel");
  return { ok: true };
}
