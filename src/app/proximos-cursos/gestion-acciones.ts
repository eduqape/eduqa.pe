"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { esIconoCurso } from "@/lib/iconos-curso";
import { perfilActual } from "@/lib/matriculas";
import {
  ESTADOS_PROPUESTA,
  type EstadoPropuesta,
} from "@/lib/proximos-cursos";
import { esInterno } from "@/lib/roles";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

const NIVELES = ["INTRODUCCIÓN", "INTERMEDIO", "AVANZADO"] as const;

async function contextoInterno() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/proximos-cursos?gestion=1");

  const perfil = await perfilActual();
  if (!esInterno(perfil)) redirect("/proximos-cursos");

  return {
    usuario,
    supabase: await clienteServidor(),
  };
}

function leer(formData: FormData) {
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
  if (area.length < 2 || area.length > 80) {
    throw new Error("El área debe tener entre 2 y 80 caracteres.");
  }
  if (!(NIVELES as readonly string[]).includes(nivel)) {
    throw new Error("Nivel inválido.");
  }
  if (!esIconoCurso(icono)) {
    throw new Error("Icono de curso inválido.");
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

export async function crearPropuesta(formData: FormData) {
  const { usuario, supabase } = await contextoInterno();
  const datos = leer(formData);

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
  redirect("/proximos-cursos?gestion=1&estado=creada#gestion-propuestas");
}

export async function actualizarPropuesta(formData: FormData) {
  const { supabase } = await contextoInterno();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Propuesta inválida.");

  const datos = leer(formData);

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
  redirect("/proximos-cursos?gestion=1&estado=actualizada#gestion-propuestas");
}
