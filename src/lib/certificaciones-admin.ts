import { clienteServidor } from "@/lib/supabase/servidor";

export type CohorteCertificacion = {
  id: string;
  curso_id: string | null;
  curso_slug: string | null;
  curso_nombre: string;
  horas: number;
  dictada_en: string;
  docente: string;
  cerrada_en: string | null;
};

export type CertificadoAdmin = {
  id: string;
  alumno: string;
  email: string | null;
  codigo: string;
  emitido_en: string;
  anulado_en: string | null;
  motivo_anulado: string | null;
  cohorte: {
    id: string;
    curso_nombre: string;
    dictada_en: string;
    horas: number;
    docente: string;
  } | null;
};

export type ReglaCertificacion = {
  id: string;
  nombre: string;
  activa: boolean;
  activador: "matricula_completada" | "cohorte_cerrada";
  cohorte_id: string | null;
  curso_id: string | null;
  enviar_correo: boolean;
  creado_en: string;
};

export type EnvioCertificado = {
  id: string;
  certificado_id: string;
  destinatario: string;
  estado: "pendiente" | "enviado" | "error";
  intentos: number;
  solicitado_en: string;
  enviado_en: string | null;
  ultimo_error: string | null;
  certificado: {
    codigo: string;
    alumno: string;
    cohorte: { curso_nombre: string } | null;
  } | null;
};

export type AlumnoCohorteCertificacion = {
  usuario_id: string;
  nombre: string;
  email: string;
  estado: string;
  certificado_id: string | null;
  codigo: string | null;
  anulado_en: string | null;
};

export async function resumenCertificacionesAdmin() {
  const supabase = await clienteServidor();

  const [cohortesR, certificadosR, reglasR, enviosR] = await Promise.all([
    supabase
      .from("cohortes")
      .select("id, curso_id, curso_slug, curso_nombre, horas, dictada_en, docente, cerrada_en")
      .order("dictada_en", { ascending: false }),
    supabase
      .from("certificados")
      .select(
        "id, alumno, email, codigo, emitido_en, anulado_en, motivo_anulado, cohorte:cohortes(id, curso_nombre, dictada_en, horas, docente)",
      )
      .order("emitido_en", { ascending: false })
      .limit(100),
    supabase
      .from("certificacion_reglas")
      .select("id, nombre, activa, activador, cohorte_id, curso_id, enviar_correo, creado_en")
      .order("creado_en", { ascending: false }),
    supabase
      .from("certificado_envios")
      .select(
        "id, certificado_id, destinatario, estado, intentos, solicitado_en, enviado_en, ultimo_error, certificado:certificados(codigo, alumno, cohorte:cohortes(curso_nombre))",
      )
      .order("solicitado_en", { ascending: false })
      .limit(100),
  ]);

  return {
    cohortes: ((cohortesR.data ?? []) as unknown as CohorteCertificacion[]),
    certificados: ((certificadosR.data ?? []) as unknown as CertificadoAdmin[]),
    reglas: ((reglasR.data ?? []) as unknown as ReglaCertificacion[]),
    envios: ((enviosR.data ?? []) as unknown as EnvioCertificado[]),
  };
}

export async function alumnosCohorteCertificacion(cohorteId: string) {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("admin_alumnos_cohorte", {
    p_cohorte_id: cohorteId,
  });
  if (error) return [];
  return (data ?? []) as AlumnoCohorteCertificacion[];
}
