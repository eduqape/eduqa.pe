"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { describirFeedMedium } from "@/lib/blog-feed-texto";
import { actualizarArticulosMedium } from "./acciones";

export function BotonActualizar() {
  const [pendiente, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState("");
  const router = useRouter();

  return (
    <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => {
          setMensaje("");
          iniciar(async () => {
            try {
              const estado = await actualizarArticulosMedium();
              router.refresh();
              setMensaje(`Consultado ahora. ${describirFeedMedium(estado).texto}`);
            } catch (error) {
              setMensaje(error instanceof Error ? error.message : "No se pudo consultar el feed.");
            }
          });
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-borde-fuerte bg-fondo px-3 py-2 text-sm font-medium text-texto-suave transition-colors hover:border-rojo-acento hover:text-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento disabled:cursor-wait disabled:opacity-50"
      >
        <RefreshCw size={15} className={pendiente ? "animate-spin" : ""} aria-hidden="true" />
        {pendiente ? "Consultando…" : "Volver a consultar"}
      </button>
      <span role="status" className="max-w-xs text-xs text-texto-tenue sm:text-right">
        {mensaje}
      </span>
    </div>
  );
}
