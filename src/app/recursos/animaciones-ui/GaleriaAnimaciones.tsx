"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Layers3,
  MousePointer2,
  Sparkles,
} from "lucide-react";

const ANIMACIONES = [
  {
    id: "tilt",
    nombre: "Tilt 3D / parallax",
    descripcion: "Inclina el elemento según el cursor y simula profundidad.",
  },
  {
    id: "lift",
    nombre: "Lift / elevation",
    descripcion: "Eleva, escala y refuerza la sombra durante hover.",
  },
  {
    id: "expand",
    nombre: "Reveal por expansión",
    descripcion: "Amplía el bloque para descubrir contenido adicional.",
  },
  {
    id: "slide",
    nombre: "Slide reveal",
    descripcion: "Sustituye una vista por otra mediante desplazamiento lateral.",
  },
  {
    id: "crossfade",
    nombre: "Fade + crossfade",
    descripcion: "Intercambia contenido usando únicamente opacidad.",
  },
  {
    id: "scale",
    nombre: "Scale swap",
    descripcion: "Combina reducción, opacidad y entrada con escala.",
  },
  {
    id: "morph",
    nombre: "Morph",
    descripcion: "Transforma forma, tamaño o composición manteniendo continuidad.",
  },
  {
    id: "stack",
    nombre: "Card stack",
    descripcion: "Simula varias tarjetas y desplaza la superior para revelar otra.",
  },
  {
    id: "spotlight",
    nombre: "Spotlight / cursor glow",
    descripcion: "Un halo tenue sigue la posición del cursor.",
  },
  {
    id: "shimmer",
    nombre: "Shimmer / sheen",
    descripcion: "Una franja de brillo atraviesa la superficie.",
  },
  {
    id: "border",
    nombre: "Border trace",
    descripcion: "Un acento luminoso recorre el perímetro del componente.",
  },
  {
    id: "magnetic",
    nombre: "Magnetic hover",
    descripcion: "Un elemento interno se desplaza suavemente hacia el cursor.",
  },
  {
    id: "floating",
    nombre: "Floating layers",
    descripcion: "Capas internas se desplazan a distinta profundidad.",
  },
  {
    id: "spring",
    nombre: "Spring animation",
    descripcion: "Respuesta con rebote o elasticidad en lugar de movimiento lineal.",
  },
  {
    id: "blur",
    nombre: "Blur reveal",
    descripcion: "El contenido entra desenfocado y termina completamente nítido.",
  },
  {
    id: "clip",
    nombre: "Clip-path reveal",
    descripcion: "Descubre una segunda capa mediante una máscara geométrica.",
  },
  {
    id: "curtain",
    nombre: "Curtain / wipe",
    descripcion: "Una cortina atraviesa el bloque y revela el estado siguiente.",
  },
  {
    id: "carousel",
    nombre: "Carousel interno",
    descripcion: "Alterna varias vistas dentro del mismo contenedor.",
  },
  {
    id: "count",
    nombre: "Number count-up",
    descripcion: "Anima métricas desde cero hasta su valor final.",
  },
  {
    id: "stagger",
    nombre: "Stagger",
    descripcion: "Hace entrar varios elementos con retrasos consecutivos.",
  },
  {
    id: "micro",
    nombre: "Microinteracciones",
    descripcion: "Pequeños giros, escalas o rebotes en iconos y controles.",
  },
] as const;

type AnimacionId = (typeof ANIMACIONES)[number]["id"];

function CopiarNombre({ nombre }: { nombre: string }) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  async function copiar() {
    await navigator.clipboard.writeText(nombre);
    setCopiado(true);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCopiado(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={`Copiar nombre: ${nombre}`}
      title={copiado ? "Copiado" : "Copiar nombre"}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-borde bg-fondo text-texto-tenue transition-colors hover:border-rojo-acento hover:text-rojo-acento"
    >
      {copiado ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
    </button>
  );
}

function Marco({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`anim-marco relative flex h-32 items-center justify-center overflow-hidden rounded-xl border border-borde bg-fondo ${className}`}>
      {children}
    </div>
  );
}

