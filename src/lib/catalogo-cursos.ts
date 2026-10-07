import "server-only";

import { cache } from "react";
import { construirCurso } from "@/lib/curso-markdown";
import type { Curso } from "@/lib/curso-tipos";
import { clienteServidor } from "@/lib/supabase/servidor";
import { leerTodo } from "@/lib/supabase/paginar";

/**
 * Catálogo de runtime.
 *
 * Supabase es la única fuente de verdad. La aplicación no descubre cursos en
 * `src/content`, no conserva un catálogo alternativo y no hace fallback si la
 * base falla. Publicar, editar, archivar o retirar un curso consiste únicamente
 * en modificar sus filas en Supabase.
 *
 * Los Markdown siguen siendo el formato editorial que se sube al panel/API,
 * pero una vez publicados se leen desde `curso_contenido`.
 */
export const obtenerCursos = cache(async (): Promise<Curso[]> => {
  const supabase = await clienteServidor();

  const [
    { data: fichas, error: errorFichas },
    { data: archivos, error: errorArchivos },
    { data: indices, error: errorIndices },
  ] = await Promise.all([
    supabase.from("cursos").select("id, slug"),
    // Paginadas: juntas superan las 1000 filas que PostgREST entrega por
    // petición, y lo que excede se pierde sin error.
    leerTodo<{ curso_id: string; archivo: string; contenido: string }>((desde, hasta) =>
      supabase.from("curso_contenido").select("curso_id, archivo, contenido")
        .order("curso_id").order("archivo").range(desde, hasta)),
    leerTodo<{ curso_id: string; numero: number; titulo: string; slug: string }>((desde, hasta) =>
      supabase.from("curso_sesiones").select("curso_id, numero, titulo, slug")
        .order("curso_id").order("archivo").range(desde, hasta)),
  ]);

  const error = errorFichas ?? errorArchivos ?? errorIndices;
  if (error) {
    // Fallar aquí es deliberado: volver a contenido empaquetado ocultaría una
    // caída o una mala configuración de Supabase y podría revivir cursos
    // archivados. La base es la única autoridad.
    throw new Error(`No se pudo leer el catálogo de cursos desde Supabase: ${error.message}`);
  }

  // El material se agrupa por el id del curso; el slug solo se usa para la URL.
  const registrados = new Map((fichas ?? []).map((fila) => [fila.id as string, fila.slug as string]));
  if (!archivos?.length) return [];

  const porCurso = new Map<string, Map<string, string>>();
  for (const fila of archivos) {
    if (!registrados.has(fila.curso_id)) continue;
    const mapa = porCurso.get(fila.curso_id) ?? new Map<string, string>();
    mapa.set(fila.archivo, fila.contenido);
    porCurso.set(fila.curso_id, mapa);
  }

  const indicePorCurso = new Map<string, { numero: number; titulo: string; slug: string }[]>();
  for (const fila of indices ?? []) {
    if (!registrados.has(fila.curso_id)) continue;
    const lista = indicePorCurso.get(fila.curso_id) ?? [];
    lista.push({ numero: fila.numero, titulo: fila.titulo, slug: fila.slug });
    indicePorCurso.set(fila.curso_id, lista);
  }

  const cursos: Curso[] = [];
  for (const [id, slug] of registrados) {
    const mapa = porCurso.get(id);
    if (!mapa?.has("curso.md")) {
      console.error(`El curso «${slug}» está registrado en Supabase pero no tiene curso.md visible.`);
      continue;
    }

    try {
      cursos.push(construirCurso(slug, mapa, indicePorCurso.get(id) ?? []));
    } catch (e) {
      // Un curso inválido no debe tumbar el resto del catálogo, pero tampoco
      // puede sustituirse por una copia local.
      console.error(`No se pudo construir el curso «${slug}» desde Supabase:`, (e as Error).message);
    }
  }

  return cursos;
});

/**
 * Fecha de primer lanzamiento de cada curso.
 *
 * `publicado_en` se fija cuando el curso pasa por primera vez a estado
 * `publico` y no cambia al editarlo después. Sirve para efectos efímeros de
 * lanzamiento sin confundir una actualización editorial con un curso nuevo.
 */
export const publicacionesCursos = cache(async (): Promise<Map<string, string | null>> => {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("cursos")
    .select("slug, publicado_en");

  if (error) {
    throw new Error(`No se pudieron leer las fechas de publicación: ${error.message}`);
  }

  return new Map((data ?? []).map((fila) => [fila.slug, fila.publicado_en]));
});

export const buscarCurso = cache(async (slug: string) =>
  (await obtenerCursos()).find((c) => c.slug === slug),
);

export const buscarLeccion = cache(async (cursoSlug: string, leccionSlug: string) => {
  const curso = await buscarCurso(cursoSlug);
  if (!curso) return undefined;
  const i = curso.lecciones.findIndex((l) => l.slug === leccionSlug);
  if (i === -1) return undefined;
  return {
    curso,
    leccion: curso.lecciones[i],
    anterior: i > 0 ? curso.lecciones[i - 1] : undefined,
    siguiente: i < curso.lecciones.length - 1 ? curso.lecciones[i + 1] : undefined,
  };
});
