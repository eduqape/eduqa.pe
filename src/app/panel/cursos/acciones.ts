"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parse as parseYaml } from "yaml";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { codigoBaseDeFicha, construirCurso } from "@/lib/curso-markdown";
import { esIconoCurso } from "@/lib/iconos-curso";
import { huella } from "@/lib/cursos-panel";
import {
  NOMBRE_ARCHIVO,
  comoAdministrador,
  comprobarImagenes,
  editarFrontmatter,
  materialDe,
  validarMaterial,
  type Material,
  type Supabase,
} from "./material";
import {
  BUCKET_IMAGENES_CURSO,
  MAX_BYTES_IMAGEN,
  firmaImagenValida,
  imagenesReferenciadas,
  nombreImagenValido,
  rutaEnBucket,
  tipoImagen,
} from "@/lib/imagenes-curso";

export type EstadoPublicacion = { ok: boolean; error?: string; detalle?: string; slug?: string };

export type ResultadoArchivo =
  | { ok: true; mensaje: string; huella: string; aviso?: string }
  | { ok: false; error: string; conflicto?: boolean };

// Los mismos que admite la restricción `cursos_estado_valido` de la base.
type EstadoCurso = "borrador" | "privado" | "publico";

type Publicacion = {
  precio: number;
  estado: EstadoCurso;
  accesoLibre: boolean;
  orden: number;
  ruta?: {
    slug: string;
    nombre: string;
    descripcion: string | null;
    orden: number;
    posicion: number;
    requisitos: string[];
  };
};

/** Devuelve el frontmatter de un archivo Markdown, o {} si no lo lleva. */
function frontmatter(texto: string): Record<string, unknown> {
  const limpio = texto.replace(/^﻿/, "");
  if (!limpio.startsWith("---")) return {};
  const cierre = limpio.indexOf("\n---", 3);
  if (cierre === -1) return {};
  return (parseYaml(limpio.slice(3, cierre)) ?? {}) as Record<string, unknown>;
}

function numero(valor: unknown, porDefecto: number) {
  if (valor === undefined || valor === null || valor === "") return porDefecto;
  return Number(valor);
}

function booleano(valor: unknown, porDefecto: boolean) {
  if (valor === undefined || valor === null || valor === "") return porDefecto;
  if (typeof valor === "boolean") return valor;
  if (valor === "true") return true;
  if (valor === "false") return false;
  return undefined;
}

/**
 * Invalida únicamente las vistas que pueden reflejar la ficha o el contenido.
 *
 * El curso no necesita un nuevo build: la siguiente petición vuelve a resolver
 * el catálogo y el Markdown desde Supabase.
 */
