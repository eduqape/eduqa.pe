"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Check, Loader2 } from "lucide-react";
import { estadoCobol, mantenerCobolPreparado, prepararCobol, suscribirseCobol } from "@/lib/cobol-web";

export function PreparacionCobol() {
  const estado = useSyncExternalStore(suscribirseCobol, estadoCobol, () => "sin-empezar" as const);
  useEffect(mantenerCobolPreparado, []);

  return (
    <div role="status" aria-live="polite" data-preparacion-cobol={estado} className="mt-4 flex flex-wrap items-center gap-2 text-xs text-texto-suave">
      {estado === "error" ? (
        <>
          <span>No pudimos preparar COBOL. Cada bloque muestra su salida de referencia.</span>
          <button type="button" onClick={() => void prepararCobol()} className="font-medium text-rojo-acento underline">
            Reintentar
          </button>
        </>
      ) : estado === "listo" ? (
        <>
          <Check size={14} aria-hidden="true" className="text-exito" />
          COBOL listo para compilar y ejecutar
        </>
      ) : (
        <>
          <Loader2 size={14} aria-hidden="true" className="animate-spin" />
          Preparando GnuCOBOL… Puedes seguir leyendo.
        </>
      )}
    </div>
  );
}
