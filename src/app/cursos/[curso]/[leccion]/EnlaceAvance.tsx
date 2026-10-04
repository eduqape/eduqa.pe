"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { marcarVista } from "./acciones";

/**
 * Enlace al final de la sesión que, además, la da por completada.
 *
 * Pasar a la siguiente sesión es la forma manual de terminar una: quien ya
 * conoce el material no tiene que esperar el tiempo mínimo de lectura. El
 * avance se guarda antes de navegar; si la escritura falla, se navega igual,
 * porque bloquear al alumno por un error de guardado sería peor.
 */
export function EnlaceAvance({
  href,
  curso,
  leccion,
  marcar,
  className,
  children,
}: {
  href: string;
  curso: string;
  leccion: string;
  /** false si no hay sesión iniciada o la lección ya estaba completada. */
  marcar: boolean;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);

  return (
    <Link
      href={href}
      aria-busy={guardando}
      className={className}
      onClick={async (e) => {
        // Ctrl/Cmd+clic y el botón central abren otra pestaña: no se intercepta.
        if (!marcar || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        if (guardando) return;
        setGuardando(true);
        try {
          await marcarVista(curso, leccion);
        } finally {
          router.push(href);
        }
      }}
    >
      {children}
    </Link>
  );
}
