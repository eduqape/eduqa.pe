"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { marcarVista } from "./acciones";
import { MarcaInline } from "@/components/LlamaMarca";
import { Boton } from "@/components/ui";

/**
 * Marca la sesión como completada cuando el lector llega al final y, además,
 * ha pasado en ella el tiempo mínimo de lectura.
 *
 * Llegar al centinela no basta: plegando todas las secciones se alcanza el
 * final en segundos. El tiempo mínimo se calcula en el servidor a partir de
 * las palabras de la sesión (ver `src/lib/lectura.ts`) y solo corre con la
 * pestaña visible. Se conserva en el navegador para que recargar la página no
 * obligue a empezar de cero.
 *
 * Quien ya conoce el material la completa pasando a la siguiente sesión
 * (`EnlaceAvance`), sin esperar el tiempo mínimo.
 *
 * Al marcarse por primera vez se celebra a pantalla completa. La celebración
 * solo aparece en ese momento: quien vuelve a una sesión que ya tenía hecha
 * no debería tropezar otra vez con la misma capa.
 */
export function AvanceLeccion({
  curso,
  leccion,
  vista,
  tituloLeccion,
  siguiente,
  volverA,
  marcaCierre = null,
  segundosMinimos,
}: {
  curso: string;
  leccion: string;
  vista: boolean;
  tituloLeccion: string;
  /** Sesión siguiente del curso, si queda alguna. */
  siguiente?: { slug: string; titulo: string };
  /** Destino cuando el curso se ha terminado. */
  volverA: string;
  /** SVG personalizado de la marca para el cierre; null usa la llama original. */
  marcaCierre?: string | null;
  /** Tiempo mínimo de lectura de la sesión, en segundos. */
  segundosMinimos: number;
}) {
  const [celebrando, setCelebrando] = useState(false);
  const [completada, setCompletada] = useState(vista);
  const [segundosLeidos, setSegundosLeidos] = useState(0);
  const [error, setError] = useState(false);
  const centinela = useRef<HTMLDivElement>(null);
  // Evita una segunda escritura mientras la primera sigue en curso.
  const yaPedido = useRef(vista);
  // El temporizador y el observador consultan el estado del otro por ref:
  // la sesión se marca en el callback que completa la segunda condición.
  const alFinal = useRef(false);
  const tiempoCumplido = useRef(false);
  // Tras un fallo de escritura la marca automática se detiene: reintentar
  // cada segundo solo repetiría el error. El enlace «Siguiente» lo reintenta.
  const autoDetenido = useRef(false);
  const clave = `eduqa:lectura:${curso}/${leccion}`;

  const marcar = useCallback(async () => {
    if (yaPedido.current || autoDetenido.current) return;
    yaPedido.current = true;
    const resultado = await marcarVista(curso, leccion);
    if (!resultado.ok) {
      yaPedido.current = false;
      autoDetenido.current = true;
      setError(true);
      return;
    }
    setError(false);
    setCompletada(true);
    setCelebrando(true);
  }, [curso, leccion]);

  // Cuenta el tiempo solo con la pestaña visible.
  useEffect(() => {
    if (vista) return;
    let acumulado = 0;
    try {
      acumulado = Number(sessionStorage.getItem(clave)) || 0;
    } catch {}
    const intervalo = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      acumulado += 1;
      setSegundosLeidos(acumulado);
      try {
        sessionStorage.setItem(clave, String(acumulado));
      } catch {}
      if (acumulado >= segundosMinimos) {
        tiempoCumplido.current = true;
        if (alFinal.current) void marcar();
      }
    }, 1000);
    return () => window.clearInterval(intervalo);
  }, [clave, vista, segundosMinimos, marcar]);

  // Detecta que el lector llegó al final de la sesión.
  useEffect(() => {
    const nodo = centinela.current;
    if (!nodo || vista) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        alFinal.current = true;
        if (tiempoCumplido.current) void marcar();
      },
      { rootMargin: "0px 0px -80px 0px" },
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [vista, marcar]);

  const restantes = Math.max(0, segundosMinimos - segundosLeidos);

  return (
    <>
      <div ref={centinela} className="mt-12 border-t border-borde pt-6">
        {completada ? (
          <p className="flex items-center gap-2 text-sm text-exito">
            <Check size={16} aria-hidden="true" />
            Sesión completada
          </p>
        ) : (
          <p className="text-sm text-texto-suave" aria-live="polite">
            {error
              ? "No se pudo guardar tu avance. Se guardará al pasar a la siguiente sesión."
              : segundosLeidos >= segundosMinimos
                ? "Tiempo de lectura cumplido: la sesión se marcará al llegar aquí."
                : `Lectura mínima: ${duracion(segundosMinimos)}. Faltan ${duracion(restantes)} con la pestaña abierta, o pasa a la siguiente sesión para darla por completada.`}
          </p>
        )}
      </div>
      {celebrando && (
        <Celebracion
          tituloLeccion={tituloLeccion}
          siguiente={siguiente}
          curso={curso}
          volverA={volverA}
          marcaCierre={marcaCierre}
          onCerrar={() => setCelebrando(false)}
        />
      )}
    </>
  );
}

