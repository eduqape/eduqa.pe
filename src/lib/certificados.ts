import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

export type Certificacion = {
  id: string;
  codigo: string;
  alumno: string;
  emitido_en: string;
  anulado_en: string | null;
  motivo_anulado: string | null;
  cohorte: {
    curso_nombre: string | null;
    horas: number | null;
    dictada_en: string | null;
    docente: string | null;
    docente_firma_url: string | null;
    director_academico: string | null;
    director_firma_url: string | null;
  } | null;
};

export type VerificacionCertificado = {
  codigo: string;
  alumno: string;
  curso_nombre: string;
  horas: number;
  dictada_en: string;
  docente: string;
  emitido_en: string;
  vigente: boolean;
};

const CAMPOS =
  "id, codigo, alumno, emitido_en, anulado_en, motivo_anulado, cohorte:cohortes(curso_nombre, horas, dictada_en, docente, docente_firma_url, director_academico, director_firma_url)";

export async function misCertificaciones(): Promise<Certificacion[]> {
  const usuario = await usuarioActual();
  if (!usuario) return [];

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("certificados")
    .select(CAMPOS)
    .order("emitido_en", { ascending: false });

  if (error) return [];
  return (data ?? []) as unknown as Certificacion[];
}

export async function certificacionPorId(id: string): Promise<Certificacion | null> {
  const usuario = await usuarioActual();
  if (!usuario) return null;

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("certificados")
    .select(CAMPOS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as Certificacion;
}

export async function verificarCertificado(
  codigoOriginal: string,
): Promise<VerificacionCertificado | null> {
  const codigo = codigoOriginal.trim().toUpperCase();
  if (!codigo) return null;

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("v_verificacion")
    .select(
      "codigo, alumno, curso_nombre, horas, dictada_en, docente, emitido_en, vigente",
    )
    .eq("codigo", codigo)
    .maybeSingle();

  if (error || !data) return null;

  return {
    codigo: data.codigo,
    alumno: data.alumno,
    curso_nombre: data.curso_nombre,
    horas: Number(data.horas),
    dictada_en: data.dictada_en,
    docente: data.docente,
    emitido_en: data.emitido_en,
    vigente: Boolean(data.vigente),
  };
}

export function fechaCertificado(fecha: string | null | undefined) {
  if (!fecha) return "";
  return new Date(`${fecha}T12:00:00-05:00`).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Lima",
  });
}

export function fechaEmision(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Lima",
  });
}
