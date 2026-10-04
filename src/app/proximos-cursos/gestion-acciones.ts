"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { perfilActual } from "@/lib/matriculas";
import {
  ESTADOS_PROPUESTA,
  type EstadoPropuesta,
} from "@/lib/proximos-cursos";
import { esInterno } from "@/lib/roles";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

async function contextoInterno() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/proximos-cursos");

  const perfil = await perfilActual();
  if (!esInterno(perfil)) redirect("/proximos-cursos");

  return {
    usuario,
    supabase: await clienteServidor(),
  };
}

function slugIcono(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function sanitizarSvg(svg: string) {
  const limpio = svg.trim();
  if (!/^<svg\b/i.test(limpio) || !/<\/svg>$/i.test(limpio)) {
    throw new Error("El archivo debe contener un SVG completo.");
  }
  if (limpio.length > 65536) {
    throw new Error("El SVG no puede superar 64 KB.");
  }
  // Misma regla que la restricción catalogo_propuestas_svg_seguro de la base.
  if (/<\s*(script|foreignObject|iframe|object|embed|style|a|use|image|animate|set)\b/i.test(limpio)) {
    throw new Error("El SVG contiene elementos no permitidos.");
  }
  // `[\s/"']` y no solo `\s`: `<svg/onload=…>` también es un atributo.
  if (/[\s/"'](?:on[a-z]+|href|xlink:href)\s*=/i.test(limpio)) {
    throw new Error("El SVG contiene atributos no permitidos.");
  }
  if (/(?:javascript|data|vbscript)\s*:/i.test(limpio) || /<!\s*(?:entity|doctype)/i.test(limpio)) {
    throw new Error("El SVG contiene referencias no permitidas.");
  }
  return limpio;
}

async function leer(formData: FormData, supabase: Awaited<ReturnType<typeof clienteServidor>>) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const subtitulo = String(formData.get("subtitulo") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const nivel = String(formData.get("nivel") ?? "").trim();
  const icono = String(formData.get("icono") ?? "").trim();
  const estado = String(formData.get("estado") ?? "borrador").trim();
  const precio = Number(formData.get("precio") ?? 20);
  const prioridadInterna = Number(formData.get("prioridadInterna") ?? 0);
  const cursoSlug = String(formData.get("cursoSlug") ?? "").trim() || null;

  if (titulo.length < 3 || titulo.length > 140) {
    throw new Error("El título debe tener entre 3 y 140 caracteres.");
  }
  if (subtitulo.length > 240) {
    throw new Error("El subtítulo no puede superar 240 caracteres.");
  }
  if (!(ESTADOS_PROPUESTA as readonly string[]).includes(estado)) {
    throw new Error("Estado inválido.");
  }
  if (!Number.isFinite(precio) || precio < 0) {
    throw new Error("Precio inválido.");
  }
  if (
    !Number.isInteger(prioridadInterna) ||
    prioridadInterna < 0 ||
    prioridadInterna > 100
  ) {
    throw new Error("La prioridad interna debe estar entre 0 y 100.");
  }

  const { data: opciones, error } = await supabase
    .from("catalogo_propuestas")
    .select("tipo, valor")
    .eq("activo", true)
    .in("tipo", ["nivel", "area", "icono"]);

  if (error) throw new Error("No se pudieron validar los catálogos.");

  const existe = (tipo: string, valor: string) =>
    (opciones ?? []).some((opcion) => opcion.tipo === tipo && opcion.valor === valor);

  if (!existe("nivel", nivel)) throw new Error("Nivel inválido.");
  if (!existe("area", area)) throw new Error("Área inválida.");
  if (!existe("icono", icono)) throw new Error("Icono inválido.");

  return {
    titulo,
    subtitulo,
    area,
    nivel,
    icono,
    estado: estado as EstadoPropuesta,
    precio,
    prioridadInterna,
    cursoSlug,
  };
}

export async function agregarOpcionCatalogo(
  tipo: "nivel" | "area",
  valorOriginal: string,
) {
  const { usuario, supabase } = await contextoInterno();
  const valorBase = valorOriginal.trim();
  if (!valorBase) throw new Error("Escribe un valor.");

  const valor = tipo === "nivel" ? valorBase.toLocaleUpperCase("es-PE") : valorBase;
  if (valor.length > 80) throw new Error("El valor es demasiado largo.");

  const { data, error } = await supabase
    .from("catalogo_propuestas")
    .insert({
      tipo,
      valor,
      creado_por: usuario.id,
    })
    .select("valor, svg")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Ese valor ya existe.");
    throw new Error("No se pudo agregar la opción.");
  }

  revalidatePath("/proximos-cursos");
  return { valor: data.valor, svg: data.svg ?? null };
}

export async function cargarIconoCatalogo(formData: FormData) {
  const { usuario, supabase } = await contextoInterno();
  const archivo = formData.get("archivo");

  if (!(archivo instanceof File) || archivo.size === 0) {
    throw new Error("Selecciona un archivo SVG.");
  }
  if (archivo.size > 65536) {
    throw new Error("El SVG no puede superar 64 KB.");
  }

  const nombreBase =
    String(formData.get("nombre") ?? "").trim() ||
    archivo.name.replace(/\.svg$/i, "");
  const valor = slugIcono(nombreBase);
  if (!valor) throw new Error("No se pudo generar un nombre válido para el icono.");

  const svg = sanitizarSvg(await archivo.text());

  const { data, error } = await supabase
    .from("catalogo_propuestas")
    .insert({
      tipo: "icono",
      valor,
      svg,
      creado_por: usuario.id,
    })
    .select("valor, svg")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Ya existe un icono con ese nombre.");
    throw new Error("No se pudo cargar el icono.");
  }

  revalidatePath("/proximos-cursos");
  return { valor: data.valor, svg: data.svg ?? null };
}

export async function crearPropuesta(formData: FormData) {
  const { usuario, supabase } = await contextoInterno();
  const datos = await leer(formData, supabase);

  const { error } = await supabase.from("propuestas_curso").insert({
    titulo: datos.titulo,
    subtitulo: datos.subtitulo,
    precio: datos.precio,
    icono: datos.icono,
    nivel: datos.nivel,
    area: datos.area,
    estado: datos.estado,
    prioridad_interna: datos.prioridadInterna,
    creado_por: usuario.id,
    curso_slug: datos.cursoSlug,
  });

  if (error) throw new Error("No se pudo crear la propuesta.");

  revalidatePath("/proximos-cursos");
  redirect("/proximos-cursos?estado=creada#gestion-propuestas");
}

export async function actualizarPropuesta(formData: FormData) {
  const { supabase } = await contextoInterno();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Propuesta inválida.");

  const datos = await leer(formData, supabase);

  const { error } = await supabase
    .from("propuestas_curso")
    .update({
      titulo: datos.titulo,
      subtitulo: datos.subtitulo,
      precio: datos.precio,
      icono: datos.icono,
      nivel: datos.nivel,
      area: datos.area,
      estado: datos.estado,
      prioridad_interna: datos.prioridadInterna,
      curso_slug: datos.cursoSlug,
    })
    .eq("id", id);

  if (error) throw new Error("No se pudo actualizar la propuesta.");

  revalidatePath("/proximos-cursos");
  redirect("/proximos-cursos?estado=actualizada#gestion-propuestas");
}
