import "server-only";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/servidor";

export type Reunion = {
  id: string;
  titulo: string;
  iniciaEn: string;
  minutos: number;
  enlace: string | null;
  cursoSlug: string | null;
  cursoNombre: string;
  docente: string;
  cancelada: boolean;
};

/**
 * Las reuniones en vivo de quien está mirando.
 *
 * Solo llegan las de las ediciones en las que está inscrito: lo deciden las
 * políticas de `reuniones` y `cohortes`, no esta consulta. Si mañana otra
 * pantalla pide lo mismo, hereda la misma barrera sin tener que acordarse.
 *
 * El enlace de la reunión cae al de la cohorte cuando va vacío, que es lo
 * normal en Meet: una serie recurrente comparte enlace.
 */
export const misReuniones = cache(async (): Promise<Reunion[]> => {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("reuniones")
    .select(
      "id, titulo, inicia_en, minutos, enlace, cancelada_en, cohortes(curso_nombre, docente, enlace, cursos(slug))",
    )
    .order("inicia_en");

  type Fila = {
    id: string;
    titulo: string;
    inicia_en: string;
    minutos: number;
    enlace: string | null;
    cancelada_en: string | null;
    cohortes: {
      curso_nombre: string;
      docente: string;
      enlace: string | null;
      cursos: { slug: string } | null;
    } | null;
  };

  return ((data ?? []) as unknown as Fila[]).map((r) => ({
    id: r.id,
    titulo: r.titulo,
    iniciaEn: r.inicia_en,
    minutos: r.minutos,
    enlace: r.enlace ?? r.cohortes?.enlace ?? null,
    cursoSlug: r.cohortes?.cursos?.slug ?? null,
    cursoNombre: r.cohortes?.curso_nombre ?? "",
    docente: r.cohortes?.docente ?? "",
    cancelada: r.cancelada_en !== null,
  }));
});
