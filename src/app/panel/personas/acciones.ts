"use server";

import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { perfilActual } from "@/lib/matriculas";
import { registrarError } from "@/lib/registro";
import {
  actualizarPersonaBD,
  borrarFotoPersonaBD,
  crearPersonaBD,
  eliminarPersonaBD,
  limpiarRedes,
  moverPersonaBD,
  rolesDesdeFormulario,
  siguienteOrden,
  subirFotoPersonaBD,
} from "@/lib/personas-bd";
import {
  banderasDeEstado,
  esEstadoFicha,
  PESO_MAXIMO_FOTO,
  TIPOS_FOTO,
  type EstadoFicha,
} from "@/lib/personas-tipos";

/**
 * El resultado de una acción del panel.
 *
 * `campo` (y `indiceRed` para las redes) dicen dónde está el fallo, para que el
 * formulario lo marque junto al campo y lleve el foco ahí en vez de dejar un
 * aviso suelto al final de un formulario largo.
 */
export type EstadoPersona = {
  ok: boolean;
  error?: string;
  detalle?: string;
  campo?: CampoPersona;
  indiceRed?: number;
  /** De la ficha guardada, para ofrecer el siguiente paso (publicar, verla). */
  id?: string;
  slug?: string;
  estado?: EstadoFicha;
};

export type CampoPersona =
  | "rol"
  | "nombre"
  | "titulo_profesional"
  | "slug"
  | "correo"
  | "telefono"
  | "biografia"
  | "foto"
  | "redes"
  | "estado";

const RE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RE_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAXIMO_BIOGRAFIA = 2000;

/**
 * El panel es de administración, así que esta comprobación está para dar un
 * mensaje claro. El permiso de verdad lo vuelve a comprobar RLS al escribir, y
 * las escrituras piden un contador para distinguir "no existe" de "te lo negaron".
 */
async function exigirAdmin(): Promise<EstadoPersona | null> {
  const usuario = await usuarioActual();
  if (!usuario) return { ok: false, error: "Tu sesión terminó. Entra de nuevo para guardar." };

  const perfil = await perfilActual();
  if (!perfil?.es_admin) {
    return { ok: false, error: "No tienes permiso para gestionar el equipo." };
  }
  return null;
}

function texto(datos: FormData, campo: string): string {
  return String(datos.get(campo) ?? "").trim();
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
  estado: EstadoFicha;
};

type Fallo = { ok: false; error: string; campo: CampoPersona };

/**
 * Valida el formulario y devuelve el primer campo que no cuadra, con un mensaje
 * que dice cómo arreglarlo. Un formulario de alta no debería aceptar un correo
 * roto y dejar que sea la base la que se queje.
 */
function leer(
  datos: FormData,
): { ok: true; valor: Lectura; roles: ReturnType<typeof rolesDesdeFormulario> } | Fallo {
  const roles = rolesDesdeFormulario(datos.getAll("rol"));
  const nombre = texto(datos, "nombre");
  const titulo = texto(datos, "titulo_profesional");
  const correo = texto(datos, "correo");
  const biografia = texto(datos, "biografia");
  const telefono = texto(datos, "telefono");
  const pais = texto(datos, "pais");
  const estadoCrudo = texto(datos, "estado");

  // El mismo orden en que aparecen en el formulario: el primer error que se
  // señala es el primero que se ve al subir.
  if (roles.length === 0) {
    return { ok: false, campo: "rol", error: "Marca al menos un rol." };
  }
  if (nombre.length < 2) {
    return { ok: false, campo: "nombre", error: "Escribe el nombre completo (mínimo 2 letras)." };
  }
  if (nombre.length > 120) {
    return { ok: false, campo: "nombre", error: "El nombre admite hasta 120 caracteres." };
  }
  if (titulo.length > 160) {
    return { ok: false, campo: "titulo_profesional", error: "El título admite hasta 160 caracteres." };
  }
  if (biografia.length > MAXIMO_BIOGRAFIA) {
    return {
      ok: false,
      campo: "biografia",
      error: `La biografía admite hasta ${MAXIMO_BIOGRAFIA} caracteres; tiene ${biografia.length}.`,
    };
  }
  if (correo && !RE_CORREO.test(correo)) {
    return { ok: false, campo: "correo", error: "Revisa el correo: debe verse como ana@gmail.com." };
  }
  if (telefono && telefono.replace(/[\s()+-]/g, "").length < 6) {
    return { ok: false, campo: "telefono", error: "El teléfono debe tener al menos 6 dígitos." };
  }

  // Si quien edita escribe su propia dirección se respeta; si la deja vacía se
  // deriva del nombre.
  const slug = texto(datos, "slug") || aSlug(nombre);
  if (!slug || !RE_SLUG.test(slug)) {
    return {
      ok: false,
      campo: "slug",
      error: "La dirección solo admite minúsculas sin tildes, números y guiones (ana-ramirez).",
    };
  }

  const estado = esEstadoFicha(estadoCrudo) ? estadoCrudo : "oculta";

  return {
    ok: true,
    roles,
    valor: { slug, nombre, titulo_profesional: titulo, correo, biografia, telefono, pais, estado },
  };
}

