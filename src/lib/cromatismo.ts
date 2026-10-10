/**
 * Preferencias de color de la interfaz: el modo monocromático y el color de
 * acento.
 *
 * Modo monocromático: la interfaz sin el color de la identidad.
 *
 * Es un eje aparte del tema claro/oscuro, no un tercer tema. Claro y oscuro
 * responden a cuánta luz hay alrededor; esto responde a si se quiere color de
 * marca o no. Mezclarlos en una sola lista obligaría a elegir entre modo
 * oscuro y modo monocromático, que son preferencias independientes.
 *
 * Lo que cambia son los tokens de color, así que ningún componente necesita
 * saber que este modo existe. La clase en <html> la pone también un script
 * que corre antes del primer pintado; aquí solo se mantiene sincronizada.
 */
const CLAVE = "eduqa:monocromo";
export const CLASE = "mono";

let activo: boolean | null = null;
const oyentes = new Set<() => void>();

function leer() {
  if (activo === null) {
    // El script de arranque ya decidió: se lee del DOM y no de localStorage,
    // para que ambos no puedan discrepar.
    activo =
      typeof document !== "undefined" &&
      document.documentElement.classList.contains(CLASE);
  }
  return activo;
}

export function monocromoActivo() {
  return leer();
}

/** En el servidor no hay preferencia todavía: se pinta el modo con color. */
export function monocromoEnServidor() {
  return false;
}

export function alternarMonocromo() {
  activo = !leer();
  document.documentElement.classList.toggle(CLASE, activo);
  try {
    window.localStorage.setItem(CLAVE, activo ? "1" : "0");
  } catch {
    // Navegación privada con almacenamiento bloqueado: la preferencia vale
    // para esta pestaña y se pierde al cerrarla, que es mejor que romper.
  }
  oyentes.forEach((avisar) => avisar());
}

export function suscribirseMonocromo(avisar: () => void) {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

/**
 * Color de acento: el tono de la marca en la interfaz. Rojo por omisión.
 *
 * Es otro eje, como el monocromático: se combina con claro y oscuro, y cambia
 * solo los tokens de marca (`--color-rojo` y sus derivados) mediante el
 * atributo `data-acento` en <html>. El rojo no lleva atributo: es el valor de
 * `:root`, así que una preferencia ilegible o borrada vuelve a la marca.
 *
 * El monocromático gana al acento: quien pide la interfaz sin color no debe
 * ver morado por haberlo elegido antes. Elegir un acento, en cambio, apaga el
 * monocromático, porque es pedir color.
 */
export const ACENTOS = [
  { id: "rojo", nombre: "Rojo", muestra: "#c70724" },
  { id: "morado", nombre: "Morado", muestra: "#6d28d9" },
  { id: "azul", nombre: "Azul", muestra: "#1d4ed8" },
  { id: "rosa", nombre: "Rosa", muestra: "#be185d" },
] as const;
export type Acento = (typeof ACENTOS)[number]["id"];

const CLAVE_ACENTO = "eduqa:acento";
const ATRIBUTO = "data-acento";
const POR_OMISION: Acento = "rojo";
const esAcento = (v: unknown): v is Acento => ACENTOS.some((a) => a.id === v);

let acento: Acento | null = null;

function leerAcento(): Acento {
  if (acento === null) {
    const enDom = typeof document !== "undefined" ? document.documentElement.getAttribute(ATRIBUTO) : null;
    acento = esAcento(enDom) ? enDom : POR_OMISION;
  }
  return acento;
}

export function acentoActivo() {
  return leerAcento();
}

/** En el servidor no hay preferencia todavía: se pinta el rojo de marca. */
export function acentoEnServidor(): Acento {
  return POR_OMISION;
}

export function elegirAcento(nuevo: Acento) {
  acento = nuevo;
  const raiz = document.documentElement;
  if (nuevo === POR_OMISION) raiz.removeAttribute(ATRIBUTO);
  else raiz.setAttribute(ATRIBUTO, nuevo);
  try {
    window.localStorage.setItem(CLAVE_ACENTO, nuevo);
  } catch {
    // Igual que en el monocromático: sin almacenamiento, vale para la pestaña.
  }
  if (leer()) alternarMonocromo();
  oyentes.forEach((avisar) => avisar());
}

/** Sirve para ambos ejes: avisa al cambiar el acento o el monocromático. */
export const suscribirseCromatismo = suscribirseMonocromo;

/**
 * Se inyecta tal cual antes de que pinte la página. Sin esto, el primer
 * fotograma sale con el rojo puesto y se ve el cambio de golpe. El acento se
 * valida contra la lista: un valor viejo o manipulado no deja la página sin
 * marca.
 */
export const GUION_ARRANQUE = `try{var r=document.documentElement;if(localStorage.getItem("${CLAVE}")==="1")r.classList.add("${CLASE}");var a=localStorage.getItem("${CLAVE_ACENTO}");if(${JSON.stringify(ACENTOS.map((a) => a.id).filter((id) => id !== "rojo"))}.indexOf(a)>-1)r.setAttribute("${ATRIBUTO}",a)}catch(e){}`;
