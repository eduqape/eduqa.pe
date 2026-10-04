import { BotonActualizar } from "@/app/blog/BotonActualizar";
import { describirFeedMedium } from "@/lib/blog-feed-texto";
import type { EstadoFeedMedium } from "@/lib/blog-types";

/**
 * Herramienta de administración sobre la página pública.
 *
 * Solo la ve quien administra, y por eso se presenta como una franja de
 * estado y no como contenido: dice si el feed funciona y, si no, por qué.
 */
export function GestionMedium({ estado }: { estado: EstadoFeedMedium }) {
  const { texto, problema } = describirFeedMedium(estado);

  return (
    <section
      id="gestion-medium"
      aria-label="Gestión del blog"
      className="mt-8 flex flex-col gap-3 rounded-xl border border-borde bg-fondo px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-texto-tenue">
          Solo administración · Feed de Medium
        </p>
        <p className="mt-1 flex items-start gap-2 text-sm text-texto-suave">
          <span
            aria-hidden="true"
            className={`mt-1.5 size-2 shrink-0 rounded-full ${problema ? "bg-rojo-acento" : "bg-exito"}`}
          />
          <span>
            <span className="sr-only">{problema ? "Problema: " : "Correcto: "}</span>
            {texto}
          </span>
        </p>
        <p className="mt-0.5 truncate pl-4 font-mono text-[11px] text-texto-tenue" title={estado.url}>
          {estado.url}
        </p>
      </div>
      <BotonActualizar />
    </section>
  );
}
