import "server-only";

import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parse as parseYaml } from "yaml";
import { codigoBaseDeFicha, construirCurso } from "@/lib/curso-markdown";
import { esIconoCurso } from "@/lib/iconos-curso";
import { PREFIJO, resumir } from "@/lib/claves-api";

/**
 * Lo común de la API de cursos: autenticar la clave y publicar un paquete de
 * archivos. `POST /api/v1/cursos` publica un paquete completo; `PATCH
 * /api/v1/cursos/[curso]` combina unos pocos archivos con lo publicado y
 * publica el resultado por el mismo camino, con las mismas validaciones.
 */

export const error = (estado: number, mensaje: string, detalle?: unknown) =>
  NextResponse.json({ ok: false, error: mensaje, detalle }, { status: estado });

/** Devuelve el frontmatter de un archivo Markdown, o {} si no lo lleva. */
function frontmatter(texto: string): Record<string, unknown> {
  const limpio = texto.replace(/^﻿/, "");
  if (!limpio.startsWith("---")) return {};
  const cierre = limpio.indexOf("\n---", 3);
  if (cierre === -1) return {};
  return (parseYaml(limpio.slice(3, cierre)) ?? {}) as Record<string, unknown>;
}

export type Autorizado = { supabase: SupabaseClient; resumen: string };

/**
 * Comprueba la clave de la cabecera `Authorization`. La clave no se guarda: se
 * compara su resumen contra el de `claves_api`. Devuelve la respuesta de error
 * lista para enviar si no vale.
 */
export async function autenticar(peticion: Request): Promise<Autorizado | NextResponse> {
  const cabecera = peticion.headers.get("authorization") ?? "";
  const clave = cabecera.startsWith("Bearer ") ? cabecera.slice(7).trim() : "";
  if (!clave.startsWith(PREFIJO)) {
    return error(401, "Falta la cabecera Authorization con una clave válida.");
  }

  // El cliente se crea con la clave publicable; la autorización la conceden
  // las funciones de la base contra `claves_api`, no esta comprobación.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const resumen = resumir(clave);

  const { data: registro } = await supabase
    .rpc("autorizar_clave_api", { p_resumen: resumen })
    .single<{ usuario_id: string }>();
  if (!registro) return error(401, "Clave desconocida o revocada.");

  return { supabase, resumen };
}

/** Comprueba que cada nombre sea un .md sin rutas. */
export function nombresInvalidos(nombres: string[]) {
  for (const nombre of nombres) {
    if (!nombre.endsWith(".md")) return error(400, `«${nombre}» no es un archivo .md.`);
    if (nombre.includes("/")) return error(400, `«${nombre}» no puede llevar rutas.`);
  }
  return null;
}

/**
 * Valida un paquete completo y lo guarda. `publicar_curso_por_api` reemplaza
 * todo el material del curso por `archivos`, así que el paquete tiene que
 * estar entero.
 */
export async function publicar(
  { supabase, resumen }: Autorizado,
  slugPedido: string | undefined,
  archivos: Record<string, string>,
  extra: Record<string, unknown> = {},
) {
  const nombres = Object.keys(archivos);
  if (nombres.length === 0) return error(400, "No llegó ningún archivo.");
  if (!nombres.includes("curso.md")) {
    return error(400, "Falta curso.md, que es la ficha del curso.");
  }
  if (nombres.length < 2) {
    return error(400, "Un curso necesita al menos una sesión además de la ficha.");
  }
  const invalido = nombresInvalidos(nombres);
  if (invalido) return invalido;

  const mapa = new Map(Object.entries(archivos));

  if (!esIconoCurso(frontmatter(archivos["curso.md"]).icono)) {
    return error(400, "Todo curso debe declarar un icono válido en curso.md.");
  }

  // Se construye antes de guardar: un temario mal escrito se rechaza aquí y no
  // cuando un alumno abra la página.
  let curso;
  let codigoBase: string | null;
  try {
    curso = construirCurso(slugPedido ?? "curso", mapa);
    codigoBase = codigoBaseDeFicha(archivos["curso.md"]);
  } catch (e) {
    return error(422, "El curso no se pudo leer.", (e as Error).message);
  }

  const slug = (slugPedido ?? curso.slug).trim();
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return error(400, "El slug solo admite minúsculas, números y guiones.");
  }

  // El índice se lee del frontmatter de cada archivo, como en el panel. Buscar
  // el archivo por el slug de la sesión confundía `sesion-1` con `sesion-10.md`.
  const sesiones = nombres
    .filter((archivo) => archivo !== "curso.md")
    .map((archivo) => {
      const f = frontmatter(archivos[archivo]);
      const numero = Number(f.numero);
      return {
        archivo,
        numero,
        titulo: String(f.titulo ?? ""),
        slug: String(f.slug ?? `sesion-${numero}`),
      };
    });
  const slugsSesion = new Set(sesiones.map((s) => s.slug));
  if (slugsSesion.size !== sesiones.length) {
    return error(422, "Dos sesiones comparten el mismo slug o número.");
  }

  const { data: codigo, error: eGuardado } = await supabase.rpc("publicar_curso_por_api", {
    p_resumen: resumen,
    p_slug: slug,
    p_titulo: curso.titulo,
    p_resumen_curso: curso.resumen,
    p_archivos: archivos,
    p_sesiones: sesiones,
    p_codigo_base: codigoBase,
  });

  if (eGuardado) return error(500, "No se pudo guardar el curso.", eGuardado.message);

  return NextResponse.json({
    ok: true,
    slug,
    codigo,
    titulo: curso.titulo,
    sesiones: curso.lecciones.map((l) => ({ numero: l.numero, slug: l.slug, titulo: l.titulo })),
    bloques: curso.lecciones.reduce((n, l) => n + l.bloques.length, 0),
    ...extra,
  });
}

/** Archivos publicados de un curso, con las reglas de `leer_curso_por_api`. */
export async function leerArchivos({ supabase, resumen }: Autorizado, slug: string) {
  const { data, error: e } = await supabase.rpc("leer_curso_por_api", { p_resumen: resumen, p_slug: slug });
  if (e) {
    const noExiste = e.message.startsWith("No existe el curso");
    return { respuesta: error(noExiste ? 404 : 403, e.message) } as const;
  }
  return { archivos: (data ?? {}) as Record<string, string> } as const;
}
