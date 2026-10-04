import "server-only";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/servidor";
import { registrarError } from "@/lib/registro";
import {
  esRolPersona,
  ROLES_ENSENAN,
  type RolPersona,
} from "@/lib/personas-tipos";
import { esRedNombre, type RedNombre } from "@/lib/redes";

export type Red = {
  red: RedNombre;
  url: string;
  orden: number;
};

export type Persona = {
  id: string;
  slug: string;
  nombre: string;
  titulo_profesional: string | null;
  foto_url: string | null;
  correo: string | null;
  telefono: string | null;
  pais: string | null;
  biografia: string | null;
  usuario_id: string | null;
  visible: boolean;
  activo: boolean;
  orden: number;
  creado_en: string;
  actualizado_en: string;
  roles: RolPersona[];
  redes: Red[];
};

const CAMPOS =
  "id, slug, nombre, titulo_profesional, foto_url, correo, telefono, pais, biografia, usuario_id, visible, activo, orden, creado_en, actualizado_en, personas_roles(rol, orden), personas_redes(red, url, orden)";

type Fila = Omit<Persona, "roles" | "redes"> & {
  personas_roles: { rol: string; orden: number }[] | null;
  personas_redes: { red: string; url: string; orden: number }[] | null;
};

function ordenar(filas: Persona[]): Persona[] {
  return [...filas].sort(
    (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"),
  );
}

/**
 * Las filas y sus relaciones llegan en un solo viaje.
 *
 * Los roles que no Reconocemos se descartan en vez de propagarse: un valor raro
 * en la base no debe romper la página pública, y la lista de roles es corta y
 * conocida.
 */
function normalizar(filas: Fila[]): Persona[] {
  return ordenar(
    filas.map((fila) => ({
      id: fila.id,
      slug: fila.slug,
      nombre: fila.nombre,
      titulo_profesional: fila.titulo_profesional,
      foto_url: fila.foto_url,
      correo: fila.correo,
      telefono: fila.telefono,
      pais: fila.pais,
      biografia: fila.biografia,
      usuario_id: fila.usuario_id,
      visible: fila.visible,
      activo: fila.activo,
      orden: fila.orden,
      creado_en: fila.creado_en,
      actualizado_en: fila.actualizado_en,
      roles: (fila.personas_roles ?? [])
        .filter((r) => esRolPersona(r.rol))
        .sort((a, b) => a.orden - b.orden)
        .map((r) => r.rol as RolPersona),
      redes: (fila.personas_redes ?? [])
        .filter((r) => esRedNombre(r.red))
        .sort((a, b) => a.orden - b.orden)
        .map((r) => ({ red: r.red as RedNombre, url: r.url, orden: r.orden })),
    })),
  );
}

async function cargar(contexto: string): Promise<Persona[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("personas")
    .select(CAMPOS)
    .order("orden")
    .order("nombre");

  if (error) {
    registrarError(contexto, error);
    return [];
  }
  return normalizar((data ?? []) as Fila[]);
}

/**
 * Personas publicadas: las que salen en la portada y en /equipo.
 *
 * No se filtran aquí con `.eq("visible", true)`: eso ya lo hace la política
 * "personas publicadas" para quien no es administrador, igual que ocurre con
 * `cursos` y sus borradores. Duplicar la regla aquí dejaría dos sitios que
 * pueden desincronizarse, y el que se equivoca es el que filtra de más.
 */
export const personasPublicas = cache(async (): Promise<Persona[]> => cargar("personas.publicas"));

/**
 * Todo el censo, sin filtrar. Solo para el panel: las políticas RLS ya
 * devuelven la lista completa únicamente a quien es administrador.
 */
export const personasDelPanel = cache(async (): Promise<Persona[]> => cargar("personas.panel"));

/**
 * Las personas de la sección "Quién enseña" de la portada.
 *
 * Alguien puede estar publicado sin dar clase: un practicante o un invitado. La
 * portada no es el censo completo, es la respuesta a "¿quién me enseña?", así
 * que se queda con quienes tienen un rol docente.
 */
export async function personasQueEnsenan(): Promise<Persona[]> {
  return (await personasPublicas()).filter((persona) =>
    persona.roles.some((rol) => ROLES_ENSENAN.includes(rol)),
  );
}