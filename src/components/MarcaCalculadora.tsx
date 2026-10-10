"use client";

import localFont from "next/font/local";
import { useEffect, useRef } from "react";

/**
 * DSEG14 Classic (keshikan, SIL OFL 1.1): display de 14 segmentos, como el de
 * una calculadora. La licencia va junto al archivo en `src/fonts/dseg`.
 */
const dseg = localFont({
  src: "../fonts/dseg/DSEG14Classic-Bold.woff2",
  weight: "700",
  display: "swap",
});

const SIMBOLOS = "0123456789ABCDEFGHJKLMNPRSTUVXYZ";
const PASOS = 8;
const ALTO = 1.2; // em por casilla
const INTERVALO = 8000;

/**
 * Tira de caracteres que pasa por cada casilla antes de quedarse en su letra,
 * con la letra final arriba: así lo que se pinta sin JavaScript (o antes de
 * hidratar) ya es la marca correcta. Semilla fija por posición: servidor y
 * navegador generan la misma tira al hidratar; después cada giro la sortea.
 */
function tira(letra: string, indice: number) {
  let semilla = (indice + 1) * 7919;
  const paso = () => {
    semilla = (semilla * 48271) % 2147483647;
    return SIMBOLOS[semilla % SIMBOLOS.length];
  };
  return [letra, ...Array.from({ length: PASOS + indice }, paso), letra];
}

/**
 * EDUQA.PE en letra de calculadora. Al cargar (con la fuente lista) y luego
 * cada ocho segundos, cada casilla rueda en vertical y se detiene en su letra,
 * de izquierda a derecha. Con movimiento reducido se queda quieta.
 */
export function MarcaCalculadora({ texto = "EDUQA.PE", className }: { texto?: string; className?: string }) {
  const raiz = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const nodo = raiz.current;
    if (!nodo || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tiras = [...nodo.querySelectorAll<HTMLElement>("[data-tira]")];
    const rodar = () => {
      tiras.forEach((t, i) => {
        // Cada giro pasa por caracteres nuevos; solo la primera y la última
        // casilla de la tira (la letra) se mantienen.
        const casillas = [...t.children];
        for (const c of casillas.slice(1, -1)) {
          c.textContent = SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)];
        }
        const fin = -(Number(t.dataset.tira) - 1) * ALTO;
        // La tira empieza y termina en la letra: parte desde la de abajo y
        // baja hasta la de arriba, que es la que queda en reposo.
        t.animate(
          [{ transform: `translateY(${fin}em)` }, { transform: "translateY(0)" }],
          {
            duration: 700 + i * 90,
            delay: i * 60,
            easing: "cubic-bezier(0.2, 0.7, 0.25, 1)",
          },
        );
      });
    };

    let intervalo: number | undefined;
    let cancelado = false;
    document.fonts.ready.then(() => {
      if (cancelado) return;
      rodar();
      intervalo = window.setInterval(() => {
        if (!document.hidden) rodar();
      }, INTERVALO);
    });
    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
  }, []);

  return (
    <span ref={raiz} className={`${dseg.className} inline-flex ${className ?? ""}`} aria-label={texto} role="img">
      {[...texto].map((letra, i) => {
        if (letra === ".") {
          return (
            <span key={i} aria-hidden="true" className="leading-[1.2]">
              .
            </span>
          );
        }
        const simbolos = tira(letra, i);
        return (
          <span key={i} aria-hidden="true" className="relative inline-block h-[1.2em] overflow-hidden">
            {/* Ocupa el ancho de la letra final; la tira va encima. */}
            <span className="invisible block leading-[1.2]">{letra}</span>
            <span
              data-tira={simbolos.length}
              className="absolute inset-x-0 top-0 flex flex-col items-center leading-[1.2] will-change-transform"
            >
              {simbolos.map((s, j) => (
                <span key={j} className="block h-[1.2em]">
                  {s}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
