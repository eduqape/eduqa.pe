import Link from "next/link";
import { AlertTriangle, Check, ExternalLink, Upload } from "lucide-react";
import type { DetalleCurso } from "@/lib/cursos-panel";
import { Icono } from "@/components/Iconos";
import { ChipEstado } from "../TarjetaCurso";
import { FichaCurso } from "./FichaCurso";
import { SesionesCurso } from "./SesionesCurso";

function fecha(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "America/Lima" }).format(new Date(iso));
}

/** Ficha de gestión de un curso, sin sesión ni base: la página le pasa los datos. */
export function VistaCurso({
  curso,
  aviso,
  crearSesion,
}: {
  curso: DetalleCurso;
  aviso: string | null;
  crearSesion: (slug: string) => Promise<{ ok: true; archivo: string } | { ok: false; error: string }>;
}) {
  const ficha = curso.ficha;
  const datos: [string, string][] = [
    ["Código", curso.codigo ?? "—"],
    ["Dirección", `/cursos/${curso.slug}`],
    ["Área", String(ficha.area ?? "—")],
    ["Nivel", String(ficha.nivel ?? "—")],
    ["Formato", String(ficha.formato ?? ficha.tipo ?? "curso")],
    ["Horas", ficha.horas ? `${ficha.horas} h` : "—"],
    ["Ruta", curso.ruta?.nombre ?? "—"],
    ["Autoría", curso.creadores.map((c) => c.nombre).join(", ") || "Sin registrar"],
    ["Creado", fecha(curso.creadoEn)],
    ["Última edición", fecha(curso.actualizadoEn)],
    ["Primera publicación", fecha(curso.publicadoEn)],
  ];

  return (
    <>
      <header className="flex flex-wrap items-start gap-4">
        <Icono nombre={curso.icono} className="size-12 shrink-0 text-texto-tenue" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-texto-tenue">{curso.codigo ?? "sin código"}</span>
            <ChipEstado estado={curso.estado} />
          </div>
          <h1 className="mt-1 text-2xl font-bold text-texto text-balance sm:text-3xl">{curso.titulo}</h1>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">
          <Link
            href={`/panel/cursos/importar?curso=${curso.slug}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-borde-fuerte px-3 py-2 text-sm text-texto-suave transition-colors hover:border-rojo-acento hover:text-rojo-acento"
          >
            <Upload size={14} aria-hidden="true" />
            Reemplazar con Markdown
          </Link>
          {curso.primeraLeccion && (
            <Link
              href={`/cursos/${curso.slug}/${curso.primeraLeccion}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-borde-fuerte px-3 py-2 text-sm text-texto-suave transition-colors hover:border-rojo-acento hover:text-rojo-acento"
            >
              Ver como alumno
              <ExternalLink size={13} aria-hidden="true" />
              <span className="sr-only">(se abre en otra pestaña)</span>
            </Link>
          )}
        </div>
      </header>

      {aviso && (
        <p role="status" className="mt-6 flex items-start gap-2 text-sm text-exito transition-opacity duration-300 starting:opacity-0">
          <Check size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {aviso}
        </p>
      )}

      {curso.errorConstruccion && (
        <div role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-rojo-acento/40 bg-rojo-tenue p-4 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rojo-acento" aria-hidden="true" />
          <div>
            <p className="font-semibold text-rojo-acento">El catálogo no puede mostrar este curso</p>
            <p className="mt-1 text-texto">{curso.errorConstruccion}</p>
            <p className="mt-1 text-texto-suave">Abre el archivo que nombra el error y corrígelo: al guardar se vuelve a comprobar.</p>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="titulo-venta">
            <h2 id="titulo-venta" className="text-base font-semibold text-texto">
              Visibilidad y venta
            </h2>
            <div className="mt-4">
              <FichaCurso
                curso={{
                  slug: curso.slug,
                  titulo: curso.titulo,
                  resumen: curso.resumen,
                  estado: curso.estado,
                  precio: curso.precio,
                  accesoLibre: curso.accesoLibre,
                }}
              />
            </div>
          </section>
          <SesionesCurso slug={curso.slug} sesiones={curso.sesiones} crearSesion={crearSesion} />
        </div>

        <aside aria-labelledby="titulo-datos" className="lg:sticky lg:top-6 lg:self-start">
          <h2 id="titulo-datos" className="text-base font-semibold text-texto">
            Datos
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            {datos.map(([clave, valor]) => (
              <div key={clave}>
                <dt className="text-xs text-texto-tenue">{clave}</dt>
                <dd className="mt-0.5 break-words text-texto">{valor}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </>
  );
}
