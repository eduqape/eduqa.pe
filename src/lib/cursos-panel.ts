import "server-only";

import { parse as parseYaml } from "yaml";
import { construirCurso } from "@/lib/curso-markdown";
import type { Curso } from "@/lib/curso-tipos";
import { resolverIconoCurso } from "@/lib/iconos-curso";
import { clienteServidor } from "@/lib/supabase/servidor";
import { leerTodo } from "@/lib/supabase/paginar";
import type { FilaPanel } from "@/lib/cursos-panel-filtro";

/**
 * Lecturas del panel de cursos.
 *
 * El listado no usa `obtenerCursos()`: ese descarga el Markdown de todas las
 * sesiones de todos los cursos y los construye uno por uno, que es lo que
 * necesita el alumno pero no una tabla de gestión. Con 2000 cursos serían
 * cientos de megabytes por cada visita. Aquí se leen la fila de `cursos` y la
 * ficha (`curso.md`, unos cientos de bytes), y el material completo solo del
 * curso que se abre.
 */

/** Frontmatter de un Markdown, o {} si no lo lleva o no se puede leer. */
export function frontmatter(texto: string): Record<string, unknown> {
  const limpio = texto.replace(/^﻿/, "");
  if (!limpio.startsWith("---")) return {};
  const cierre = limpio.indexOf("\n---", 3);
  if (cierre === -1) return {};
  try {
    const datos = parseYaml(limpio.slice(3, cierre));
    return datos && typeof datos === "object" && !Array.isArray(datos) ? (datos as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Huella corta del texto de un archivo, para saber si cambió mientras se editaba. */
export function huella(texto: string): string {
  // FNV-1a de 32 bits: no es criptográfica ni necesita serlo, solo distinguir versiones.
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(16)}-${texto.length}`;
}

type FilaCurso = {
  id: string;
  slug: string;
  codigo: string | null;
  titulo: string;
  resumen: string | null;
  estado: string;
  precio: number | string;
  acceso_libre: boolean;
  actualizado_en: string | null;
};

/** Todas las filas del listado, ligeras. El filtrado y la paginación los hace `filtrarCursos`. */
export async function filasDelPanel(): Promise<FilaPanel[]> {
  const supabase = await clienteServidor();
  const [cursos, fichas] = await Promise.all([
    leerTodo<FilaCurso>((desde, hasta) =>
      supabase
        .from("cursos")
        .select("id, slug, codigo, titulo, resumen, estado, precio, acceso_libre, actualizado_en")
        .order("id")
        .range(desde, hasta),
    ),
    leerTodo<{ curso_id: string; contenido: string }>((desde, hasta) =>
      supabase
        .from("curso_contenido")
        .select("curso_id, contenido")
        .eq("archivo", "curso.md")
        .order("curso_id")
        .range(desde, hasta),
    ),
  ]);

  const error = cursos.error ?? fichas.error;
  if (error) throw new Error(`No se pudo leer el listado de cursos: ${error.message}`);

  const fichaPorCurso = new Map(fichas.data.map((fila) => [fila.curso_id, frontmatter(fila.contenido)]));

  return cursos.data.map((fila) => {
    const ficha = fichaPorCurso.get(fila.id);
    const area = String(ficha?.area ?? "");
    return {
      id: fila.id,
      slug: fila.slug,
      codigo: fila.codigo,
      titulo: fila.titulo || String(ficha?.titulo ?? fila.slug),
      resumen: fila.resumen ?? "",
      estado: fila.estado,
      precio: Number(fila.precio),
      accesoLibre: fila.acceso_libre,
      actualizadoEn: fila.actualizado_en,
      area,
      nivel: String(ficha?.nivel ?? ""),
      formato: String(ficha?.formato ?? ficha?.tipo ?? "curso"),
      horas: Number(ficha?.horas ?? 0) || 0,
      icono: resolverIconoCurso(fila.slug, area, ficha?.icono),
      fichaLegible: Boolean(ficha && Object.keys(ficha).length > 0),
    };
  });
}

/** Cuántas sesiones tiene cada curso de la página visible. */
export async function sesionesDe(ids: string[]): Promise<Map<string, number>> {
  const conteo = new Map<string, number>();
  if (ids.length === 0) return conteo;
  const supabase = await clienteServidor();
  // Se cuentan los archivos y no el índice: las políticas solo enseñan el
  // índice de los cursos públicos, y el material sí lo ve un administrador.
  const { data, error } = await leerTodo<{ curso_id: string; archivo: string }>((desde, hasta) =>
    supabase
      .from("curso_contenido")
      .select("curso_id, archivo")
      .in("curso_id", ids)
      .neq("archivo", "curso.md")
      .order("curso_id")
      .order("archivo")
      .range(desde, hasta),
  );
  if (error) throw new Error(`No se pudieron contar las sesiones: ${error.message}`);
  for (const fila of data) conteo.set(fila.curso_id, (conteo.get(fila.curso_id) ?? 0) + 1);
  return conteo;
}

export type SesionPanel = {
  archivo: string;
  numero: number | null;
  titulo: string;
  slug: string;
  palabras: number;
  secciones: number;
  bloquesCodigo: number;
  sinSalida: number;
  ejercicios: number;
};

export type DetalleCurso = {
  id: string;
  slug: string;
  codigo: string | null;
  codigoBase: string | null;
  revision: number | null;
  titulo: string;
  resumen: string;
  estado: string;
  precio: number;
  accesoLibre: boolean;
  orden: number | null;
  ruta: { slug: string; nombre: string } | null;
  actualizadoEn: string | null;
  creadoEn: string | null;
  publicadoEn: string | null;
  ficha: Record<string, unknown>;
  icono: ReturnType<typeof resolverIconoCurso>;
  /** El curso construido, o el motivo por el que no se puede construir. */
  curso: Curso | null;
  errorConstruccion: string | null;
  sesiones: SesionPanel[];
  creadores: { nombre: string; rol: string }[];
  primeraLeccion: string | null;
};

function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Un curso con todo lo que hace falta para gestionarlo.
 *
 * Si el Markdown no se puede construir, el curso no desaparece del panel (el
 * catálogo sí lo esconde): se devuelve con el error para que se pueda arreglar
 * desde aquí.
 */
export async function cursoDelPanel(slug: string): Promise<DetalleCurso | null> {
  const supabase = await clienteServidor();
  const { data: fila, error } = await supabase
    .from("cursos")
    .select(
      "id, slug, codigo, codigo_base, revision, titulo, resumen, estado, precio, acceso_libre, orden, ruta, actualizado_en, creado_en, publicado_en",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer el curso: ${error.message}`);
  if (!fila) return null;

  const [archivos, autorias, ruta] = await Promise.all([
    leerTodo<{ archivo: string; contenido: string }>((desde, hasta) =>
      supabase
        .from("curso_contenido")
        .select("archivo, contenido")
        .eq("curso_id", fila.id)
        .order("archivo")
        .range(desde, hasta),
    ),
    supabase.from("curso_creadores").select("usuario_id, rol, orden").eq("curso_id", fila.id).order("orden"),
    fila.ruta
      ? supabase.from("rutas").select("slug, nombre").eq("slug", fila.ruta).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (archivos.error) throw new Error(`No se pudo leer el material: ${archivos.error.message}`);

  const ids = (autorias.data ?? []).map((a) => a.usuario_id as string);
  const { data: perfiles } = ids.length
    ? await supabase.from("perfiles").select("id, nombre").in("id", ids)
    : { data: [] as { id: string; nombre: string | null }[] };
  const nombrePorId = new Map((perfiles ?? []).map((p) => [p.id, p.nombre]));

  const mapa = new Map(archivos.data.map((a) => [a.archivo, a.contenido]));
  const ficha = frontmatter(mapa.get("curso.md") ?? "");

  let curso: Curso | null = null;
  let errorConstruccion: string | null = null;
  if (!mapa.has("curso.md")) {
    errorConstruccion = "Falta curso.md: el curso está registrado pero no tiene ficha.";
  } else {
    try {
      curso = construirCurso(slug, mapa);
    } catch (e) {
      errorConstruccion = (e as Error).message;
    }
  }

  const sesiones: SesionPanel[] = archivos.data
    .filter((a) => a.archivo !== "curso.md")
    .map((a) => {
      const f = frontmatter(a.contenido);
      const numero = Number(f.numero);
      const slugSesion = String(f.slug ?? (Number.isFinite(numero) ? `sesion-${numero}` : ""));
      const leccion = curso?.lecciones.find((l) => l.slug === slugSesion);
      const codigo = (leccion?.bloques ?? []).filter((b) => b.tipo === "codigo");
      return {
        archivo: a.archivo,
        numero: Number.isFinite(numero) ? numero : null,
        titulo: String(f.titulo ?? ""),
        slug: slugSesion,
        palabras: contarPalabras(a.contenido),
        secciones: leccion?.secciones.length ?? 0,
        bloquesCodigo: codigo.length,
        sinSalida: codigo.filter((b) => b.tipo === "codigo" && b.salida === null).length,
        ejercicios: Object.keys(leccion?.ejercicios ?? {}).length,
      };
    })
    .sort((a, b) => (a.numero ?? Number.MAX_SAFE_INTEGER) - (b.numero ?? Number.MAX_SAFE_INTEGER) || a.archivo.localeCompare(b.archivo));

  const area = String(ficha.area ?? "");
  return {
    id: fila.id,
    slug: fila.slug,
    codigo: fila.codigo,
    codigoBase: fila.codigo_base,
    revision: fila.revision,
    titulo: fila.titulo,
    resumen: fila.resumen ?? "",
    estado: fila.estado,
    precio: Number(fila.precio),
    accesoLibre: fila.acceso_libre,
    orden: fila.orden,
    ruta: ruta.data ? { slug: ruta.data.slug, nombre: ruta.data.nombre } : null,
    actualizadoEn: fila.actualizado_en,
    creadoEn: fila.creado_en,
    publicadoEn: fila.publicado_en,
    ficha,
    icono: resolverIconoCurso(slug, area, ficha.icono),
    curso,
    errorConstruccion,
    sesiones,
    creadores: (autorias.data ?? []).map((a) => ({
      nombre: nombrePorId.get(a.usuario_id) || "Sin nombre",
      rol: String(a.rol ?? "autor"),
    })),
    primeraLeccion: curso?.lecciones[0]?.slug ?? null,
  };
}

/** Un archivo del curso para el editor, con la huella de la versión leída. */
export async function archivoDelPanel(slug: string, archivo: string) {
  const supabase = await clienteServidor();
  const { data: curso, error } = await supabase
    .from("cursos")
    .select("id, slug, titulo, estado, codigo")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer el curso: ${error.message}`);
  if (!curso) return null;

  const { data: filas, error: eArchivos } = await supabase
    .from("curso_contenido")
    .select("archivo, contenido")
    .eq("curso_id", curso.id)
    .order("archivo");
  if (eArchivos) throw new Error(`No se pudo leer el material: ${eArchivos.message}`);

  const actual = (filas ?? []).find((f) => f.archivo === archivo);
  if (!actual) return null;

  const sesiones = (filas ?? [])
    .filter((f) => f.archivo !== "curso.md")
    .map((f) => {
      const fm = frontmatter(f.contenido);
      return { archivo: f.archivo, numero: Number(fm.numero), titulo: String(fm.titulo ?? f.archivo) };
    })
    .sort((a, b) => (a.numero || 0) - (b.numero || 0));

  return {
    curso: { slug: curso.slug, titulo: curso.titulo, estado: curso.estado, codigo: curso.codigo },
    archivo,
    contenido: actual.contenido,
    huella: huella(actual.contenido),
    sesiones,
  };
}
