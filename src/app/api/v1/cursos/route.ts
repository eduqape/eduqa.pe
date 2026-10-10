import { NextResponse } from "next/server";
import { autenticar, error, publicar } from "@/lib/api-cursos";

/**
 * Publica o actualiza un curso.
 *
 * Recibe los archivos Markdown del curso, los valida construyendo el temario y
 * los guarda. Es la misma operación que hace el panel, expuesta para que un
 * proceso externo —o un agente— pueda publicar sin abrir el navegador.
 *
 * El paquete reemplaza todo el material del curso. Para cambiar solo algunos
 * archivos está `PATCH /api/v1/cursos/[curso]`.
 */

type Cuerpo = { slug?: string; archivos?: Record<string, string> };

export async function POST(peticion: Request) {
  const autorizado = await autenticar(peticion);
  if (autorizado instanceof NextResponse) return autorizado;

  let cuerpo: Cuerpo;
  try {
    cuerpo = (await peticion.json()) as Cuerpo;
  } catch {
    return error(400, "El cuerpo debe ser JSON.");
  }

  return publicar(autorizado, cuerpo.slug, cuerpo.archivos ?? {}, {
    estado: "borrador",
    mensaje: "Guardado. Se publica desde el panel cuando esté revisado.",
  });
}
