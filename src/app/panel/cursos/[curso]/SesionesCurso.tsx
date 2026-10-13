"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronRight, FileCog, Loader2, Plus } from "lucide-react";
import type { SesionPanel } from "@/lib/cursos-panel";

/**
 * El contenido del curso: la ficha técnica y las sesiones, cada una con su
 * editor. Añadir una sesión la crea con plantilla y abre su editor.
 */
export function SesionesCurso({
  slug,
  sesiones,
  crearSesion,
}: {
  slug: string;
  sesiones: SesionPanel[];
  crearSesion: (slug: string) => Promise<{ ok: true; archivo: string } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [creando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nueva = () =>
    iniciar(async () => {
      setError(null);
      const r = await crearSesion(slug).catch(() => ({ ok: false as const, error: "No se pudo confirmar con el servidor." }));
      if (r.ok) router.push(`/panel/cursos/${slug}/archivos/${r.archivo}`);
      else setError(r.error);
    });

  const fila =
    "group flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-superficie focus-visible:bg-superficie focus-visible:outline-none";

  return (
    <section aria-labelledby="titulo-contenido">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="titulo-contenido" className="text-base font-semibold text-texto">
            Contenido
          </h2>
          <p className="mt-0.5 text-xs text-texto-tenue">
            {sesiones.length} {sesiones.length === 1 ? "sesión" : "sesiones"}. Ábrelas para escribir con vista previa.
          </p>
        </div>
        <button
          type="button"
          onClick={nueva}
          disabled={creando}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-borde-fuerte bg-fondo px-3 py-2 text-sm font-medium text-texto transition-colors hover:border-rojo-acento hover:text-rojo-acento disabled:opacity-50"
        >
          {creando ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
          {creando ? "Creando…" : "Nueva sesión"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-rojo-acento">
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <ul className="mt-4 divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-fondo">
        <li>
          <Link href={`/panel/cursos/${slug}/archivos/curso.md`} className={fila}>
            <FileCog size={18} className="shrink-0 text-texto-tenue transition-colors group-hover:text-rojo-acento" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-texto">Ficha técnica</span>
              <span className="block truncate text-xs text-texto-tenue">curso.md · área, nivel, horas, icono, paquetes y preludio</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-texto-tenue transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
          </Link>
        </li>
        {sesiones.map((s) => (
          <li key={s.archivo}>
            <Link href={`/panel/cursos/${slug}/archivos/${s.archivo}`} className={fila}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-superficie font-mono text-xs font-semibold tabular-nums text-texto-suave transition-colors group-hover:bg-rojo-tenue group-hover:text-rojo-acento">
                {s.numero ?? "?"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-texto">{s.titulo || "Sin título"}</span>
                <span className="block truncate text-xs tabular-nums text-texto-tenue">
                  {s.archivo} · {s.palabras.toLocaleString("es-PE")} palabras · {s.secciones}{" "}
                  {s.secciones === 1 ? "sección" : "secciones"} · {s.bloquesCodigo} de código
                  {s.ejercicios > 0 && ` · ${s.ejercicios} ${s.ejercicios === 1 ? "ejercicio" : "ejercicios"}`}
                </span>
              </span>
              {s.sinSalida > 0 && (
                <span className="hidden shrink-0 text-xs text-texto-suave sm:inline" title="Bloques de código sin salida">
                  {s.sinSalida} sin salida
                </span>
              )}
              <ChevronRight size={16} className="shrink-0 text-texto-tenue transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
