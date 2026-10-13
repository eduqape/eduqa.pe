/**
 * Geometría de la estación lectora. Se calcula una vez, al cargar el módulo
 * en el servidor; el componente vivo solo recibe el SVG terminado y mueve el
 * carro con `transformCarro`.
 *
 * Unidades del mundo: 1,4 por milímetro. La tarjeta mide lo que mide una
 * tarjeta IBM de 80 columnas, 7⅜ × 3¼ pulgadas. x crece de la columna 1 a la
 * 80; y, del borde de la fila 12 (al fondo) al de la fila 9 (al frente).
 */
import * as k from "@/components/iso/iso-kit";
import type { Plan, Point3 } from "@/components/iso/iso-kit";
import { COLUMNAS, FILAS, LINEA, TOPES, perforacionesDe, type Fila } from "./modelo";

export const ANCHO = 640;
export const ALTO = 380;

const MM = 1.4;
const PULGADA = 25.4 * MM;
const LARGO = 7.375 * PULGADA;
const ALTURA_TARJETA = 3.25 * PULGADA;
/** Paso entre columnas y entre filas, y margen hasta el centro de la primera. */
const PASO_COLUMNA = 0.087 * PULGADA;
const PASO_FILA = 0.25 * PULGADA;
const MARGEN = 0.25 * PULGADA;
const HUECO: [number, number] = [0.055 * PULGADA, 0.125 * PULGADA];

export const xColumna = (columna: number) => MARGEN + (columna - 1) * PASO_COLUMNA;
const yFila = (fila: Fila) => MARGEN + FILAS.indexOf(fila) * PASO_FILA;

const PLACA: Plan = { x: -32, y: -36, w: LARGO + 62, d: ALTURA_TARJETA + 82, r: 8 };
const ALTO_PLACA = 12;
const LECHO = { z: 0, h: 2 };
const Z_TARJETA = LECHO.h;
const GROSOR = 0.6;
const Z_CARA = Z_TARJETA + GROSOR;

const GUIA: Plan = { x: -10, y: -20, w: LARGO + 16, d: 16, r: 2 };
const ALTO_GUIA = 10;
const TOPE_IZQ: Plan = { x: -22, y: -20, w: 14, d: ALTURA_TARJETA + 22, r: 2 };
const LABIO: Plan = { x: -10, y: ALTURA_TARJETA + 3, w: LARGO + 16, d: 18, r: 2 };
const ALTO_LABIO = 4;
// El patín delantero corre por la parte trasera del labio; la regla va delante.
const REGLA: Plan = { x: 0, y: LABIO.y + 10, w: LARGO, d: 6, r: 1 };

export const P = k.fitProjection(
  [...k.boxCorners(PLACA, -ALTO_PLACA - 5, 0), [xColumna(1), GUIA.y, 22], [xColumna(COLUMNAS), LABIO.y + LABIO.d, 22]],
  ANCHO,
  ALTO,
  { pad: 30, azimuth: 62, elevation: 38 },
);

const S = k.solidSvg;
const L = k.lineSvg;
const D = k.dotsSvg;
const en = (punto: Point3) => k.iso(punto, P);
const porFondo = (puntos: [number, number][]) =>
  [...puntos].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

/** Rectángulo de una perforación sobre la cara de la tarjeta. */
function hueco(columna: number, fila: Fila) {
  const x = xColumna(columna);
  const y = yFila(fila);
  const [w, h] = HUECO;
  return k.onTop(
    [
      [x - w / 2, y - h / 2],
      [x + w / 2, y - h / 2],
      [x + w / 2, y + h / 2],
      [x - w / 2, y + h / 2],
    ],
    Z_CARA,
    P,
    true,
  );
}

