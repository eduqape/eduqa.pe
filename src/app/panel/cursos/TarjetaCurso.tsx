import Link from "next/link";
import { AlertTriangle, BookOpen, ChevronRight, Clock, Globe } from "lucide-react";
import { Icono } from "@/components/Iconos";
import { ETIQUETA_ESTADO, type EstadoCurso, type FilaPanel, type Vista } from "@/lib/cursos-panel-filtro";

const COLOR_ESTADO: Record<EstadoCurso, string> = {
  borrador: "bg-superficie text-texto-suave ring-borde-fuerte",
  privado: "bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-300",
  publico: "bg-exito/10 text-exito ring-exito/30",
};

/** Estado del curso: color y palabra, para que se lea también en monocromo. */
export function ChipEstado({ estado, className = "" }: { estado: string; className?: string }) {
  const conocido = estado in ETIQUETA_ESTADO ? (estado as EstadoCurso) : null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
        conocido ? COLOR_ESTADO[conocido] : COLOR_ESTADO.borrador
      } ${className}`}
    >
      {conocido ? ETIQUETA_ESTADO[conocido] : estado}
    </span>
  );
}

export function fechaRelativa(iso: string | null): string {
  if (!iso) return "sin fecha";
  const dias = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

const precio = (n: number) => (n === 0 ? "Gratis" : `S/${n.toFixed(2)}`);

/**
 * Un curso en el listado. Toda la tarjeta lleva a su ficha de gestión; la
 * edición ocurre allí y no dentro de la grilla, que así no cambia de forma.
 */
export function TarjetaCurso({
  curso,
  sesiones,
  vista,
  indice,
}: {
  curso: FilaPanel;
  sesiones: number;
  vista: Vista;
  indice: number;
}) {
  const href = `/panel/cursos/${curso.slug}`;
  const esMicro = curso.formato === "microcurso" || curso.formato === "pildora";
  // La entrada escalonada vive en el envoltorio: si el retardo estuviera en
  // la tarjeta, también retrasaría la respuesta al pasar el ratón.
  const entrada = {
    className:
      "transition-[opacity,translate] duration-300 ease-out starting:translate-y-1.5 starting:opacity-0 motion-reduce:transition-none",
    style: { transitionDelay: `${Math.min(indice, 12) * 25}ms` },
  };

  const aviso = !curso.fichaLegible && (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rojo-acento">
      <AlertTriangle size={12} aria-hidden="true" />
      Ficha ilegible
    </span>
  );

  if (vista === "lista") {
    return (
      <li {...entrada}>
        <article className="group relative flex items-center gap-3 rounded-xl border border-borde bg-fondo px-4 py-3.5 sm:gap-4 transition-[border-color,background-color] duration-150 hover:border-rojo-acento/60 focus-within:border-rojo-acento">
          <Icono nombre={curso.icono} className="size-9 shrink-0 text-texto-tenue transition-colors duration-150 group-hover:text-rojo-acento" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-texto">
              <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-rojo-acento">
                {curso.titulo}
              </Link>
            </h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-texto-tenue">
              <span className="font-mono">{curso.codigo ?? "sin código"}</span>
              {curso.area && <span>· {curso.area}</span>}
              {esMicro && <span>· {curso.formato === "pildora" ? "Píldora" : "Microcurso"}</span>}
              {aviso}
              <ChipEstado estado={curso.estado} className="sm:hidden" />
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-4 text-xs tabular-nums text-texto-suave md:flex">
            <span className="flex w-10 items-center gap-1" title="Sesiones">
              <BookOpen size={13} aria-hidden="true" />
              {sesiones}
            </span>
            <span className="w-16 text-right font-medium text-texto">{precio(curso.precio)}</span>
            <span className="w-24 text-right text-texto-tenue" title={curso.actualizadoEn ?? undefined}>
              {fechaRelativa(curso.actualizadoEn)}
            </span>
          </div>
          <div className="hidden shrink-0 items-center justify-end gap-1.5 sm:flex md:w-24">
            {curso.accesoLibre && curso.estado === "publico" && (
              <Globe size={13} className="text-rojo-acento" aria-label="Acceso libre" />
            )}
            <ChipEstado estado={curso.estado} />
          </div>
          <ChevronRight
            size={16}
            className="shrink-0 text-texto-tenue transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-rojo-acento motion-reduce:transition-none"
            aria-hidden="true"
          />
        </article>
      </li>
    );
  }

  return (
    <li {...entrada}>
      <article className="group relative flex h-full flex-col rounded-xl border border-borde bg-fondo p-5 transition-[border-color,translate,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-rojo-acento/60 hover:shadow-lg hover:shadow-black/5 focus-within:border-rojo-acento motion-reduce:transition-none motion-reduce:hover:translate-y-0">
        <div className="flex items-start justify-between gap-3">
          <Icono nombre={curso.icono} className="size-10 shrink-0 text-texto-tenue transition-colors duration-200 group-hover:text-rojo-acento" />
          <ChipEstado estado={curso.estado} />
        </div>
        <p className="mt-4 flex flex-wrap items-center gap-x-2 text-xs text-texto-tenue">
          <span className="font-mono">{curso.codigo ?? "sin código"}</span>
          {esMicro && <span>· {curso.formato === "pildora" ? "Píldora" : "Microcurso"}</span>}
          {curso.accesoLibre && curso.estado === "publico" && (
            <span className="inline-flex items-center gap-1 text-rojo-acento">
              · <Globe size={11} aria-hidden="true" /> Acceso libre
            </span>
          )}
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-base font-semibold leading-snug text-texto">
          <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-rojo-acento">
            {curso.titulo}
          </Link>
        </h3>
        {/* El recorte va en el párrafo y el estiramiento en su caja: si el
            mismo elemento crece, asoma media línea por debajo del recorte. */}
        <div className="mt-2 flex-1">
          <p className="line-clamp-2 text-sm leading-relaxed text-texto-suave">
            {curso.resumen || <span className="italic text-texto-tenue">Sin resumen todavía.</span>}
          </p>
          {aviso && <p className="mt-2">{aviso}</p>}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-borde pt-3 text-xs tabular-nums text-texto-tenue">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1" title="Sesiones">
              <BookOpen size={13} aria-hidden="true" />
              {sesiones}
            </span>
            {curso.horas > 0 && (
              <span className="flex items-center gap-1" title="Horas">
                <Clock size={13} aria-hidden="true" />
                {curso.horas} h
              </span>
            )}
          </span>
          <span className="font-medium text-texto">{precio(curso.precio)}</span>
        </div>
      </article>
    </li>
  );
}
