/**
 * Búsqueda, filtros y paginación del listado de cursos del panel.
 *
 * Es código puro, sin base ni React, por dos motivos: la barra de filtros del
 * cliente construye los enlaces con las mismas reglas que el servidor usa para
 * leerlos, y se puede probar con miles de cursos sin levantar nada
 * (`scripts/cursos-panel.test.mjs`).
 *
 * Los filtros viven en la URL y no en el estado del componente: un enlace
 * compartido abre el mismo listado, y «atrás» devuelve a la página y al filtro
 * en que se estaba.
 */

import type { IconoNombre } from "@/lib/iconos-curso";

export const ESTADOS_CURSO = ["borrador", "privado", "publico", "archivado"] as const;
export type EstadoCurso = (typeof ESTADOS_CURSO)[number];

export const ETIQUETA_ESTADO: Record<EstadoCurso, string> = {
  borrador: "Borrador",
  privado: "Privado",
  publico: "Público",
  archivado: "Archivado",
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
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function coincide(fila: FilaPanel, terminos: string[]): boolean {
  if (terminos.length === 0) return true;
  const pajar = normalizar(`${fila.titulo} ${fila.codigo ?? ""} ${fila.slug} ${fila.area}`);
  return terminos.every((termino) => pajar.includes(termino));
}

function comparar(orden: Orden) {
  const porTitulo = (a: FilaPanel, b: FilaPanel) => a.titulo.localeCompare(b.titulo, "es");
  return (a: FilaPanel, b: FilaPanel): number => {
    if (orden === "titulo") return porTitulo(a, b);
    if (orden === "codigo") return (a.codigo ?? "￿").localeCompare(b.codigo ?? "￿") || porTitulo(a, b);
    if (orden === "precio") return b.precio - a.precio || porTitulo(a, b);
    // Sin fecha va al final: no se sabe cuándo se tocó.
    const ta = a.actualizadoEn ? Date.parse(a.actualizadoEn) : 0;
    const tb = b.actualizadoEn ? Date.parse(b.actualizadoEn) : 0;
    return tb - ta || porTitulo(a, b);
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
  areas: string[];
};

export function filtrarCursos(todas: FilaPanel[], filtros: Filtros): Resultado {
  const terminos = normalizar(filtros.q).split(/\s+/).filter(Boolean);
  const antesDeEstado = todas.filter(
    (fila) => (!filtros.area || fila.area === filtros.area) && coincide(fila, terminos),
  );

  const porEstado = { todos: antesDeEstado.length } as Record<EstadoCurso | "todos", number>;
  for (const estado of ESTADOS_CURSO) porEstado[estado] = 0;
  for (const fila of antesDeEstado) {
    if (fila.estado in porEstado) porEstado[fila.estado as EstadoCurso] += 1;
  }

  const filtradas = filtros.estado === "todos"
    ? antesDeEstado
    : antesDeEstado.filter((fila) => fila.estado === filtros.estado);
  const ordenadas = [...filtradas].sort(comparar(filtros.orden));

  const paginas = Math.max(1, Math.ceil(ordenadas.length / POR_PAGINA));
  const pagina = Math.min(filtros.pagina, paginas);
  const inicio = (pagina - 1) * POR_PAGINA;

  return {
    filas: ordenadas.slice(inicio, inicio + POR_PAGINA),
    total: ordenadas.length,
    paginas,
    pagina,
    desde: ordenadas.length === 0 ? 0 : inicio + 1,
    hasta: Math.min(inicio + POR_PAGINA, ordenadas.length),
    porEstado,
    areas: [...new Set(todas.map((fila) => fila.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
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
