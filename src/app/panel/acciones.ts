"use server";

import { revalidatePath } from "next/cache";
import { parseDocument } from "yaml";
import { clienteServidor } from "@/lib/supabase/servidor";

export type EstadoGuardado = { ok: boolean; error?: string };

// Los mismos que admite la restricción `cursos_estado_valido` de la base.
const ESTADOS = ["borrador", "privado", "publico"] as const;
type EstadoCurso = (typeof ESTADOS)[number];

/**
 * Guarda los campos editables de un curso.
 *
 * Quién puede hacerlo lo decide RLS, no esta función: la política exige
 * `es_admin`. Aquí solo se valida la forma de los datos.
 */
export async function guardarCurso(
  _prev: EstadoGuardado | null,
  formData: FormData,
): Promise<EstadoGuardado> {
  const slug = String(formData.get("curso") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const resumen = String(formData.get("resumen") ?? "").trim();
  const estado = String(formData.get("estado") ?? "");
  const precio = Number(formData.get("precio"));
  // Una casilla desmarcada no viaja en el formulario: ausencia es falso.
  const accesoLibre = formData.get("acceso_libre") !== null;

  if (titulo.length < 3) return { ok: false, error: "El título es muy corto." };
  if (resumen.length < 10) return { ok: false, error: "El resumen es muy corto." };
  if (!ESTADOS.includes(estado as EstadoCurso))
    return { ok: false, error: "Estado no válido." };
  if (!Number.isFinite(precio) || precio < 0)
    return { ok: false, error: "El precio debe ser un número no negativo." };

  const supabase = await clienteServidor();
  const { error, count } = await supabase
    .from("cursos")
    .update(
      {
        titulo,
        resumen,
        estado,
        precio,
        acceso_libre: accesoLibre,
        publicado: estado === "publico",
        actualizado_en: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .eq("slug", slug);

  if (error) {
    console.error("[guardarCurso]", error);
    return { ok: false, error: "No pudimos guardar los cambios." };
  }
  // RLS no lanza error cuando deniega: simplemente no afecta ninguna fila.
  if (count === 0) return { ok: false, error: "No tienes permiso para editar cursos." };

  // La ficha en Markdown lleva el mismo título y resumen. Si se quedara con
  // los antiguos, la siguiente importación del curso los devolvería.
  const errorFicha = await sincronizarFicha(supabase, slug, { titulo, resumen, estado, precio, acceso_libre: accesoLibre });
  if (errorFicha) {
    console.error("[guardarCurso:ficha]", errorFicha);
    return { ok: false, error: "El curso se guardó, pero no se pudo actualizar su curso.md." };
  }

  // Solo cambia la revisión cuando el título, el resumen o el material son
  // distintos. Precio, acceso y estado comercial no alteran el contenido.
  const { error: errorRevision } = await supabase
    .rpc("registrar_revision_curso", { p_slug: slug });
  if (errorRevision) {
    console.error("[guardarCurso:revision]", errorRevision);
    return { ok: false, error: "El curso se guardó, pero no se pudo registrar su revisión." };
  }

  revalidatePath("/cursos");
  revalidatePath("/catalogo");
  revalidatePath("/panel/cursos");
  revalidatePath(`/panel/cursos/${slug}`, "layout");
  revalidatePath(`/cursos/${slug}`, "layout");
  revalidatePath("/panel");
  return { ok: true };
}

/**
 * Lleva a curso.md lo que se acaba de guardar, conservando el resto del
 * archivo: comentarios, orden de claves y el cuerpo con el preludio.
 *
 * Título y resumen se escriben siempre. Estado, precio y acceso solo si la
 * ficha ya los declaraba: si no, al importarla se conserva lo de la base.
 */
async function sincronizarFicha(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  slug: string,
  campos: { titulo: string; resumen: string; estado: string; precio: number; acceso_libre: boolean },
): Promise<string | null> {
  const { data: curso } = await supabase.from("cursos").select("id").eq("slug", slug).maybeSingle();
  if (!curso) return null;
  const { data: fila, error } = await supabase
    .from("curso_contenido")
    .select("contenido")
    .eq("curso_id", curso.id)
    .eq("archivo", "curso.md")
    .maybeSingle();
  if (error) return error.message;
  if (!fila) return null;

  const texto = fila.contenido.replace(/^\uFEFF/, "");
  if (!texto.startsWith("---")) return null;
  const cierre = texto.indexOf("\n---", 3);
  if (cierre === -1) return null;
  const documento = parseDocument(texto.slice(3, cierre));
  if (documento.errors.length > 0) return null;
  let cambia = false;
  for (const [clave, valor] of Object.entries(campos)) {
    const siempre = clave === "titulo" || clave === "resumen";
    if ((siempre || documento.has(clave)) && documento.get(clave) !== valor) {
      documento.set(clave, valor);
      cambia = true;
    }
  }
  if (!cambia) return null;
  const nuevo = `---\n${documento.toString().trimEnd()}${texto.slice(cierre)}`;

  const { error: eGuardar } = await supabase
    .from("curso_contenido")
    .update({ contenido: nuevo })
    .eq("curso_id", curso.id)
    .eq("archivo", "curso.md");
  return eGuardar?.message ?? null;
}
