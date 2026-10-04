"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Panel lateral para dar de alta y editar.
 *
 * Es un `<dialog>` nativo: atrapa el foco, se cierra con Escape y devuelve el
 * foco al botón que lo abrió sin código propio. Antes la edición se abría
 * dentro de la tarjeta, que en la grilla mide un tercio del ancho; un
 * formulario de veinte campos en esa columna obligaba a desplazarse sin ver
 * qué se estaba editando.
 *
 * Si hay cambios sin guardar, cerrar (con la X, con Escape o pulsando fuera)
 * pide confirmación en vez de tirar lo escrito.
 */
export function HojaPersona({
  abierta,
  titulo,
  subtitulo,
  sucio,
  alCerrar,
  children,
}: {
  abierta: boolean;
  titulo: string;
  subtitulo?: string;
  sucio: boolean;
  alCerrar: () => void;
  /** Recibe `pedirCierre` para que el "Cancelar" del contenido pase por la misma confirmación. */
  children: (pedirCierre: () => void) => ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierta && !dialogo.open) dialogo.showModal();
    if (!abierta && dialogo.open) dialogo.close();
  }, [abierta]);

  const pedirCierre = () => {
    if (sucio) setConfirmando(true);
    else alCerrar();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="hoja-persona-titulo"
      onCancel={(evento) => {
        evento.preventDefault();
        pedirCierre();
      }}
      onClick={(evento) => {
        // Solo el fondo: el clic dentro del panel cae en sus hijos.
        if (evento.target === evento.currentTarget) pedirCierre();
      }}
      onClose={() => setConfirmando(false)}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-xl overflow-hidden bg-fondo p-0 text-texto shadow-2xl backdrop:bg-black/50 sm:border-l sm:border-borde"
    >
      {abierta && (
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-borde px-6 py-4">
            <div className="min-w-0">
              <h2 id="hoja-persona-titulo" className="truncate text-lg font-semibold">
                {titulo}
              </h2>
              {subtitulo && <p className="mt-0.5 text-xs text-texto-tenue">{subtitulo}</p>}
            </div>
            <button
              type="button"
              onClick={pedirCierre}
              aria-label="Cerrar el panel"
              className="-mr-2 rounded-lg p-2 text-texto-tenue transition-colors hover:bg-superficie hover:text-texto focus-visible:outline-2 focus-visible:outline-rojo-acento"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          {confirmando && (
            <div
              role="alertdialog"
              aria-labelledby="hoja-persona-descartar"
              className="flex flex-wrap items-center justify-between gap-3 border-b border-borde bg-rojo-tenue px-6 py-3"
            >
              <p id="hoja-persona-descartar" className="text-sm text-texto">
                Hay cambios sin guardar. ¿Descartarlos?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setConfirmando(false)}
                  className="rounded-lg border border-borde-fuerte bg-fondo px-3 py-1.5 text-xs font-medium text-texto transition-colors hover:bg-superficie"
                >
                  Seguir editando
                </button>
                <button
                  type="button"
                  onClick={alCerrar}
                  className="rounded-lg bg-rojo px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rojo-hover"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1">{children(pedirCierre)}</div>
        </div>
      )}
    </dialog>
  );
}