/** «4 min 05 s», «45 s». */
function duracion(segundos: number) {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  if (minutos === 0) return `${resto} s`;
  return `${minutos} min ${String(resto).padStart(2, "0")} s`;
}

function Celebracion({
  tituloLeccion,
  siguiente,
  curso,
  volverA,
  marcaCierre = null,
  onCerrar,
}: {
  tituloLeccion: string;
  siguiente?: { slug: string; titulo: string };
  curso: string;
  volverA: string;
  /** SVG personalizado de la marca para el cierre; null usa la llama original. */
  marcaCierre?: string | null;
  onCerrar: () => void;
}) {
  // El foco entra en la capa para que quien navegue con teclado no se quede
  // detrás, y Escape la cierra.
  const cierreRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cierreRef.current?.focus();
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [onCerrar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sesión completada"
      className="animar-velo fixed inset-0 z-50 flex items-center justify-center bg-fondo/95 px-6 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center text-center">
        {/* La marca en el centro, con dos anillos saliendo de ella. El
            desfase entre los dos hace que se lean como una onda y no como
            un parpadeo. */}
        <div className="relative flex size-32 items-center justify-center">
          <span
            aria-hidden="true"
            className="animar-anillo absolute inset-0 rounded-full border-2 border-rojo"
          />
          <span
            aria-hidden="true"
            style={{ animationDelay: "0.45s" }}
            className="animar-anillo absolute inset-0 rounded-full border-2 border-rojo"
          />
          <MarcaInline svg={marcaCierre} className="animar-marca relative h-24 w-auto text-rojo" />
        </div>

        <p
          style={{ animationDelay: "0.25s" }}
          className="animar-texto mt-8 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-exito"
        >
          <Check size={16} aria-hidden="true" />
          Sesión completada
        </p>

        <h2
          style={{ animationDelay: "0.35s" }}
          className="animar-texto mt-3 max-w-lg text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
        >
          {tituloLeccion}
        </h2>

        <p
          style={{ animationDelay: "0.45s" }}
          className="animar-texto mt-3 max-w-sm leading-relaxed text-texto-suave"
        >
          {siguiente
            ? "Tu avance queda guardado. Cuando quieras, sigues por donde toca."
            : "Terminaste el curso entero. Tu avance queda guardado."}
        </p>

        <div
          style={{ animationDelay: "0.55s" }}
          className="animar-texto mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          {siguiente ? (
            <Link href={`/cursos/${curso}/${siguiente.slug}`}>
              <Boton>
                Seguir con {siguiente.titulo}
                <ArrowRight size={16} aria-hidden="true" />
              </Boton>
            </Link>
          ) : (
            <Link href={volverA}>
              <Boton>
                Volver a mis cursos
                <ArrowRight size={16} aria-hidden="true" />
              </Boton>
            </Link>
          )}

          <button
            ref={cierreRef}
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-borde-fuerte px-5 py-3 text-sm font-medium text-texto-suave transition-colors hover:border-rojo-acento hover:text-rojo-acento"
          >
            Quedarme aquí
          </button>
        </div>
      </div>
    </div>
  );
}
