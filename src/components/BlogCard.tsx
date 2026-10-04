import Link from "next/link";
import { Clock } from "lucide-react";
import type { ArticuloBlog } from "@/lib/blog-types";
import { posicionObjetoCaratula, resolverCaratulaBlog } from "@/lib/blog-types";

/**
 * Tarjeta de un artículo en los listados.
 *
 * Toda la tarjeta es el enlace (el `<a>` del título se estira con `after:`),
 * así que el objetivo de clic es la tarjeta entera y no una línea de texto. Sin
 * carátula no se dibuja un bloque de relleno: el título ocupa ese lugar.
 */
export function BlogCard({
  articulo,
  nivel = "h3",
}: {
  articulo: ArticuloBlog;
  /** El nivel del título depende de la sección donde se pinta la tarjeta. */
  nivel?: "h2" | "h3";
}) {
  const caratula = resolverCaratulaBlog(articulo);
  const Titulo = nivel;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-borde bg-fondo transition-colors hover:border-rojo-acento has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-rojo-acento">
      {caratula && (
        <div className="aspect-video w-full overflow-hidden border-b border-borde bg-superficie">
          {/* La carátula puede venir de Medium: next/image no conoce ese dominio. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={caratula.url}
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: posicionObjetoCaratula(caratula.posicion) }}
            loading="lazy"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        {articulo.categorias.length > 0 && (
          <p className="text-xs font-semibold text-rojo-acento">
            {articulo.categorias.slice(0, 2).join(" · ")}
          </p>
        )}

        <Titulo className="mt-2 text-lg font-semibold leading-snug tracking-tight text-texto text-balance">
          <Link
            href={`/blog/${articulo.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:text-rojo-acento"
          >
            {articulo.titulo}
          </Link>
        </Titulo>

        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-texto-suave">
          {articulo.resumen}
        </p>

        <p className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-4 text-xs text-texto-tenue">
          <time dateTime={articulo.fechaIso}>{articulo.fecha}</time>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} aria-hidden="true" />
            {articulo.minutosLectura} min de lectura
          </span>
        </p>
      </div>
    </article>
  );
}
