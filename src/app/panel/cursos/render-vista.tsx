import "server-only";

import type { ReactNode } from "react";
import { BookOpen, Clock, Layers } from "lucide-react";
import { renderSecciones } from "@/components/curso/SeccionesLeccion";
import { Icono } from "@/components/Iconos";
import { agruparEnSecciones, type Bloque, type Curso } from "@/lib/cursos";
import { frontmatter } from "@/lib/cursos-panel";
import { baseImagenesCurso } from "@/lib/imagenes-curso";

export type Vista = { ok: true; vista: ReactNode; avisos: string[] } | { ok: false; error: string };

/**
 * Pinta un archivo del curso ya construido con los componentes de la lección.
 * Lo usan la vista previa del editor y nada más; separado de la acción para
 * que se pueda comprobar sin sesión ni base.
 */
export function vistaDeArchivo(
  slug: string,
  curso: Curso,
  archivo: string,
  contenido: string,
  avisosPrevios: string[] = [],
): Vista {
  const avisos = [...avisosPrevios];
  if (archivo === "curso.md") {
    return {
      ok: true,
      avisos,
      vista: (
        <div className="rounded-xl border border-borde bg-fondo p-6">
          <div className="flex items-start gap-4">
            <Icono nombre={curso.icono} className="size-12 shrink-0 text-texto-tenue" />
            <div className="min-w-0">
              <p className="font-mono text-[11px] tracking-wider text-texto-tenue">
                {curso.codigoBase ?? "—"} · {curso.area} · {curso.nivel}
              </p>
              <h2 className="mt-1 text-xl font-bold text-texto text-balance">{curso.titulo}</h2>
              <p className="mt-2 text-sm leading-relaxed text-texto-suave">{curso.resumen}</p>
            </div>
          </div>
          <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-borde pt-4 text-xs text-texto-suave">
            <div className="flex items-center gap-1.5">
              <BookOpen size={13} aria-hidden="true" />
              <dt className="sr-only">Sesiones</dt>
              <dd>{curso.lecciones.length} sesiones</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={13} aria-hidden="true" />
              <dt className="sr-only">Duración</dt>
              <dd>{curso.horas} h</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers size={13} aria-hidden="true" />
              <dt className="sr-only">Formato</dt>
              <dd className="capitalize">{curso.formato}</dd>
            </div>
            {curso.paquetes && curso.paquetes.length > 0 && (
              <div>
                <dt className="sr-only">Paquetes</dt>
                <dd className="font-mono">{curso.paquetes.join(", ")}</dd>
              </div>
            )}
          </dl>
        </div>
      ),
    };
  }

  const f = frontmatter(contenido);
  const slugSesion = String(f.slug ?? `sesion-${Number(f.numero)}`);
  const leccion = curso.lecciones.find((l) => l.slug === slugSesion);
  if (!leccion) return { ok: false, error: "No se encontró la sesión dentro del curso. Revisa su número y su slug." };

  const codigo = leccion.bloques.filter((b): b is Extract<Bloque, { tipo: "codigo" }> => b.tipo === "codigo");
  const sinSalida = codigo.filter((b) => b.salida === null && !b.sinConsola).length;
  if (leccion.bloques.length === 0) avisos.push("La sesión está vacía: todavía no tiene ningún bloque.");
  if (sinSalida > 0) {
    avisos.push(
      `${sinSalida} de ${codigo.length} bloques de código no muestran salida. Si producen algo, ejecútalos y pega la salida real en un bloque \`salida\`.`,
    );
  }

  // Las consolas cargan intérpretes de decenas de megabytes: en la vista
  // previa el código se muestra resaltado y con su salida, sin ejecutarse.
  const bloques = leccion.bloques.map((b) => (b.tipo === "codigo" ? { ...b, sinConsola: true } : b));

  return {
    ok: true,
    avisos,
    vista: (
      <article>
        <p className="font-mono text-xs uppercase tracking-wider text-texto-tenue">Sesión {leccion.numero}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-texto text-balance sm:text-3xl">{leccion.titulo}</h1>
        <div className="mt-6">
          {renderSecciones(agruparEnSecciones(bloques), {
            ejercicios: leccion.ejercicios,
            paquetes: leccion.paquetes ?? curso.paquetes,
            preludio: leccion.preludio ?? curso.preludio,
            baseImagenes: baseImagenesCurso(slug),
          })}
        </div>
      </article>
    ),
  };
}
