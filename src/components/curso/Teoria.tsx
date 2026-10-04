import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Doc } from "@/lib/cursos";
import { resolverImagenCurso } from "@/lib/imagenes-curso";
import { Citas } from "./Citas";
import { NotaTecnica } from "./NotaTecnica";

/**
 * Teoría con react-markdown + remark-gfm.
 * El GFM es lo que hace que las tablas de los notebooks se rendericen;
 * el markdown básico no las soporta.
 */
export function Teoria({
  contenido,
  docs,
  nota,
  baseImagenes,
}: {
  contenido: string;
  docs?: Doc[];
  nota?: string;
  /** Prefijo público del bucket del curso; resuelve `imagenes/…`. */
  baseImagenes?: string;
}) {
  return (
    <div className="max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => (
            <h2
              className="mt-10 scroll-mt-24 border-b border-borde pb-2 text-2xl font-semibold tracking-tight first:mt-0"
              {...p}
            />
          ),
          h2: (p) => (
            <h3 className="mt-8 scroll-mt-24 text-xl font-semibold tracking-tight" {...p} />
          ),
          h3: (p) => <h4 className="mt-6 font-semibold" {...p} />,
          p: (p) => <p className="mt-4 leading-relaxed text-texto-suave" {...p} />,
          ul: (p) => (
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-texto-suave" {...p} />
          ),
          ol: (p) => (
            <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-texto-suave" {...p} />
          ),
          li: (p) => <li className="leading-relaxed" {...p} />,
          a: (p) => (
            <a
              className="font-medium text-rojo-acento underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...p}
            />
          ),
          strong: (p) => <strong className="font-semibold text-texto" {...p} />,
          hr: () => <hr className="my-8 border-borde" />,
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element -- la imagen vive en Supabase Storage y su tamaño no se conoce al compilar.
            <img
              src={typeof src === "string" ? resolverImagenCurso(src, baseImagenes) : undefined}
              alt={alt ?? ""}
              loading="lazy"
              className="mt-6 h-auto max-w-full"
            />
          ),
          blockquote: (p) => (
            <blockquote
              className="mt-4 border-l-4 border-rojo-acento/40 bg-rojo-tenue py-2 pl-4 text-texto-suave"
              {...p}
            />
          ),
          // Código dentro del markdown (siempre en línea aquí: los bloques
          // reales del notebook llegan como celdas de código aparte).
          code: (p) => (
            <code
              className="rounded bg-superficie px-1.5 py-0.5 font-mono text-[0.85em] text-rojo-acento ring-1 ring-inset ring-borde"
              {...p}
            />
          ),
          pre: (p) => (
            <pre
              className="mt-4 overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-[0.8125rem] leading-relaxed text-zinc-200 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit [&_code]:ring-0"
              {...p}
            />
          ),
          // Las tablas necesitan su propio scroll: son lo que rompe el layout en móvil.
          table: (p) => (
            <div className="mt-5 overflow-x-auto rounded-lg border border-borde">
              <table className="w-full border-collapse text-sm" {...p} />
            </div>
          ),
          thead: (p) => <thead className="bg-superficie" {...p} />,
          th: (p) => (
            <th
              className="border-b border-borde px-3 py-2 text-left font-semibold"
              {...p}
            />
          ),
          td: (p) => (
            <td
              className="border-b border-borde px-3 py-2 align-top text-texto-suave"
              {...p}
            />
          ),
        }}
      >
        {contenido}
      </ReactMarkdown>
      <NotaTecnica texto={nota} />
      <Citas docs={docs} />
    </div>
  );
}
