"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  ChevronRight,
  FlaskConical,
  Info,
  ListChecks,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import type { Curso, Leccion } from "@/lib/cursos";
import { MarcaCalculadora } from "@/components/MarcaCalculadora";
import { MarcaTextoLateral } from "@/components/MarcaTextoLateral";

export type HerramientaCurso = {
  href: string;
  etiqueta: string;
  tipo: "sandbox" | "quiz";
  activa?: boolean;
};

function EnlaceHerramienta({
  herramienta,
  onNavegar,
}: {
  herramienta: HerramientaCurso;
  onNavegar?: () => void;
}) {
  const Icono = herramienta.tipo === "sandbox" ? FlaskConical : ListChecks;
  return (
    <Link
      href={herramienta.href}
      onClick={onNavegar}
      aria-current={herramienta.activa ? "page" : undefined}
      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rojo-acento ${
        herramienta.activa
          ? "bg-rojo-tenue font-medium text-rojo-acento"
          : "text-texto-suave hover:bg-superficie hover:text-rojo-acento"
      }`}
    >
      <Icono size={15} aria-hidden="true" />
      {herramienta.etiqueta}
    </Link>
  );
}

/**
 * Devuelve el id de la sección que se está leyendo.
 *
 * IntersectionObserver avisa cuándo entra o sale cada encabezado; con eso se
 * mantiene una lista de los visibles y se toma el primero en orden de
 * documento. El margen superior negativo hace que una sección deje de contar
 * apenas su título se va por arriba de la pantalla, que es lo que uno espera
 * al desplazarse.
 */
function useSeccionVisible(ids: string[]) {
  const [visible, setVisible] = useState<string | null>(null);

  useEffect(() => {
    // Se observan los títulos, no los contenedores de sección: el contenedor
    // de un encabezado de nivel 1 envuelve a los de nivel 2, así que estaría
    // intersectando siempre que lo esté cualquiera de sus hijos y el hijo
    // nunca llegaría a ganar. Los títulos son hermanos en la pantalla aunque
    // sus secciones estén anidadas.
    const nodos = ids
      .map((id) => document.querySelector<HTMLElement>(`[data-titulo-de="${id}"]`))
      .filter((n): n is HTMLElement => n !== null);
    if (nodos.length === 0) return;

    const dentro = new Set<string>();

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          const id = (e.target as HTMLElement).dataset.tituloDe;
          if (!id) continue;
          if (e.isIntersecting) dentro.add(id);
          else dentro.delete(id);
        }
        // El orden de `ids` es el del documento, así que el primero que esté
        // dentro es el de más arriba en la pantalla.
        setVisible(ids.find((id) => dentro.has(id)) ?? null);
      },
      { rootMargin: "0px 0px -55% 0px" },
    );

    nodos.forEach((n) => observador.observe(n));
    return () => observador.disconnect();
  }, [ids]);

  return visible;
}

/**
 * Índice del curso. Cada lección es un Collapsible de Radix, que aporta el
 * estado, la animación de altura y el cableado de accesibilidad (aria-expanded,
 * aria-controls y manejo de teclado).
 */
function Indice({
  curso,
  actual,
  seccionActiva,
  onNavegar,
  informacionActiva = false,
}: {
  curso: Curso;
  actual?: Leccion;
  seccionActiva: string | null;
  onNavegar?: () => void;
  informacionActiva?: boolean;
}) {
  return (
    <ol className="space-y-1">
      {curso.lecciones.map((l) => {
        const activa = l.slug === actual?.slug;
        return (
          <li key={l.slug}>
            <Collapsible.Root defaultOpen={activa}>
              <div
                className={`flex items-start gap-1 rounded-lg pr-1 ${
                  activa ? "bg-rojo-tenue" : "hover:bg-superficie"
                }`}
              >
                <Link
                  href={`/cursos/${curso.slug}/${l.slug}`}
                  onClick={onNavegar}
                  aria-current={activa ? "page" : undefined}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                    activa ? "font-medium text-rojo-acento" : "text-texto-suave"
                  }`}
                >
                  <span className="font-mono text-xs text-texto-tenue">
                    {String(l.numero).padStart(2, "0")}
                  </span>{" "}
                  {l.titulo}
                </Link>

                {l.secciones.length > 0 && (
                  <Collapsible.Trigger asChild>
                    <button
                      type="button"
                      aria-label={`Secciones de ${l.titulo}`}
                      className="group/tr mt-1.5 rounded p-1 text-texto-tenue transition-colors hover:text-rojo-acento"
                    >
                      <ChevronRight
                        size={14}
                        aria-hidden="true"
                        className="transition-transform group-data-[state=open]/tr:rotate-90"
                      />
                    </button>
                  </Collapsible.Trigger>
                )}
              </div>

              <Collapsible.Content className="animar-colapsable overflow-hidden">
                <ul className="ml-3 mt-1 space-y-0.5 border-l border-borde pl-3">
                  {l.secciones.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/cursos/${curso.slug}/${l.slug}#${s.id}`}
                        onClick={onNavegar}
                        aria-current={
                          activa && s.id === seccionActiva ? "location" : undefined
                        }
                        className={`block rounded py-1 text-xs leading-snug transition-colors hover:text-rojo-acento ${
                          s.nivel === 1
                            ? "px-2 font-medium"
                            : s.nivel === 2
                              ? "pl-5 pr-2"
                              : "pl-9 pr-2"
                        } ${
                          activa && s.id === seccionActiva
                            ? "text-rojo-acento"
                            : "text-texto-tenue"
                        }`}
                      >
                        {s.titulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Collapsible.Content>
            </Collapsible.Root>
          </li>
        );
      })}

      <li>
        <div
          className={`flex items-start gap-1 rounded-lg pr-1 ${
            informacionActiva ? "bg-rojo-tenue" : "hover:bg-superficie"
          }`}
        >
          <Link
            href={`/cursos/${curso.slug}/informacion`}
            onClick={onNavegar}
            aria-current={informacionActiva ? "page" : undefined}
            className={`flex-1 rounded-lg px-3 py-2 text-sm ${
              informacionActiva
                ? "font-medium text-rojo-acento"
                : "text-texto-suave"
            }`}
          >
            <span className="font-mono text-xs text-texto-tenue">i</span>{" "}
            Información del curso
          </Link>
        </div>
      </li>
    </ol>
  );
}

