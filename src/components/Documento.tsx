import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Documento interno en Markdown.
 *
 * Comparte estilos con la teoría de los cursos pero es un componente aparte:
 * aquí no hay citas plegables, notas técnicas ni bloques ejecutables, y meter
 * las dos necesidades en el mismo componente obligaría a que cada uno ignorara
 * la mitad de las opciones del otro.
 */
export function Documento({ markdown }: { markdown: string }) {
  return (
    <div className="space-y-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: (p) => (
            <h2 className="mt-10 border-b border-borde pb-2 text-lg font-semibold" {...p} />
          ),
          h3: (p) => <h3 className="mt-6 text-base font-semibold" {...p} />,
          p: (p) => <p className="text-sm leading-relaxed text-texto-suave" {...p} />,
          ul: (p) => <ul className="ml-5 list-disc space-y-1.5 text-sm text-texto-suave" {...p} />,
          ol: (p) => <ol className="ml-5 list-decimal space-y-1.5 text-sm text-texto-suave" {...p} />,
          li: (p) => <li className="leading-relaxed" {...p} />,
          strong: (p) => <strong className="font-semibold text-texto" {...p} />,
          a: (p) => (
            <a
              className="text-rojo-acento underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
              {...p}
            />
          ),
          code: ({ children, ...p }) => (
            <code
              className="rounded bg-superficie px-1.5 py-0.5 font-mono text-[0.85em] text-texto"
              {...p}
            >
              {children}
            </code>
          ),
          pre: (p) => (
            <pre
              className="overflow-x-auto rounded-xl border border-borde bg-superficie p-4 font-mono text-[0.78rem] leading-relaxed text-texto-suave [&_code]:bg-transparent [&_code]:p-0"
              {...p}
            />
          ),
          table: (p) => (
            <div className="overflow-x-auto rounded-xl border border-borde">
              <table className="w-full border-collapse text-sm" {...p} />
            </div>
          ),
          th: (p) => (
            <th className="border-b border-borde bg-superficie px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-texto-tenue" {...p} />
          ),
          td: (p) => <td className="border-b border-borde px-4 py-2 text-texto-suave" {...p} />,
          blockquote: (p) => (
            <blockquote className="rounded-xl border border-borde bg-fondo px-4 py-3 text-sm italic text-texto-suave" {...p} />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
