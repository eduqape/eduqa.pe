"use server";

import { comoAdministrador, comprobarImagenes, materialDe, validarMaterial } from "./material";
import { vistaDeArchivo, type Vista } from "./render-vista";

/**
 * Pinta el archivo que se está escribiendo con los mismos componentes que ve
 * el alumno, sin guardarlo.
 *
 * Se renderiza en el servidor porque el resaltado del código (Shiki) y el
 * lector del Markdown solo corren ahí: una vista previa hecha con otro motor
 * en el navegador acabaría enseñando algo distinto de lo que se publica.
 */
export async function previsualizarArchivo(slug: string, archivo: string, contenido: string): Promise<Vista> {
  const acceso = await comoAdministrador();
  if ("error" in acceso) return { ok: false, error: acceso.error };

  const material = await materialDe(acceso.supabase, slug);
  if ("error" in material) return { ok: false, error: material.error };

  material.archivos.set(archivo, contenido);
  const valido = validarMaterial(slug, material.curso.codigo_base, material.archivos);
  if ("error" in valido) return { ok: false, error: valido.error };

  const faltan = await comprobarImagenes(acceso.supabase, slug, archivo, contenido);
  return vistaDeArchivo(slug, valido.curso, archivo, contenido, faltan ? [faltan] : []);
}
