"use server";

import { revalidatePath } from "next/cache";
import { parse as parseYaml } from "yaml";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { codigoBaseDeFicha, construirCurso } from "@/lib/curso-markdown";
import { esIconoCurso } from "@/lib/iconos-curso";
import {
  BUCKET_IMAGENES_CURSO,
  MAX_BYTES_IMAGEN,
  firmaImagenValida,
  imagenesReferenciadas,
  nombreImagenValido,
  rutaEnBucket,
  tipoImagen,
} from "@/lib/imagenes-curso";

export type EstadoPublicacion = { ok: boolean; error?: string; detalle?: string };

type EstadoCurso = "borrador" | "publico" | "archivado";

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
  if (!["borrador", "publico", "archivado"].includes(estado)) {
    return { error: "El estado debe ser borrador, publico o archivado." };
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
        curso_slug: slug,
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

  const { error: eCurso } = await supabase.from("cursos").upsert(
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
  );
  if (eCurso) return { ok: false, error: `No se pudo guardar la ficha: ${eCurso.message}` };

  const contenido = [...archivos.entries()].map(([archivo, texto]) => ({
    curso_slug: slug,
    archivo,
    contenido: texto,
  }));
  const { error: eContenido } = await supabase
    .from("curso_contenido")
    .upsert(contenido, { onConflict: "curso_slug,archivo" });
  if (eContenido) return { ok: false, error: `No se pudo guardar el material: ${eContenido.message}` };

  const { error: eIndice } = await supabase
    .from("curso_sesiones")
    .upsert(indice, { onConflict: "curso_slug,archivo" });
  if (eIndice) return { ok: false, error: `No se pudo guardar el temario: ${eIndice.message}` };

  // Lo nuevo se guarda antes de retirar lo antiguo. Si falla una escritura,
  // el alumno conserva la versión anterior en vez de encontrar un curso vacío.
  const nombresContenido = new Set(contenido.map((fila) => fila.archivo));
  const { data: contenidoActual, error: eLeerContenido } = await supabase
    .from("curso_contenido")
    .select("archivo")
    .eq("curso_slug", slug);
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
      .eq("curso_slug", slug)
      .in("archivo", contenidoObsoleto);
    if (eBorrarContenido) {
      return { ok: false, error: `No se pudo retirar material antiguo: ${eBorrarContenido.message}` };
    }
  }

  const nombresSesiones = new Set(indice.map((fila) => fila.archivo));
  const { data: sesionesActuales, error: eLeerSesiones } = await supabase
    .from("curso_sesiones")
    .select("archivo")
    .eq("curso_slug", slug);
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
      .eq("curso_slug", slug)
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

  const { error: eCurso } = await supabase.from("cursos").insert({
    slug,
    codigo_base: codigoBase,
    titulo,
    resumen: "",
    precio,
    estado: "borrador",
    acceso_libre: false,
    orden: 99,
  });
  if (eCurso) return { ok: false, error: `No se pudo crear: ${eCurso.message}` };

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
    { curso_slug: slug, archivo: "curso.md", contenido: fichaMd },
    { curso_slug: slug, archivo: "sesion-1.md", contenido: sesionMd },
  ]);
  if (eContenido) return { ok: false, error: `No se pudo guardar el esqueleto: ${eContenido.message}` };

  const { error: eIndice } = await supabase.from("curso_sesiones").insert({
    curso_slug: slug,
    archivo: "sesion-1.md",
    numero: 1,
    titulo: "Primera sesión",
    slug: "sesion-1",
  });
  if (eIndice) return { ok: false, error: `No se pudo guardar el temario: ${eIndice.message}` };

  const { error: eRevision } = await supabase.rpc("registrar_revision_curso", { p_slug: slug });
  if (eRevision) return { ok: false, error: `No se pudo registrar la revisión: ${eRevision.message}` };

  revalidarCursoPublicado(slug);

  return {
    ok: true,
    detalle: `Creado en borrador como /${slug}, con una sesión de ejemplo. Edítalo y vuelve a subirlo cuando esté.`,
  };
}