function SpotlightDemo() {
  const ref = useRef<HTMLDivElement>(null);

  function mover(evento: React.MouseEvent<HTMLDivElement>) {
    const caja = ref.current?.getBoundingClientRect();
    if (!caja || !ref.current) return;
    ref.current.style.setProperty("--x", `${evento.clientX - caja.left}px`);
    ref.current.style.setProperty("--y", `${evento.clientY - caja.top}px`);
  }

  return (
    <Marco>
      <div
        ref={ref}
        onMouseMove={mover}
        className="anim-spotlight relative flex h-20 w-40 items-center justify-center overflow-hidden rounded-xl border border-borde bg-superficie"
      >
        <span className="relative z-10 text-xs font-semibold">Mueve el cursor</span>
      </div>
    </Marco>
  );
}

function MagneticDemo() {
  const [transformacion, setTransformacion] = useState("translate(0px, 0px)");

  function mover(evento: React.MouseEvent<HTMLDivElement>) {
    const caja = evento.currentTarget.getBoundingClientRect();
    const x = ((evento.clientX - caja.left) / caja.width - 0.5) * 18;
    const y = ((evento.clientY - caja.top) / caja.height - 0.5) * 18;
    setTransformacion(`translate(${x}px, ${y}px)`);
  }

  return (
    <Marco>
      <div
        onMouseMove={mover}
        onMouseLeave={() => setTransformacion("translate(0px, 0px)")}
        className="flex h-full w-full items-center justify-center"
      >
        <div
          style={{ transform: transformacion }}
          className="flex size-14 items-center justify-center rounded-2xl bg-rojo text-white shadow-sm transition-transform duration-150"
        >
          <MousePointer2 size={22} />
        </div>
      </div>
    </Marco>
  );
}

function CarouselDemo() {
  const [indice, setIndice] = useState(0);
  const nombres = ["Identidad", "Cuenta", "Actividad"];

  return (
    <Marco>
      <button
        type="button"
        onClick={() => setIndice((valor) => (valor + 1) % nombres.length)}
        className="relative h-20 w-44 overflow-hidden rounded-xl border border-borde bg-superficie text-left"
      >
        <div
          className="flex h-full transition-transform duration-500"
          style={{ width: "300%", transform: `translateX(-${indice * (100 / 3)}%)` }}
        >
          {nombres.map((nombre, i) => (
            <span
              key={nombre}
              className="flex h-full w-1/3 shrink-0 items-center justify-center text-xs font-semibold"
            >
              {i + 1}. {nombre}
            </span>
          ))}
        </div>
      </button>
    </Marco>
  );
}

