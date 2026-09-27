import { clienteServidor } from "@/lib/supabase/servidor";
import { obtenerCursos } from "@/lib/catalogo-cursos";

export type CursoCertificacion = {
  id: string;
  slug: string;
  titulo: string;
  horas: number;
};

export type MatriculadoCertificacion = {
  curso_id: string;
  curso_slug: string;
  curso_titulo: string;
  usuario_id: string;
  nombre: string;
  email: string;
  estado: string;
  completada_en: string | null;
  certificado_id: string | null;
  codigo: string | null;
  anulado_en: string | null;
};

export type ConfigCertificacionCurso = {
  curso_id: string;
  horas: number;
  docente: string;
  docente_firma_url: string | null;
  director_academico: string;
  director_firma_url: string | null;
  variante: "banda" | "marco" | "solido";
};

export type CertificadoAdmin = {
  id: string;
  alumno: string;
  email: string | null;
  codigo: string;
  emitido_en: string;
  anulado_en: string | null;
  motivo_anulado: string | null;
  curso_id: string | null;
  curso_nombre: string | null;
  cohorte: { curso_nombre: string } | null;
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
};

export async function resumenCertificacionesAdmin() {
  const supabase = await clienteServidor();

  const [cursosR, cursosRuntime, matriculadosR, configR, certificadosR, reglasR, enviosR] =
    await Promise.all([
      supabase.from("cursos").select("id, slug, titulo").order("titulo"),
      obtenerCursos(),
      supabase.rpc("admin_matriculados_certificacion"),
      supabase
        .from("certificacion_config_curso")
        .select(
          "curso_id, horas, docente, docente_firma_url, director_academico, director_firma_url, variante",
        ),
      supabase
        .from("certificados")
        .select(
          "id, alumno, email, codigo, emitido_en, anulado_en, motivo_anulado, curso_id, curso_nombre, cohorte:cohortes(curso_nombre)",
        )
        .order("emitido_en", { ascending: false })
        .limit(100),
      supabase
        .from("certificacion_reglas")
        .select(
          "id, nombre, activa, activador, cohorte_id, curso_id, enviar_correo, creado_en",
        )
        .order("creado_en", { ascending: false }),
      supabase
        .from("certificado_envios")
        .select(
          "id, certificado_id, destinatario, estado, intentos, solicitado_en, enviado_en, ultimo_error",
        )
        .order("solicitado_en", { ascending: false })
        .limit(100),
    ]);

  const horasPorSlug = new Map(cursosRuntime.map((curso) => [curso.slug, curso.horas]));

  return {
    cursos: (cursosR.data ?? []).map((curso) => ({
      ...curso,
      horas: Number(horasPorSlug.get(curso.slug) ?? 0),
    })) as CursoCertificacion[],
    matriculados: (matriculadosR.data ?? []) as MatriculadoCertificacion[],
    configs: (configR.data ?? []) as unknown as ConfigCertificacionCurso[],
    certificados: (certificadosR.data ?? []) as unknown as CertificadoAdmin[],
    reglas: (reglasR.data ?? []) as unknown as ReglaCertificacion[],
    envios: (enviosR.data ?? []) as unknown as EnvioCertificado[],
  };
}
