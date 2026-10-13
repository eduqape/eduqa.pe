/**
 * Búsqueda, filtros y paginación del listado de cursos del panel.
 *
 * La consulta la hace la base (`listadoDelPanel` en cursos-panel.ts); aquí
 * vive lo puro: leer los filtros de la URL, escribir los enlaces y traducir
 * los filtros a un plan de consulta. La barra del cliente y el servidor usan
 * las mismas reglas, y se prueban sin base (`scripts/cursos-panel.test.mjs`).
 *
 * Los filtros viven en la URL y no en el estado del componente: un enlace
 * compartido abre el mismo listado, y «atrás» devuelve a la página y al filtro
 * en que se estaba.
 */

import type { IconoNombre } from "@/lib/iconos-curso";

/** Los mismos que admite la restricción `cursos_estado_valido` de la base. */
export const ESTADOS_CURSO = ["borrador", "privado", "publico"] as const;
export type EstadoCurso = (typeof ESTADOS_CURSO)[number];

export const ETIQUETA_ESTADO: Record<EstadoCurso, string> = {
  borrador: "Borrador",
  privado: "Privado",
  publico: "Público",
};

export const ORDENES = ["recientes", "titulo", "codigo", "precio"] as const;
export type Orden = (typeof ORDENES)[number];

export const ETIQUETA_ORDEN: Record<Orden, string> = {
  recientes: "Editados recientemente",
  titulo: "Título (A–Z)",
  codigo: "Código",
  precio: "Precio (mayor primero)",
};

export type Vista = "lista" | "grilla";

export const POR_PAGINA = 24;

/** Lo que el listado necesita de cada curso: nunca el material de sus sesiones. */
export type FilaPanel = {
  id: string;
  slug: string;
  codigo: string | null;
  titulo: string;
  resumen: string;
  estado: string;
  precio: number;
  accesoLibre: boolean;
  actualizadoEn: string | null;
  area: string;
  nivel: string;
  formato: string;
  horas: number;
  icono: IconoNombre;
  /** Falso cuando el curso está registrado pero su curso.md falta o no se lee. */
  fichaLegible: boolean;
};

export type Filtros = {
  q: string;
  estado: EstadoCurso | "todos";
  area: string;
  orden: Orden;
  pagina: number;
  vista: Vista;
};

export const FILTROS_POR_DEFECTO: Filtros = {
  q: "",
  estado: "todos",
  area: "",
  orden: "recientes",
  pagina: 1,
  vista: "lista",
};

type Parametros = Record<string, string | string[] | undefined>;

