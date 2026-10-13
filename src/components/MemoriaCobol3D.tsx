"use client";

import { useEffect, useRef } from "react";
import { LocateFixed, Minus, Plus } from "lucide-react";
import * as THREE from "three";
import type { Paso } from "./Reproductor3D";
import { caja, material, montarEscena, texturaLienzo } from "./lowpoly";
import type { PaletaTema } from "./paleta-tema";

/**
 * La memoria de un programa COBOL en volumen. Cada campo es una bandeja con
 * una casilla por byte; cada byte, una ficha con su carácter. A diferencia de
 * Python, el nombre no señala un valor: es la bandeja misma, de tamaño fijo.
 * Un MOVE o un VALUE deja caer fichas nuevas sobre las viejas; las casillas
 * que el dato no cubre reciben relleno (espacios o ceros) y lo que no cabe
 * cae por el borde.
 *
 * Los valores son fichas del rojo de marca; el relleno, fichas del tono de
 * superficie con el carácter tenue. Un espacio se dibuja como «␣» para que se
 * vea que ocupa su byte.
 */

export type CampoCobol = {
  nombre: string;
  pic: string;
  largo: number;
  numerico?: boolean;
  /** Dígitos después de la V; la V se dibuja como una pestaña entre casillas. */
  decimales?: number;
  /** Contenido desde el principio (sin VALUE, GnuCOBOL inicia en espacios o ceros). */
  inicial?: string;
};

export type Movimiento = {
  t: number;
  campo: number;
  /** Los caracteres que llegan, ya alineados: el primero cae en la casilla `desde`. */
  texto: string;
  desde: number;
  /** Lo que queda en el campo: se comprueba contra GnuCOBOL. */
  valor: string;
};

export type GuionMemoria = {
  /** DATA DIVISION del programa equivalente, para la verificación. */
  datos: string[];
  grupo?: { nombre: string; aparece: number };
  campos: CampoCobol[];
  movimientos: Movimiento[];
  /** Sentencias en el orden en que se ejecutan; `lee` son los campos que muestra un DISPLAY. */
  codigo: { t: number; linea: string; salida?: string; lee?: number[] }[];
  registro: Paso[];
  duracion: number;
};

const hex = (css: string) => new THREE.Color(css).getHex();
const fase = (t: number, a: number, b: number) => THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
const salidaCubica = (x: number) => 1 - (1 - x) ** 3;
const salidaRebote = (x: number) => {
  const n = 7.5625;
  const d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
};

const CELDA = 1;
const FICHA = 0.84;
const ALTO_FICHA = 0.42;
const SEPARACION = 0.55;
const SUELO = 0.2;
const CAIDA = 0.55;
const CADENCIA = 0.07;
const ALTURA_CAIDA = 3.2;
const ETIQUETA = "border border-borde bg-fondo text-texto-suave";
const BOTON =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-borde bg-fondo text-texto-suave shadow-sm transition-colors hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento";

type Ficha = {
  m: THREE.Mesh;
  mats: THREE.Material[];
  campo: number;
  celda: number;
  /** Generación del campo a la que pertenece: 0 es el contenido inicial. */
  generacion: number;
  aparece: number;
  cae: boolean;
};

function caraCaracter(caracter: string, relleno: boolean, p: PaletaTema) {
  return texturaLienzo(256, 256, (g) => {
    g.fillStyle = relleno ? p.superficie : p.rojo;
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = relleno ? p["texto-tenue"] : p["sobre-rojo"];
    g.font = "800 168px ui-monospace, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(caracter === " " ? "␣" : caracter, 128, 140);
  });
}

