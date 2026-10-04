import "server-only";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { esRolPersona, type RolPersona } from "@/lib/personas-tipos";
import { detectarRed, esRedNombre, ETIQUETA_RED, hostDe, normalizarUrl, type RedNombre } from "@/lib/redes";

/**
 * Las escrituras de `personas`.
 *
 * Viven aquí y no en el módulo del panel para que las Server Actions sean
 * finas, igual que ocurre con `rutas-bd`. Todas revalidan la portada y /equipo:
 * una persona dada de alta cambia lo que ve cualquiera que entre sin cuenta.
 */
function revalidarPersonas() {
  revalidatePath("/");
  revalidatePath("/equipo");
  revalidatePath("/panel/personas");
}

export type DatosPersona = {
  slug: string;
  nombre: string;
  titulo_profesional?: string | null;
  foto_url?: string | null;
  correo?: string | null;
  telefono?: string | null;
  pais?: string | null;
  biografia?: string | null;
  visible?: boolean;
  activo?: boolean;
  orden?: number;
};

/**
 * Escribe los roles y las redes de una persona, reemplazando lo anterior.
 *
 * Se borra y se vuelve a insertar en vez de differentials: son como diez filas
 * como mucho y el formulario es la fuente de verdad. Un `upsert` sobre
 * `personas_roles` dejaría los roles que se desmarcaron, que es justo el error
 * difícil de detectar.
 */
async function escribirRelaciones(
  personaId: string,
  roles: RolPersona[],
  redes: { red: RedNombre; url: string }[],
) {
  const supabase = await clienteServidor();

  const { error: eRoles } = await supabase.from("personas_roles").delete().eq("persona_id", personaId);
  if (eRoles) throw new Error(`No se pudieron cambiar los roles: ${eRoles.message}`);

  const { error: eRedes } = await supabase.from("personas_redes").delete().eq("persona_id", personaId);
  if (eRedes) throw new Error(`No se pudieron cambiar las redes: ${eRedes.message}`);

  if (roles.length > 0) {
    const { error } = await supabase.from("personas_roles").insert(
      roles.map((rol, i) => ({ persona_id: personaId, rol, orden: (i + 1) * 10 })),
    );
    if (error) throw new Error(`No se pudieron guardar los roles: ${error.message}`);
  }

  if (redes.length > 0) {
    const { error } = await supabase.from("personas_redes").insert(
      redes.map((red, i) => ({ persona_id: personaId, red: red.red, url: red.url, orden: (i + 1) * 10 })),
    );
    if (error) throw new Error(`No se pudieron guardar las redes: ${error.message}`);
  }
}

function sinNada(valor: string | null | undefined): string | null {
  const limpio = (valor ?? "").trim();
  return limpio === "" ? null : limpio;
}

export async function crearPersonaBD(
  datos: DatosPersona,
  roles: RolPersona[],
  redes: { red: RedNombre; url: string }[],
) {
  const supabase = await clienteServidor();

  const { data, error } = await supabase
    .from("personas")
    .insert({
      slug: datos.slug.trim().toLowerCase(),
      nombre: datos.nombre.trim(),
      titulo_profesional: sinNada(datos.titulo_profesional),
      foto_url: sinNada(datos.foto_url),
      correo: sinNada(datos.correo),
      telefono: sinNada(datos.telefono),
      pais: sinNada(datos.pais),
      biografia: sinNada(datos.biografia),
      visible: datos.visible ?? false,
      activo: datos.activo ?? true,
      orden: datos.orden ?? 50,
    })
    .select("id")
    .single();

  if (error) throw new Error(`No se pudo crear la persona: ${error.message}`);

  try {
    await escribirRelaciones(data.id, roles, redes);
  } catch (e) {
    // Una persona sin roles ni redes es un registro inútil. Antes de dejar la
    // ficha a medias, se retira la fila recién insertada. El fallo se propaga
    // igual, para que quien lo pidió vea el motivo real y no un "se creó" mudo.
    await supabase.from("personas").delete().eq("id", data.id);
    throw e;
  }

  revalidarPersonas();
  return data.id as string;
}

export async function actualizarPersonaBD(
  id: string,
  datos: Partial<DatosPersona>,
  roles?: RolPersona[],
  redes?: { red: RedNombre; url: string }[],
) {
  const supabase = await clienteServidor();

  const campos: Record<string, unknown> = {};

  if (datos.slug !== undefined) campos.slug = datos.slug.trim().toLowerCase();
  if (datos.nombre !== undefined) campos.nombre = datos.nombre.trim();
  if (datos.titulo_profesional !== undefined) campos.titulo_profesional = sinNada(datos.titulo_profesional);
  if (datos.foto_url !== undefined) campos.foto_url = sinNada(datos.foto_url);
  if (datos.correo !== undefined) campos.correo = sinNada(datos.correo);
  if (datos.telefono !== undefined) campos.telefono = sinNada(datos.telefono);
  if (datos.pais !== undefined) campos.pais = sinNada(datos.pais);
  if (datos.biografia !== undefined) campos.biografia = sinNada(datos.biografia);
  if (datos.visible !== undefined) campos.visible = datos.visible;
  if (datos.activo !== undefined) campos.activo = datos.activo;
  if (datos.orden !== undefined) campos.orden = datos.orden;

  // `count: "exact"` porque RLS no lanza error cuando le niegas una escritura:
  // simplemente no toca ninguna fila. Sin el contador, un "no autorizado"
  // pasaría por un guardado correcto.
  const { count, error } = await supabase
    .from("personas")
    .update(campos, { count: "exact" })
    .eq("id", id);

  if (error) throw new Error(`No se pudo actualizar: ${error.message}`);
  if (count === 0) throw new Error("No se encontró esa persona, o no tienes permiso.");

  if (roles && redes) await escribirRelaciones(id, roles, redes);

  revalidarPersonas();
}

