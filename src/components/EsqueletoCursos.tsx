import { BookOpen } from "lucide-react";

/** Esqueleto de /cursos mientras se leen matrículas, precios y progreso. */
export function EsqueletoCursos() {
  return (
    <div
      className="mx-auto w-full max-w-5xl px-6 py-14 lg:pl-64 xl:pl-32 2xl:pl-6"
      role="status"
      aria-live="polite"
      aria-label="Cargando cursos"
    >
      <div className="flex items-center gap-3 text-sm font-medium text-texto-suave">
        <BookOpen size={20} className="animate-pulse text-rojo-acento" aria-hidden="true" />
        Cargando cursos…
      </div>

      <div aria-hidden="true">
        <div className="mt-8 h-4 w-20 animate-pulse rounded bg-borde" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="h-9 w-64 max-w-full animate-pulse rounded bg-borde" />
          <div className="h-7 w-44 animate-pulse rounded-full bg-borde" />
        </div>

        <div className="mt-12 h-6 w-40 animate-pulse rounded bg-borde" />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl border border-borde bg-fondo"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="p-5">
                <div className="size-9 rounded-lg bg-borde" />
                <div className="mt-5 h-5 w-3/4 rounded bg-borde" />
                <div className="mt-3 h-4 w-full rounded bg-borde" />
                <div className="mt-2 h-4 w-2/3 rounded bg-borde" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
