"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { perfilActual } from "@/lib/matriculas";
import { buscarCurso } from "@/lib/catalogo-cursos";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

async function admin() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/panel/certificaciones");

  const perfil = await perfilActual();
  if (!perfil?.es_admin) redirect("/panel");

  return { usuario, supabase: await clienteServidor() };
}


async function subirFirma(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  cohorteId: string,
  tipo: "docente" | "director",
  archivo: File,
) {
  if (archivo.size === 0) return null;
  if (archivo.size > 2 * 1024 * 1024) {
    throw new Error("Cada firma debe pesar como máximo 2 MB.");
  }

  const permitidos = new Set(["image/png", "image/jpeg", "image/webp"]);
  if (!permitidos.has(archivo.type)) {
    throw new Error("La firma debe ser PNG, JPG o WebP.");
  }

  const extension =
    archivo.type === "image/png"
      ? "png"
      : archivo.type === "image/webp"
        ? "webp"
        : "jpg";

  const ruta = `${cohorteId}/${tipo}.${extension}`;
  const { error } = await supabase.storage
    .from("firmas-certificados")
    .upload(ruta, archivo, {
      upsert: true,
      contentType: archivo.type,
      cacheControl: "3600",
    });

  if (error) throw new Error(`No se pudo subir la firma de ${tipo}.`);

  return supabase.storage.from("firmas-certificados").getPublicUrl(ruta).data.publicUrl;
}

export type EstadoGuardadoCertificacion = {
  ok: boolean;
  error?: string;
};