function revalidarCursoPublicado(slug: string, ruta?: string) {
  revalidatePath("/");
  revalidatePath("/cursos");
  revalidatePath("/catalogo");
  revalidatePath(`/catalogo/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/panel");
  revalidatePath("/panel/cursos");
  revalidatePath(`/panel/cursos/${slug}`, "layout");
  revalidatePath("/compras");
  revalidatePath(`/pagar/${slug}`);
  revalidatePath(`/cursos/${slug}`, "layout");
  if (ruta) revalidatePath(`/rutas/${ruta}`);
}

function leerPublicacion(
  ficha: Record<string, unknown>,
  existente?: {
    precio: number;
    estado: string;
    acceso_libre: boolean;
    orden: number;
    posicion: number | null;
    requisitos: string[];
  } | null,
): { publicacion?: Publicacion; error?: string } {
  const precio = numero(ficha.precio, existente?.precio ?? 20);
  const orden = numero(ficha.orden, existente?.orden ?? 99);
  const estado = String(ficha.estado ?? existente?.estado ?? "borrador") as EstadoCurso;
  const accesoLibre = booleano(ficha.acceso_libre, existente?.acceso_libre ?? false);

  if (!Number.isFinite(precio) || precio < 0) return { error: "El precio de curso.md no es válido." };
  if (!Number.isInteger(orden) || orden < 0) return { error: "El orden de curso.md no es válido." };
  if (accesoLibre === undefined) {
    return { error: "acceso_libre debe ser true o false." };
  }
  if (!["borrador", "privado", "publico"].includes(estado)) {
    return { error: "El estado debe ser borrador, privado o publico." };
  }

  const rutaCruda = ficha.ruta;
  if (rutaCruda === undefined || rutaCruda === null) {
    return { publicacion: { precio, estado, accesoLibre, orden } };
  }
  if (typeof rutaCruda !== "object" || Array.isArray(rutaCruda)) {
    return { error: "La ruta de curso.md debe ser un objeto YAML." };
  }

  const ruta = rutaCruda as Record<string, unknown>;
  const slug = String(ruta.slug ?? "").trim();
  const nombre = String(ruta.nombre ?? "").trim();
  const descripcion = String(ruta.descripcion ?? "").trim() || null;
  const ordenRuta = numero(ruta.orden, 99);
  const posicion = numero(ruta.posicion, existente?.posicion ?? 1);
  if (ruta.requisitos !== undefined && !Array.isArray(ruta.requisitos)) {
    return { error: "Los requisitos de la ruta deben ser una lista YAML." };
  }
  const requisitos = Array.isArray(ruta.requisitos)
    ? [...new Set(ruta.requisitos.map((r) => String(r).trim()).filter(Boolean))]
    : existente?.requisitos ?? [];

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { error: "El slug de la ruta solo admite minúsculas, números y guiones." };
  }
  if (nombre.length < 3) return { error: "La ruta necesita un nombre." };
  if (!Number.isInteger(ordenRuta) || ordenRuta < 0) {
    return { error: "El orden de la ruta no es válido." };
  }
  if (!Number.isInteger(posicion) || posicion < 1) {
    return { error: "La posición del curso dentro de la ruta no es válida." };
  }
  if (requisitos.some((requisito) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requisito))) {
    return { error: "Cada requisito debe ser el slug válido de otro curso." };
  }

  return {
    publicacion: {
      precio,
      estado,
      accesoLibre,
      orden,
      ruta: { slug, nombre, descripcion, orden: ordenRuta, posicion, requisitos },
    },
  };
}

/**
 * Publica o actualiza un curso guardando su Markdown en la base.
 *
 * A partir de aquí la aplicación lo sirve leyéndolo de la base, así que
 * corregir una errata o añadir una sesión no obliga a desplegar.
 *
 * La acción comprueba que el usuario sea administrador y las políticas RLS
 * vuelven a comprobarlo al escribir. También se valida que los archivos sean
 * los esperados y que el temario se pueda construir.
 */
export async function publicarCurso(
  _prev: EstadoPublicacion | null,
  formData: FormData,
): Promise<EstadoPublicacion> {
  const usuario = await usuarioActual();
  if (!usuario) return { ok: false, error: "Entra a tu cuenta primero." };

  const supabase = await clienteServidor();
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("es_admin")
    .eq("id", usuario.id)
    .maybeSingle();
  if (!perfil?.es_admin) {
    return { ok: false, error: "No tienes permiso para publicar cursos." };
  }

  const subidos = formData.getAll("archivos").filter((f): f is File => f instanceof File);
  if (subidos.length === 0) return { ok: false, error: "No llegó ningún archivo." };

  const archivos = new Map<string, string>();
  const imagenes = new Map<string, { tipo: string; bytes: Uint8Array }>();
  for (const f of subidos) {
    if (f.name.endsWith(".md")) {
      archivos.set(f.name, await f.text());
      continue;
    }
    const tipo = tipoImagen(f.name);
    if (!tipo) {
      return { ok: false, error: `«${f.name}» no es un archivo .md ni una imagen PNG, JPG, WebP o GIF.` };
    }
    if (!nombreImagenValido(f.name)) {
      return { ok: false, error: `«${f.name}»: el nombre de una imagen solo admite letras, números, punto, guion y guion bajo.` };
    }
    if (f.size > MAX_BYTES_IMAGEN) {
      return { ok: false, error: `«${f.name}» supera los 2 MB por imagen.` };
    }
    const bytes = new Uint8Array(await f.arrayBuffer());
    if (!firmaImagenValida(bytes, tipo)) {
      return { ok: false, error: `«${f.name}» no tiene el formato que indica su extensión.` };
    }
    imagenes.set(f.name, { tipo, bytes });
  }

  if (!archivos.has("curso.md")) {
    return { ok: false, error: "Falta curso.md, que es la ficha del curso." };
  }
  if (archivos.size < 2) {
    return { ok: false, error: "Un curso necesita al menos una sesión además de la ficha." };
  }

  const ficha = frontmatter(archivos.get("curso.md")!);
  const slug = String(ficha.slug ?? "").trim();
  if (!slug) return { ok: false, error: "La ficha no declara un slug." };
  let codigoBase: string | null;
  try {
    codigoBase = codigoBaseDeFicha(archivos.get("curso.md")!);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!esIconoCurso(ficha.icono)) {
    return { ok: false, error: "Todo curso debe declarar un icono válido en curso.md." };
  }

  // Se construye antes de guardar. Si el temario está mal escrito, el error
  // se ve aquí y no cuando un alumno abra la página.
  let curso;
  try {
    curso = construirCurso(slug, archivos);
  } catch (e) {
    return { ok: false, error: `El curso no se pudo leer: ${(e as Error).message}` };
  }

  // Cada imagen relativa que cite el Markdown debe llegar en este envío o
  // estar ya en el bucket. Se comprueba antes de escribir nada: una sesión
  // publicada no puede quedar apuntando a una figura que no existe.
  const citadas = new Map<string, string>();
  for (const [archivo, texto] of archivos) {
    for (const ruta of imagenesReferenciadas(texto)) {
      const destino = rutaEnBucket(slug, ruta);
      if (!destino) {
        return {
          ok: false,
          error: `${archivo} cita «${ruta}». Las imágenes del curso se citan como imagenes/nombre.png.`,
        };
      }
      citadas.set(destino.slice(destino.lastIndexOf("/") + 1), archivo);
    }
  }
  const faltantes = [...citadas.keys()].filter((nombre) => !imagenes.has(nombre));
  if (faltantes.length > 0) {
    const { data: enBucket, error: eListar } = await supabase.storage
      .from(BUCKET_IMAGENES_CURSO)
      .list(`${slug}/imagenes`, { limit: 1000 });
    if (eListar) return { ok: false, error: `No se pudieron comprobar las imágenes del curso: ${eListar.message}` };
    const existentes = new Set((enBucket ?? []).map((o) => o.name));
    const ausentes = faltantes.filter((nombre) => !existentes.has(nombre));
    if (ausentes.length > 0) {
      return {
        ok: false,
        error: `Faltan imágenes: ${ausentes.map((n) => `${n} (en ${citadas.get(n)})`).join(", ")}. Súbelas junto con el Markdown.`,
      };
    }
  }

  const { data: existe, error: eExiste } = await supabase
    .from("cursos")
    .select("slug, codigo_base, precio, estado, acceso_libre, orden, ruta, posicion, requisitos")
    .eq("slug", slug)
    .maybeSingle();
  if (eExiste) return { ok: false, error: `No se pudo leer la ficha actual: ${eExiste.message}` };
  if (!existe && !codigoBase) {
    return { ok: false, error: "Un curso nuevo debe declarar codigo: ABCD en curso.md." };
  }
  if (existe && codigoBase && codigoBase !== existe.codigo_base) {
    return { ok: false, error: `El código de este curso es ${existe.codigo_base} y no cambia al republicarlo.` };
  }

  const { publicacion, error: errorPublicacion } = leerPublicacion(ficha, existe);
  if (!publicacion) return { ok: false, error: errorPublicacion };

  // El índice se deriva del mismo Markdown, así que no puede quedarse
  // desfasado respecto al contenido.
  const indice = [...archivos.entries()]
    .filter(([archivo]) => archivo !== "curso.md")
    .map(([archivo, texto]) => {
      const f = frontmatter(texto);
      const numero = Number(f.numero);
      return {
        archivo,
        numero,
        titulo: String(f.titulo ?? ""),
        slug: String(f.slug ?? `sesion-${numero}`),
      };
    });

  // Las imágenes se suben antes que el Markdown que las cita.
  for (const [nombre, { tipo, bytes }] of imagenes) {
    const { error: eImagen } = await supabase.storage
      .from(BUCKET_IMAGENES_CURSO)
      .upload(`${slug}/imagenes/${nombre}`, bytes, { contentType: tipo, upsert: true });
    if (eImagen) return { ok: false, error: `No se pudo subir «${nombre}»: ${eImagen.message}` };
  }

  if (publicacion.ruta) {
    const { error: eRuta } = await supabase.from("rutas").upsert(
      {
        slug: publicacion.ruta.slug,
        nombre: publicacion.ruta.nombre,
        descripcion: publicacion.ruta.descripcion,
        orden: publicacion.ruta.orden,
      },
      { onConflict: "slug" },
    );
    if (eRuta) return { ok: false, error: `No se pudo guardar la ruta: ${eRuta.message}` };
  }

  // El slug identifica al curso que llega en Markdown; dentro de la base todo
  // se ata a su id (#112).
  const { data: guardado, error: eCurso } = await supabase.from("cursos").upsert(
    {
      slug,
      codigo_base: codigoBase ?? existe?.codigo_base,
      titulo: curso.titulo,
      resumen: curso.resumen,
      precio: publicacion.precio,
      estado: publicacion.estado,
      acceso_libre: publicacion.accesoLibre,
      orden: publicacion.orden,
      ruta: publicacion.ruta?.slug ?? existe?.ruta ?? null,
      posicion: publicacion.ruta?.posicion ?? existe?.posicion ?? null,
      requisitos: publicacion.ruta?.requisitos ?? existe?.requisitos ?? [],
    },
    { onConflict: "slug" },
  ).select("id").single();
  if (eCurso || !guardado) {
    return { ok: false, error: `No se pudo guardar la ficha: ${eCurso?.message ?? "sin respuesta"}` };
  }
  const cursoId = guardado.id as string;

  const contenido = [...archivos.entries()].map(([archivo, texto]) => ({
    curso_id: cursoId,
    archivo,
    contenido: texto,
  }));
  const { error: eContenido } = await supabase
    .from("curso_contenido")
    .upsert(contenido, { onConflict: "curso_id,archivo" });
  if (eContenido) return { ok: false, error: `No se pudo guardar el material: ${eContenido.message}` };

  const { error: eIndice } = await supabase
    .from("curso_sesiones")
    .upsert(
      indice.map((fila) => ({ ...fila, curso_id: cursoId })),
      { onConflict: "curso_id,archivo" },
    );
  if (eIndice) return { ok: false, error: `No se pudo guardar el temario: ${eIndice.message}` };

  // Lo nuevo se guarda antes de retirar lo antiguo. Si falla una escritura,
  // el alumno conserva la versión anterior en vez de encontrar un curso vacío.
  const nombresContenido = new Set(contenido.map((fila) => fila.archivo));
  const { data: contenidoActual, error: eLeerContenido } = await supabase
    .from("curso_contenido")
    .select("archivo")
    .eq("curso_id", cursoId);
  if (eLeerContenido) {
    return { ok: false, error: `No se pudo comprobar el material guardado: ${eLeerContenido.message}` };
  }
  const contenidoObsoleto = (contenidoActual ?? [])
    .map((fila) => fila.archivo)
    .filter((archivo) => !nombresContenido.has(archivo));
  if (contenidoObsoleto.length > 0) {
    const { error: eBorrarContenido } = await supabase
      .from("curso_contenido")
      .delete()
      .eq("curso_id", cursoId)
      .in("archivo", contenidoObsoleto);
    if (eBorrarContenido) {
      return { ok: false, error: `No se pudo retirar material antiguo: ${eBorrarContenido.message}` };
    }
  }

  const nombresSesiones = new Set(indice.map((fila) => fila.archivo));
  const { data: sesionesActuales, error: eLeerSesiones } = await supabase
    .from("curso_sesiones")
    .select("archivo")
    .eq("curso_id", cursoId);
  if (eLeerSesiones) {
    return { ok: false, error: `No se pudo comprobar el temario guardado: ${eLeerSesiones.message}` };
  }
  const sesionesObsoletas = (sesionesActuales ?? [])
    .map((fila) => fila.archivo)
    .filter((archivo) => !nombresSesiones.has(archivo));
  if (sesionesObsoletas.length > 0) {
    const { error: eBorrarSesiones } = await supabase
      .from("curso_sesiones")
      .delete()
      .eq("curso_id", cursoId)
      .in("archivo", sesionesObsoletas);
    if (eBorrarSesiones) {
      return { ok: false, error: `No se pudo retirar el temario antiguo: ${eBorrarSesiones.message}` };
    }
  }

  const { data: codigoPublicado, error: eRevision } = await supabase
    .rpc("registrar_revision_curso", { p_slug: slug });
  if (eRevision) {
    return { ok: false, error: `El material se guardó, pero no se pudo registrar su revisión: ${eRevision.message}` };
  }

  revalidarCursoPublicado(slug, publicacion.ruta?.slug ?? existe?.ruta ?? undefined);

  return {
    ok: true,
    slug,
    detalle: `«${curso.titulo}» (${codigoPublicado}): ${curso.lecciones.length} sesiones guardadas${
      imagenes.size > 0 ? ` y ${imagenes.size} imágenes` : ""
    }${
      publicacion.ruta ? ` en la ruta «${publicacion.ruta.nombre}»` : ""
    }. Ya está en línea, sin desplegar.`,
  };
}

/**
 * Crea un curso vacío y lo deja listo para escribir.
 *
 * Nace en borrador y con una sesión de ejemplo dentro: un curso sin ninguna
 * sesión no se puede abrir, y una pantalla que da error nada más crear algo
 * es peor que una que enseña por dónde se empieza.
 *
 * Quien lo crea queda como su autor, cosa que hace un disparador de la base:
 * si dependiera de esta función, un curso creado por otro camino se quedaría
 * sin responsable.
 */
export async function crearCurso(
  _prev: EstadoPublicacion | null,
  formData: FormData,
): Promise<EstadoPublicacion> {
  const usuario = await usuarioActual();
  if (!usuario) return { ok: false, error: "Entra a tu cuenta primero." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  const codigoBase = String(formData.get("codigo") ?? "").trim().toUpperCase();
  const area = String(formData.get("area") ?? "").trim();
  const nivel = String(formData.get("nivel") ?? "INTRODUCCIÓN").trim();
  const icono = String(formData.get("icono") ?? "").trim();
  const horas = Number(formData.get("horas") ?? 16);
  const precio = Number(formData.get("precio") ?? 20);

  if (titulo.length < 4) return { ok: false, error: "El título es muy corto." };
  if (!/^[A-Z]{4}$/.test(codigoBase)) {
    return { ok: false, error: "El código debe tener exactamente cuatro letras (por ejemplo, INPY)." };
  }
  if (!area) return { ok: false, error: "Elige un área." };
  if (!esIconoCurso(icono)) return { ok: false, error: "Elige un icono válido para el curso." };
  if (!Number.isFinite(horas) || horas <= 0) return { ok: false, error: "Las horas no son válidas." };
  if (!Number.isFinite(precio) || precio < 0) return { ok: false, error: "El precio no es válido." };

  // El slug sale del título: sin tildes, en minúsculas y con guiones.
  const slug = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (!slug) return { ok: false, error: "Con ese título no sale una dirección válida." };

  const supabase = await clienteServidor();

  const { data: ocupado } = await supabase
    .from("cursos")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (ocupado) return { ok: false, error: `Ya existe un curso en /${slug}.` };

  const { data: codigoOcupado, error: eCodigo } = await supabase
    .from("cursos")
    .select("slug")
    .eq("codigo_base", codigoBase)
    .maybeSingle();
  if (eCodigo) return { ok: false, error: `No se pudo comprobar el código: ${eCodigo.message}` };
  if (codigoOcupado) return { ok: false, error: `${codigoBase} ya pertenece a otro curso.` };

  const { data: creado, error: eCurso } = await supabase.from("cursos").insert({
    slug,
    codigo_base: codigoBase,
    titulo,
    resumen: "",
    precio,
    estado: "borrador",
    acceso_libre: false,
    orden: 99,
  }).select("id").single();
  if (eCurso || !creado) {
    return { ok: false, error: `No se pudo crear: ${eCurso?.message ?? "sin respuesta"}` };
  }

  const fichaMd = [
    "---",
    `slug: ${slug}`,
    `codigo: ${codigoBase}`,
    `titulo: ${JSON.stringify(titulo)}`,
    'resumen: "Escribe aquí de qué va el curso y para quién es."',
    `area: ${JSON.stringify(area)}`,
    `nivel: ${JSON.stringify(nivel)}`,
    `horas: ${horas}`,
    `icono: ${icono}`,
    "---",
    "",
  ].join("\n");

  const sesionMd = [
    "---",
    "numero: 1",
    'titulo: "Primera sesión"',
    "---",
    "",
    "# Empieza por aquí",
    "",
    "Sustituye este texto. Cada encabezado abre una sección del temario y",
    "aparece en el índice lateral.",
    "",
    "```python",
    'print("hola")',
    "```",
    "",
  ].join("\n");

  const { error: eContenido } = await supabase.from("curso_contenido").insert([
    { curso_id: creado.id, archivo: "curso.md", contenido: fichaMd },
    { curso_id: creado.id, archivo: "sesion-1.md", contenido: sesionMd },
  ]);
  if (eContenido) return { ok: false, error: `No se pudo guardar el esqueleto: ${eContenido.message}` };

  const { error: eIndice } = await supabase.from("curso_sesiones").insert({
    curso_id: creado.id,
    archivo: "sesion-1.md",
    numero: 1,
    titulo: "Primera sesión",
    slug: "sesion-1",
  });
  if (eIndice) return { ok: false, error: `No se pudo guardar el temario: ${eIndice.message}` };

  const { error: eRevision } = await supabase.rpc("registrar_revision_curso", { p_slug: slug });
  if (eRevision) return { ok: false, error: `No se pudo registrar la revisión: ${eRevision.message}` };

  revalidarCursoPublicado(slug);

  // Se abre directamente el curso recién creado: quien lo crea viene a
  // escribirlo, no a volver al listado a buscarlo.
  redirect(`/panel/cursos/${slug}?creado=1`);
}