function CountDemo() {
  const [numero, setNumero] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function iniciar() {
    if (timer.current) clearInterval(timer.current);
    setNumero(0);
    let actual = 0;
    timer.current = setInterval(() => {
      actual += 1;
      setNumero(actual);
      if (actual >= 24 && timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    }, 24);
  }

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  return (
    <Marco>
      <div onMouseEnter={iniciar} className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold tabular-nums text-rojo-acento">{numero}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wide text-texto-tenue">Cursos</div>
        </div>
      </div>
    </Marco>
  );
}

function Demo({ id }: { id: AnimacionId }) {
  switch (id) {
    case "tilt":
      return (
        <Marco>
          <div className="anim-tilt flex h-20 w-40 items-center justify-center rounded-xl border border-borde bg-superficie text-xs font-semibold shadow-sm">
            3D
          </div>
        </Marco>
      );
    case "lift":
      return (
        <Marco>
          <div className="anim-lift flex h-20 w-40 items-center justify-center rounded-xl border border-borde bg-superficie text-xs font-semibold shadow-sm">
            Elevation
          </div>
        </Marco>
      );
    case "expand":
      return (
        <Marco>
          <div className="anim-expand w-44 overflow-hidden rounded-xl border border-borde bg-superficie p-3">
            <div className="text-xs font-semibold">Resumen</div>
            <div className="anim-expand-extra mt-2 text-[10px] leading-relaxed text-texto-suave">
              Información adicional revelada por expansión.
            </div>
          </div>
        </Marco>
      );
    case "slide":
      return (
        <Marco>
          <div className="anim-slide relative h-20 w-44 overflow-hidden rounded-xl border border-borde bg-superficie">
            <div className="anim-slide-front absolute inset-0 flex items-center justify-center text-xs font-semibold">Frente</div>
            <div className="anim-slide-back absolute inset-0 flex translate-x-full items-center justify-center bg-rojo text-xs font-semibold text-white">Detalle</div>
          </div>
        </Marco>
      );
    case "crossfade":
      return (
        <Marco>
          <div className="anim-crossfade relative h-20 w-44 rounded-xl border border-borde bg-superficie">
            <span className="anim-crossfade-a absolute inset-0 flex items-center justify-center text-xs font-semibold">Estado A</span>
            <span className="anim-crossfade-b absolute inset-0 flex items-center justify-center text-xs font-semibold text-rojo-acento">Estado B</span>
          </div>
        </Marco>
      );
    case "scale":
      return (
        <Marco>
          <div className="anim-scale relative h-20 w-44 rounded-xl border border-borde bg-superficie">
            <span className="anim-scale-a absolute inset-0 flex items-center justify-center text-xs font-semibold">Principal</span>
            <span className="anim-scale-b absolute inset-0 flex items-center justify-center text-xs font-semibold text-rojo-acento">Secundario</span>
          </div>
        </Marco>
      );
    case "morph":
      return (
        <Marco>
          <div className="anim-morph flex size-16 items-center justify-center rounded-xl bg-rojo text-[10px] font-bold text-white">
            MORPH
          </div>
        </Marco>
      );
    case "stack":
      return (
        <Marco>
          <div className="relative h-20 w-40">
            <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-xl border border-borde bg-rojo-tenue" />
            <div className="anim-stack-front absolute inset-0 flex items-center justify-center rounded-xl border border-borde bg-superficie text-xs font-semibold shadow-sm">
              Tarjeta
            </div>
          </div>
        </Marco>
      );
    case "spotlight":
      return <SpotlightDemo />;
    case "shimmer":
      return (
        <Marco>
          <div className="anim-shimmer relative flex h-20 w-44 items-center justify-center overflow-hidden rounded-xl bg-rojo text-xs font-semibold text-white">
            Sheen
          </div>
        </Marco>
      );
    case "border":
      return (
        <Marco>
          <div className="anim-border-wrap relative rounded-xl p-px">
            <div className="relative z-10 flex h-[78px] w-[174px] items-center justify-center rounded-[11px] bg-superficie text-xs font-semibold">
              Border
            </div>
          </div>
        </Marco>
      );
    case "magnetic":
      return <MagneticDemo />;
    case "floating":
      return (
        <Marco>
          <div className="relative h-24 w-44">
            <div className="anim-layer-1 absolute left-3 top-4 size-12 rounded-xl bg-rojo/20" />
            <div className="anim-layer-2 absolute left-14 top-7 flex h-14 w-24 items-center justify-center rounded-xl border border-borde bg-superficie text-[10px] font-semibold shadow-sm">
              Layers
            </div>
            <Sparkles className="anim-layer-3 absolute right-3 top-2 text-rojo-acento" size={20} />
          </div>
        </Marco>
      );
    case "spring":
      return (
        <Marco>
          <div className="anim-spring flex size-16 items-center justify-center rounded-2xl bg-rojo text-xs font-bold text-white">
            Spring
          </div>
        </Marco>
      );
    case "blur":
      return (
        <Marco>
          <div className="anim-blur relative h-20 w-44 rounded-xl border border-borde bg-superficie">
            <span className="anim-blur-a absolute inset-0 flex items-center justify-center text-xs font-semibold">Normal</span>
            <span className="anim-blur-b absolute inset-0 flex items-center justify-center text-xs font-semibold text-rojo-acento">Revelado</span>
          </div>
        </Marco>
      );
    case "clip":
      return (
        <Marco>
          <div className="anim-clip relative h-20 w-44 overflow-hidden rounded-xl border border-borde bg-superficie">
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">Base</div>
            <div className="anim-clip-layer absolute inset-0 flex items-center justify-center bg-rojo text-xs font-semibold text-white">Reveal</div>
          </div>
        </Marco>
      );
    case "curtain":
      return (
        <Marco>
          <div className="anim-curtain relative h-20 w-44 overflow-hidden rounded-xl border border-borde bg-superficie">
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-rojo-acento">Nuevo estado</div>
            <div className="anim-curtain-layer absolute inset-0 flex items-center justify-center bg-superficie text-xs font-semibold">Estado actual</div>
          </div>
        </Marco>
      );
    case "carousel":
      return <CarouselDemo />;
    case "count":
      return <CountDemo />;
    case "stagger":
      return (
        <Marco>
          <div className="anim-stagger flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className="size-8 rounded-lg bg-rojo" />
            ))}
          </div>
        </Marco>
      );
    case "micro":
      return (
        <Marco>
          <div className="anim-micro flex items-center gap-3 rounded-xl border border-borde bg-superficie px-4 py-3">
            <Sparkles size={19} className="anim-micro-icon text-rojo-acento" />
            <span className="anim-micro-badge rounded-full bg-rojo-tenue px-2 py-1 text-[10px] font-bold text-rojo-acento">
              Activo
            </span>
            <Layers3 size={19} className="anim-micro-layer text-texto-tenue" />
          </div>
        </Marco>
      );
  }
}

