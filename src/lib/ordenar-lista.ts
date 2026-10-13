/**
 * Lo puro de ordenar una lista arrastrando: dónde caería la fila y cómo queda
 * la lista. Separado del componente para probarlo sin navegador.
 */

/** Copia de `lista` con el elemento de `desde` movido a `hasta`. */
export function moverElemento<T>(lista: readonly T[], desde: number, hasta: number): T[] {
  const copia = [...lista];
  const [elemento] = copia.splice(desde, 1);
  copia.splice(hasta, 0, elemento);
  return copia;
}

/**
 * Posición final de la fila `indice` cuando su centro está en `centro`: tantas
 * como filas de las demás tengan el centro por encima.
 */
export function destinoArrastre(centros: readonly number[], indice: number, centro: number): number {
  return centros.reduce((cuenta, c, i) => (i !== indice && c < centro ? cuenta + 1 : cuenta), 0);
}

/**
 * Cuánto se aparta cada fila mientras otra se arrastra de `indice` a
 * `destino`: las que quedan entre medias dejan el hueco de su altura.
 */
export function desplazamiento(i: number, indice: number, destino: number, altura: number): number {
  if (i === indice) return 0;
  if (indice < destino && i > indice && i <= destino) return -altura;
  if (indice > destino && i >= destino && i < indice) return altura;
  return 0;
}
