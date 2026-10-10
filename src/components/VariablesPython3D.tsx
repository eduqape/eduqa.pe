"use client";

import { useEffect, useRef } from "react";
import { LocateFixed, Minus, Plus } from "lucide-react";
import * as THREE from "three";
import type { Paso } from "./Reproductor3D";
import { caja, material, montarEscena, texturaLienzo } from "./lowpoly";
import type { PaletaTema } from "./paleta-tema";

/**
 * Variables de Python en volumen. Los nombres son carteles y los valores son
 * cajas en la memoria; un cordón une cada nombre con su objeto. El nombre no
 * guarda el valor ni declara un tipo: señala un objeto, y al reasignar el
 * cordón cambia de objeto.
 *
 * Se lee como el código, de izquierda a derecha: la zona de nombres a la
 * izquierda, la memoria a la derecha y el `=` en el cordón que las une.
 *
 * Qué aparece y cuándo lo decide un `Guion`, para que cada punto de la sesión
 * muestre solo lo suyo (ver `guiones-variables.ts`).
 *
 * Los colores son los de la marca y del tema activo (`PaletaTema`): el valor
 * es rojo de marca y todo lo demás usa los neutros del tema. El tipo se lee en
 * la pastilla de la caja, no en un color, para que el monocromático no pierda
 * información.
 */

export type Tipo = "str" | "int" | "float" | "bool";

export type Guion = {
  /** Valores en memoria. `cae` es cuándo aparece; `libera`, cuándo se hunde por quedarse sin nombre. */
  objetos: { valor: string; tipo: Tipo; x: number; z: number; cae: number; libera?: number; resalta?: number }[];
  /** Nombres. El primer destino de `apunta` tiende el cordón; los siguientes lo mueven. */
  nombres: { nombre: string; x: number; z: number; aparece: number; apunta: { objeto: number; t: number }[] }[];
  /** Líneas del ejemplo, con el momento en que se ejecutan. Las salidas se obtienen ejecutando el código. */
  codigo: { t: number; linea: string; salida?: string }[];
  registro: Paso[];
  duracion: number;
  /** Muestra un cartel «=» sobre el cordón mientras se tiende. */
  igual?: boolean;
};

const hex = (css: string) => new THREE.Color(css).getHex();

const fase = (t: number, a: number, b: number) => THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
const salidaCubica = (x: number) => 1 - (1 - x) ** 3;
const sinusoidal = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const salidaRebote = (x: number) => {
  const n = 7.5625;
  const d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
};
const salidaRetroceso = (x: number) => {
  const c = 1.9;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
};

const ANCHO = 2.1;
const ALTO = 0.9;
const FONDO_CAJA = 1.3;
const SUELO = 0.2;
const CAIDA = 0.7;
const TENDIDO = 0.8;
const MUDANZA = 1.0;
const HUNDIDO = 0.9;
const ETIQUETA = "border border-borde bg-fondo text-texto-suave";
// Borde de cada zona alrededor de lo que contiene.
const MARGEN_ZONA = 0.8;
const BOTON =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-borde bg-fondo text-texto-suave shadow-sm transition-colors hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento";

/** Cara rotulada de una caja: valor grande y una pastilla con el tipo. */
function caraValor(valor: string, tipo: Tipo, p: PaletaTema) {
  return texturaLienzo(640, 280, (g) => {
    g.fillStyle = p.rojo;
    g.fillRect(0, 0, 640, 280);
    g.fillStyle = "rgba(255,255,255,0.14)";
    g.fillRect(0, 0, 640, 14);
    g.fillStyle = "rgba(0,0,0,0.32)";
    g.beginPath();
    g.roundRect(24, 26, 170, 72, 16);
    g.fill();
    g.fillStyle = p["sobre-rojo"];
    g.font = "700 50px ui-monospace, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(tipo, 109, 63);
    g.font = `800 ${valor.length > 7 ? 84 : 104}px ui-monospace, monospace`;
    g.fillText(valor, 320, 170);
  });
}

function caraNombre(nombre: string, p: PaletaTema) {
  return texturaLienzo(640, 180, (g) => {
    g.fillStyle = p.superficie;
    g.fillRect(0, 0, 640, 180);
    g.fillStyle = p.texto;
    g.font = "800 84px ui-monospace, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(nombre, 320, 96);
  });
}