function Contenido({
  curso,
  actual,
  inicio,
  seccionActiva,
  onNavegar,
  herramientas,
  codigo,
  informacionActiva = false,
}: {
  curso: Curso;
  actual?: Leccion;
  inicio: string;
  seccionActiva: string | null;
  onNavegar?: () => void;
  herramientas?: HerramientaCurso[];
  codigo?: string | null;
  informacionActiva?: boolean;
}) {
  return (
    <nav className="flex h-full flex-col">
      <Link
        href={inicio}
        className="flex items-center gap-2 border-b border-borde px-4 py-4"
      >
        <MarcaTextoLateral />
      </Link>

      <div className="border-b border-borde px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-texto-tenue">Curso</p>
        <p className="mt-1 text-sm font-semibold leading-snug">{curso.titulo}</p>
        {codigo && (
          <p className="mt-1.5 font-mono text-[10px] tracking-wider text-texto-tenue">
            {codigo}
          </p>
        )}
        {herramientas?.some((herramienta) => herramienta.tipo === "sandbox") && (
          <div className="mt-3 space-y-1">
            {herramientas
              .filter((herramienta) => herramienta.tipo === "sandbox")
              .map((herramienta) => (
                <EnlaceHerramienta
                  key={herramienta.href}
                  herramienta={herramienta}
                  onNavegar={onNavegar}
                />
              ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <Indice
          curso={curso}
          actual={actual}
          seccionActiva={seccionActiva}
          onNavegar={onNavegar}
          informacionActiva={informacionActiva}
        />
        {herramientas?.some((herramienta) => herramienta.tipo === "quiz") && (
          <div className="mt-4 border-t border-borde pt-4">
            {herramientas
              .filter((herramienta) => herramienta.tipo === "quiz")
              .map((herramienta) => (
                <EnlaceHerramienta
                  key={herramienta.href}
                  herramienta={herramienta}
                  onNavegar={onNavegar}
                />
              ))}
          </div>
        )}

      </div>
    </nav>
  );
}

/**
 * `inicio` es a dónde lleva el logo. Quien lee un curso de acceso libre no
 * tiene sesión, así que /cursos le respondería con una redirección al acceso:
 * para ese caso el destino es la portada.
 */
export function BarraLateral({
  curso,
  actual,
  inicio = "/cursos",
  herramientas,
  codigo,
  informacionActiva = false,
}: {
  curso: Curso;
  actual?: Leccion;
  inicio?: string;
  herramientas?: HerramientaCurso[];
  codigo?: string | null;
  informacionActiva?: boolean;
}) {
  const [movilAbierta, setMovilAbierta] = useState(false);
  const [plegada, setPlegada] = useState(false);
  // Memorizado: `map` devolvería un array nuevo en cada render y el efecto
  // del observador volvería a montarse sin parar.
  const ids = useMemo(
    () => actual?.secciones.map((s) => s.id) ?? [],
    [actual?.secciones],
  );
  const seccionActiva = useSeccionVisible(ids);

  // La barra de direcciones acompaña a la lectura, así que copiar la URL da un
  // enlace al punto exacto donde está el lector. Va con `replaceState` a
  // propósito: con `pushState` cada sección dejaría una entrada en el
  // historial y el botón de atrás quedaría inservible. Asignar
  // `location.hash` tampoco sirve, porque el navegador saltaría el scroll.
  useEffect(() => {
    if (!seccionActiva) return;
    if (window.location.hash === `#${seccionActiva}`) return;
    window.history.replaceState(null, "", `#${seccionActiva}`);
  }, [seccionActiva]);

  return (
    <>
      {/* Móvil */}
      <button
        type="button"
        onClick={() => setMovilAbierta(true)}
        className="fixed bottom-5 left-5 z-30 flex items-center gap-2 rounded-full bg-rojo px-4 py-3 text-sm font-semibold text-white shadow-lg lg:hidden"
      >
        <Menu size={16} aria-hidden="true" />
        Contenido
      </button>

      {movilAbierta && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMovilAbierta(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-fondo shadow-xl">
            <button
              type="button"
              onClick={() => setMovilAbierta(false)}
              aria-label="Cerrar"
              className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-texto-tenue hover:bg-superficie"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <Contenido
              curso={curso}
              actual={actual}
              inicio={inicio}
              herramientas={herramientas}
              codigo={codigo}
              informacionActiva={informacionActiva}
              seccionActiva={seccionActiva}
              onNavegar={() => setMovilAbierta(false)}
            />
          </div>
        </div>
      )}

      {/* Escritorio: plegable a una franja estrecha */}
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 border-r border-borde bg-fondo transition-[width] duration-200 lg:block ${
          plegada ? "w-14" : "w-72"
        }`}
      >
        {plegada ? (
          <div className="flex h-full flex-col items-center gap-4 py-4">
            <button
              type="button"
              onClick={() => setPlegada(false)}
              aria-label="Mostrar el índice del curso"
              aria-expanded={false}
              className="rounded-lg p-2 text-texto-tenue transition-colors hover:bg-superficie hover:text-rojo-acento"
            >
              <PanelLeftOpen size={18} aria-hidden="true" />
            </button>
            <Link href={inicio} aria-label="Volver">
              <MarcaCalculadora texto="E" className="text-lg text-rojo-acento" />
            </Link>
            {herramientas?.map((herramienta) => {
              const Icono = herramienta.tipo === "sandbox" ? FlaskConical : ListChecks;
              return (
                <Link
                  key={herramienta.href}
                  href={herramienta.href}
                  aria-label={herramienta.etiqueta}
                  aria-current={herramienta.activa ? "page" : undefined}
                  className={`rounded-lg p-2 transition-colors hover:bg-superficie ${
                    herramienta.activa ? "bg-rojo-tenue text-rojo-acento" : "text-texto-suave hover:text-rojo-acento"
                  }`}
                >
                  <Icono size={18} aria-hidden="true" />
                </Link>
              );
            })}
            <Link
              href={`/cursos/${curso.slug}/informacion`}
              aria-label="Información del curso (opcional)"
              aria-current={informacionActiva ? "page" : undefined}
              className={`mt-auto mb-10 rounded-lg p-2 transition-colors hover:bg-superficie ${
                informacionActiva
                  ? "bg-rojo-tenue text-rojo-acento"
                  : "text-texto-suave hover:text-rojo-acento"
              }`}
            >
              <Info size={18} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="relative h-full">
            <button
              type="button"
              onClick={() => setPlegada(true)}
              aria-label="Ocultar el índice del curso"
              aria-expanded
              className="absolute bottom-4 right-3 z-10 rounded-lg border border-borde bg-fondo p-1.5 text-texto-tenue transition-colors hover:text-rojo-acento"
            >
              <PanelLeftClose size={16} aria-hidden="true" />
            </button>
            <Contenido
              curso={curso}
              actual={actual}
              inicio={inicio}
              herramientas={herramientas}
              codigo={codigo}
              informacionActiva={informacionActiva}
              seccionActiva={seccionActiva}
            />
          </div>
        )}
      </aside>
    </>
  );
}
