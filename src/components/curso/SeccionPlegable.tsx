"use client";

import type { ReactNode } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";

/**
 * Sección de la lección, plegable. La cabecera es el disparador de un
 * Collapsible de Radix, que aporta estado, animación de altura y el cableado
 * de accesibilidad. Abiertas por omisión: plegar sirve para repasar.
 *
 * El ritmo vertical vive en la raíz y no en el disparador. Puesto en el
 * disparador, al plegarse el contenido desaparece y los encabezados quedan
 * separados de forma desigual.
 */
export function SeccionPlegable({
  id,
  titulo,
  nivel,
  children,
}: {
  id: string;
  titulo: string;
  nivel: number;
  children: ReactNode;
}) {
  const Encabezado = nivel === 1 ? "h2" : nivel === 2 ? "h3" : "h4";

  return (
    <Collapsible.Root
      defaultOpen
      id={id}
      className={`group/sec scroll-mt-6 ${
        nivel === 1 ? "mt-12 first:mt-0" : nivel === 2 ? "mt-9" : "mt-7 ml-4"
      }`}
    >
      <Collapsible.Trigger asChild>
        <button
          type="button"
          // El índice lateral observa este botón, no el contenedor: un
          // contenedor de nivel 1 envuelve a los de nivel 2, así que siempre
          // estaría visible a la vez que sus hijos y el hijo nunca ganaría.
          data-titulo-de={id}
          className={`flex w-full items-center gap-2 py-2 pr-2 text-left transition-colors hover:text-rojo-acento ${
            nivel === 1 ? "border-b border-borde" : ""
          }`}
        >
          <ChevronDown
            size={nivel === 1 ? 20 : nivel === 2 ? 17 : 15}
            aria-hidden="true"
            className="shrink-0 text-texto-tenue transition-transform group-data-[state=closed]/sec:-rotate-90"
          />
          <Encabezado
            className={`font-semibold tracking-tight ${
              nivel === 1 ? "text-2xl" : nivel === 2 ? "text-xl" : "text-base"
            }`}
          >
            {titulo}
          </Encabezado>
        </button>
      </Collapsible.Trigger>

      <Collapsible.Content className="animar-colapsable overflow-hidden">
        <div className="pt-2">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
