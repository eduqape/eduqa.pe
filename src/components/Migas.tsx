import Link from "next/link";
import { ChevronRight, House } from "lucide-react";

export type Miga = { texto: string; href?: string };

/**
 * Migas de pan. El último elemento nunca es enlace y lleva aria-current,
 * porque es la página en la que ya estás.
 *
 * Ocupan siempre una sola línea. Con títulos largos, los elementos
 * intermedios se acortan primero con puntos suspensivos y el último cede
 * menos; los cortos, como «Cursos», no se acortan nunca; el texto completo queda en `title`. `contain: inline-size` evita que
 * el ancho del texto completo ensanche la página cuando el contenedor es un
 * elemento flex sin `min-w-0`.
 */
export function Migas({ items }: { items: Miga[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="mb-6 [contain:inline-size]">
      <ol className="flex min-w-0 items-center gap-1 text-sm text-texto-tenue">
        <li
          className="miga-stagger flex shrink-0 items-center gap-1"
          style={{ animationDelay: "0ms" }}
        >
          <Link
            href="/"
            aria-label="Inicio"
            className="rounded p-0.5 transition-colors hover:text-rojo-acento"
          >
            <House size={14} aria-hidden="true" />
          </Link>
        </li>

        {items.map((m, i) => {
          const ultimo = i === items.length - 1;
          return (
            <li
              key={`${m.texto}-${i}`}
              className={`miga-stagger flex min-w-0 items-center gap-1 ${
                m.texto.length <= 12 ? "shrink-0" : ultimo ? "shrink-[0.35]" : "shrink"
              }`}
              style={{ animationDelay: `${(i + 1) * 65}ms` }}
            >
              <ChevronRight size={13} aria-hidden="true" className="shrink-0 opacity-60" />
              {m.href && !ultimo ? (
                <Link href={m.href} title={m.texto} className="truncate transition-colors hover:text-rojo-acento">
                  {m.texto}
                </Link>
              ) : (
                <span aria-current={ultimo ? "page" : undefined} title={m.texto} className="truncate text-texto">
                  {m.texto}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
