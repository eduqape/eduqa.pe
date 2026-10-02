"use server";

import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { perfilActual } from "@/lib/matriculas";
import { registrarError } from "@/lib/registro";
import {
  actualizarPersonaBD,
  crearPersonaBD,
  eliminarPersonaBD,
  limpiarRedes,
  rolesDesdeFormulario,
} from "@/lib/personas-bd";

export type EstadoPersona = { ok: boolean; error?: string; detalle?: string };

const RE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RE_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * El panel es de administración, así que esta comprobación está para dar un
 * mensaje claro. El permiso de verdad lo vuelve a comprobar RLS al escribir, y
 * las escrituras piden un contador para distinguir "no existe" de "te lo negaron".
 */
async function exigirAdmin(): Promise<EstadoPersona | null> {
  const usuario = await usuarioActual();
  if (!usuario) return { ok: false, error: "Entra a tu cuenta primero." };

  const perfil = await perfilActual();
  if (!perfil?.es_admin) {
    return { ok: false, error: "No tienes permiso para gestionar el equipo." };
  }
  return null;
}

function texto(datos: FormData, campo: string): string {
  return String(datos.get(campo) ?? "").trim();
}

function bandera(datos: FormData, campo: string, porDefecto: boolean): boolean {
  const valor = datos.get(campo);
  if (valor === null) return porDefecto;
  return valor === "true" || valor === "on" || valor === "1";
}

/** Sin tildes, en minúsculas y con guiones: el mismo criterio que los cursos. */
function aSlug(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Lectura = {
  slug: string;
  nombre: string;
  titulo_profesional: string;
  correo: string;
  biografia: string;
  telefono: string;
  pais: string;
  visible: boolean;
  activo: boolean;
  orden: number;
};

/**
 * Valida el formulario y devuelve el error de la primera cosa que no cuadra, en
 * castellano y de forma legible. Un formulario de alta no debería aceptar un
 * correo roto y dejar que sea la base la que se queje.
 */
function leer(datos: FormData):
  | { ok: true; valor: Lectura; roles: ReturnType<typeof rolesDesdeFormulario> }
  | { ok: false; error: string } {
  const nombre = texto(datos, "nombre");
  const titulo = texto(datos, "titulo_profesional");
  const correo = texto(datos, "correo");
  const biografia = texto(datos, "biografia");
  const telefono = texto(datos, "telefono");
  const pais = texto(datos, "pais");
  const ordenCrudo = Number(datos.get("orden") ?? 50);

  if (nombre.length < 2) return { ok: false, error: "El nombre es demasiado corto." };
  if (titulo.length > 160) return { ok: false, error: "El título profesional es muy largo." };
  if (correo && !RE_CORREO.test(correo)) {
    return { ok: false, error: "Ese correo no tiene forma de correo." };
  }
  if (telefono && telefono.replace(/[\s()+-]/g, "").length < 6) {
    return { ok: false, error: "Ese teléfono no parece un teléfono." };
  }
  if (!Number.isInteger(ordenCrudo) || ordenCrudo < 0) {
    return { ok: false, error: "El orden debe ser un número entero de 0 para arriba." };
  }

  // Si quien edita escribe su propia dirección se respeta; si la deja vacía se
  // vuelve a derivar del nombre. Editar el nombre no arrastra la dirección, y
  // eso es lo que se espera al corregir un nombre con tilde.
  const escrito = texto(datos, "slug");
  const slug = escrito || aSlug(nombre);

  if (!slug) {
    return { ok: false, error: "Con ese nombre no sale una dirección válida para la ficha." };
  }
  if (!RE_SLUG.test(slug)) {
    return { ok: false, error: "La dirección solo admite minúsculas, números y guiones." };
  }

  const roles = rolesDesdeFormulario(datos.getAll("rol"));
  if (roles.length === 0) {
    return { ok: false, error: "Marca al menos un rol: sin rol no se sabe quién es." };
  }

  return {
    ok: true,
    roles,
    valor: {
      slug,
      nombre,
      titulo_profesional: titulo,
      correo,
      biografia,
      telefono,
      pais,
      visible: bandera(datos, "visible", false),
      activo: bandera(datos, "activo", true),
      orden: ordenCrudo,
    },
  };
}

/**
 * Los select de redes se mandan como `red` y `red_url`, uno por fila y en el
 * mismo orden. Se emparejan por posición y se descartan las filas a medio
 * rellenar, para que un hueco en un par no corra el emparejamiento de los
 * siguientes.
 */
function redesDelFormulario(datos: FormData) {
  const nombres = datos.getAll("red").map(String);
  const urls = datos.getAll("red_url").map(String);

  const parejas: { red: string; url: string }[] = [];
  const total = Math.max(nombres.length, urls.length);
  for (let i = 0; i < total; i += 1) {
    parejas.push({ red: nombres[i] ?? "", url: urls[i] ?? "" });
  }
  return parejas;
}

export async function crearPersona(
  _prev: EstadoPersona | null,
  formData: FormData,
): Promise<EstadoPersona> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  const lectura = leer(formData);
  if (!lectura.ok) return lectura;

  const { redes, error: errorRedes } = limpiarRedes(redesDelFormulario(formData));
  if (errorRedes) return { ok: false, error: errorRedes };

  const supabase = await clienteServidor();
  const { data: ocupado } = await supabase
    .from("personas")
    .select("id")
    .eq("slug", lectura.valor.slug)
    .maybeSingle();

  if (ocupado) {
    return {
      ok: false,
      error: `Ya hay una ficha en /${lectura.valor.slug}. Cambia el nombre o la dirección.`,
    };
  }

  try {
    await crearPersonaBD(lectura.valor, lectura.roles, redes);
  } catch (e) {
    registrarError("personas.crear", e);
    return { ok: false, error: (e as Error).message };
  }

  return {
    ok: true,
    detalle: `${lectura.valor.nombre} dada de alta${
      lectura.valor.visible ? " y visible en la web" : ""
    }.`,
  };
}

