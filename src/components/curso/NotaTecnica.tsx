import { ChevronRight } from "lucide-react";

/**
 * Precisión técnica del bloque, plegada por defecto.
 * Quien recién empieza sigue la línea principal sin tropezar; quien quiere el
 * detalle exacto lo abre. `details` nativo: sin JavaScript y accesible por teclado.
 */
export function NotaTecnica({ texto }: { texto?: string }) {
  if (!texto) return null;

  return (
    <details className="group/nota mt-2">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[0.8125rem] text-texto-tenue transition-colors marker:content-none hover:text-rojo-acento">
        <ChevronRight
          size={13}
          aria-hidden="true"
          className="shrink-0 transition-transform group-open/nota:rotate-90"
        />
        Nota técnica
      </summary>
      <p className="mt-1.5 pl-[17px] text-[0.8125rem] leading-relaxed text-texto-tenue">
        {texto.split(/`([^`]+)`/).map((trozo, i) =>
          i % 2 ? (
            <code key={i} className="rounded bg-superficie px-0.5 font-mono text-[0.9em] text-texto-suave">
              {trozo}
            </code>
          ) : (
            trozo
          ),
        )}
      </p>
    </details>
  );
}
