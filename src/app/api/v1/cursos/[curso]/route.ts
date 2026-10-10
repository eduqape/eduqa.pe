import { NextResponse } from "next/server";
import { autenticar, error, leerArchivos, nombresInvalidos, publicar } from "@/lib/api-cursos";

/**
 * Un curso concreto.
 *
 * `GET` devuelve sus archivos Markdown publicados. `PATCH` cambia solo los
 * archivos que se envían: los combina con lo publicado, valida el curso entero
 * y lo guarda. Así una sesión se corrige sin reenviar —ni arriesgarse a
 * borrar— las demás. Ambos siguen las reglas de publicar: clave vigente, rol
 * que lo permita y autoría del curso, salvo para un administrador.
 */

export async function GET(peticion: Request, { params }: { params: Promise<{ curso: string }> }) {
  const autorizado = await autenticar(peticion);
  if (autorizado instanceof NextResponse) return autorizado;
  const { curso } = await params;

  const leido = await leerArchivos(autorizado, curso);
  if ("respuesta" in leido) return leido.respuesta;
  return NextResponse.json({ ok: true, slug: curso, archivos: leido.archivos });
}

type Cuerpo = { archivos?: Record<string, string> };

export async function PATCH(peticion: Request, { params }: { params: Promise<{ curso: string }> }) {
  const autorizado = await autenticar(peticion);
  if (autorizado instanceof NextResponse) return autorizado;
  const { curso } = await params;

  let cuerpo: Cuerpo;
  try {
    cuerpo = (await peticion.json()) as Cuerpo;
  } catch {
    return error(400, "El cuerpo debe ser JSON.");
  }

  const cambios = cuerpo.archivos ?? {};
  const nombres = Object.keys(cambios);
  if (nombres.length === 0) return error(400, "No llegó ningún archivo que cambiar.");
  const invalido = nombresInvalidos(nombres);
  if (invalido) return invalido;
  if (nombres.some((n) => typeof cambios[n] !== "string")) {
    return error(400, "Cada archivo tiene que llegar como texto.");
  }

  const leido = await leerArchivos(autorizado, curso);
  if ("respuesta" in leido) return leido.respuesta;

  const nuevos = nombres.filter((n) => !(n in leido.archivos));
  const sinCambio = nombres.filter((n) => leido.archivos[n] === cambios[n]);
  if (sinCambio.length === nombres.length) {
    return NextResponse.json({ ok: true, slug: curso, actualizados: [], mensaje: "Nada que cambiar." });
  }

  return publicar(autorizado, curso, { ...leido.archivos, ...cambios }, {
    actualizados: nombres.filter((n) => !sinCambio.includes(n)),
    nuevos,
  });
}