export async function eliminarPersonaBD(id: string) {
  const supabase = await clienteServidor();

  // `personas_roles` y `personas_redes` caen en cascada desde `personas`, así
  // que una sola operación basta. El contador distingue "no estaba" de "RLS te
  // lo negó sin avisar".
  const { count, error } = await supabase
    .from("personas")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) throw new Error(`No se pudo eliminar: ${error.message}`);
  if (count === 0) throw new Error("No se encontró esa persona, o no tienes permiso.");

  revalidarPersonas();
}

/**
 * Valida las redes que llegan del formulario.
 *
 * Una fila sin enlace se ignora: es una fila vacía, no un error. El enlace se
 * completa con `https://` si no lo trae, y si no se eligió la red se deduce del
 * dominio. Dos filas con la misma red sí son un error y se avisa: antes la
 * segunda desaparecía sin decir nada.
 *
 * `indice` señala la fila del fallo para que el panel la marque.
 */
export function limpiarRedes(
  crudas: { red: string; url: string }[],
): { redes: { red: RedNombre; url: string }[]; error?: string; indice?: number } {
  const redes: { red: RedNombre; url: string }[] = [];
  const vistas = new Set<RedNombre>();

  for (const [indice, cruda] of crudas.entries()) {
    const url = normalizarUrl(cruda.url);
    if (!url) continue;

    if (!hostDe(url)) {
      return { redes: [], indice, error: `«${cruda.url.trim()}» no parece un enlace.` };
    }

    // El nombre viene del `value` del select, que el navegador puede alterar a
    // voluntad; la base lo vuelve a comprobar en el `check`.
    const red = esRedNombre(cruda.red) ? cruda.red : detectarRed(url);
    if (!red) {
      return { redes: [], indice, error: "Elige de qué red es este enlace." };
    }
    if (vistas.has(red)) {
      return { redes: [], indice, error: `${ETIQUETA_RED[red]} está dos veces. Deja un solo enlace.` };
    }

    vistas.add(red);
    redes.push({ red, url });
  }

  return { redes };
}

/** El orden que deja a una persona nueva al final del censo. */
export async function siguienteOrden(): Promise<number> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("personas")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.orden ?? 0) + 10;
}

/**
 * Sube o baja a una persona un puesto en el orden del panel y de la web.
 *
 * Se renumera todo el censo de 10 en 10 en vez de intercambiar dos valores: con
 * órdenes repetidos (el 50 por defecto de antes) un intercambio no movería
 * nada. Solo se escriben las filas cuyo número cambia.
 */
export async function moverPersonaBD(id: string, direccion: "arriba" | "abajo") {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("personas")
    .select("id, orden, nombre")
    .order("orden")
    .order("nombre");
  if (error) throw new Error(`No se pudo leer el orden: ${error.message}`);

  const filas = data ?? [];
  const desde = filas.findIndex((fila) => fila.id === id);
  if (desde === -1) throw new Error("No se encontró esa persona, o no tienes permiso.");

  const hasta = direccion === "arriba" ? desde - 1 : desde + 1;
  if (hasta < 0 || hasta >= filas.length) return;

  const nuevas = [...filas];
  [nuevas[desde], nuevas[hasta]] = [nuevas[hasta], nuevas[desde]];

  for (const [posicion, fila] of nuevas.entries()) {
    const orden = (posicion + 1) * 10;
    if (fila.orden === orden) continue;
    const { error: eOrden } = await supabase.from("personas").update({ orden }).eq("id", fila.id);
    if (eOrden) throw new Error(`No se pudo guardar el orden: ${eOrden.message}`);
  }

  revalidarPersonas();
}

const BUCKET_FOTOS = "personas-fotos";

/**
 * Sube el retrato al bucket y devuelve su dirección pública.
 *
 * El nombre lleva la marca de tiempo para que el navegador no siga mostrando la
 * foto anterior desde su caché al reemplazarla.
 */
export async function subirFotoPersonaBD(slug: string, archivo: File): Promise<string> {
  const supabase = await clienteServidor();
  const extension = archivo.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const ruta = `${slug}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .upload(ruta, archivo, { contentType: archivo.type });
  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);

  return supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta).data.publicUrl;
}

/**
 * Borra del bucket una foto que ya no usa nadie. Si la dirección no es de este
 * bucket (una foto enlazada desde fuera) no hay nada que borrar. Un fallo aquí
 * no debe deshacer el guardado: deja un archivo huérfano, no una ficha rota.
 */
export async function borrarFotoPersonaBD(url: string | null) {
  if (!url) return;
  const marca = `/${BUCKET_FOTOS}/`;
  const posicion = url.indexOf(marca);
  if (posicion === -1) return;

  const supabase = await clienteServidor();
  await supabase.storage.from(BUCKET_FOTOS).remove([decodeURIComponent(url.slice(posicion + marca.length))]);
}

export function rolesDesdeFormulario(valores: FormDataEntryValue[]): RolPersona[] {
  return valores.filter(esRolPersona);
}