export function MemoriaCobol3D({
  tiempo,
  guion,
  paleta,
  dentroDePagina = false,
}: {
  tiempo: React.RefObject<number>;
  guion: GuionMemoria;
  paleta: PaletaTema;
  dentroDePagina?: boolean;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const capaEtiquetas = useRef<HTMLDivElement>(null);
  const camara = useRef<{ acercar: (f: number) => void; recentrar: () => void } | null>(null);

  useEffect(() => {
    const { campos, movimientos, codigo, duracion, grupo } = guion;

    // Casillas en una fila, de izquierda a derecha, con un hueco entre campos.
    const inicio: number[] = [];
    let x = 0;
    for (const c of campos) {
      inicio.push(x);
      x += c.largo * CELDA + SEPARACION;
    }
    const ancho = x - SEPARACION;
    const desplazar = -ancho / 2;
    const xCelda = (campo: number, celda: number) => desplazar + inicio[campo] + (celda + 0.5) * CELDA;

    // El encuadre abarca también las casillas fuera del campo donde caen los
    // caracteres que no caben, para que el corte se vea entero.
    const fuera = movimientos.map((m) => [xCelda(m.campo, m.desde), xCelda(m.campo, m.desde + m.texto.length - 1)]).flat();
    const izquierda = Math.min(desplazar, ...fuera.map((v) => v - 0.5));
    const derecha = Math.max(-desplazar, ...fuera.map((v) => v + 0.5));
    const encuadre = new THREE.Box3(new THREE.Vector3(izquierda - 1.5, 0, -1.6), new THREE.Vector3(derecha + 1.5, 3.4, 2.4));
    const montaje = montarEscena({
      raiz: contenedor.current!,
      capa: capaEtiquetas.current!,
      fondo: hex(paleta.fondo),
      luzSuelo: hex(paleta.borde),
      caja: encuadre,
      dentroDePagina,
      niebla: [60, 120],
      sombra: [ancho / 2 + 3, 4],
    });
    const { escena, etiqueta, iniciar, destruir } = montaje;
    camara.current = montaje;

    // El grupo es una losa que abarca todos sus campos.
    if (grupo) {
      escena.add(caja(ancho + 0.9, 0.1, 2.3, material(hex(paleta["rojo-tenue"])), 0, 0.05, 0));
    }
    // Una bandeja por campo, con una casilla por byte.
    campos.forEach((c, i) => {
      const largo = c.largo * CELDA;
      const cx = desplazar + inicio[i] + largo / 2;
      escena.add(caja(largo + 0.2, 0.12, 1.4, material(hex(paleta["borde-fuerte"])), cx, 0.06, 0));
      escena.add(caja(largo, 0.04, 1.2, material(hex(paleta.superficie), { flatShading: false }), cx, 0.14, 0));
      for (let k = 1; k < c.largo; k++) {
        escena.add(caja(0.03, 0.03, 1.2, material(hex(paleta.borde)), desplazar + inicio[i] + k * CELDA, 0.17, 0));
      }
      if (c.decimales) {
        // La V: una pestaña entre casillas que no ocupa ningún byte.
        const xv = desplazar + inicio[i] + (c.largo - c.decimales) * CELDA;
        escena.add(caja(0.07, 0.9, 0.5, material(hex(paleta.texto)), xv, SUELO + 0.45, -0.5));
        etiqueta("V", new THREE.Vector3(xv, SUELO + 1.05, -0.5), ETIQUETA, { secundaria: true });
      }
      etiqueta(`${c.nombre}`, new THREE.Vector3(cx, 0.1, 0.95), ETIQUETA, { debajo: true }).textContent = `PIC ${c.pic}`;
    });
    if (grupo) {
      etiqueta(`01 ${grupo.nombre}`, new THREE.Vector3(desplazar - 0.6, 0.1, -1.25), "border border-borde bg-rojo-tenue text-rojo-acento").textContent =
        `${campos.reduce((s, c) => s + c.largo, 0)} bytes`;
    }

    // Generaciones de cada campo: la inicial y una por movimiento.
    const fichas: Ficha[] = [];
    const geo = new THREE.BoxGeometry(FICHA, ALTO_FICHA, FICHA);
    const lado = material(hex(paleta.rojo), { transparent: true });
    const ladoRelleno = material(hex(paleta.superficie), { transparent: true });
    const caras = new Map<string, THREE.MeshStandardMaterial>();
    const cara = (caracter: string, relleno: boolean) => {
      const clave = `${relleno}${caracter}`;
      if (!caras.has(clave)) {
        caras.set(clave, new THREE.MeshStandardMaterial({ map: caraCaracter(caracter, relleno, paleta), roughness: 0.75, transparent: true }));
      }
      return caras.get(clave)!;
    };
    const nuevaFicha = (campo: number, celda: number, caracter: string, relleno: boolean, generacion: number, aparece: number) => {
      // La textura se comparte; el material no, porque cada ficha se desvanece a su ritmo.
      const c = cara(caracter, relleno).clone();
      const l = relleno ? ladoRelleno.clone() : lado.clone();
      const mats = [l, l, c, l, c, l];
      const m = new THREE.Mesh(geo, mats);
      m.castShadow = true;
      m.receiveShadow = true;
      escena.add(m);
      fichas.push({ m, mats: [l, c], campo, celda, generacion, aparece, cae: celda < 0 || celda >= campos[campo].largo });
    };

    const generaciones = campos.map(() => [-Infinity]);
    campos.forEach((c, i) => {
      if (c.inicial) [...c.inicial].forEach((ch, k) => nuevaFicha(i, k, ch, true, 0, 0.2 + k * 0.03));
    });
    for (const mov of movimientos) {
      const c = campos[mov.campo];
      const g = generaciones[mov.campo].push(mov.t) - 1;
      const cubiertas = new Set<number>();
      // Primero el dato, en su orden; después el relleno de lo que no cubrió.
      [...mov.texto].forEach((ch, k) => {
        const celda = mov.desde + k;
        if (celda >= 0 && celda < c.largo) cubiertas.add(celda);
        nuevaFicha(mov.campo, celda, ch, false, g, mov.t + 0.35 + k * CADENCIA);
      });
      let orden = mov.texto.length;
      for (let celda = 0; celda < c.largo; celda++) {
        if (!cubiertas.has(celda)) nuevaFicha(mov.campo, celda, c.numerico ? "0" : " ", true, g, mov.t + 0.35 + orden++ * CADENCIA);
      }
    }

    // La sentencia en curso, sobre la fila, y la salida de DISPLAY debajo.
    const sentencia = etiqueta("COBOL", new THREE.Vector3(0, 2.6, -0.6), `${ETIQUETA} whitespace-pre`);
    const titulo = sentencia.previousElementSibling as HTMLElement;

    const aplicar = (t: number) => {
      const disuelve = 1 - salidaCubica(fase(t, duracion - 0.9, duracion - 0.3));
      const actual = codigo.filter((l) => l.t <= t).at(-1);
      titulo.textContent = actual ? actual.linea : "WORKING-STORAGE";
      sentencia.textContent = actual?.salida !== undefined ? `→ [${actual.salida}]` : " ";
      const leyendo = actual?.lee && actual.salida !== undefined ? actual : null;

      for (const f of fichas) {
        const gens = generaciones[f.campo];
        // La generación siguiente a la de esta ficha, si la hay, la sustituye.
        const reemplazo = gens[f.generacion + 1];
        const llega = fase(t, f.aparece, f.aparece + CAIDA);
        const saliendo = reemplazo === undefined ? 0 : salidaCubica(fase(t, reemplazo, reemplazo + 0.45));
        let y = SUELO + ALTO_FICHA / 2;
        let opacidad = disuelve * (1 - saliendo);
        if (f.cae) {
          // Lo que no cabe atraviesa el borde y cae hasta perderse.
          const p = fase(t, f.aparece, f.aparece + 1.3);
          y = ALTURA_CAIDA - p * p * (ALTURA_CAIDA + 4);
          opacidad *= 1 - fase(t, f.aparece + 0.7, f.aparece + 1.3);
        } else {
          y += (1 - salidaRebote(llega)) * ALTURA_CAIDA + saliendo * 0.6;
        }
        let escala = 1;
        if (leyendo?.lee?.includes(f.campo) && !f.cae) {
          const orden = campos.slice(0, f.campo).reduce((s, c) => s + c.largo, 0) + f.celda;
          escala += Math.sin(fase(t, leyendo.t + 0.2 + orden * 0.05, leyendo.t + 0.55 + orden * 0.05) * Math.PI) * 0.14;
        }
        f.m.visible = t >= f.aparece && opacidad > 0.01;
        f.m.position.set(xCelda(f.campo, f.celda), y, 0);
        f.m.scale.setScalar(escala);
        for (const mat of f.mats) {
          mat.opacity = opacidad;
          mat.depthWrite = opacidad > 0.99;
        }
      }
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