export async function actualizarResponsablesCertificacion(
  _estado: EstadoGuardadoCertificacion,
  formData: FormData,
): Promise<EstadoGuardadoCertificacion> {
  try {
    const { usuario, supabase } = await admin();
    const cursoId = String(formData.get("cursoId") ?? "").trim();
    const docente = String(formData.get("docente") ?? "").trim();
    const directorAcademico = String(formData.get("directorAcademico") ?? "").trim();
    const variante = String(formData.get("variante") ?? "banda").trim();
    const firmaDocente = formData.get("firmaDocente");
    const firmaDirector = formData.get("firmaDirector");

    if (!cursoId) return { ok: false, error: "Selecciona un curso." };
    if (!docente) return { ok: false, error: "Escribe el nombre del docente." };
    if (!directorAcademico) {
      return { ok: false, error: "Escribe el nombre del director académico." };
    }
    if (!["banda", "marco", "solido"].includes(variante)) {
      return { ok: false, error: "Selecciona un estilo de certificación válido." };
    }

    const { data: cursoDb, error: errorCursoDb } = await supabase
      .from("cursos")
      .select("slug")
      .eq("id", cursoId)
      .maybeSingle();

    if (errorCursoDb || !cursoDb?.slug) {
      return { ok: false, error: "No se pudo leer el curso seleccionado." };
    }

    const curso = await buscarCurso(cursoDb.slug);
    if (!curso || !Number.isFinite(curso.horas) || curso.horas <= 0) {
      return { ok: false, error: "El curso no tiene horas válidas configuradas." };
    }

    const { data: actual } = await supabase
      .from("certificacion_config_curso")
      .select("docente_firma_url, director_firma_url")
      .eq("curso_id", cursoId)
      .maybeSingle();

    const cambios: {
      curso_id: string;
      horas: number;
      docente: string;
      director_academico: string;
      variante: "banda" | "marco" | "solido";
      actualizado_por: string;
      actualizado_en: string;
      docente_firma_url?: string | null;
      director_firma_url?: string | null;
    } = {
      curso_id: cursoId,
      horas: curso.horas,
      docente,
      director_academico: directorAcademico,
      variante: variante as "banda" | "marco" | "solido",
      actualizado_por: usuario.id,
      actualizado_en: new Date().toISOString(),
      docente_firma_url: actual?.docente_firma_url ?? null,
      director_firma_url: actual?.director_firma_url ?? null,
    };

    if (firmaDocente instanceof File && firmaDocente.size > 0) {
      const url = await subirFirma(supabase, cursoId, "docente", firmaDocente);
      if (url) cambios.docente_firma_url = url;
    }

    if (firmaDirector instanceof File && firmaDirector.size > 0) {
      const url = await subirFirma(supabase, cursoId, "director", firmaDirector);
      if (url) cambios.director_firma_url = url;
    }

    const { error } = await supabase
      .from("certificacion_config_curso")
      .upsert(cambios, { onConflict: "curso_id" });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/panel/certificaciones");
    revalidatePath("/panel/certificaciones/preview");
    revalidatePath("/certificaciones");

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo guardar la configuración.",
    };
  }
}
export async function emitirCertificadoManual(formData: FormData) {
  const { supabase } = await admin();
  const cursoId = String(formData.get("cursoId") ?? "");
  const usuarioId = String(formData.get("usuarioId") ?? "");
  const enviar = formData.get("enviar") === "on";
  const variante = String(formData.get("variante") ?? "banda");

  if (!cursoId || !usuarioId) throw new Error("Selecciona curso y alumno.");
  if (!["banda", "marco", "solido"].includes(variante)) {
    throw new Error("Selecciona un estilo de certificación válido.");
  }

  const { error } = await supabase.rpc("emitir_certificado_curso_usuario", {
    p_curso_id: cursoId,
    p_usuario_id: usuarioId,
    p_solicitar_correo: enviar,
    p_variante: variante,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/panel/certificaciones");
  redirect(`/panel/certificaciones?modo=manual&estado=emitido&curso=${cursoId}`);
}

export async function emitirCertificadosLote(formData: FormData) {
  const { supabase } = await admin();
  const cursoId = String(formData.get("cursoId") ?? "");
  const soloCompletadas = formData.get("soloCompletadas") === "on";
  const enviar = formData.get("enviar") === "on";

  if (!cursoId) throw new Error("Selecciona un curso.");

  const { data, error } = await supabase.rpc("emitir_certificados_curso_lote", {
    p_curso_id: cursoId,
    p_solo_completadas: soloCompletadas,
    p_solicitar_correo: enviar,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/panel/certificaciones");
  redirect(
    `/panel/certificaciones?modo=lote&estado=lote&cantidad=${Number(data ?? 0)}&curso=${cursoId}`,
  );
}

export async function crearReglaCertificacion(formData: FormData) {
  const { usuario, supabase } = await admin();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const activador = String(formData.get("activador") ?? "");
  const cohorteId = String(formData.get("cohorteId") ?? "").trim() || null;
  const cursoId = String(formData.get("cursoId") ?? "").trim() || null;
  const enviarCorreo = formData.get("enviarCorreo") === "on";

  if (nombre.length < 3) throw new Error("Escribe un nombre para la regla.");
  if (!["matricula_completada", "cohorte_cerrada"].includes(activador)) {
    throw new Error("Activador inválido.");
  }
  if (!cursoId && !cohorteId) {
    throw new Error("La regla debe apuntar a un curso.");
  }

  const { error } = await supabase.from("certificacion_reglas").insert({
    nombre,
    activador,
    cohorte_id: cohorteId,
    curso_id: cursoId,
    enviar_correo: enviarCorreo,
    creado_por: usuario.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/panel/certificaciones");
}

export async function alternarReglaCertificacion(formData: FormData) {
  const { supabase } = await admin();
  const id = String(formData.get("id") ?? "");
  const activa = formData.get("activa") === "true";

  const { error } = await supabase
    .from("certificacion_reglas")
    .update({ activa: !activa, actualizada_en: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/panel/certificaciones");
}

export async function anularCertificado(formData: FormData) {
  const { supabase } = await admin();
  const certificadoId = String(formData.get("certificadoId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  const { error } = await supabase.rpc("admin_anular_certificado", {
    p_certificado_id: certificadoId,
    p_motivo: motivo,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/panel/certificaciones");
}

export async function solicitarEnvioCertificado(formData: FormData) {
  const { usuario, supabase } = await admin();
  const certificadoId = String(formData.get("certificadoId") ?? "");

  const { data: certificado, error: certificadoError } = await supabase
    .from("certificados")
    .select("id, email")
    .eq("id", certificadoId)
    .maybeSingle();

  if (certificadoError || !certificado?.email) {
    throw new Error("El certificado no tiene un correo de destino.");
  }

  const { error } = await supabase.from("certificado_envios").insert({
    certificado_id: certificadoId,
    destinatario: certificado.email,
    solicitado_por: usuario.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/panel/certificaciones");
}

function origenPublico() {
  const dominio =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "eduqa-pe.vercel.app";
  return dominio.startsWith("http") ? dominio : `https://${dominio}`;
}

async function enviarConResend({
  destinatario,
  alumno,
  curso,
  codigo,
  certificadoId,
}: {
  destinatario: string;
  alumno: string;
  curso: string;
  codigo: string;
  certificadoId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está configurada.");
  }

  const origen = origenPublico();
  const from = process.env.CERTIFICADOS_FROM_EMAIL || "EDUQA.PE <certificados@eduqa.pe>";
  const urlCertificado = `${origen}/certificaciones/${certificadoId}`;
  const urlVerificacion = `${origen}/verificar/${encodeURIComponent(codigo)}`;

  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [destinatario],
      subject: `Tu certificación de ${curso} — EDUQA.PE`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#18181b">
          <h2 style="color:#c70724">EDUQA.PE</h2>
          <p>Hola, ${alumno}.</p>
          <p>Tu certificación de <strong>${curso}</strong> ya fue emitida.</p>
          <p><strong>Código:</strong> ${codigo}</p>
          <p><a href="${urlCertificado}">Ver y guardar certificado</a></p>
          <p><a href="${urlVerificacion}">Verificar autenticidad</a></p>
        </div>
      `,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Resend respondió ${respuesta.status}: ${detalle.slice(0, 240)}`);
  }
}

export async function procesarEnviosPendientes() {
  const { supabase } = await admin();

  const { data: envios, error } = await supabase
    .from("certificado_envios")
    .select(
      "id, certificado_id, destinatario, intentos, certificado:certificados(codigo, alumno, anulado_en, curso_nombre, cohorte:cohortes(curso_nombre))",
    )
    .in("estado", ["pendiente", "error"])
    .order("solicitado_en", { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);

  for (const envio of envios ?? []) {
    const certificado = envio.certificado as unknown as {
      codigo: string;
      alumno: string;
      anulado_en: string | null;
      curso_nombre: string | null;
      cohorte: { curso_nombre: string } | null;
    } | null;

    if (!certificado || certificado.anulado_en) {
      await supabase
        .from("certificado_envios")
        .update({
          estado: "error",
          intentos: envio.intentos + 1,
          ultimo_error: "Certificado inexistente o anulado.",
        })
        .eq("id", envio.id);
      continue;
    }

    try {
      await enviarConResend({
        destinatario: envio.destinatario,
        alumno: certificado.alumno,
        curso: certificado.curso_nombre ?? certificado.cohorte?.curso_nombre ?? "Curso EDUQA.PE",
        codigo: certificado.codigo,
        certificadoId: envio.certificado_id,
      });

      await supabase
        .from("certificado_envios")
        .update({
          estado: "enviado",
          intentos: envio.intentos + 1,
          enviado_en: new Date().toISOString(),
          ultimo_error: null,
        })
        .eq("id", envio.id);
    } catch (e) {
      await supabase
        .from("certificado_envios")
        .update({
          estado: "error",
          intentos: envio.intentos + 1,
          ultimo_error: e instanceof Error ? e.message.slice(0, 500) : "Error desconocido",
        })
        .eq("id", envio.id);
    }
  }

  revalidatePath("/panel/certificaciones");
}
