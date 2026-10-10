"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Pause, Play } from "lucide-react";

export type Paso = { t: number; comando: string; detalle: string };

export function pasoEn(registro: Paso[], t: number) {
  let i = 0;
  while (i + 1 < registro.length && registro[i + 1].t <= t) i++;
  return { actual: registro[i] };
}

const reloj = (t: number) => `0:${Math.floor(t).toString().padStart(2, "0")}`;

/**
 * Anima la entrada del elemento cada vez que cambia `valor`. Compara con el
 * valor anterior en vez de saltarse el primer efecto: así montar (o el doble
 * montaje del modo estricto) no anima nada. Usa la Web Animations API para no
 * depender de keyframes globales, y no hace nada si el sistema pide reducir
 * el movimiento.
 */
function useEntrada<T extends HTMLElement>(valor: unknown, desde: Keyframe, duracion: number) {
  const ref = useRef<T>(null);
  const previo = useRef(valor);
  useEffect(() => {
    if (previo.current === valor) return;
    previo.current = valor;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ref.current?.animate([desde, { opacity: 1, transform: "none" }], {
      duration: duracion,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    });
    // `desde` y `duracion` son fijos para cada uso; solo importa cuándo cambia el valor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);
  return ref;
}

/** Un dígito del reloj: al cambiar, el nuevo sube desde abajo, como un contador. */
function Digito({ valor }: { valor: string }) {
  const ref = useEntrada<HTMLSpanElement>(valor, { opacity: 0, transform: "translateY(70%)" }, 260);
  return (
    <span className="inline-block overflow-hidden align-bottom">
      <span ref={ref} className="inline-block">
        {valor}
      </span>
    </span>
  );
}

/**
 * Lo que está pasando, solo para lectores de pantalla: la barra visible es
 * únicamente el avance, pero quien no ve la escena necesita que se le cuente.
 */
function Narracion({ actual }: ReturnType<typeof pasoEn>) {
  return (
    <p className="sr-only" aria-live="polite">
      {actual.comando}: {actual.detalle}
    </p>
  );
}

/**
 * Escena 3D con barra de reproducción: pausa, adelantar o rebobinar y
 * velocidad. Ocupa el tamaño de su contenedor. La escena lee el tiempo de
 * `tiempo` en cada cuadro, así que debe ser función pura del tiempo.
 *
 * Los colores son tokens del tema, así que sigue al modo claro, al oscuro y al
 * monocromático.
 */
export function Reproductor3D({
  escena,
  duracion,
  registro,
  antetitulo,
  titulo,
  lateral,
}: {
  escena: (tiempo: RefObject<number>) => ReactNode;
  duracion: number;
  registro: Paso[];
  antetitulo?: string;
  titulo?: string;
  lateral?: (t: number) => ReactNode;
}) {
  const tiempo = useRef(0);
  const [pausa, setPausa] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const [t, setT] = useState(0);

  useEffect(() => {
    let cuadro = 0;
    let antes = performance.now();
    const paso = (ahora: number) => {
      cuadro = requestAnimationFrame(paso);
      const dt = Math.min((ahora - antes) / 1000, 0.1);
      antes = ahora;
      if (!pausa) tiempo.current = (tiempo.current + dt * velocidad) % duracion;
      setT(tiempo.current);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [pausa, velocidad, duracion]);

  const paso = pasoEn(registro, t);

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="relative min-h-0 flex-1">
        {escena(tiempo)}

        {(titulo || lateral) && (
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
            {titulo && (
              <div className="rounded-lg border border-borde bg-fondo px-4 py-2.5 shadow-sm">
                {antetitulo && <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-texto-tenue">{antetitulo}</p>}
                <p className="text-sm font-semibold text-texto sm:text-base">{titulo}</p>
              </div>
            )}
            {lateral?.(t)}
          </div>
        )}
      </div>

      {/* Una sola línea: contador, avance, velocidad y el botón de reproducir,
          cuadrado y del alto de la línea. */}
      <div className="flex items-center gap-3 border-t border-borde bg-fondo px-4 py-3">
        <span className="font-mono text-lg font-bold leading-8 tabular-nums text-rojo-acento" aria-label={`Segundo ${Math.floor(t)}`}>
          {reloj(t)
            .split("")
            .map((c, i) => (
              <Digito key={i} valor={c} />
            ))}
        </span>
        <input
          type="range"
          min={0}
          max={duracion}
          step={0.01}
          value={t}
          onChange={(e) => {
            tiempo.current = Number(e.target.value);
            setT(tiempo.current);
          }}
          aria-label="Momento de la animación"
          className="min-w-0 flex-1 accent-[var(--color-rojo)]"
        />
        <select
          value={velocidad}
          onChange={(e) => setVelocidad(Number(e.target.value))}
          aria-label="Velocidad"
          className="h-8 rounded-lg border border-borde-fuerte bg-fondo px-2 text-xs text-texto"
        >
          {[0.5, 1, 2].map((v) => (
            <option key={v} value={v}>
              {v}×
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setPausa((p) => !p)}
          aria-label={pausa ? "Seguir" : "Pausar"}
          title={pausa ? "Seguir" : "Pausar"}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-rojo text-sobre-rojo transition-colors hover:bg-rojo-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento"
        >
          {pausa ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
        </button>
        <Narracion {...paso} />
      </div>
    </div>
  );
}