/**
 * Las filas de redes llegan como `red` y `red_url`, una por fila y en el mismo
 * orden. Se emparejan por posición: la fila vacía también viaja, así que un
 * hueco no corre el emparejamiento de las siguientes.
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

/** La foto elegida en el formulario, validada; `null` si no se eligió ninguna. */
function fotoDelFormulario(datos: FormData): { archivo: File | null } | Fallo {
  const archivo = datos.get("foto");
  if (!(archivo instanceof File) || archivo.size === 0) return { archivo: null };

  if (!(TIPOS_FOTO as readonly string[]).includes(archivo.type)) {
    return { ok: false, campo: "foto", error: "La foto tiene que ser JPG, PNG o WEBP." };
  }
  if (archivo.size > PESO_MAXIMO_FOTO) {
    return { ok: false, campo: "foto", error: "La foto pesa más de 2 MB. Redúcela y vuelve a elegirla." };
  }
  return { archivo };
}

function mensajeGuardado(nombre: string, estado: EstadoFicha, creada: boolean): string {
  // "Ficha de …" y no "… quedó dada de alta": el participio obligaría a
  // adivinar el género de la persona por su nombre.
  const accion = creada ? `Ficha de ${nombre} creada` : `Cambios guardados en la ficha de ${nombre}`;
  if (estado === "publicada") return `${accion}. Ya aparece en el sitio web.`;
  if (estado === "baja") return `${accion}. Figura como ex-integrante, fuera del sitio.`;
  return `${accion}. Está oculta: no aparece en el sitio web.`;
}

export async function crearPersona(
  _prev: EstadoPersona | null,
  formData: FormData,
): Promise<EstadoPersona> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  const lectura = leer(formData);
  if (!lectura.ok) return lectura;

  const limpias = limpiarRedes(redesDelFormulario(formData));
  if (limpias.error) {
    return { ok: false, campo: "redes", indiceRed: limpias.indice, error: limpias.error };
  }

  const foto = fotoDelFormulario(formData);
  if ("ok" in foto) return foto;

  const supabase = await clienteServidor();
  const { data: ocupado } = await supabase
    .from("personas")
    .select("id")
    .eq("slug", lectura.valor.slug)
    .maybeSingle();

  if (ocupado) {
    return {
      ok: false,
      campo: "slug",
      error: `Ya hay una ficha con la dirección «${lectura.valor.slug}». Cámbiala en «Dirección de la ficha».`,
    };
  }

  let fotoUrl: string | null = null;
  try {
    if (foto.archivo) fotoUrl = await subirFotoPersonaBD(lectura.valor.slug, foto.archivo);

    const id = await crearPersonaBD(
      {
        ...lectura.valor,
        ...banderasDeEstado(lectura.valor.estado),
        foto_url: fotoUrl,
        orden: await siguienteOrden(),
      },
      lectura.roles,
      limpias.redes,
    );

    return {
      ok: true,
      id,
      slug: lectura.valor.slug,
      estado: lectura.valor.estado,
      detalle: mensajeGuardado(lectura.valor.nombre, lectura.valor.estado, true),
    };
  } catch (e) {
    // La foto subió pero la ficha no: se retira para no dejar archivos sueltos.
    await borrarFotoPersonaBD(fotoUrl);
    registrarError("personas.crear", e);
    return { ok: false, error: (e as Error).message };
  }
}

