import type { GuionMemoria } from "./MemoriaCobol3D";

/**
 * Guiones de la escena de memoria de COBOL. Cada valor que queda en un campo
 * y cada salida de DISPLAY se obtuvo ejecutando el programa equivalente con
 * GnuCOBOL 3.2; `scripts/verificar-escenas-cobol.mjs` lo vuelve a comprobar a
 * partir de `datos` y `codigo`.
 */

/**
 * Nivelación, «Grupos y registros»: un registro de cliente de 21 bytes. Los
 * tres campos se llenan con sus VALUE y DISPLAY del grupo muestra los bytes
 * tal como están, sin punto decimal ni separadores.
 */
export const REGISTRO_CLIENTE: GuionMemoria = {
  datos: [
    "01  CLIENTE.",
    '    05  CODIGO      PIC X(4)     VALUE "C001".',
    '    05  NOMBRE      PIC X(10)    VALUE "ROSA".',
    "    05  SALDO       PIC 9(5)V99  VALUE 1250.50.",
  ],
  grupo: { nombre: "CLIENTE", aparece: 0.6 },
  campos: [
    { nombre: "CODIGO", pic: "X(4)", largo: 4 },
    { nombre: "NOMBRE", pic: "X(10)", largo: 10 },
    { nombre: "SALDO", pic: "9(5)V99", largo: 7, numerico: true, decimales: 2 },
  ],
  movimientos: [
    { t: 1.6, campo: 0, texto: "C001", desde: 0, valor: "C001" },
    { t: 3.4, campo: 1, texto: "ROSA", desde: 0, valor: "ROSA      " },
    { t: 5.6, campo: 2, texto: "125050", desde: 1, valor: "0125050" },
  ],
  codigo: [
    { t: 1.6, linea: 'CODIGO  VALUE "C001"' },
    { t: 3.4, linea: 'NOMBRE  VALUE "ROSA"' },
    { t: 5.6, linea: "SALDO   VALUE 1250.50" },
    { t: 8.2, linea: "DISPLAY CLIENTE", salida: "C001ROSA      0125050", lee: [0, 1, 2] },
  ],
  registro: [
    { t: 0, comando: "01 CLIENTE", detalle: "Un registro: un grupo de 21 bytes seguidos, 4 + 10 + 7" },
    { t: 1.6, comando: 'CODIGO PIC X(4) VALUE "C001"', detalle: "Cuatro bytes de texto, uno por carácter" },
    { t: 3.4, comando: 'NOMBRE PIC X(10) VALUE "ROSA"', detalle: "El texto ocupa 4 de los 10 bytes; los otros 6 quedan con espacios" },
    { t: 5.6, comando: "SALDO PIC 9(5)V99 VALUE 1250.50", detalle: "Siete dígitos. La V marca dónde va la coma decimal, pero no ocupa ningún byte" },
    { t: 8.2, comando: "DISPLAY CLIENTE", detalle: "El grupo se muestra como sus 21 bytes, uno tras otro: C001ROSA      0125050" },
  ],
  duracion: 12,
};

/**
 * Introducción, MOVE a un campo alfanumérico: el texto se coloca desde la
 * izquierda; si es corto se rellena con espacios y si es largo se corta lo
 * que no cabe a la derecha.
 */
export const MOVE_ALFANUMERICO: GuionMemoria = {
  datos: ["01  CIUDAD          PIC X(8)."],
  campos: [{ nombre: "CIUDAD", pic: "X(8)", largo: 8, inicial: "        " }],
  movimientos: [
    { t: 1.4, campo: 0, texto: "LIMA", desde: 0, valor: "LIMA    " },
    { t: 6.0, campo: 0, texto: "AREQUIPA-SUR", desde: 0, valor: "AREQUIPA" },
  ],
  codigo: [
    { t: 1.4, linea: 'MOVE "LIMA" TO CIUDAD' },
    { t: 4.0, linea: "DISPLAY CIUDAD", salida: "LIMA    ", lee: [0] },
    { t: 6.0, linea: 'MOVE "AREQUIPA-SUR" TO CIUDAD' },
    { t: 9.4, linea: "DISPLAY CIUDAD", salida: "AREQUIPA", lee: [0] },
  ],
  registro: [
    { t: 0, comando: "CIUDAD PIC X(8)", detalle: "Ocho bytes de texto. Sin VALUE, GnuCOBOL los deja en espacios" },
    { t: 1.4, comando: 'MOVE "LIMA" TO CIUDAD', detalle: "El texto entra desde la izquierda; los 4 bytes que sobran se rellenan con espacios" },
    { t: 4.0, comando: "DISPLAY CIUDAD", detalle: "Se muestran los 8 bytes: LIMA y cuatro espacios" },
    { t: 6.0, comando: 'MOVE "AREQUIPA-SUR" TO CIUDAD', detalle: "Doce caracteres no caben en ocho: se pierden los cuatro de la derecha" },
    { t: 9.4, comando: "DISPLAY CIUDAD", detalle: "Queda AREQUIPA. COBOL no avisa del corte" },
  ],
  duracion: 12.4,
};

/**
 * Introducción, MOVE a un campo numérico: los dígitos se alinean por la coma
 * decimal; faltantes, se rellenan con ceros; sobrantes, se pierden por los dos
 * extremos.
 */
export const MOVE_NUMERICO: GuionMemoria = {
  datos: ["01  MONTO           PIC 9(5)V99."],
  campos: [{ nombre: "MONTO", pic: "9(5)V99", largo: 7, numerico: true, decimales: 2, inicial: "0000000" }],
  movimientos: [
    { t: 1.4, campo: 0, texto: "42", desde: 3, valor: "0004200" },
    { t: 6.4, campo: 0, texto: "1234567891", desde: -2, valor: "3456789" },
  ],
  codigo: [
    { t: 1.4, linea: "MOVE 42 TO MONTO" },
    { t: 4.2, linea: "DISPLAY MONTO", salida: "00042.00", lee: [0] },
    { t: 6.4, linea: "MOVE 1234567.891 TO MONTO" },
    { t: 10.0, linea: "DISPLAY MONTO", salida: "34567.89", lee: [0] },
  ],
  registro: [
    { t: 0, comando: "MONTO PIC 9(5)V99", detalle: "Siete dígitos: cinco enteros y dos decimales. Sin VALUE, GnuCOBOL los deja en cero" },
    { t: 1.4, comando: "MOVE 42 TO MONTO", detalle: "42 se alinea con la coma decimal: los dígitos que faltan quedan en cero" },
    { t: 4.2, comando: "DISPLAY MONTO → 00042.00", detalle: "El punto lo añade DISPLAY en GnuCOBOL; en memoria hay siete dígitos" },
    { t: 6.4, comando: "MOVE 1234567.891 TO MONTO", detalle: "Sobran dos enteros a la izquierda y un decimal a la derecha: se pierden" },
    { t: 10.0, comando: "DISPLAY MONTO → 34567.89", detalle: "Quedan 34567,89. COBOL tampoco avisa de este corte" },
  ],
  duracion: 13,
};
