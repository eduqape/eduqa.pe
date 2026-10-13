import "server-only";

import { codigoBaseDeFicha, construirCurso } from "@/lib/curso-markdown";
import type { Curso } from "@/lib/curso-tipos";
import { frontmatter } from "@/lib/cursos-panel";
import { esIconoCurso } from "@/lib/iconos-curso";
import { BUCKET_IMAGENES_CURSO, imagenesReferenciadas, rutaEnBucket } from "@/lib/imagenes-curso";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { leerTodo } from "@/lib/supabase/paginar";

/**
 * Lo que comparten las acciones del editor de cursos y su vista previa.
 *
 * No es un módulo `"use server"`: todo lo que exporta uno de esos se convierte
 * en un punto de entrada público, y estas funciones solo deben llamarse desde
 * el propio servidor.
 */

export type Supabase = Awaited<ReturnType<typeof clienteServidor>>;

/** Comprueba que quien llama sea administrador. RLS lo vuelve a exigir al escribir. */
export async function comoAdministrador(): Promise<{ supabase: Supabase } | { error: string }> {
  const usuario = await usuarioActual();
  if (!usuario) return { error: "Tu sesión expiró. Vuelve a entrar; lo escrito sigue en el editor." };
  const supabase = await clienteServidor();
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("es_admin")
    .eq("id", usuario.id)
    .maybeSingle();
  if (!perfil?.es_admin) return { error: "No tienes permiso para editar cursos." };
  return { supabase };
}

export const NOMBRE_ARCHIVO = /^[a-z0-9][a-z0-9_-]*\.md$/;

export type Material = {
  curso: { id: string; slug: string; codigo_base: string; estado: string; ruta: string | null };
  archivos: Map<string, string>;
};

/** El curso y todos sus archivos tal como están ahora en la base. */
export async function materialDe(supabase: Supabase, slug: string): Promise<Material | { error: string }> {
  const { data: curso, error } = await supabase
    .from("cursos")
    .select("id, slug, codigo_base, estado, ruta")
    .eq("slug", slug)
    .maybeSingle();
  if (error) return { error: `No se pudo leer el curso: ${error.message}` };
  if (!curso) return { error: "Ese curso ya no existe. Puede que alguien lo haya eliminado." };

  const { data: filas, error: eArchivos } = await leerTodo<{ archivo: string; contenido: string }>(
    (desde, hasta) =>
      supabase
        .from("curso_contenido")
        .select("archivo, contenido")
        .eq("curso_id", curso.id)
        .order("archivo")
        .range(desde, hasta),
  );
  if (eArchivos) return { error: `No se pudo leer el material: ${eArchivos.message}` };
  return { curso, archivos: new Map(filas.map((f) => [f.archivo, f.contenido])) };
}

type FilaIndice = { archivo: string; numero: number; titulo: string; slug: string };

/**
 * Valida el curso entero con los archivos ya combinados.
 *
 * Es la misma barrera que al importar: si el temario no se puede construir,
 * no se guarda nada y el alumno sigue viendo la versión anterior.
 */
export function validarMaterial(
  slug: string,
  codigoBase: string,
  archivos: Map<string, string>,
): { indice: FilaIndice[]; curso: Curso } | { error: string } {
  const fichaTexto = archivos.get("curso.md");
  if (!fichaTexto) return { error: "Falta curso.md, que es la ficha del curso." };
  const ficha = frontmatter(fichaTexto);
  const slugFicha = String(ficha.slug ?? "").trim();
  if (slugFicha && slugFicha !== slug) {
    return {
      error: `La ficha declara slug: ${slugFicha}, pero este curso es /${slug}. La dirección de un curso no se cambia desde el editor: rompería los enlaces y el progreso de los alumnos.`,
    };
  }
  if (!esIconoCurso(ficha.icono)) return { error: "La ficha debe declarar un icono válido (icono: python, libro…)." };
  let base: string | null;
  try {
    base = codigoBaseDeFicha(fichaTexto);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (base && base !== codigoBase) {
    return { error: `El código de este curso es ${codigoBase} y no cambia.` };
  }

  let curso: Curso;
  try {
    curso = construirCurso(slug, archivos);
  } catch (e) {
    return { error: `El curso no se pudo leer: ${(e as Error).message}` };
  }

  const indice = [...archivos.entries()]
    .filter(([archivo]) => archivo !== "curso.md")
    .map(([archivo, texto]) => {
      const f = frontmatter(texto);
      const numeroSesion = Number(f.numero);
      return { archivo, numero: numeroSesion, titulo: String(f.titulo ?? ""), slug: String(f.slug ?? `sesion-${numeroSesion}`) };
    });
  const repetido = (clave: "numero" | "slug") =>
    indice.find((fila, i) => indice.findIndex((otra) => otra[clave] === fila[clave]) !== i);
  const mismoNumero = repetido("numero");
  if (mismoNumero) return { error: `Dos sesiones llevan el número ${mismoNumero.numero}. Cada sesión necesita el suyo.` };
  const mismoSlug = repetido("slug");
  if (mismoSlug) return { error: `Dos sesiones comparten el slug «${mismoSlug.slug}».` };

  return { indice, curso };
}

/** Las imágenes que cita `texto` tienen que estar ya en el bucket del curso. */
export async function comprobarImagenes(supabase: Supabase, slug: string, archivo: string, texto: string) {
  const nombres: string[] = [];
  for (const ruta of imagenesReferenciadas(texto)) {
    const destino = rutaEnBucket(slug, ruta);
    if (!destino) return `${archivo} cita «${ruta}». Las imágenes del curso se citan como imagenes/nombre.png.`;
    nombres.push(destino.slice(destino.lastIndexOf("/") + 1));
  }
  if (nombres.length === 0) return null;
  const { data, error } = await supabase.storage.from(BUCKET_IMAGENES_CURSO).list(`${slug}/imagenes`, { limit: 1000 });
  if (error) return `No se pudieron comprobar las imágenes: ${error.message}`;
  const existentes = new Set((data ?? []).map((o) => o.name));
  const ausentes = [...new Set(nombres)].filter((n) => !existentes.has(n));
  return ausentes.length > 0
    ? `Faltan imágenes en el curso: ${ausentes.join(", ")}. Súbelas con «Insertar imagen» antes de guardar.`
    : null;
}

