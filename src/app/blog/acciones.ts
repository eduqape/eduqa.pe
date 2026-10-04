"use server";

import { revalidatePath, updateTag } from "next/cache";
import { perfilActual } from "@/lib/matriculas";
import { estadoFeedMedium, type EstadoFeedMedium } from "@/lib/blog-medium";

export async function actualizarArticulosMedium(): Promise<EstadoFeedMedium> {
  const perfil = await perfilActual();
  if (!perfil?.es_admin) {
    throw new Error("No tienes permisos para actualizar el blog.");
  }

  updateTag("medium-blog");
  revalidatePath("/blog");
  return estadoFeedMedium();
}
