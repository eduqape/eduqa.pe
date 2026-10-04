"use client";

import { useEffect, useRef, useState } from "react";
import { List } from "lucide-react";
import type { SeccionBlog } from "@/lib/blog-types";

/** El cuerpo del artículo: la lectura se mide sobre él y no sobre la página entera. */
export const ID_CUERPO_ARTICULO = "cuerpo-articulo";

/**
 * Cuánto del cuerpo del artículo ha pasado ya por la pantalla, de 0 a 1.
 *
 * Se toma el borde inferior de la ventana: un párrafo cuenta como visto cuando
 * llega a verse entero, no cuando sale por arriba. Así el 100 % llega con la
 * última línea en pantalla y no exige desplazar el pie de página.
 */
function progresoCuerpo(): number {
  const cuerpo = document.getElementById(ID_CUERPO_ARTICULO);
  if (!cuerpo) return 0;
  const caja = cuerpo.getBoundingClientRect();
  const visto = window.innerHeight - caja.top;
  if (caja.height <= 0) return 1;
  return Math.min(1, Math.max(0, visto / caja.height));
}

function useProgresoCuerpo(): number {
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    let marco = 0;
    const actualizar = () => {
      cancelAnimationFrame(marco);
      marco = requestAnimationFrame(() => setProgreso(progresoCuerpo()));
    };
    actualizar();
    window.addEventListener("scroll", actualizar, { passive: true });
    window.addEventListener("resize", actualizar);
    return () => {
      cancelAnimationFrame(marco);
      window.removeEventListener("scroll", actualizar);
      window.removeEventListener("resize", actualizar);
    };
  }, []);

  return progreso;
}

export function ProgresoLectura() {
  const progreso = useProgresoCuerpo();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-1 bg-borde/40" aria-hidden="true">
      <div
        className="h-full origin-left bg-rojo-acento"
        style={{ transform: `scaleX(${progreso})` }}
      />
    </div>
  );
}

/** La sección cuyo título ya pasó por el tercio superior de la pantalla. */
function useSeccionActiva(secciones: SeccionBlog[]): string | null {
  const [activa, setActiva] = useState<string | null>(null);

  useEffect(() => {
    if (secciones.length === 0) return;
    let marco = 0;
    const calcular = () => {
      cancelAnimationFrame(marco);
      marco = requestAnimationFrame(() => {
        const umbral = window.innerHeight / 3;
        let actual: string | null = null;
        for (const { id } of secciones) {
          const titulo = document.getElementById(id);
          if (titulo && titulo.getBoundingClientRect().top <= umbral) actual = id;
        }
        setActiva(actual);
      });
    };
    calcular();
    window.addEventListener("scroll", calcular, { passive: true });
    window.addEventListener("resize", calcular);
    return () => {
      cancelAnimationFrame(marco);
      window.removeEventListener("scroll", calcular);
      window.removeEventListener("resize", calcular);
    };
  }, [secciones]);

  return activa;
}

function textoRestante(minutos: number, progreso: number): string {
  if (progreso >= 0.98) return "Lectura terminada";
  const quedan = Math.max(1, Math.ceil(minutos * (1 - progreso)));
  return progreso < 0.02 ? `${minutos} min de lectura` : `Quedan ~${quedan} min`;
}

