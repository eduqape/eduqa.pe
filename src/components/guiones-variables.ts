import type { Guion } from "./VariablesPython3D";

/**
 * Guiones de la escena de variables, uno por punto de la sesión. Cada salida
 * de `print` se obtuvo ejecutando el código en Python 3.
 */

/**
 * Punto «Variables»: una sola asignación. Primero se evalúa la derecha y nace
 * el valor; después el `=` liga el nombre a ese valor.
 */
export const DEFINICION: Guion = {
  objetos: [{ valor: '"Laptop"', tipo: "str", x: 2.6, z: 0, cae: 1.0, resalta: 5.0 }],
  nombres: [{ nombre: "producto", x: -2.6, z: 0, aparece: 2.8, apunta: [{ objeto: 0, t: 3.3 }] }],
  codigo: [
    { t: 1.0, linea: 'producto = "Laptop"' },
    { t: 6.4, linea: "print(producto)", salida: "Laptop" },
  ],
  registro: [
    { t: 0, comando: "Memoria vacía", detalle: "Todavía no existe ningún nombre ni ningún valor" },
    { t: 1.0, comando: '"Laptop"', detalle: "Primero se evalúa lo de la derecha: Python crea el texto en memoria" },
    { t: 2.8, comando: "producto =", detalle: "Después el = liga el nombre producto a ese valor" },
    { t: 5.0, comando: "str", detalle: "No se declaró ningún tipo: lo trae el valor" },
    { t: 6.4, comando: "print(producto)", detalle: "Al usar el nombre se obtiene el valor que señala: Laptop" },
  ],
  duracion: 9.6,
  igual: true,
};

/**
 * Recorrido completo: varias variables, `type()`, reasignación y cambio de
 * tipo. Pensado para el punto de reasignación, no para la definición.
 */
const ALTA = (i: number) => 0.4 + i * 2.6;
// Una fila por variable, de atrás hacia delante, en el orden del código. Con
// la cámara a unos 38°, una caja tapa el frente de la de atrás si las filas
// distan menos de ~2,5: el frente (0,9) más la tapa (1,3) en perspectiva.
const FILA = (i: number) => -4.2 + i * 2.8;
export const RECORRIDO: Guion = {
  objetos: [
    { valor: '"Laptop"', tipo: "str", x: 1.4, z: FILA(0), cae: ALTA(0) },
    { valor: "2500", tipo: "int", x: 1.4, z: FILA(1), cae: ALTA(1), libera: 14.4 },
    { valor: "3", tipo: "int", x: 1.4, z: FILA(2), cae: ALTA(2) },
    { valor: "True", tipo: "bool", x: 1.4, z: FILA(3), cae: ALTA(3) },
    { valor: "2950.0", tipo: "float", x: 5.0, z: FILA(0.5), cae: 12.0, libera: 19.0 },
    { valor: '"agotado"', tipo: "str", x: 5.0, z: FILA(1.5), cae: 16.6 },
  ],
  nombres: ["producto", "precio", "cantidad", "disponible"].map((nombre, i) => ({
    nombre,
    x: -3.6,
    z: FILA(i),
    aparece: ALTA(i) + 0.6,
    apunta:
      i === 1
        ? [
            { objeto: 1, t: ALTA(1) + 1.1 },
            { objeto: 4, t: 13.0 },
            { objeto: 5, t: 17.6 },
          ]
        : [{ objeto: i, t: ALTA(i) + 1.1 }],
  })),
  codigo: [
    { t: ALTA(0), linea: 'producto = "Laptop"' },
    { t: ALTA(1), linea: "precio = 2500" },
    { t: ALTA(2), linea: "cantidad = 3" },
    { t: ALTA(3), linea: "disponible = True" },
    { t: 10.6, linea: "print(type(precio))", salida: "<class 'int'>" },
    { t: 12.0, linea: "precio = precio * 1.18" },
    { t: 16.6, linea: 'precio = "agotado"' },
    { t: 20.4, linea: "print(type(precio))", salida: "<class 'str'>" },
  ],
  registro: [
    { t: 0, comando: "Memoria vacía", detalle: "Todavía no existe ningún nombre ni ningún valor" },
    { t: ALTA(0), comando: 'producto = "Laptop"', detalle: "Python crea el texto y le pone el nombre producto" },
    { t: ALTA(1), comando: "precio = 2500", detalle: "Un entero. No se declara el tipo: lo trae el valor" },
    { t: ALTA(2), comando: "cantidad = 3", detalle: "Otro entero, con su propio nombre" },
    { t: ALTA(3), comando: "disponible = True", detalle: "Un booleano: solo puede ser True o False" },
    { t: 10.6, comando: "type(precio) → <class 'int'>", detalle: "El tipo pertenece al valor, no al nombre" },
    { t: 12.0, comando: "precio = precio * 1.18", detalle: "Se calcula un valor nuevo, 2950.0, de tipo float" },
    { t: 13.0, comando: "precio → 2950.0", detalle: "El nombre precio deja 2500 y pasa a señalar el resultado" },
    { t: 14.4, comando: "2500 sin nombre", detalle: "Ningún nombre lo señala: ya no se puede usar y Python puede liberarlo" },
    { t: 16.6, comando: 'precio = "agotado"', detalle: "El mismo nombre puede señalar un valor de otro tipo" },
    { t: 20.4, comando: "type(precio) → <class 'str'>", detalle: "Cambió el tipo porque cambió el valor señalado" },
  ],
  duracion: 24.4,
};
