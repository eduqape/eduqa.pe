"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpenCheck, Library, Plug, Search, Shapes, WandSparkles } from "lucide-react";
import type { Recurso } from "@/lib/recursos";

const ICONOS = {
  redaccion: BookOpenCheck,
  api: Plug,
  "tipos-de-preguntas": Library,
  "animaciones-ui": WandSparkles,
  "catalogo-svg": Shapes,
};

export function BuscadorRecursos({ recursos }: { recursos: Recurso[] }) {
  const [busqueda, setBusqueda] = useState("");
  const termino = busqueda.trim().toLocaleLowerCase("es");
  const visibles = recursos.filter((recurso) =>
    [recurso.titulo, recurso.resumen, recurso.destinatarios, recurso.busqueda ?? ""].some((valor) =>
      valor.toLocaleLowerCase("es").includes(termino),
    ),
  );

  return (
    <div className="mt-8">
      <label htmlFor="buscar-recurso" className="mb-2 block text-sm font-medium">Buscar recursos</label>
      <div className="relative">
        <Search size={18} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-texto-tenue" />
        <input id="buscar-recurso" type="search" value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Título, descripción o destinatario"
          className="w-full rounded-xl border border-borde bg-superficie py-3 pl-11 pr-4 text-sm text-texto outline-none focus:border-rojo-acento" />
      </div>
      <p role="status" className="mt-2 text-sm text-texto-tenue">
        {visibles.length} {visibles.length === 1 ? "recurso" : "recursos"}
      </p>
      {visibles.length === 0 ? (
        <p className="mt-6 rounded-xl border border-borde p-5 text-sm text-texto-suave">No hay recursos que coincidan con la búsqueda.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {visibles.map((recurso) => {
            const Icono = ICONOS[recurso.slug];
            return (
              <li key={recurso.slug}>
                <Link href={`/recursos/${recurso.slug}`}
                  className="group flex items-start gap-4 rounded-xl border border-borde bg-fondo p-5 transition-colors hover:border-rojo-acento">
                  <Icono size={22} className="mt-0.5 shrink-0 text-texto-tenue group-hover:text-rojo-acento" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-base font-semibold group-hover:text-rojo-acento">{recurso.titulo}</span>
                      <span className="rounded-md border border-borde px-2 py-0.5 text-xs text-texto-tenue">v{recurso.version}</span>
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-texto-suave">{recurso.resumen}</span>
                    <span className="mt-2 block text-xs uppercase tracking-wide text-texto-tenue">{recurso.destinatarios}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
