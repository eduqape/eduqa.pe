import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

export const ESTADOS_PROPUESTA = [
  "borrador",
  "en_votacion",
  "priorizado",
  "en_desarrollo",
  "publicado",
  "descartado",
] as const;

export type EstadoPropuesta = (typeof ESTADOS_PROPUESTA)[number];

export const ETIQUETA_ESTADO: Record<EstadoPropuesta, string> = {
  borrador: "Borrador",
  en_votacion: "En votación",
  priorizado: "Priorizado",
  en_desarrollo: "En desarrollo",
  publicado: "Publicado",
  descartado: "Descartado",
};

export type PropuestaPublica = {
  id: string;
  titulo: string;
  subtitulo: string;
  precio: number;
  icono: string;
  nivel: string;
  area: string;
  estado: EstadoPropuesta;
  cursoSlug: string | null;
  creadaEn: string;
  votos: number;
};

export type PropuestaInterna = PropuestaPublica & {
  prioridadInterna: number;
  creadoPor: string;
  actualizadaEn: string;
};

export type OpcionCatalogo = {
  valor: string;
  svg: string | null;
};

export type CatalogosPropuestas = {
  niveles: OpcionCatalogo[];
  areas: OpcionCatalogo[];
  iconos: OpcionCatalogo[];
};

type FilaPublica = {
  id: string;
  titulo: string;
  subtitulo: string;
  precio: number | string;
  icono: string;
  nivel: string;
  area: string;
  estado: EstadoPropuesta;
  curso_slug: string | null;
  creada_en: string;
  votos: number;
};

function normalizarPublica(fila: FilaPublica): PropuestaPublica {
  return {
    id: fila.id,
    titulo: fila.titulo,
    subtitulo: fila.subtitulo,
    precio: Number(fila.precio),
    icono: fila.icono || "libro",
    nivel: fila.nivel,
    area: fila.area,
    estado: fila.estado,
    cursoSlug: fila.curso_slug,
    creadaEn: fila.creada_en,
    votos: Number(fila.votos ?? 0),
  };
}

export async function catalogosPropuestas(): Promise<CatalogosPropuestas> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("catalogo_propuestas")
    .select("tipo, valor, svg, orden")
    .eq("activo", true)
    .order("orden", { ascending: true })
    .order("valor", { ascending: true });

  if (error) {
    return { niveles: [], areas: [], iconos: [] };
  }

  const filas = data ?? [];
  const tomar = (tipo: "nivel" | "area" | "icono") =>
    filas
      .filter((fila) => fila.tipo === tipo)
      .map((fila) => ({ valor: fila.valor, svg: fila.svg ?? null }));

  return {
    niveles: tomar("nivel"),
    areas: tomar("area"),
    iconos: tomar("icono"),
  };
}

export async function proximosCursos(): Promise<PropuestaPublica[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("v_proximos_cursos")
    .select(
      "id, titulo, subtitulo, precio, icono, nivel, area, estado, curso_slug, creada_en, votos",
    )
    .order("votos", { ascending: false })
    .order("creada_en", { ascending: true });

  if (error) return [];
  return ((data ?? []) as FilaPublica[]).map(normalizarPublica);
}

function fechaActualEnLima() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";

  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export async function miEstadoDeVoto(): Promise<{
  propuestasVotadas: Set<string>;
  votoDeHoyUsado: boolean;
}> {
  const usuario = await usuarioActual();
  if (!usuario) return { propuestasVotadas: new Set(), votoDeHoyUsado: false };

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("votos_propuesta_curso")
    .select("propuesta_id, dia_lima")
    .eq("usuario_id", usuario.id);

  if (error) return { propuestasVotadas: new Set(), votoDeHoyUsado: false };

  const filas = data ?? [];
  return {
    propuestasVotadas: new Set(filas.map((fila) => fila.propuesta_id)),
    votoDeHoyUsado: filas.some((fila) => fila.dia_lima === fechaActualEnLima()),
  };
}

export async function propuestasInternas(): Promise<PropuestaInterna[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("v_propuestas_curso_internas")
    .select(
      "id, titulo, subtitulo, precio, icono, nivel, area, estado, prioridad_interna, creado_por, curso_slug, creada_en, actualizada_en, votos",
    )
    .order("actualizada_en", { ascending: false });

  if (error) return [];

  return (data ?? []).map((fila) => ({
    id: fila.id,
    titulo: fila.titulo,
    subtitulo: fila.subtitulo,
    precio: Number(fila.precio),
    icono: fila.icono || "libro",
    nivel: fila.nivel,
    area: fila.area,
    estado: fila.estado as EstadoPropuesta,
    cursoSlug: fila.curso_slug,
    creadaEn: fila.creada_en,
    votos: Number(fila.votos ?? 0),
    prioridadInterna: fila.prioridad_interna,
    creadoPor: fila.creado_por,
    actualizadaEn: fila.actualizada_en,
  }));
}