export function GaleriaAnimaciones() {
  return (
    <>
      <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Ejemplos de animaciones">
        {ANIMACIONES.map((animacion) => (
          <article
            key={animacion.id}
            className="rounded-2xl border border-borde bg-superficie p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-texto">{animacion.nombre}</h2>
                <p className="mt-1 text-xs leading-relaxed text-texto-suave">
                  {animacion.descripcion}
                </p>
              </div>
              <CopiarNombre nombre={animacion.nombre} />
            </div>
            <div className="mt-4">
              <Demo id={animacion.id} />
            </div>
          </article>
        ))}
      </section>

      <style>{`
        .anim-marco:hover .anim-tilt {
          transform: perspective(500px) rotateX(9deg) rotateY(-12deg) scale(1.02);
          box-shadow: 0 18px 35px rgba(0,0,0,.18);
        }
        .anim-tilt { transition: transform .32s ease, box-shadow .32s ease; }

        .anim-marco:hover .anim-lift {
          transform: translateY(-8px) scale(1.025);
          box-shadow: 0 18px 32px rgba(0,0,0,.2);
        }
        .anim-lift { transition: transform .28s ease, box-shadow .28s ease; }

        .anim-expand { transition: padding .35s ease, transform .35s ease; }
        .anim-expand-extra { max-height: 0; opacity: 0; transform: translateY(-6px); transition: max-height .35s ease, opacity .25s ease, transform .35s ease; }
        .anim-marco:hover .anim-expand { transform: scale(1.03); }
        .anim-marco:hover .anim-expand-extra { max-height: 48px; opacity: 1; transform: translateY(0); }

        .anim-slide-front, .anim-slide-back { transition: transform .42s cubic-bezier(.22,.8,.22,1); }
        .anim-marco:hover .anim-slide-front { transform: translateX(-100%); }
        .anim-marco:hover .anim-slide-back { transform: translateX(0); }

        .anim-crossfade-a, .anim-crossfade-b { transition: opacity .38s ease; }
        .anim-crossfade-b { opacity: 0; }
        .anim-marco:hover .anim-crossfade-a { opacity: 0; }
        .anim-marco:hover .anim-crossfade-b { opacity: 1; }

        .anim-scale-a, .anim-scale-b { transition: opacity .35s ease, transform .35s ease; }
        .anim-scale-b { opacity: 0; transform: scale(.82); }
        .anim-marco:hover .anim-scale-a { opacity: 0; transform: scale(.82); }
        .anim-marco:hover .anim-scale-b { opacity: 1; transform: scale(1); }

        .anim-morph { transition: border-radius .5s ease, width .5s ease, transform .5s ease; }
        .anim-marco:hover .anim-morph { width: 112px; border-radius: 999px; transform: rotate(8deg); }

        .anim-stack-front { transition: transform .38s cubic-bezier(.2,.8,.2,1), box-shadow .38s ease; }
        .anim-marco:hover .anim-stack-front { transform: translate(-12px,-10px) rotate(-4deg); box-shadow: 0 16px 28px rgba(0,0,0,.18); }

        .anim-spotlight::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(70px circle at var(--x, 50%) var(--y, 50%), color-mix(in srgb, var(--color-rojo) 32%, transparent), transparent 70%);
          opacity: 0;
          transition: opacity .2s ease;
        }
        .anim-spotlight:hover::before { opacity: 1; }

        .anim-shimmer::after {
          content: "";
          position: absolute;
          inset: -30% auto -30% -45%;
          width: 34%;
          transform: skewX(-18deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent);
        }
        .anim-marco:hover .anim-shimmer::after { animation: eduqa-shimmer .75s ease both; }
        @keyframes eduqa-shimmer { to { left: 125%; } }

        .anim-border-wrap { background: conic-gradient(from 0deg, transparent 0 72%, rgb(199 7 36) 82%, transparent 92%); }
        .anim-marco:hover .anim-border-wrap { animation: eduqa-border-spin 1.1s linear infinite; }
        @keyframes eduqa-border-spin { to { transform: rotate(360deg); } }
        .anim-border-wrap > div { transform: rotate(0deg); }

        .anim-layer-1, .anim-layer-2, .anim-layer-3 { transition: transform .4s ease; }
        .anim-marco:hover .anim-layer-1 { transform: translate(-5px,8px); }
        .anim-marco:hover .anim-layer-2 { transform: translate(4px,-7px) scale(1.04); }
        .anim-marco:hover .anim-layer-3 { transform: translate(7px,-5px) rotate(14deg); }

        .anim-spring { transition: transform .55s cubic-bezier(.2,1.65,.45,.9); }
        .anim-marco:hover .anim-spring { transform: translateY(-12px) scale(1.12) rotate(5deg); }

        .anim-blur-a, .anim-blur-b { transition: opacity .4s ease, filter .4s ease, transform .4s ease; }
        .anim-blur-b { opacity: 0; filter: blur(7px); transform: scale(.94); }
        .anim-marco:hover .anim-blur-a { opacity: 0; filter: blur(5px); transform: scale(1.04); }
        .anim-marco:hover .anim-blur-b { opacity: 1; filter: blur(0); transform: scale(1); }

        .anim-clip-layer { clip-path: circle(0% at 50% 50%); transition: clip-path .55s cubic-bezier(.2,.8,.2,1); }
        .anim-marco:hover .anim-clip-layer { clip-path: circle(75% at 50% 50%); }

        .anim-curtain-layer { transition: transform .55s cubic-bezier(.65,0,.35,1); }
        .anim-marco:hover .anim-curtain-layer { transform: translateX(105%); }

        .anim-stagger span { opacity: .25; transform: translateY(8px); transition: opacity .28s ease, transform .28s ease; }
        .anim-marco:hover .anim-stagger span { opacity: 1; transform: translateY(0); }
        .anim-stagger span:nth-child(2) { transition-delay: 70ms; }
        .anim-stagger span:nth-child(3) { transition-delay: 140ms; }
        .anim-stagger span:nth-child(4) { transition-delay: 210ms; }

        .anim-micro-icon, .anim-micro-badge, .anim-micro-layer { transition: transform .35s ease; }
        .anim-marco:hover .anim-micro-icon { transform: rotate(16deg) scale(1.15); }
        .anim-marco:hover .anim-micro-badge { transform: scale(1.08); }
        .anim-marco:hover .anim-micro-layer { transform: translateY(-4px) rotate(-7deg); }

        @media (prefers-reduced-motion: reduce) {
          .anim-marco *, .anim-marco *::before, .anim-marco *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>
    </>
  );
}
