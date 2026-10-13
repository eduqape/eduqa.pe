"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Search, X } from "lucide-react";
import {
  ESTADOS_CURSO,
  ETIQUETA_ESTADO,
  ETIQUETA_ORDEN,
  ORDENES,
  hrefListado,
  paginasVisibles,
  type EstadoCurso,
  type Filtros,
  type Orden,
} from "@/lib/cursos-panel-filtro";

const claseSelect =
  "h-9 rounded-lg border border-borde-fuerte bg-fondo px-3 text-sm text-texto outline-none transition-colors hover:border-texto-tenue focus-visible:border-rojo-acento focus-visible:ring-1 focus-visible:ring-rojo-acento";

/**
 * Barra de búsqueda y filtros del listado, y la zona donde el servidor pinta
 * los resultados.
 *
 * Cada cambio navega a una URL nueva dentro de una transición: mientras el
 * servidor responde, los resultados anteriores se atenúan en vez de
 * desaparecer, y la barra no se bloquea.
 */
export function CatalogoPanel({
  filtros,
  areas,
  porEstado,
  total,
  paginas,
  desde,
  hasta,
  children,
}: {
  filtros: Filtros;
  areas: string[];
  porEstado: Record<EstadoCurso | "todos", number>;
  total: number;
  paginas: number;
  desde: number;
  hasta: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const buscador = useRef<HTMLInputElement>(null);

  // El texto del buscador sigue a la URL cuando cambia por fuera (atrás,
  // «Quitar filtros»), pero no mientras se escribe: si no, cada respuesta
  // del servidor borraría las letras tecleadas después de enviarla.
  const [q, setQ] = useState(filtros.q);
  const [qUrl, setQUrl] = useState(filtros.q);
  const [qEnviado, setQEnviado] = useState(filtros.q);
  if (filtros.q !== qUrl) {
    setQUrl(filtros.q);
    if (filtros.q !== qEnviado) setQ(filtros.q);
  }

  const navegar = (cambios: Partial<Filtros>, modo: "push" | "replace" = "push") =>
    iniciar(() => {
      const href = hrefListado(filtros, cambios);
      if (modo === "replace") router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });

  // Busca 300 ms después de la última tecla. La primera búsqueda deja una
  // entrada en el historial, para que «atrás» vuelva al listado completo; los
  // retoques posteriores la reemplazan en vez de apilar una por tecla.
  useEffect(() => {
    if (q.trim() === filtros.q) return;
    const espera = setTimeout(() => {
      const href = hrefListado(filtros, { q: q.trim() });
      setQEnviado(q.trim());
      iniciar(() => (filtros.q ? router.replace(href, { scroll: false }) : router.push(href, { scroll: false })));
    }, 300);
    return () => clearTimeout(espera);
  }, [q, filtros, router]);

  // «/» enfoca el buscador, como en GitHub o en la documentación de Next.
  useEffect(() => {
    const atajo = (evento: KeyboardEvent) => {
      const destino = evento.target as HTMLElement;
      if (evento.key !== "/" || evento.metaKey || evento.ctrlKey) return;
      if (destino.closest("input, textarea, select, [contenteditable='true']")) return;
      evento.preventDefault();
      buscador.current?.focus();
    };
    window.addEventListener("keydown", atajo);
    return () => window.removeEventListener("keydown", atajo);
  }, []);

  const hayFiltros = Boolean(filtros.q || filtros.area || filtros.estado !== "todos");

  return (
    <section aria-labelledby="titulo-listado" className="mt-6">
      <h2 id="titulo-listado" className="sr-only">
        Cursos
      </h2>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-tenue" aria-hidden="true" />
          <label htmlFor="buscar-cursos" className="sr-only">
            Buscar por título, código o dirección
          </label>
          <input
            ref={buscador}
            id="buscar-cursos"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && q) {
                e.preventDefault();
                setQ("");
              }
            }}
            placeholder="Buscar por título o código"
            autoComplete="off"
            className="h-10 w-full rounded-lg border border-borde-fuerte bg-fondo pl-9 pr-16 text-sm text-texto outline-none transition-colors placeholder:text-texto-tenue hover:border-texto-tenue focus-visible:border-rojo-acento focus-visible:ring-1 focus-visible:ring-rojo-acento [&::-webkit-search-cancel-button]:hidden"
          />
          {q ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                buscador.current?.focus();
              }}
              aria-label="Borrar la búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-texto-tenue transition-colors hover:bg-superficie hover:text-texto"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-borde px-1.5 font-mono text-[11px] text-texto-tenue sm:block">
              /
            </kbd>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="area-cursos" className="sr-only">
            Área
          </label>
          <select
            id="area-cursos"
            value={filtros.area}
            onChange={(e) => navegar({ area: e.target.value })}
            className={claseSelect}
          >
            <option value="">Todas las áreas</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <label htmlFor="orden-cursos" className="sr-only">
            Ordenar
          </label>
          <select
            id="orden-cursos"
            value={filtros.orden}
            onChange={(e) => navegar({ orden: e.target.value as Orden })}
            className={claseSelect}
          >
            {ORDENES.map((orden) => (
              <option key={orden} value={orden}>
                {ETIQUETA_ORDEN[orden]}
              </option>
            ))}
          </select>

          <div className="flex rounded-lg border border-borde-fuerte bg-fondo p-0.5" role="group" aria-label="Forma del listado">
            {(
              [
                ["lista", "Ver como lista", List],
                ["grilla", "Ver como grilla", LayoutGrid],
              ] as const
            ).map(([vista, etiqueta, IconoVista]) => (
              <button
                key={vista}
                type="button"
                onClick={() => navegar({ vista }, "replace")}
                aria-label={etiqueta}
                aria-pressed={filtros.vista === vista}
                className={`rounded-md p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-rojo-acento ${
                  filtros.vista === vista ? "bg-rojo-tenue text-rojo-acento" : "text-texto-tenue hover:bg-superficie hover:text-texto"
                }`}
              >
                <IconoVista size={15} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado">
        {(["todos", ...ESTADOS_CURSO] as const).map((estado) => {
          const activo = filtros.estado === estado;
          const cuenta = porEstado[estado];
          return (
            <button
              key={estado}
              type="button"
              aria-pressed={activo}
              onClick={() => navegar({ estado })}
              disabled={!activo && cuenta === 0}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-40 ${
                activo
                  ? "border-rojo-acento bg-rojo-tenue text-rojo-acento"
                  : "border-borde text-texto-suave enabled:hover:border-texto-tenue enabled:hover:text-texto"
              }`}
            >
              {estado === "todos" ? "Todos" : ETIQUETA_ESTADO[estado]}
              <span className="tabular-nums opacity-75">{cuenta}</span>
            </button>
          );
        })}
        {hayFiltros && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setQEnviado("");
              navegar({ q: "", area: "", estado: "todos" });
            }}
            className="ml-1 text-xs font-medium text-texto-suave underline-offset-4 transition-colors hover:text-rojo-acento hover:underline"
          >
            Quitar filtros
          </button>
        )}
      </div>

      <div className="relative mt-5">
        {/* Barra de progreso fina: dice «estoy buscando» sin mover nada de sitio. */}
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 -top-2 h-0.5 overflow-hidden rounded-full transition-opacity duration-200 ${pendiente ? "opacity-100" : "opacity-0"}`}
        >
          <div className="h-full w-full animate-pulse rounded-full bg-rojo-acento motion-reduce:animate-none" />
        </div>

        <p className="mb-3 text-xs text-texto-tenue" aria-live="polite">
          {total === 0
            ? "Ningún curso coincide."
            : total <= hasta - desde + 1
              ? `${total} ${total === 1 ? "curso" : "cursos"}`
              : `${desde}–${hasta} de ${total} cursos`}
        </p>

        <div
          aria-busy={pendiente}
          className={`transition-opacity duration-200 ${pendiente ? "opacity-50" : "opacity-100"}`}
        >
          {children}
        </div>
      </div>

      {paginas > 1 && (
        <nav aria-label="Páginas del listado" className="mt-8 flex flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => navegar({ pagina: filtros.pagina - 1 })}
            disabled={filtros.pagina <= 1}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm text-texto-suave transition-colors enabled:hover:bg-superficie enabled:hover:text-texto disabled:opacity-40"
          >
            <ChevronLeft size={15} aria-hidden="true" />
            Anterior
          </button>
          {paginasVisibles(filtros.pagina, paginas).map((n, i) =>
            n === null ? (
              <span key={`salto-${i}`} className="px-1 text-sm text-texto-tenue" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => navegar({ pagina: n })}
                aria-current={n === filtros.pagina ? "page" : undefined}
                aria-label={`Página ${n}`}
                className={`h-9 min-w-9 rounded-lg px-2 text-sm tabular-nums transition-colors ${
                  n === filtros.pagina ? "bg-rojo-tenue font-semibold text-rojo-acento" : "text-texto-suave hover:bg-superficie hover:text-texto"
                }`}
              >
                {n}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => navegar({ pagina: filtros.pagina + 1 })}
            disabled={filtros.pagina >= paginas}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm text-texto-suave transition-colors enabled:hover:bg-superficie enabled:hover:text-texto disabled:opacity-40"
          >
            Siguiente
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </nav>
      )}
    </section>
  );
}
