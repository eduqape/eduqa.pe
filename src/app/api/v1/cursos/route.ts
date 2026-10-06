import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parse as parseYaml } from "yaml";
import { codigoBaseDeFicha, construirCurso } from "@/lib/curso-markdown";
import { esIconoCurso } from "@/lib/iconos-curso";
import { PREFIJO, resumir } from "@/lib/claves-api";

/** Devuelve el frontmatter de un archivo Markdown, o {} si no lo lleva. */
function frontmatter(texto: string): Record<string, unknown> {
  const limpio = texto.replace(/^﻿/, "");
  if (!limpio.startsWith("---")) return {};
  const cierre = limpio.indexOf("\n---", 3);
  if (cierre === -1) return {};
  return (parseYaml(limpio.slice(3, cierre)) ?? {}) as Record<string, unknown>;
}

/**
 * Publica o actualiza un curso.
 *
 * Recibe los archivos Markdown del curso, los valida construyendo el temario y
 * los guarda. Es la misma operación que hace el panel, expuesta para que un
 * proceso externo —o un agente— pueda publicar sin abrir el navegador.
 *
 * La autenticación va por clave en la cabecera `Authorization`. La clave no se
 * guarda: se compara su resumen contra el de `claves_api`.
 */

type Cuerpo = { slug?: string; archivos?: Record<string, string> };

const error = (estado: number, mensaje: string, detalle?: unknown) =>
  NextResponse.json({ ok: false, error: mensaje, detalle }, { status: estado });

export async function POST(peticion: Request) {
  const cabecera = peticion.headers.get("authorization") ?? "";
  const clave = cabecera.startsWith("Bearer ") ? cabecera.slice(7).trim() : "";
  if (!clave.startsWith(PREFIJO)) {
    return error(401, "Falta la cabecera Authorization con una clave válida.");
  }

  // El cliente se crea con la clave publicable; la autorización de escritura
  // la concede la política de `claves_api`, no esta comprobación.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  const { data: registro } = await supabase
    .rpc("autorizar_clave_api", { p_resumen: resumir(clave) })
    .single<{ usuario_id: string }>();

  if (!registro) return error(401, "Clave desconocida o revocada.");

  let cuerpo: Cuerpo;
  try {
    cuerpo = (await peticion.json()) as Cuerpo;
  } catch {
    return error(400, "El cuerpo debe ser JSON.");
  }

  const archivos = cuerpo.archivos ?? {};
  const nombres = Object.keys(archivos);
  if (nombres.length === 0) return error(400, "No llegó ningún archivo.");
  if (!nombres.includes("curso.md")) {
    return error(400, "Falta curso.md, que es la ficha del curso.");
  }
  if (nombres.length < 2) {
    return error(400, "Un curso necesita al menos una sesión además de la ficha.");
  }
  for (const nombre of nombres) {
    if (!nombre.endsWith(".md")) return error(400, `«${nombre}» no es un archivo .md.`);
    if (nombre.includes("/")) return error(400, `«${nombre}» no puede llevar rutas.`);
  }

  const mapa = new Map(Object.entries(archivos));

  if (!esIconoCurso(frontmatter(archivos["curso.md"]).icono)) {
    return error(400, "Todo curso debe declarar un icono válido en curso.md.");
  }

  // Se construye antes de guardar: un temario mal escrito se rechaza aquí y no
  // cuando un alumno abra la página.
  let curso;
  let codigoBase: string | null;
  try {
    curso = construirCurso(cuerpo.slug ?? "curso", mapa);
    codigoBase = codigoBaseDeFicha(archivos["curso.md"]);
  } catch (e) {
    return error(422, "El curso no se pudo leer.", (e as Error).message);
  }

  const slug = (cuerpo.slug ?? curso.slug).trim();
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
    p_resumen: resumir(clave),
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
    estado: "borrador",
    mensaje: "Guardado. Se publica desde el panel cuando esté revisado.",
  });
}