function base() {
  const fuera = [`<path class="iso-halo" d="${k.haloOf(PLACA, -ALTO_PLACA - 5, ALTO_PLACA, P)}"/>`];
  for (const [x, y] of porFondo(k.corners(PLACA, 24))) {
    fuera.push(S(k.cylinder(x, y, 7, -ALTO_PLACA - 5, 1.6, P, 28), { tone: "lo" }));
    fuera.push(S(k.cylinder(x, y, 5.4, -ALTO_PLACA - 3.4, 3.4, P, 28), { tone: "mid" }));
  }
  fuera.push(S(k.slabOf(PLACA, -ALTO_PLACA, ALTO_PLACA, P, 8, 1.6), { tone: "mid" }));
  fuera.push(L(k.planOutline(k.insetPlan(PLACA, 5), 0, P), { tone: "lo" }));
  const tornillos = k.corners(PLACA, 11);
  fuera.push(L(tornillos.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  fuera.push(D(tornillos.map(([x, y]) => en([x, y, 0])), { size: 0.5 }));
  // Placa de identificación al frente, con tres líneas de texto grabado.
  const placa: Plan = { x: LARGO - 70, y: LABIO.y + LABIO.d + 6, w: 74, d: 12, r: 2 };
  fuera.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  fuera.push(L(k.planOutline(k.insetPlan(placa, 1.6), 0.8, P), { tone: "faint" }));
  [0, 1, 2].forEach((i) => {
    const y = placa.y + 3.5 + i * 2.6;
    const largo = [46, 34, 40][i];
    fuera.push(L(k.lineOnTop([placa.x + 12, y], [placa.x + 12 + largo, y], 0.8, P), { tone: "lo", free: true }));
  });
  fuera.push(D([en([placa.x + 5, placa.y + 6, 0.8]), en([placa.x + placa.w - 5, placa.y + 6, 0.8])], { size: 0.45 }));
  return fuera.join("");
}

function lecho() {
  const plan: Plan = { x: -4, y: -4, w: LARGO + 8, d: ALTURA_TARJETA + 7, r: 1.5 };
  return S(k.slabOf(plan, LECHO.z, LECHO.h, P, 3), { tone: "lo", crease: "none" });
}

function guiaYTopes() {
  const fuera = [S(k.slabOf(TOPE_IZQ, 0, ALTO_GUIA - 2, P, 3, 0.5), { tone: "mid" })];
  fuera.push(D([en([TOPE_IZQ.x + 7, TOPE_IZQ.y + 8, ALTO_GUIA - 2]), en([TOPE_IZQ.x + 7, TOPE_IZQ.y + TOPE_IZQ.d - 8, ALTO_GUIA - 2])], { size: 0.45 }));
  fuera.push(S(k.slabOf(GUIA, 0, ALTO_GUIA, P, 3, 0.6), { tone: "mid" }));
  // La ranura por la que corren los patines del carro.
  fuera.push(L(k.lineOnTop([GUIA.x, GUIA.y + GUIA.d / 2], [GUIA.x + GUIA.w, GUIA.y + GUIA.d / 2], ALTO_GUIA, P), { tone: "faint" }));
  fuera.push(D([GUIA.x + 6, GUIA.x + GUIA.w - 6].map((x) => en([x, GUIA.y + 4, ALTO_GUIA])), { size: 0.45 }));
  // Topes de fin de carrera del carro, a ambos extremos de la guía.
  for (const x of [GUIA.x + 1, GUIA.x + GUIA.w - 6]) {
    const plan: Plan = { x, y: GUIA.y + 1, w: 5, d: GUIA.d - 2, r: 1 };
    fuera.push(S(k.slabOf(plan, ALTO_GUIA, 6, P, 2, 0.4), { tone: "mid" }));
    fuera.push(D([en([x + 2.5, GUIA.y + GUIA.d / 2, ALTO_GUIA + 6])], { size: 0.45 }));
  }
  // Un tope de tabulación en el borde izquierdo de las columnas 7, 8, 12 y 73.
  for (const columna of TOPES) {
    const x = xColumna(columna) - PASO_COLUMNA / 2;
    const plan: Plan = { x: x - 1.2, y: GUIA.y + 1.5, w: 2.4, d: 6, r: 0.6 };
    fuera.push(S(k.slabOf(plan, ALTO_GUIA, 4, P, 2, 0.3), { tone: "hi", crease: "lo" }));
    fuera.push(D([en([x, GUIA.y + 4.5, ALTO_GUIA + 4])], { size: 0.4, tone: "mid" }));
  }
  return fuera.join("");
}

function tarjeta() {
  // La esquina de la fila 12 junto a la columna 1 va cortada en diagonal.
  const corte = 0.25 * PULGADA;
  const contorno: [number, number][] = [
    [corte, 0],
    [LARGO, 0],
    [LARGO, ALTURA_TARJETA],
    [0, ALTURA_TARJETA],
    [0, corte],
  ];
  const fuera = [`<path class="iso-halo" d="${k.extrude(contorno, Z_TARJETA, GROSOR, P).fill}" style="filter:blur(3px);opacity:.25"/>`];
  fuera.push(S(k.extrude(contorno, Z_TARJETA, GROSOR, P), { tone: "hi", crease: "lo" }));
  const huecos: string[] = [];
  for (let columna = 1; columna <= COLUMNAS; columna++) {
    for (const fila of perforacionesDe(LINEA[columna - 1])) huecos.push(hueco(columna, fila));
  }
  fuera.push(`<path class="tp-hueco" d="${huecos.join("")}"/>`);
  // La 029 imprime cada carácter sobre su columna, en el borde de la fila 12.
  for (let columna = 1; columna <= COLUMNAS; columna++) {
    const caracter = LINEA[columna - 1];
    if (caracter === " ") continue;
    const matriz = k.topMatrix([xColumna(columna), 3.1], Z_CARA, P, "x");
    fuera.push(k.faceTextSvg(matriz, caracter, { size: 2.6, tone: "mid", anchor: "middle" }));
  }
  return fuera.join("");
}

function labioYRegla() {
  const fuera = [S(k.slabOf(LABIO, 0, ALTO_LABIO, P, 3, 0.5), { tone: "mid" })];
  fuera.push(S(k.slabOf(REGLA, ALTO_LABIO, 0.6, P, 2), { tone: "lo", crease: "none" }));
  // Una marca por columna, colgada del borde trasero de la regla; las decenas, más largas.
  const menores: string[] = [];
  const mayores: string[] = [];
  for (let columna = 1; columna <= COLUMNAS; columna++) {
    const x = xColumna(columna);
    const largo = columna % 10 === 0 ? 3.6 : 1.8;
    (columna % 10 === 0 ? mayores : menores).push(k.lineOnTop([x, REGLA.y], [x, REGLA.y + largo], ALTO_LABIO + 0.6, P));
  }
  fuera.push(L(menores.join(""), { tone: "lo" }), L(mayores.join(""), { tone: "mid" }));
  fuera.push(D([LABIO.x + 4, LABIO.x + LABIO.w - 4].map((x) => en([x, LABIO.y + LABIO.d - 3, ALTO_LABIO])), { size: 0.45 }));
  return fuera.join("");
}

/** Dos pisadores atornillados al labio mantienen plano el borde de la fila 9. */
function pisadores() {
  const fuera: string[] = [];
  for (const columna of [26, 58]) {
    const x = xColumna(columna);
    const pie: Plan = { x: x - 4, y: LABIO.y + 1, w: 8, d: 6, r: 1 };
    const lengua: Plan = { x: x - 2.5, y: ALTURA_TARJETA - 6, w: 5, d: 10, r: 1 };
    fuera.push(S(k.slabOf(pie, ALTO_LABIO, 2.2, P, 2, 0.3), { tone: "mid" }));
    fuera.push(S(k.slabOf(lengua, Z_CARA, ALTO_LABIO + 2.2 - Z_CARA, P, 2, 0.3), { tone: "mid" }));
    fuera.push(D([en([x, pie.y + 3.6, ALTO_LABIO + 2.2])], { size: 0.5 }));
  }
  return fuera.join("");
}

/**
 * El carro, construido sobre la columna 1 y trasladado a lo largo de x. Un
 * patín corre sobre la guía y otro sobre el labio; entre los dos, una barra
 * baja con doce contactos, uno por fila.
 *
 * Todo es estrecho y bajo a propósito: el rayo de vista desde una perforación
 * de la columna leída cruza la altura de la barra (11) 5,05 unidades a la
 * derecha de su centro, y la cara trasera del patín delantero, 6,85: con
 * medio ancho 3 y 4 la columna que se lee nunca queda tapada.
 */
function carro() {
  const x0 = xColumna(1);
  const zBarra = ALTO_GUIA + 1;
  const altoBarra = 3;
  const tope = zBarra + altoBarra + 1;
  const atras: Plan = { x: x0 - 6, y: GUIA.y + 1, w: 12, d: GUIA.d - 2, r: 1.5 };
  const frente: Plan = { x: x0 - 4, y: LABIO.y + 0.5, w: 8, d: 8.5, r: 1.5 };
  const barra: Plan = { x: x0 - 3, y: atras.y + atras.d, w: 6, d: frente.y - (atras.y + atras.d), r: 1 };
  const fuera: string[] = [];
  fuera.push(S(k.slabOf(atras, ALTO_GUIA, tope - ALTO_GUIA, P, 3, 0.4), { tone: "mid" }));
  fuera.push(D([en([x0 - 3.5, atras.y + 3, tope]), en([x0 + 3.5, atras.y + atras.d - 3, tope])], { size: 0.45 }));
  fuera.push(S(k.slabOf(barra, zBarra, altoBarra, P, 2, 0.4), { tone: "mid" }));
  fuera.push(D(FILAS.map((fila) => en([x0, yFila(fila), zBarra + altoBarra])), { size: 0.5, tone: "hi" }));
  fuera.push(S(k.slabOf(frente, ALTO_LABIO, tope - ALTO_LABIO, P, 3, 0.4), { tone: "mid" }));
  // Índice: sale del patín delantero y apoya su punta sobre la regla.
  const indice: Plan = { x: x0 - 0.9, y: frente.y + frente.d - 0.5, w: 1.8, d: 8.5, r: 0.4 };
  const zIndice = ALTO_LABIO + 0.8;
  fuera.push(S(k.slabOf(indice, zIndice, 1, P, 2), { tone: "hi" }));
  fuera.push(L(k.lineOnTop([x0, indice.y + 0.5], [x0, indice.y + indice.d], zIndice + 1, P), { tone: "lit" }));
  // Perilla moleteada sobre el patín delantero, para moverlo a mano.
  const perilla: [number, number] = [x0, frente.y + frente.d / 2];
  fuera.push(S(k.cylinder(perilla[0], perilla[1], 3, tope, 4.5, P, 20), { tone: "mid" }));
  fuera.push(L(k.knurl(perilla[0], perilla[1], 3, tope, tope + 4.5, 18, P), { tone: "lo" }));
  fuera.push(D([en([perilla[0], perilla[1], tope + 4.5])], { size: 0.5, tone: "hi" }));
  return fuera.join("");
}

/** Contorno iluminado de las perforaciones de una columna. */
export function leidosDe(columna: number) {
  return perforacionesDe(LINEA[columna - 1]).map((fila) => hueco(columna, fila)).join("");
}

export const transformCarro = (columna: number) => k.translateAlong(P, [(columna - 1) * PASO_COLUMNA, 0, 0]);

/** Lo que se mueve el carro en pantalla al avanzar una columna. */
export const PASO_PANTALLA = k.axisVector(P, [PASO_COLUMNA, 0, 0]);

/** Posición en pantalla (viewBox) de cada columna sobre la regla, para el puntero. */
export const X_PANTALLA = Array.from({ length: COLUMNAS }, (_, i) => en([xColumna(i + 1), REGLA.y + 3, ALTO_LABIO])[0]);

const COLUMNA_INICIAL = 12;

export const SVG = k.figureSvg({
  width: ANCHO,
  height: ALTO,
  label:
    "Estación lectora de tarjetas perforadas. Una tarjeta IBM de 80 columnas descansa en el lecho, contra una guía trasera con topes en las columnas 7, 8, 12 y 73. Lleva perforada la línea de COBOL 000300 DISPLAY \"HOLA, COBOL\". con el nombre SALUDO en las columnas 73 a 80. Un carro con doce contactos recorre las columnas y su índice marca en la regla la columna que lee.",
  body: [
    base(),
    lecho(),
    guiaYTopes(),
    tarjeta(),
    `<path data-part="leidos" class="tp-leido" d="${leidosDe(COLUMNA_INICIAL)}"/>`,
    labioYRegla(),
    pisadores(),
    `<g data-part="carro" transform="${transformCarro(COLUMNA_INICIAL)}">${carro()}</g>`,
  ],
});

export { COLUMNA_INICIAL };
