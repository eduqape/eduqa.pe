"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { perfilActual } from "@/lib/matriculas";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

async function admin() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/panel/certificaciones");

  const perfil = await perfilActual();
  if (!perfil?.es_admin) redirect("/panel");

  return { usuario, supabase: await clienteServidor() };
}

export async function emitirCertificadoManual(formData: FormData) {
  const { supabase } = await admin();
  const cohorteId = String(formData.get("cohorteId") ?? "");
  const usuarioId = String(formData.get("usuarioId") ?? "");
  const enviar = formData.get("enviar") === "on";

  if (!cohorteId || !usuarioId) throw new Error("Selecciona cohorte y alumno.");

  const { error } = await supabase.rpc("admin_emitir_certificado", {
    p_cohorte_id: cohorteId,
    p_usuario_id: usuarioId,
    p_solicitar_correo: enviar,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/panel/certificaciones");
  redirect(`/panel/certificaciones?estado=emitido&cohorte=${cohorteId}`);
}

export async function emitirCertificadosLote(formData: FormData) {
  const { supabase } = await admin();
  const cohorteId = String(formData.get("cohorteId") ?? "");
  const soloCompletadas = formData.get("soloCompletadas") === "on";
  const enviar = formData.get("enviar") === "on";

  if (!cohorteId) throw new Error("Selecciona una cohorte.");

  const { data, error } = await supabase.rpc("admin_emitir_lote", {
    p_cohorte_id: cohorteId,
    p_solo_completadas: soloCompletadas,
    p_solicitar_correo: enviar,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/panel/certificaciones");
  redirect(
    `/panel/certificaciones?estado=lote&cantidad=${Number(data ?? 0)}&cohorte=${cohorteId}`,
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
  if (!cohorteId && !cursoId) {
    throw new Error("La regla debe apuntar a una cohorte o curso.");
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
      "id, certificado_id, destinatario, intentos, certificado:certificados(codigo, alumno, anulado_en, cohorte:cohortes(curso_nombre))",
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
        curso: certificado.cohorte?.curso_nombre ?? "Curso EDUQA.PE",
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