export async function actualizarPersona(
  _prev: EstadoPersona | null,
  formData: FormData,
): Promise<EstadoPersona> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  const id = texto(formData, "id");
  if (!id) return { ok: false, error: "No se sabe a quién editar. Cierra el panel y vuelve a abrirlo." };

  const lectura = leer(formData);
  if (!lectura.ok) return lectura;

  const limpias = limpiarRedes(redesDelFormulario(formData));
  if (limpias.error) {
    return { ok: false, campo: "redes", indiceRed: limpias.indice, error: limpias.error };
  }

  const foto = fotoDelFormulario(formData);
  if ("ok" in foto) return foto;

  const supabase = await clienteServidor();
  const [{ data: otra }, { data: actual }] = await Promise.all([
    supabase.from("personas").select("id").eq("slug", lectura.valor.slug).neq("id", id).maybeSingle(),
    supabase.from("personas").select("foto_url").eq("id", id).maybeSingle(),
  ]);

  if (otra) {
    return {
      ok: false,
      campo: "slug",
      error: `La dirección «${lectura.valor.slug}» ya la usa otra ficha. Elige otra.`,
    };
  }

  const anterior = actual?.foto_url ?? null;
  const quitar = texto(formData, "quitar_foto") === "1";

  let nueva: string | null = null;
  try {
    if (foto.archivo) nueva = await subirFotoPersonaBD(lectura.valor.slug, foto.archivo);
    const fotoUrl = foto.archivo ? nueva : quitar ? null : anterior;

    await actualizarPersonaBD(
      id,
      { ...lectura.valor, ...banderasDeEstado(lectura.valor.estado), foto_url: fotoUrl },
      lectura.roles,
      limpias.redes,
    );

    if (anterior && anterior !== fotoUrl) await borrarFotoPersonaBD(anterior);
  } catch (e) {
    await borrarFotoPersonaBD(nueva);
    registrarError("personas.actualizar", e);
    return { ok: false, error: (e as Error).message };
  }

  return {
    ok: true,
    id,
    slug: lectura.valor.slug,
    estado: lectura.valor.estado,
    detalle: mensajeGuardado(lectura.valor.nombre, lectura.valor.estado, false),
  };
}

export async function eliminarPersona(id: string): Promise<EstadoPersona> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  if (!id) return { ok: false, error: "No se sabe a quién borrar." };

  const supabase = await clienteServidor();
  const { data } = await supabase.from("personas").select("nombre, foto_url").eq("id", id).maybeSingle();

  try {
    await eliminarPersonaBD(id);
    await borrarFotoPersonaBD(data?.foto_url ?? null);
  } catch (e) {
    registrarError("personas.eliminar", e);
    return { ok: false, error: (e as Error).message };
  }

  return { ok: true, detalle: `Se eliminó la ficha de ${data?.nombre ?? "la persona"}.` };
}

/**
 * Cambiar el estado sin entrar a editar: publicar, ocultar o dar de baja.
 *
 * Es el gesto más frecuente del panel y por eso va en su propia acción: si
 * compartiera la del guardado, quien publicara leería un "guardado" que en
 * realidad no ha guardado nada nuevo.
 */
export async function cambiarEstado(id: string, estado: EstadoFicha): Promise<EstadoPersona> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  if (!esEstadoFicha(estado)) return { ok: false, error: "Ese estado no existe." };

  try {
    await actualizarPersonaBD(id, banderasDeEstado(estado));
  } catch (e) {
    registrarError("personas.estado", e);
    return { ok: false, error: (e as Error).message };
  }

  const detalle: Record<EstadoFicha, string> = {
    publicada: "Ahora aparece en el sitio web.",
    oculta: "Oculta: ya no aparece en el sitio web. La ficha se conserva.",
    baja: "Marcada como ex-integrante: fuera del sitio web. La ficha se conserva.",
  };
  return { ok: true, id, estado, detalle: detalle[estado] };
}

export async function moverPersona(id: string, direccion: "arriba" | "abajo"): Promise<EstadoPersona> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  try {
    await moverPersonaBD(id, direccion === "arriba" ? "arriba" : "abajo");
  } catch (e) {
    registrarError("personas.mover", e);
    return { ok: false, error: (e as Error).message };
  }
  return { ok: true };
}