function uno(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

/** Lee los filtros de la URL. Un valor desconocido vuelve al de por defecto, nunca rompe la página. */
export function leerFiltros(parametros: Parametros): Filtros {
  const estado = uno(parametros.estado);
  const orden = uno(parametros.orden);
  const pagina = Number.parseInt(uno(parametros.pagina), 10);
  return {
    q: uno(parametros.q).trim().slice(0, 120),
    estado: (ESTADOS_CURSO as readonly string[]).includes(estado) ? (estado as EstadoCurso) : "todos",
    area: uno(parametros.area).trim(),
    orden: (ORDENES as readonly string[]).includes(orden) ? (orden as Orden) : "recientes",
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
    vista: uno(parametros.vista) === "grilla" ? "grilla" : "lista",
  };
}

/**
 * Enlace al listado con algunos filtros cambiados.
 *
 * Cambiar cualquier filtro que no sea la página vuelve a la primera: seguir en
 * la 7 después de buscar llevaría a una página vacía. Los valores por defecto
 * no se escriben, para que la URL corta sea la canónica.
 */
export function hrefListado(actuales: Filtros, cambios: Partial<Filtros>): string {
  const siguiente: Filtros = { ...actuales, ...cambios };
  const tocaOtraCosa = Object.keys(cambios).some((clave) => clave !== "pagina" && clave !== "vista");
  if (tocaOtraCosa && cambios.pagina === undefined) siguiente.pagina = 1;

  const parametros = new URLSearchParams();
  if (siguiente.q) parametros.set("q", siguiente.q);
  if (siguiente.estado !== "todos") parametros.set("estado", siguiente.estado);
  if (siguiente.area) parametros.set("area", siguiente.area);
  if (siguiente.orden !== FILTROS_POR_DEFECTO.orden) parametros.set("orden", siguiente.orden);
  if (siguiente.pagina > 1) parametros.set("pagina", String(siguiente.pagina));
  if (siguiente.vista !== FILTROS_POR_DEFECTO.vista) parametros.set("vista", siguiente.vista);

  const consulta = parametros.toString();
  return consulta ? `/panel/cursos?${consulta}` : "/panel/cursos";
}

/** Minúsculas y sin tildes: «introduccion» encuentra «Introducción». */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Escapa los comodines de LIKE para que «50%» busque «50%» y no «50 y lo que sea». */
function literalLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export type OrdenColumna = { columna: string; ascendente: boolean; nulosPrimero?: boolean };

export type PlanConsulta = {
  /** Patrones ILIKE sobre la columna `busqueda`, uno por palabra; todos deben cumplirse. */
  patrones: string[];
  orden: OrdenColumna[];
  desde: number;
  hasta: number;
};

const ORDEN_SQL: Record<Orden, OrdenColumna[]> = {
  // Sin fecha va al final: no se sabe cuándo se tocó.
  recientes: [{ columna: "actualizado_en", ascendente: false, nulosPrimero: false }, { columna: "titulo", ascendente: true }],
  titulo: [{ columna: "titulo", ascendente: true }],
  codigo: [{ columna: "codigo_base", ascendente: true }, { columna: "titulo", ascendente: true }],
  precio: [{ columna: "precio", ascendente: false }, { columna: "titulo", ascendente: true }],
};

/**
 * Traduce los filtros a la consulta que hace la base. Las palabras se
 * normalizan igual que la columna `busqueda` (minúsculas, sin tildes) y el
 * orden siempre termina en una columna única para que las páginas no se
 * solapen.
 */
export function planConsulta(filtros: Filtros, pagina = filtros.pagina): PlanConsulta {
  const desde = (pagina - 1) * POR_PAGINA;
  return {
    patrones: normalizar(filtros.q).split(/\s+/).filter(Boolean).map((t) => `%${literalLike(t)}%`),
    orden: [...ORDEN_SQL[filtros.orden], { columna: "id", ascendente: true }],
    desde,
    hasta: desde + POR_PAGINA - 1,
  };
}

export type Resultado = {
  filas: FilaPanel[];
  /** Cursos que cumplen búsqueda, estado y área. */
  total: number;
  paginas: number;
  /** La página pedida, recortada al rango que existe. */
  pagina: number;
  desde: number;
  hasta: number;
  /** Cuántos hay en cada estado con la búsqueda y el área actuales. */
  porEstado: Record<EstadoCurso | "todos", number>;
};

/** Página real y rango mostrado cuando ya se conoce el total. */
export function paginacion(total: number, pedida: number) {
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Math.min(pedida, paginas);
  const inicio = (pagina - 1) * POR_PAGINA;
  return {
    paginas,
    pagina,
    desde: total === 0 ? 0 : inicio + 1,
    hasta: Math.min(inicio + POR_PAGINA, total),
  };
}

/** Páginas a enlazar: la primera, la última y las vecinas de la actual; `null` es un salto. */
export function paginasVisibles(actual: number, total: number): (number | null)[] {
  const conjunto = new Set([1, total, actual - 1, actual, actual + 1].filter((n) => n >= 1 && n <= total));
  const ordenadas = [...conjunto].sort((a, b) => a - b);
  const salida: (number | null)[] = [];
  for (const [i, n] of ordenadas.entries()) {
    if (i > 0 && n - ordenadas[i - 1] > 1) salida.push(null);
    salida.push(n);
  }
  return salida;
}