/* ------------------------------------------------------------------------ */
/* Edición en el navegador, archivo por archivo                              */
/* ------------------------------------------------------------------------ */

/** Escribe el índice, la revisión y las vistas después de cambiar material. */
async function cerrarCambio(supabase: Supabase, material: Material) {
  const { error } = await supabase.rpc("registrar_revision_curso", { p_slug: material.curso.slug });
  revalidarCursoPublicado(material.curso.slug, material.curso.ruta ?? undefined);
  return error ? `El cambio se guardó, pero no se pudo registrar la revisión: ${error.message}` : null;
}

/**
 * Guarda un solo archivo (la ficha o una sesión) escrito en el editor.
 *
 * `base` es la huella del texto que el editor abrió. Si en la base ya hay otro
 * texto, alguien lo cambió entretanto y se rechaza en lugar de pisarlo.
 */
export async function guardarArchivoCurso(
  slug: string,
  archivo: string,
  contenido: string,
  base: string,
): Promise<ResultadoArchivo> {
  const acceso = await comoAdministrador();
  if ("error" in acceso) return { ok: false, error: acceso.error };
  const { supabase } = acceso;

  if (!NOMBRE_ARCHIVO.test(archivo)) return { ok: false, error: "El nombre del archivo no es válido." };
  if (contenido.length > 400_000) return { ok: false, error: "El archivo supera los 400 000 caracteres. Divide la sesión en dos." };

  const material = await materialDe(supabase, slug);
  if ("error" in material) return { ok: false, error: material.error };

  const anterior = material.archivos.get(archivo);
  if (anterior === undefined) return { ok: false, error: "Este archivo ya no existe en el curso. Puede que lo hayan eliminado." };
  if (huella(anterior) !== base) {
    return {
      ok: false,
      conflicto: true,
      error: "Alguien guardó otra versión de este archivo mientras lo editabas. Copia tus cambios y recarga para no perder ninguno de los dos.",
    };
  }
  if (anterior === contenido) return { ok: true, mensaje: "No había cambios que guardar.", huella: base };

  material.archivos.set(archivo, contenido);
  const valido = validarMaterial(slug, material.curso.codigo_base, material.archivos);
  if ("error" in valido) return { ok: false, error: valido.error };

  const faltan = await comprobarImagenes(supabase, slug, archivo, contenido);
  if (faltan) return { ok: false, error: faltan };

  // La ficha también decide precio, estado y ruta, igual que al importarla.
  // Se valida antes de escribir nada.
  let publicacion: Publicacion | undefined;
  if (archivo === "curso.md") {
    const { data: existente, error: eExistente } = await supabase
      .from("cursos")
      .select("precio, estado, acceso_libre, orden, posicion, requisitos")
      .eq("id", material.curso.id)
      .single();
    if (eExistente) return { ok: false, error: `No se pudo leer la ficha actual: ${eExistente.message}` };
    const leida = leerPublicacion(frontmatter(contenido), existente);
    if (!leida.publicacion) return { ok: false, error: leida.error ?? "La ficha no es válida." };
    publicacion = leida.publicacion;
  }

  const { error: eContenido } = await supabase
    .from("curso_contenido")
    .upsert({ curso_id: material.curso.id, archivo, contenido }, { onConflict: "curso_id,archivo" });
  if (eContenido) return { ok: false, error: `No se pudo guardar: ${eContenido.message}` };

  let aviso: string | undefined;
  if (publicacion) {
    if (publicacion.ruta) {
      const { error: eRuta } = await supabase.from("rutas").upsert(
        {
          slug: publicacion.ruta.slug,
          nombre: publicacion.ruta.nombre,
          descripcion: publicacion.ruta.descripcion,
          orden: publicacion.ruta.orden,
        },
        { onConflict: "slug" },
      );
      if (eRuta) return { ok: false, error: `El archivo se guardó, pero no la ruta: ${eRuta.message}` };
    }
    // Título y resumen de la ficha son los del catálogo: la fila y el
    // Markdown dicen siempre lo mismo.
    const { error: eFicha } = await supabase
      .from("cursos")
      .update({
        titulo: valido.curso.titulo,
        resumen: valido.curso.resumen,
        precio: publicacion.precio,
        estado: publicacion.estado,
        acceso_libre: publicacion.accesoLibre,
        orden: publicacion.orden,
        ...(publicacion.ruta
          ? { ruta: publicacion.ruta.slug, posicion: publicacion.ruta.posicion, requisitos: publicacion.ruta.requisitos }
          : {}),
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", material.curso.id);
    if (eFicha) return { ok: false, error: `El archivo se guardó, pero no la ficha: ${eFicha.message}` };
    material.curso.estado = publicacion.estado;
    if (publicacion.ruta) material.curso.ruta = publicacion.ruta.slug;
  } else {
    const fila = valido.indice.find((f) => f.archivo === archivo)!;
    const { error: eIndice } = await supabase
      .from("curso_sesiones")
      .upsert({ ...fila, curso_id: material.curso.id }, { onConflict: "curso_id,archivo" });
    if (eIndice) return { ok: false, error: `El archivo se guardó, pero no el temario: ${eIndice.message}` };

    const antes = frontmatter(anterior);
    const slugAntes = String(antes.slug ?? `sesion-${Number(antes.numero)}`);
    if (slugAntes !== fila.slug && material.curso.estado === "publico") {
      aviso = `La sesión cambió de dirección (/${slugAntes} → /${fila.slug}). Los enlaces antiguos y el avance guardado de los alumnos apuntaban a la anterior.`;
    }
  }

  const errorRevision = await cerrarCambio(supabase, material);
  if (errorRevision) return { ok: false, error: errorRevision };

  return {
    ok: true,
    mensaje: material.curso.estado === "publico" ? "Guardado y publicado: los alumnos ya lo ven." : "Guardado.",
    huella: huella(contenido),
    aviso,
  };
}

/** Añade una sesión al final del curso con una plantilla y devuelve su archivo. */
export async function crearSesion(slug: string): Promise<{ ok: true; archivo: string } | { ok: false; error: string }> {
  const acceso = await comoAdministrador();
  if ("error" in acceso) return { ok: false, error: acceso.error };
  const { supabase } = acceso;

  const material = await materialDe(supabase, slug);
  if ("error" in material) return { ok: false, error: material.error };

  const numeros = [...material.archivos.entries()]
    .filter(([archivo]) => archivo !== "curso.md")
    .map(([, texto]) => Number(frontmatter(texto).numero))
    .filter(Number.isInteger);
  const siguiente = Math.max(0, ...numeros) + 1;
  let archivo = `sesion-${siguiente}.md`;
  for (let n = 2; material.archivos.has(archivo); n++) archivo = `sesion-${siguiente}-${n}.md`;

  const texto = [
    "---",
    `numero: ${siguiente}`,
    `titulo: "Sesión ${siguiente}"`,
    "---",
    "",
    "# Primer punto",
    "",
    "Cada encabezado abre una sección del temario y aparece en el índice lateral.",
    "",
  ].join("\n");

  material.archivos.set(archivo, texto);
  const valido = validarMaterial(slug, material.curso.codigo_base, material.archivos);
  if ("error" in valido) return { ok: false, error: valido.error };

  const { error: eContenido } = await supabase
    .from("curso_contenido")
    .insert({ curso_id: material.curso.id, archivo, contenido: texto });
  if (eContenido) return { ok: false, error: `No se pudo crear la sesión: ${eContenido.message}` };
  const fila = valido.indice.find((f) => f.archivo === archivo)!;
  const { error: eIndice } = await supabase.from("curso_sesiones").insert({ ...fila, curso_id: material.curso.id });
  if (eIndice) return { ok: false, error: `No se pudo añadir al temario: ${eIndice.message}` };

  const errorRevision = await cerrarCambio(supabase, material);
  if (errorRevision) return { ok: false, error: errorRevision };
  return { ok: true, archivo };
}

/** Quita una sesión. Un curso conserva siempre al menos una. */
export async function eliminarSesion(slug: string, archivo: string): Promise<{ ok: boolean; error?: string }> {
  const acceso = await comoAdministrador();
  if ("error" in acceso) return { ok: false, error: acceso.error };
  const { supabase } = acceso;

  if (archivo === "curso.md") return { ok: false, error: "La ficha no se elimina: sin ella no hay curso." };
  const material = await materialDe(supabase, slug);
  if ("error" in material) return { ok: false, error: material.error };
  if (!material.archivos.has(archivo)) return { ok: true };
  const sesiones = [...material.archivos.keys()].filter((a) => a !== "curso.md");
  if (sesiones.length <= 1) return { ok: false, error: "Es la única sesión del curso. Un curso necesita al menos una." };

  material.archivos.delete(archivo);
  const valido = validarMaterial(slug, material.curso.codigo_base, material.archivos);
  if ("error" in valido) return { ok: false, error: valido.error };

  // Primero el índice: si falla lo segundo, la sesión deja de listarse pero su
  // texto sigue en la base y se puede recuperar.
  const { error: eIndice } = await supabase
    .from("curso_sesiones")
    .delete()
    .eq("curso_id", material.curso.id)
    .eq("archivo", archivo);
  if (eIndice) return { ok: false, error: `No se pudo quitar del temario: ${eIndice.message}` };
  const { error: eContenido } = await supabase
    .from("curso_contenido")
    .delete()
    .eq("curso_id", material.curso.id)
    .eq("archivo", archivo);
  if (eContenido) return { ok: false, error: `No se pudo eliminar el texto: ${eContenido.message}` };

  const errorRevision = await cerrarCambio(supabase, material);
  if (errorRevision) return { ok: false, error: errorRevision };
  return { ok: true };
}

/** Sube una imagen al bucket del curso y devuelve cómo citarla en el Markdown. */
export async function subirImagenCurso(
  slug: string,
  datos: FormData,
): Promise<{ ok: true; ruta: string } | { ok: false; error: string }> {
  const acceso = await comoAdministrador();
  if ("error" in acceso) return { ok: false, error: acceso.error };
  const { supabase } = acceso;

  const archivo = datos.get("imagen");
  if (!(archivo instanceof File)) return { ok: false, error: "No llegó ninguna imagen." };
  const tipo = tipoImagen(archivo.name);
  if (!tipo) return { ok: false, error: "Solo PNG, JPG, WebP o GIF." };
  // Un nombre con espacios o tildes no se puede citar sin escaparlo.
  const nombre = archivo.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .toLowerCase();
  if (!nombreImagenValido(nombre)) return { ok: false, error: "El nombre de la imagen no es válido." };
  if (archivo.size > MAX_BYTES_IMAGEN) return { ok: false, error: "La imagen supera los 2 MB." };
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  if (!firmaImagenValida(bytes, tipo)) return { ok: false, error: "El archivo no tiene el formato que indica su extensión." };

  const { data: curso } = await supabase.from("cursos").select("slug").eq("slug", slug).maybeSingle();
  if (!curso) return { ok: false, error: "Ese curso ya no existe." };

  const { error } = await supabase.storage
    .from(BUCKET_IMAGENES_CURSO)
    .upload(`${slug}/imagenes/${nombre}`, bytes, { contentType: tipo, upsert: true });
  if (error) return { ok: false, error: `No se pudo subir: ${error.message}` };
  return { ok: true, ruta: `imagenes/${nombre}` };
}

/**
 * Cambia el orden de las sesiones. `orden` trae todos los archivos de sesión
 * en la posición nueva; cada uno pasa a llevar el número de su posición.
 *
 * La dirección de una sesión sin `slug` sale de su número. Al moverla se le
 * fija la que tenía, para que sus enlaces y el avance de los alumnos sigan
 * apuntando a ella.
 */
export async function reordenarSesiones(
  slug: string,
  orden: string[],
): Promise<{ ok: true; mensaje: string } | { ok: false; error: string }> {
  const acceso = await comoAdministrador();
  if ("error" in acceso) return { ok: false, error: acceso.error };
  const { supabase } = acceso;

  const material = await materialDe(supabase, slug);
  if ("error" in material) return { ok: false, error: material.error };

  const actuales = [...material.archivos.keys()].filter((archivo) => archivo !== "curso.md");
  const mismoConjunto =
    orden.length === actuales.length &&
    new Set(orden).size === orden.length &&
    orden.every((archivo) => archivo !== "curso.md" && material.archivos.has(archivo));
  if (!mismoConjunto) {
    return { ok: false, error: "Las sesiones cambiaron mientras las ordenabas. Recarga la página y vuelve a ordenarlas." };
  }

  const cambiados: string[] = [];
  for (const [posicion, archivo] of orden.entries()) {
    const texto = material.archivos.get(archivo)!;
    const ficha = frontmatter(texto);
    const anterior = Number(ficha.numero);
    if (!Number.isInteger(anterior)) {
      return { ok: false, error: `${archivo} no declara un número válido. Corrígelo en su editor antes de ordenar.` };
    }
    const numero = posicion + 1;
    if (anterior === numero) continue;
    const cambios: Record<string, unknown> = { numero };
    if (ficha.slug === undefined || ficha.slug === null || String(ficha.slug).trim() === "") {
      cambios.slug = `sesion-${anterior}`;
    }
    const nuevo = editarFrontmatter(texto, cambios);
    if (nuevo === null) return { ok: false, error: `No se pudo leer el encabezado de ${archivo}.` };
    material.archivos.set(archivo, nuevo);
    cambiados.push(archivo);
  }
  if (cambiados.length === 0) return { ok: true, mensaje: "Las sesiones ya estaban en ese orden." };

  const valido = validarMaterial(slug, material.curso.codigo_base, material.archivos);
  if ("error" in valido) return { ok: false, error: valido.error };

  const { error: eContenido } = await supabase.from("curso_contenido").upsert(
    cambiados.map((archivo) => ({ curso_id: material.curso.id, archivo, contenido: material.archivos.get(archivo)! })),
    { onConflict: "curso_id,archivo" },
  );
  if (eContenido) return { ok: false, error: `No se pudo guardar el orden: ${eContenido.message}` };

  const { error: eIndice } = await supabase.from("curso_sesiones").upsert(
    valido.indice.filter((fila) => cambiados.includes(fila.archivo)).map((fila) => ({ ...fila, curso_id: material.curso.id })),
    { onConflict: "curso_id,archivo" },
  );
  if (eIndice) return { ok: false, error: `El orden se guardó, pero no el temario: ${eIndice.message}` };

  const errorRevision = await cerrarCambio(supabase, material);
  if (errorRevision) return { ok: false, error: errorRevision };

  return {
    ok: true,
    mensaje: `Orden guardado: ${cambiados.length} ${cambiados.length === 1 ? "sesión cambió" : "sesiones cambiaron"} de número. Sus direcciones siguen siendo las mismas.`,
  };
}