export function VariablesPython3D({
  tiempo,
  guion,
  paleta,
  dentroDePagina = false,
}: {
  tiempo: React.RefObject<number>;
  guion: Guion;
  paleta: PaletaTema;
  dentroDePagina?: boolean;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const capaEtiquetas = useRef<HTMLDivElement>(null);
  const camara = useRef<{ acercar: (f: number) => void; recentrar: () => void } | null>(null);

  useEffect(() => {
    const { objetos, nombres, duracion } = guion;

    // Zonas: un rectángulo alrededor de los carteles y otro alrededor de las
    // cajas, cada uno con su margen.
    const zona = (puntos: { x: number; z: number }[], medioAncho: number, medioFondo: number) => {
      const xs = puntos.map((p) => p.x);
      const zs = puntos.map((p) => p.z);
      return {
        x0: Math.min(...xs) - medioAncho - MARGEN_ZONA,
        x1: Math.max(...xs) + medioAncho + MARGEN_ZONA,
        z0: Math.min(...zs) - medioFondo - MARGEN_ZONA,
        z1: Math.max(...zs) + medioFondo + MARGEN_ZONA,
      };
    };
    const zonaNombres = zona(nombres, 1.15, 0.3);
    const zonaMemoria = zona(objetos, ANCHO / 2, FONDO_CAJA / 2);
    // Las dos losas comparten fondo para que se lean como un mismo plano.
    const z0 = Math.min(zonaNombres.z0, zonaMemoria.z0);
    const z1 = Math.max(zonaNombres.z1, zonaMemoria.z1);
    zonaNombres.z0 = zonaMemoria.z0 = z0;
    zonaNombres.z1 = zonaMemoria.z1 = z1;

    // Todo lo que tiene que verse: las losas, la altura de carteles y
    // cordones, y los rótulos que cuelgan bajo el borde delantero.
    const encuadre = new THREE.Box3(
      new THREE.Vector3(zonaNombres.x0, 0, z0),
      new THREE.Vector3(zonaMemoria.x1, 2.9, z1 + 1.1),
    );

    const montaje = montarEscena({
      raiz: contenedor.current!,
      capa: capaEtiquetas.current!,
      fondo: hex(paleta.fondo),
      luzSuelo: hex(paleta.borde),
      caja: encuadre,
      dentroDePagina,
      niebla: [60, 120],
      sombra: [Math.max(-zonaNombres.x0, zonaMemoria.x1) + 1, Math.max(-z0, z1) + 1],
    });
    const { escena, etiqueta, iniciar, destruir } = montaje;
    camara.current = montaje;

    // Losas: borde grueso del tono fuerte y cara superior con baldosas.
    const losa = ({ x0, x1 }: { x0: number; x1: number }) => {
      const ancho = x1 - x0;
      const fondo = z1 - z0;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      escena.add(caja(ancho + 0.3, 0.16, fondo + 0.3, material(hex(paleta["borde-fuerte"])), cx, 0.08, cz));
      escena.add(caja(ancho, 0.04, fondo, material(hex(paleta.superficie), { flatShading: false }), cx, 0.18, cz));
      const lado = Math.max(ancho, fondo);
      const juntas = new THREE.GridHelper(lado, Math.round(lado), hex(paleta.borde), hex(paleta.borde));
      juntas.scale.set(ancho / lado, 1, fondo / lado);
      juntas.position.set(cx, 0.205, cz);
      escena.add(juntas);
    };
    losa(zonaNombres);
    losa(zonaMemoria);

    // Valores: cajas rotuladas por delante; el cordón llega por el costado.
    const cajas = objetos.map(({ valor, tipo, x, z }) => {
      const cara = new THREE.MeshStandardMaterial({ map: caraValor(valor, tipo, paleta), roughness: 0.75, transparent: true });
      const lado = material(hex(paleta.rojo), { transparent: true });
      const m = caja(ANCHO, ALTO, FONDO_CAJA, [lado, lado, lado, lado, cara, lado]);
      m.position.set(x, 0, z);
      escena.add(m);
      return { m, mats: [cara, lado] };
    });

    // Nombres: carteles sobre un poste.
    const poste = material(hex(paleta["texto-suave"]));
    const borde = material(hex(paleta.texto));
    const carteles = nombres.map(({ nombre, x, z }) => {
      const g = new THREE.Group();
      g.position.set(x, SUELO, z);
      g.add(caja(0.1, 1.1, 0.1, poste, 0, 0.55, 0));
      const tabla = new THREE.MeshStandardMaterial({ map: caraNombre(nombre, paleta), roughness: 0.8 });
      g.add(caja(2.3, 0.65, 0.12, [borde, borde, borde, borde, tabla, borde], 0, 1.4, 0));
      escena.add(g);
      return g;
    });

    // Cordones: cuentas a lo largo de una curva del cartel a su caja.
    const CUENTAS = 34;
    const cuenta = new THREE.SphereGeometry(0.055, 8, 6);
    const cuentaMat = material(hex(paleta.texto), { flatShading: false });
    const cordones = nombres.map(() =>
      Array.from({ length: CUENTAS }, () => {
        const m = new THREE.Mesh(cuenta, cuentaMat);
        m.castShadow = true;
        escena.add(m);
        return m;
      }),
    );
    const curva = new THREE.CubicBezierCurve3();
    // El cordón llega al costado izquierdo de la caja, a media altura: así
    // nunca cruza el frente rotulado, que es lo que se lee.
    const costado = (i: number) => new THREE.Vector3(objetos[i].x - ANCHO / 2, SUELO + ALTO * 0.6, objetos[i].z);

    // Rótulos de zona, colgando bajo el borde delantero de cada losa.
    const rotulo = (titulo: string, { x0, x1 }: { x0: number; x1: number }) =>
      etiqueta(titulo, new THREE.Vector3((x0 + x1) / 2, 0.1, z1 + 0.25), ETIQUETA, { debajo: true });
    // Solo el título: lo que es un nombre lo explica la barra de pasos, y un
    // rótulo más ancho que su losa se saldría del cuadro en pantallas angostas.
    rotulo(nombres.length > 1 ? "Nombres" : "Nombre", zonaNombres);
    const subMemoria = rotulo("Memoria", zonaMemoria);

    const puntoIgual = new THREE.Vector3();
    const subIgual = guion.igual ? etiqueta("=", puntoIgual, "bg-rojo text-center text-sobre-rojo") : null;
    if (subIgual) {
      subIgual.textContent = "asignación";
      subIgual.parentElement!.style.transition = "opacity 200ms";
    }

    const aplicar = (t: number) => {
      const disuelve = 1 - salidaCubica(fase(t, duracion - 1.0, duracion - 0.4));

      // Cada valor cae y queda; los que se quedan sin nombre se hunden.
      const presentes = objetos.map((o) => fase(t, o.cae, o.cae + CAIDA));
      const hundidos = objetos.map((o) => (o.libera === undefined ? 0 : salidaCubica(fase(t, o.libera, o.libera + HUNDIDO))));
      cajas.forEach(({ m, mats }, i) => {
        const c = presentes[i];
        const h = hundidos[i];
        const opacidad = (1 - h) * disuelve;
        const r = objetos[i].resalta;
        const pulso = r === undefined ? 0 : Math.sin(fase(t, r, r + 0.7) * Math.PI) * 0.12;
        m.visible = c > 0 && opacidad > 0.01;
        m.position.y = SUELO + ALTO / 2 + (1 - salidaRebote(c)) * 6 - h * 0.5;
        m.scale.set(1 + pulso, Math.max(1 - h * 0.85, 0.01) * (1 + pulso), 1 + pulso);
        for (const mat of mats) {
          mat.opacity = opacidad;
          mat.depthWrite = opacidad > 0.99;
        }
      });

      carteles.forEach((g, i) => {
        const p = salidaRetroceso(fase(t, nombres[i].aparece, nombres[i].aparece + 0.5));
        g.scale.setScalar(Math.max(p * disuelve, 0.001));
        g.visible = p > 0.001 && disuelve > 0.01;
      });

      let igualVisible = false;
      cordones.forEach((perlas, i) => {
        const { x, z, apunta } = nombres[i];
        const tiende = sinusoidal(fase(t, apunta[0].t, apunta[0].t + TENDIDO));
        // El destino es la última mudanza empezada, a medio camino si está en curso.
        let destino = costado(apunta[0].objeto);
        let alza = 0;
        for (let k = 1; k < apunta.length; k++) {
          const m = sinusoidal(fase(t, apunta[k].t, apunta[k].t + MUDANZA));
          if (m === 0) break;
          destino = costado(apunta[k - 1].objeto).lerp(costado(apunta[k].objeto), m);
          alza = Math.sin(m * Math.PI) * 1.2;
        }
        destino.y += alza;
        // Del borde derecho del cartel sale horizontal, sube sobre lo que haya
        // en medio y entra horizontal por el costado de la caja.
        curva.v0.set(x + 1.15, SUELO + 1.4 * disuelve, z);
        curva.v1.set(x + 2.2, SUELO + 1.9 + alza, z);
        curva.v2.set(destino.x - 1.2, destino.y + 1.1, destino.z);
        curva.v3.copy(destino);
        const visibles = Math.floor(tiende * CUENTAS);
        perlas.forEach((p, k) => {
          p.visible = k < visibles && disuelve > 0.05;
          if (p.visible) curva.getPoint(k / (CUENTAS - 1), p.position);
        });
        if (i === 0 && tiende > 0.5 && disuelve > 0.5) {
          igualVisible = true;
          curva.getPoint(0.5, puntoIgual);
          puntoIgual.y += 0.2;
        }
      });
      if (subIgual) subIgual.parentElement!.style.opacity = igualVisible ? "1" : "0";

      const vivos = cajas.filter((_, i) => presentes[i] > 0 && hundidos[i] < 1).length;
      subMemoria.textContent = vivos === 0 ? "vacía" : `${vivos} ${vivos === 1 ? "objeto" : "objetos"}`;
    };

    iniciar(aplicar, tiempo);
    return () => {
      camara.current = null;
      destruir();
    };
  }, [tiempo, guion, paleta, dentroDePagina]);

  return (
    <div ref={contenedor} className="relative h-full w-full cursor-grab overflow-hidden active:cursor-grabbing">
      <div ref={capaEtiquetas} className="pointer-events-none absolute inset-0" />
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <button type="button" className={BOTON} onClick={() => camara.current?.acercar(0.8)} aria-label="Acercar" title="Acercar">
          <Plus className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" className={BOTON} onClick={() => camara.current?.acercar(1.25)} aria-label="Alejar" title="Alejar">
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" className={BOTON} onClick={() => camara.current?.recentrar()} aria-label="Volver a la vista inicial" title="Volver a la vista inicial">
          <LocateFixed className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-texto-tenue">
        Arrastra para girar{dentroDePagina ? " · Ctrl + rueda para acercar" : ""}
      </p>
    </div>
  );
}
