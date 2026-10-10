"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MonitorPlay, Play, X } from "lucide-react";
import { ESCENAS, type NombreEscena } from "@/lib/escenas";

// three.js y el guion van en un fragmento aparte que solo se pide al lanzar:
// la lección se descarga sin ellos y quien no quiera la animación no los paga.
const Escena3D = dynamic(() => import("./Escena3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-texto-tenue" role="status">
      Cargando la animación…
    </div>
  ),
});

/**
 * Animación 3D opcional de un punto de la lección. Entra cerrada, como una
 * tarjeta, y se lanza a petición. Cerrarla libera el contexto WebGL.
 */
export function EscenaCurso({ escena, pie }: { escena: NombreEscena; pie?: string }) {
  const [lanzada, setLanzada] = useState(false);
  const { titulo } = ESCENAS[escena];

  return (
    <figure className="my-6">
      <div className="overflow-hidden rounded-xl border border-borde bg-fondo">
        <div className="flex items-center gap-3 px-4 py-3">
          <MonitorPlay className="h-5 w-5 shrink-0 text-rojo-acento" aria-hidden />
          <p className="min-w-0 flex-1 text-sm font-semibold text-texto">{titulo}</p>
          {lanzada ? (
            <button
              type="button"
              onClick={() => setLanzada(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-borde-fuerte bg-fondo px-3 py-1.5 text-xs font-semibold text-texto transition-colors hover:bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Cerrar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setLanzada(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-rojo px-3 py-1.5 text-xs font-semibold text-sobre-rojo transition-colors hover:bg-rojo-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento"
            >
              <Play className="h-3.5 w-3.5" aria-hidden />
              Ver animación
            </button>
          )}
        </div>
        {lanzada && (
          <div className="h-[28rem] border-t border-borde sm:h-[30rem]">
            <Escena3D escena={escena} />
          </div>
        )}
      </div>
      {pie && <figcaption className="mt-2 text-center text-xs leading-relaxed text-texto-suave">{pie}</figcaption>}
    </figure>
  );
}