function ListaSecciones({
  secciones,
  activa,
  alElegir,
}: {
  secciones: SeccionBlog[];
  activa: string | null;
  alElegir?: () => void;
}) {
  return (
    <ol className="space-y-1">
      {secciones.map(({ id, titulo }) => {
        const esActiva = id === activa;
        return (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={alElegir}
              aria-current={esActiva ? "location" : undefined}
              className={`block rounded-md px-2 py-1.5 text-sm leading-snug transition-colors focus-visible:outline-2 focus-visible:outline-rojo-acento ${
                esActiva
                  ? "bg-rojo-tenue font-medium text-rojo-acento"
                  : "text-texto-suave hover:text-texto"
              }`}
            >
              {titulo}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Índice fijo en pantallas anchas. Señala la sección en curso y cuánto falta:
 * saber que quedan tres minutos es lo que decide a muchos a terminar.
 */
export function IndiceLateral({ secciones, minutos }: { secciones: SeccionBlog[]; minutos: number }) {
  const progreso = useProgresoCuerpo();
  const activa = useSeccionActiva(secciones);

  return (
    <nav aria-label="En este artículo" className="sticky top-24">
      <p className="text-xs font-semibold uppercase tracking-wide text-texto-tenue">En este artículo</p>
      <div className="mt-3">
        <ListaSecciones secciones={secciones} activa={activa} />
      </div>
      <div className="mt-5 border-t border-borde pt-4">
        <div className="h-1 overflow-hidden rounded-full bg-borde" aria-hidden="true">
          <div className="h-full origin-left bg-rojo-acento" style={{ transform: `scaleX(${progreso})` }} />
        </div>
        <p className="mt-2 text-xs text-texto-tenue" aria-live="off">
          {textoRestante(minutos, progreso)}
        </p>
      </div>
    </nav>
  );
}

/** El mismo índice, plegado, para pantallas donde no cabe al costado. */
export function IndicePlegable({ secciones }: { secciones: SeccionBlog[] }) {
  const detalles = useRef<HTMLDetailsElement>(null);

  return (
    <details ref={detalles} className="group mt-8 rounded-xl border border-borde bg-fondo">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-texto focus-visible:outline-2 focus-visible:outline-rojo-acento [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <List size={15} aria-hidden="true" className="text-texto-tenue" />
          En este artículo · {secciones.length} secciones
        </span>
        <span aria-hidden="true" className="text-texto-tenue transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="border-t border-borde px-2 py-2">
        <ListaSecciones
          secciones={secciones}
          activa={null}
          alElegir={() => detalles.current?.removeAttribute("open")}
        />
      </div>
    </details>
  );
}

type EventoLectura = Record<string, string | number> & { event: string };

function enviar(evento: EventoLectura) {
  const ventana = window as unknown as { dataLayer?: unknown[] };
  ventana.dataLayer = ventana.dataLayer ?? [];
  ventana.dataLayer.push(evento);
}

/** Sin interacción durante este tiempo, el lector se da por ausente. */
const INACTIVIDAD_MS = 30_000;
/** Fracción del tiempo estimado que separa una lectura de un vistazo. */
const FRACCION_LECTURA_REAL = 0.4;
const HITOS = [25, 50, 75, 100] as const;

/**
 * Mide la lectura y la deja en `dataLayer` para Google Tag Manager.
 *
 * El tiempo en página de la analítica estándar cuenta la pestaña abierta en
 * segundo plano. Aquí solo suma el tiempo activo: pestaña visible y alguna
 * interacción en los últimos 30 segundos. Eventos:
 *
 * - `blog_progreso`: al cruzar el 25, 50, 75 y 100 % del cuerpo.
 * - `blog_lectura_completa`: llegó al final y estuvo activo al menos el 40 %
 *   del tiempo estimado. Filtra a quien baja de golpe hasta el pie.
 * - `blog_tiempo_activo`: al ocultar o cerrar la pestaña, con el acumulado.
 */
export function MedicionLectura({ slug, minutos }: { slug: string; minutos: number }) {
  useEffect(() => {
    let segundos = 0;
    let maximo = 0;
    let ultimaActividad = Date.now();
    let completa = false;
    const cruzados = new Set<number>();

    const actividad = () => {
      ultimaActividad = Date.now();
    };

    const revisar = () => {
      const porcentaje = Math.round(progresoCuerpo() * 100);
      maximo = Math.max(maximo, porcentaje);
      for (const hito of HITOS) {
        if (maximo >= hito && !cruzados.has(hito)) {
          cruzados.add(hito);
          enviar({ event: "blog_progreso", blog_slug: slug, blog_porcentaje: hito, blog_segundos_activos: segundos });
        }
      }
      if (!completa && maximo >= 100 && segundos >= minutos * 60 * FRACCION_LECTURA_REAL) {
        completa = true;
        enviar({ event: "blog_lectura_completa", blog_slug: slug, blog_segundos_activos: segundos, blog_minutos_estimados: minutos });
      }
    };

    const reloj = window.setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - ultimaActividad < INACTIVIDAD_MS) {
        segundos += 1;
        revisar();
      }
    }, 1000);

    const alOcultar = () => {
      if (document.visibilityState !== "hidden" || segundos === 0) return;
      enviar({ event: "blog_tiempo_activo", blog_slug: slug, blog_segundos_activos: segundos, blog_porcentaje_maximo: maximo });
    };

    const eventos = ["scroll", "pointermove", "pointerdown", "keydown", "touchstart"] as const;
    for (const nombre of eventos) window.addEventListener(nombre, actividad, { passive: true });
    window.addEventListener("scroll", revisar, { passive: true });
    document.addEventListener("visibilitychange", alOcultar);
    revisar();

    return () => {
      window.clearInterval(reloj);
      for (const nombre of eventos) window.removeEventListener(nombre, actividad);
      window.removeEventListener("scroll", revisar);
      document.removeEventListener("visibilitychange", alOcultar);
    };
  }, [slug, minutos]);

  return null;
}
