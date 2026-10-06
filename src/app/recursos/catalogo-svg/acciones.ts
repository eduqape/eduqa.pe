"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { perfilActual } from "@/lib/matriculas";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { BUCKET_ASSETS, TAMANO_MAXIMO_SVG, problemaSvg, slugAsset } from "@/lib/catalogo-svg";

const RUTA = "/recursos/catalogo-svg";

async function validarAdmin() {
  const [usuario, perfil] = await Promise.all([usuarioActual(), perfilActual()]);
  if (!usuario || !(perfil?.es_admin || perfil?.rol === "admin")) {
    throw new Error("Solo un administrador puede modificar el catálogo.");
  }
  return usuario;
}

function texto(formData: FormData, campo: string, maximo: number) {
  return String(formData.get(campo) ?? "").trim().slice(0, maximo);
}

function volver(estado: string): never {
  redirect(`${RUTA}?${new URLSearchParams({ estado })}`);
}

export type EstadoSubida = { estado: "inicial" } | { estado: "error"; mensaje: string } | { estado: "subido"; nombre: string };

// Devuelve el resultado en vez de redirigir: el formulario vive en un panel y
// los errores se muestran ahí, sin perder lo escrito.
export async function subirAsset(_previo: EstadoSubida, formData: FormData): Promise<EstadoSubida> {
  const error = (mensaje: string): EstadoSubida => ({ estado: "error", mensaje });
  const usuario = await validarAdmin().catch(() => null);
  if (!usuario) return error("Tu sesión no tiene permisos de administrador. Vuelve a entrar.");
  const nombre = texto(formData, "nombre", 120);
  const descripcion = texto(formData, "descripcion", 400);
  const origen = texto(formData, "origen", 300);
  const usadoEn = texto(formData, "usado_en", 300);
  const etiquetas = texto(formData, "etiquetas", 300)
    .split(",")
    .map((etiqueta) => etiqueta.trim().toLocaleLowerCase("es"))
    .filter(Boolean)
    .slice(0, 12);
  const archivo = formData.get("archivo");
  const slug = slugAsset(nombre);

  if (nombre.length < 2 || slug.length < 2) return error("Escribe un nombre de al menos 2 caracteres.");
  if (!(archivo instanceof File) || archivo.size === 0) return error("Elige un archivo SVG.");
  if (archivo.size > TAMANO_MAXIMO_SVG) return error("El SVG pesa más de 1 MB.");

  const contenido = await archivo.text();
  const problema = problemaSvg(contenido);
  if (problema) return error(problema);

  const supabase = await clienteServidor();
  const ruta = `${slug}-${Date.now().toString(36)}.svg`;
  const subida = await supabase.storage.from(BUCKET_ASSETS).upload(ruta, new Blob([contenido], { type: "image/svg+xml" }), {
    contentType: "image/svg+xml",
    cacheControl: "31536000",
    upsert: false,
  });
  if (subida.error) return error("No se pudo subir el archivo. Inténtalo de nuevo.");

  const publica = supabase.storage.from(BUCKET_ASSETS).getPublicUrl(ruta).data.publicUrl;
  const { data: ultimo } = await supabase
    .from("recurso_assets")
    .select("posicion")
    .order("posicion", { ascending: false })
    .limit(1)
    .maybeSingle();

  const insercion = await supabase.from("recurso_assets").insert({
    slug,
    nombre,
    archivo: publica,
    ruta_storage: ruta,
    descripcion,
    etiquetas,
    origen,
    usado_en: usadoEn || null,
    posicion: (ultimo?.posicion ?? 0) + 10,
    creado_por: usuario.id,
  });
  if (insercion.error) {
    // Sin fila no hay forma de llegar al archivo: se borra para no dejar huérfanos.
    await supabase.storage.from(BUCKET_ASSETS).remove([ruta]);
    return error(
      insercion.error.code === "23505"
        ? "Ya existe un asset con ese nombre."
        : "No se pudo guardar el asset. Inténtalo de nuevo.",
    );
  }

  revalidatePath(RUTA);
  return { estado: "subido", nombre };
}

export async function eliminarAsset(formData: FormData) {
  await validarAdmin();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) volver("error");

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("recurso_assets")
    .delete()
    .eq("id", id)
    .select("ruta_storage")
    .single();
  if (error || !data) volver("error");
  // Los SVG de /public los usa el resto del sitio: solo se borran los del bucket.
  if (data.ruta_storage) await supabase.storage.from(BUCKET_ASSETS).remove([data.ruta_storage]);

  revalidatePath(RUTA);
  volver("eliminado");
}
