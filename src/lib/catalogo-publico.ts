import "server-only";

import { leerTodo } from "@/lib/supabase/paginar";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { construirCurso } from "@/lib/curso-markdown";
import type { Curso } from "@/lib/curso-tipos";

export type CursoCatalogoPublico = Curso & {
  codigo: string;
  precio: number;
  accesoLibre: boolean;
  actualizadoEn: string;
};

type FichaPublica = {
  id: string;
  slug: string;
  codigo: string;
  titulo: string;
  resumen: string | null;
  precio: number | string;
  acceso_libre: boolean;
  actualizado_en: string;
};

function clientePublico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan las variables públicas de Supabase para cargar el catálogo.");
  }

  // Este cliente no lleva cookies ni sesión: consulta exactamente lo que RLS
  // permite al rol anon. Así una landing SEO jamás hereda permisos del visitante.
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Escaparate público de cursos.
 *
 * Solo lee la ficha curso.md y el índice de sesiones. No solicita el Markdown
 * de las lecciones protegidas: la página pública puede explicar qué se enseña
 * sin convertir el contenido comprado en una respuesta anónima.
 */
export const obtenerCatalogoPublico = cache(async (): Promise<CursoCatalogoPublico[]> => {
  const supabase = clientePublico();

  const [
    { data: fichas, error: errorFichas },
    { data: archivos, error: errorArchivos },
    { data: indices, error: errorIndices },
  ] = await Promise.all([
    supabase
      .from("cursos")
      .select("id, slug, codigo, titulo, resumen, precio, acceso_libre, actualizado_en")
      .eq("estado", "publico")
      .order("orden"),
    supabase
      .from("curso_contenido")
      .select("curso_id, archivo, contenido")
      .eq("archivo", "curso.md"),
    leerTodo<{ curso_id: string; numero: number; titulo: string; slug: string }>((desde, hasta) =>
      supabase
        .from("curso_sesiones")
        .select("curso_id, numero, titulo, slug")
        .order("numero")
        .order("curso_id")
        .order("archivo")
        .range(desde, hasta)),
  ]);

  const error = errorFichas ?? errorArchivos ?? errorIndices;
  if (error) {
    throw new Error(`No se pudo cargar el catálogo público: ${error.message}`);
  }

  const fichaMarkdown = new Map(
    (archivos ?? []).map((fila) => [fila.curso_id, fila.contenido] as const),
  );
  const indicePorCurso = new Map<
    string,
    { numero: number; titulo: string; slug: string }[]
  >();

  for (const fila of indices ?? []) {
    const lista = indicePorCurso.get(fila.curso_id) ?? [];
    lista.push({ numero: fila.numero, titulo: fila.titulo, slug: fila.slug });
    indicePorCurso.set(fila.curso_id, lista);
  }

  const cursos: CursoCatalogoPublico[] = [];
  for (const ficha of (fichas ?? []) as FichaPublica[]) {
    const markdown = fichaMarkdown.get(ficha.id);
    if (!markdown) {
      console.error(`El curso público «${ficha.slug}» no tiene curso.md visible para anon.`);
      continue;
    }

    try {
      const curso = construirCurso(
        ficha.slug,
        new Map([["curso.md", markdown]]),
        indicePorCurso.get(ficha.id) ?? [],
      );

      cursos.push({
        ...curso,
        titulo: ficha.titulo?.trim() || curso.titulo,
        resumen: ficha.resumen?.trim() || curso.resumen,
        codigo: ficha.codigo,
        precio: Number(ficha.precio),
        accesoLibre: ficha.acceso_libre,
        actualizadoEn: ficha.actualizado_en,
      });
    } catch (errorCurso) {
      console.error(
        `No se pudo construir la ficha pública de «${ficha.slug}»:`,
        (errorCurso as Error).message,
      );
    }
  }

  return cursos;
});
