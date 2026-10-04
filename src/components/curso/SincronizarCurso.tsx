"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase/navegador";

/**
 * Mantiene abierta la sesión que el alumno está leyendo y vuelve a pedir el
 * Server Component cuando cambia la ficha, el índice o el Markdown del curso.
 *
 * router.refresh() conserva la URL y el estado de navegación; no obliga a
 * recargar toda la pestaña. El pequeño debounce agrupa los múltiples eventos
 * que produce publicar una sesión completa.
 */
/** `cursoId` y no el slug: los cambios se filtran por la clave del curso (#112). */
export function SincronizarCurso({ cursoId }: { cursoId: string }) {
  const router = useRouter();
  const pendiente = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = clienteNavegador();

    function programarActualizacion() {
      if (pendiente.current) clearTimeout(pendiente.current);
      pendiente.current = setTimeout(() => {
        pendiente.current = null;
        router.refresh();
      }, 700);
    }

    const canal = supabase
      .channel(`curso:${cursoId}:cambios`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "curso_contenido",
          filter: `curso_id=eq.${cursoId}`,
        },
        programarActualizacion,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "curso_sesiones",
          filter: `curso_id=eq.${cursoId}`,
        },
        programarActualizacion,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cursos",
          filter: `id=eq.${cursoId}`,
        },
        programarActualizacion,
      )
      .subscribe();

    return () => {
      if (pendiente.current) clearTimeout(pendiente.current);
      void supabase.removeChannel(canal);
    };
  }, [cursoId, router]);

  return null;
}
