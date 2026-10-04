"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { generarQr, niubizConfigurado } from "@/lib/niubiz";
import { precioDe } from "@/lib/precios";
import { idDeCurso } from "@/lib/curso-id";

export type EstadoPago =
  | { ok: true; pagoId: string; imagen: string; venceEn: string; monto: number }
  | { ok: false; error: string };

/**
 * Crea la intención de pago de un curso y pide a Niubiz el QR dinámico.
 *
 * El importe se lee de la base, nunca del formulario: si viniera del cliente,
 * cualquiera podría pagar un curso de S/20 enviando S/1.
 *
 * El registro se crea antes de llamar a Niubiz para que su identificador
 * viaje como `idc` y vuelva en el callback. Sin esa correspondencia no
 * habría forma de saber qué curso abonar y a quién.
 */
export async function generarQrDePago(
  _prev: EstadoPago | null,
  formData: FormData,
): Promise<EstadoPago> {
  const cursoSlug = String(formData.get("curso") ?? "");

  const usuario = await usuarioActual();
  if (!usuario) return { ok: false, error: "Inicia sesión primero." };

  const monto = await precioDe(cursoSlug);
  if (monto === null) return { ok: false, error: "Ese curso no existe." };
  if (monto <= 0) return { ok: false, error: "Ese curso no se paga." };
  const cursoId = await idDeCurso(cursoSlug);
  if (!cursoId) return { ok: false, error: "Ese curso no existe." };

  if (!niubizConfigurado()) {
    return {
      ok: false,
      error:
        "Los pagos todavía no están habilitados. Escríbenos y te matriculamos a mano.",
    };
  }

  // Con la sesión del usuario: RLS solo le deja tocar sus propios pagos
  // pendientes, y le impide marcarlos como pagados.
  const supabase = await clienteServidor();

  // Si ya hay un QR vigente para este curso, se reutiliza.
  const { data: vigente } = await supabase
    .from("pagos")
    .select("id, vence_en, crudo")
    .eq("usuario_id", usuario.id)
    .eq("curso_id", cursoId)
    .eq("estado", "pendiente")
    .gt("vence_en", new Date().toISOString())
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vigente?.crudo && typeof vigente.crudo === "object") {
    const img = (vigente.crudo as { imagen?: string }).imagen;
    if (img) {
      return {
        ok: true,
        pagoId: vigente.id,
        imagen: img,
        venceEn: vigente.vence_en,
        monto,
      };
    }
  }

  const vence = new Date();
  vence.setDate(vence.getDate() + 1);

  const { data: pago, error } = await supabase
    .from("pagos")
    .insert({
      usuario_id: usuario.id,
      curso_id: cursoId,
      concepto: "curso",
      monto,
      vence_en: vence.toISOString(),
    })
    .select("id")
    .single();

  if (error || !pago) {
    console.error("[generarQrDePago]", error);
    return { ok: false, error: "No pudimos preparar el pago. Intenta de nuevo." };
  }

  try {
    const qr = await generarQr({ monto, idc: pago.id });

    await supabase
      .from("pagos")
      .update({
        tag_id: qr.tagId,
        vence_en: qr.venceEn.toISOString(),
        crudo: { imagen: qr.imagenBase64, tagId: qr.tagId },
      })
      .eq("id", pago.id);

    revalidatePath("/cursos");
    return {
      ok: true,
      pagoId: pago.id,
      imagen: qr.imagenBase64,
      venceEn: qr.venceEn.toISOString(),
      monto,
    };
  } catch (e) {
    console.error("[generarQrDePago]", e);
    return { ok: false, error: "No pudimos preparar el pago. Intenta de nuevo en un momento." };
  }
}

/** Consulta el estado del pago para que la pantalla deje de esperar. */
export async function estadoDePago(pagoId: string) {
  const usuario = await usuarioActual();
  if (!usuario) return { pagado: false };

  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("pagos")
    .select("estado")
    .eq("id", pagoId)
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  return { pagado: data?.estado === "pagado" };
}

/** Cambia el precio de un curso. Solo administradores: lo impone RLS. */
export async function cambiarPrecio(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const slug = String(formData.get("curso") ?? "");
  const precio = Number(formData.get("precio"));

  if (!Number.isFinite(precio) || precio < 0)
    return { ok: false, error: "El precio debe ser un número no negativo." };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("cursos")
    .update({ precio, actualizado_en: new Date().toISOString() })
    .eq("slug", slug);

  if (error) {
    return { ok: false, error: "No tienes permiso para cambiar precios." };
  }

  revalidatePath("/cursos");
  revalidatePath("/panel");
  return { ok: true };
}