export async function actualizarPersona(
  _prev: EstadoPersona | null,
  formData: FormData,
): Promise<EstadoPersona> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  const id = texto(formData, "id");
  if (!id) return { ok: false, error: "No se sabe a quién editar." };

  const lectura = leer(formData);
  if (!lectura.ok) return lectura;

  const { redes, error: errorRedes } = limpiarRedes(redesDelFormulario(formData));
  if (errorRedes) return { ok: false, error: errorRedes };

  const supabase = await clienteServidor();
  const { data: otra } = await supabase
    .from("personas")
    .select("id")
    .eq("slug", lectura.valor.slug)
    .neq("id", id)
    .maybeSingle();

  if (otra) {
    return {
      ok: false,
      error: `La dirección /${lectura.valor.slug} ya la usa otra ficha.`,
    };
  }

  try {
    await actualizarPersonaBD(id, lectura.valor, lectura.roles, redes);
  } catch (e) {
    registrarError("personas.actualizar", e);
    return { ok: false, error: (e as Error).message };
  }

  return { ok: true, detalle: `Cambios guardados en ${lectura.valor.nombre}.` };
}

export async function eliminarPersona(id: string): Promise<EstadoPersona> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  if (!id) return { ok: false, error: "No se sabe a quién borrar." };

  try {
    await eliminarPersonaBD(id);
  } catch (e) {
    registrarError("personas.eliminar", e);
    return { ok: false, error: (e as Error).message };
  }

  return { ok: true, detalle: "Ficha eliminada, con sus roles y sus redes." };
}

/**
 * Publicar o dejar de publicar, sin entrar a editar.
 *
 * Es el gesto más frecuente del panel y por eso va en su propia acción: si
 * compartiera la del guardado, aparecería mezclado con el resultado de haber
 * guardado todos los campos, y quien despublicara leería un "guardado" que en
 * realidad no ha guardado nada nuevo.
 */
export async function cambiarVisibilidad(id: string, visible: boolean): Promise<EstadoPersona> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  try {
    await actualizarPersonaBD(id, { visible });
  } catch (e) {
    registrarError("personas.visibilidad", e);
    return { ok: false, error: (e as Error).message };
  }

  return {
    ok: true,
    detalle: visible
      ? "Visible en la web."
      : "Ya no sale en la web; la ficha se conserva.",
  };
}