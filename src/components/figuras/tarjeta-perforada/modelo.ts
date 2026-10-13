/**
 * La tarjeta de la figura: una línea de COBOL de 80 columnas perforada con el
 * código de la perforadora IBM 029, y las zonas del formato de referencia.
 * Todo lo que la figura muestra —perforaciones, letras impresas, lectura—
 * sale de aquí.
 *
 * Código de perforación: Douglas W. Jones, «Punched Card Codes», tabla de la
 * IBM 029 (https://homepage.cs.uiowa.edu/~jones/cards/codes.html). Una columna
 * en blanco es un espacio.
 */

export const COLUMNAS = 80;

/** Filas de arriba abajo: las tres de zona (12, 11 y 0) y las de dígito. */
export const FILAS = ["12", "11", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
export type Fila = (typeof FILAS)[number];

/**
 * La línea perforada: número de secuencia en 1–6, indicador en blanco en la
 * 7, área A vacía y la sentencia desde la 12, y el nombre del programa en el
 * área de identificación (73–80).
 */
export const LINEA = `${"000300".padEnd(6)} ${"".padEnd(4)}${'DISPLAY "HOLA, COBOL".'.padEnd(61)}${"SALUDO".padEnd(8)}`;

const CODIGO_029: Record<string, Fila[]> = {
  " ": [],
  "0": ["0"], "1": ["1"], "2": ["2"], "3": ["3"], "4": ["4"],
  "5": ["5"], "6": ["6"], "7": ["7"], "8": ["8"], "9": ["9"],
  A: ["12", "1"], B: ["12", "2"], C: ["12", "3"], D: ["12", "4"], E: ["12", "5"],
  F: ["12", "6"], G: ["12", "7"], H: ["12", "8"], I: ["12", "9"],
  J: ["11", "1"], K: ["11", "2"], L: ["11", "3"], M: ["11", "4"], N: ["11", "5"],
  O: ["11", "6"], P: ["11", "7"], Q: ["11", "8"], R: ["11", "9"],
  S: ["0", "2"], T: ["0", "3"], U: ["0", "4"], V: ["0", "5"], W: ["0", "6"],
  X: ["0", "7"], Y: ["0", "8"], Z: ["0", "9"],
  '"': ["7", "8"],
  ".": ["12", "3", "8"],
  ",": ["0", "3", "8"],
};

export function perforacionesDe(caracter: string): Fila[] {
  const filas = CODIGO_029[caracter];
  if (!filas) throw new Error(`El carácter «${caracter}» no está en la tabla de la figura.`);
  return filas;
}

export type Zona = { desde: number; hasta: number; nombre: string };

/** Las cinco zonas de una línea en formato fijo. */
export const ZONAS: Zona[] = [
  { desde: 1, hasta: 6, nombre: "secuencia" },
  { desde: 7, hasta: 7, nombre: "indicador" },
  { desde: 8, hasta: 11, nombre: "área A" },
  { desde: 12, hasta: 72, nombre: "área B" },
  { desde: 73, hasta: 80, nombre: "identificación" },
];

/** Columnas donde empieza cada zona después de la primera: los topes. */
export const TOPES = ZONAS.slice(1).map((zona) => zona.desde);

export const zonaDe = (columna: number) => ZONAS.find((z) => columna >= z.desde && columna <= z.hasta)!;

export const caracterDe = (columna: number) => LINEA[columna - 1];

/** Lo que muestra la esquina de la tarjeta: columna, zona y lo leído. */
export function lecturaDe(columna: number) {
  const caracter = caracterDe(columna);
  const leido = caracter === " " ? "espacio" : `«${caracter}» ${perforacionesDe(caracter).join("-")}`;
  return `col ${String(columna).padStart(2, "0")} · ${zonaDe(columna).nombre} · ${leido}`;
}

/** La misma lectura, en frase, para lectores de pantalla. */
export function lecturaHablada(columna: number) {
  const caracter = caracterDe(columna);
  const leido =
    caracter === " "
      ? "en blanco, un espacio"
      : `el carácter ${caracter}, perforado en las filas ${perforacionesDe(caracter).join(", ")}`;
  return `Columna ${columna}, ${zonaDe(columna).nombre}: ${leido}`;
}
