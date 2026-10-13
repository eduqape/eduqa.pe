"use client";

import { useEffect, useRef } from "react";

export type DatosTarjeta = {
  svg: string;
  /** Desplazamiento en pantalla del carro por columna. */
  paso: [number, number];
  /** x en pantalla de cada columna sobre la regla, para el puntero. */
  xPantalla: number[];
  /** Por columna: contorno iluminado de sus perforaciones, lectura y frase. */
  leidos: string[];
  lecturas: string[];
  habladas: string[];
  inicial: number;
};

const SEGUIR = 0.12;
const SEGUIR_RECORRIDO = 0.32;
const RECORRIDO = [1, 7, 8, 12, 19, 34, 73, 80, 12];
const PAUSA = 1.5;
const PRIMERA_ESPERA = 1.4;
const VOLVER_AL_RECORRIDO = 3600;

const quieto = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * El carro sigue al puntero o al teclado con un seguimiento exponencial; sin
 * nadie que lo mueva recorre las zonas del formato. Solo anima mientras la
 * figura está a la vista, y con «reducir movimiento» no hace recorrido ni
 * suaviza: salta a la columna pedida.
 */
export function VivoTarjeta({ datos }: { datos: DatosTarjeta }) {
  const raiz = useRef<HTMLDivElement>(null);
  const { paso, xPantalla, leidos, lecturas, habladas, inicial } = datos;

  useEffect(() => {
    const nodo = raiz.current!;
    const svg = nodo.querySelector("svg")!;
    const carro = svg.querySelector('[data-part="carro"]')!;
    const leido = svg.querySelector('[data-part="leidos"]')!;
    const lectura = nodo.closest(".iso-plate")?.querySelector("[data-readout]");

    let actual = inicial;
    let objetivo = inicial;
    let mostrada = inicial;
    let enVista = false;
    let cuadro = 0;
    let antes = 0;
    let manual = 0;
    let reloj = 0;
    let parada = 0;
    let espera = PRIMERA_ESPERA;
    let reanudar: ReturnType<typeof setTimeout> | undefined;

    const pintar = () => {
      const [dx, dy] = paso;
      carro.setAttribute("transform", `translate(${((actual - 1) * dx).toFixed(2)} ${((actual - 1) * dy).toFixed(2)})`);
      const columna = Math.round(actual);
      if (columna !== mostrada) {
        mostrada = columna;
        leido.setAttribute("d", leidos[columna - 1]);
        if (lectura) lectura.textContent = lecturas[columna - 1];
        nodo.setAttribute("aria-valuenow", String(columna));
        nodo.setAttribute("aria-valuetext", habladas[columna - 1]);
      }
    };

    const recorriendo = () => !quieto() && performance.now() - manual > VOLVER_AL_RECORRIDO;

    const paso1 = (ahora: number) => {
      cuadro = 0;
      const dt = antes ? Math.min((ahora - antes) / 1000, 1 / 30) : 1 / 60;
      antes = ahora;
      if (recorriendo()) {
        reloj += dt;
        if (reloj >= espera) {
          reloj = 0;
          espera = PAUSA;
          parada = (parada + 1) % RECORRIDO.length;
          objetivo = RECORRIDO[parada];
        }
      }
      const tau = recorriendo() ? SEGUIR_RECORRIDO : SEGUIR;
      actual = quieto() ? objetivo : actual + (objetivo - actual) * (1 - Math.exp(-dt / tau));
      if (Math.abs(objetivo - actual) < 1e-3) actual = objetivo;
      pintar();
      if (enVista && (actual !== objetivo || recorriendo())) cuadro = requestAnimationFrame(paso1);
      else antes = 0;
    };
    const animar = () => {
      if (!cuadro && enVista) cuadro = requestAnimationFrame(paso1);
    };

    const ir = (columna: number) => {
      manual = performance.now();
      objetivo = Math.min(80, Math.max(1, columna));
      animar();
      // Sin más movimientos, el recorrido se reanuda cuando vence la espera.
      clearTimeout(reanudar);
      reanudar = setTimeout(animar, VOLVER_AL_RECORRIDO + 50);
    };

    const alMover = (evento: PointerEvent) => {
      const matriz = svg.getScreenCTM();
      if (!matriz) return;
      const x = new DOMPoint(evento.clientX, evento.clientY).matrixTransform(matriz.inverse()).x;
      let mejor = 0;
      for (let i = 1; i < xPantalla.length; i++) {
        if (Math.abs(xPantalla[i] - x) < Math.abs(xPantalla[mejor] - x)) mejor = i;
      }
      ir(mejor + 1);
    };
    const alTeclear = (evento: KeyboardEvent) => {
      const salto = evento.shiftKey ? 10 : 1;
      const destino =
        evento.key === "ArrowRight" || evento.key === "ArrowUp" ? objetivo + salto
        : evento.key === "ArrowLeft" || evento.key === "ArrowDown" ? objetivo - salto
        : evento.key === "Home" ? 1
        : evento.key === "End" ? 80
        : null;
      if (destino === null) return;
      evento.preventDefault();
      ir(Math.round(destino));
    };

    const vigia = new IntersectionObserver(([entrada]) => {
      enVista = entrada.isIntersecting;
      if (enVista) animar();
    }, { rootMargin: "120px 0px" });
    vigia.observe(nodo);
    nodo.addEventListener("pointermove", alMover);
    nodo.addEventListener("pointerdown", alMover);
    nodo.addEventListener("keydown", alTeclear);
    return () => {
      vigia.disconnect();
      cancelAnimationFrame(cuadro);
      clearTimeout(reanudar);
      nodo.removeEventListener("pointermove", alMover);
      nodo.removeEventListener("pointerdown", alMover);
      nodo.removeEventListener("keydown", alTeclear);
    };
  }, [paso, xPantalla, leidos, lecturas, habladas, inicial]);

  return (
    <div
      ref={raiz}
      className="iso-stage"
      data-figura-interactiva=""
      role="slider"
      tabIndex={0}
      aria-label="Columna que lee el carro"
      aria-valuemin={1}
      aria-valuemax={80}
      aria-valuenow={inicial}
      aria-valuetext={habladas[inicial - 1]}
      dangerouslySetInnerHTML={{ __html: datos.svg }}
    />
  );
}
