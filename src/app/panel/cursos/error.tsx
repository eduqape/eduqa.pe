"use client";

import { RotateCcw } from "lucide-react";

/**
 * Si la base no responde, se dice así y se ofrece reintentar, en vez de una
 * pantalla en blanco o un listado vacío que parezca «no hay cursos».
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16 lg:pl-64 xl:pl-32 2xl:pl-6">
      <div role="alert" className="mx-auto max-w-md text-center">
        <h1 className="text-lg font-semibold text-texto">No se pudo cargar la gestión de cursos</h1>
        <p className="mt-2 text-sm text-texto-suave">
          La base de datos no respondió a tiempo. No se perdió nada: vuelve a intentarlo en unos segundos.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover"
        >
          <RotateCcw size={15} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    </div>
  );
}
