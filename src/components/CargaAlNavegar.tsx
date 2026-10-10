"use client";

import { useLinkStatus } from "next/link";
import { createPortal } from "react-dom";
import { EsqueletoCursos } from "./EsqueletoCursos";

/**
 * Va dentro del <Link> a /cursos. Mientras Next espera la respuesta (proxy
 * valida la sesión y la ruta es dinámica), la URL todavía no cambia y
 * `loading.tsx` no puede mostrarse; esta capa cubre ese intervalo con el
 * mismo esqueleto. Aparece con un retraso breve para no destellar en
 * navegaciones rápidas.
 */
export function CargaAlNavegar() {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden bg-fondo text-texto animate-[velo-entra_150ms_ease-out_120ms_both]">
      <EsqueletoCursos />
    </div>,
    document.body,
  );
}
