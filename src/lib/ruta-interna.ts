/**
 * Devuelve `valor` si es una ruta de este mismo sitio, o `porDefecto` si no.
 *
 * Mirar solo que empiece por "/" y no por "//" no basta: el navegador lee
 * "\" como "/" y descarta tabuladores y saltos de línea, así que "/\evil.com"
 * o "/\t/evil.com" terminan en otro dominio. Se resuelve la ruta contra un
 * origen ficticio y se acepta solo si sigue en ese origen.
 */
export function rutaInterna(valor: string | null | undefined, porDefecto = "/panel") {
  if (typeof valor !== "string" || !valor.startsWith("/")) return porDefecto;
  if (/[\\\s\u0000-\u001f\u007f]/.test(valor)) return porDefecto;
  try {
    const base = "https://interno.invalid";
    const url = new URL(valor, base);
    if (url.origin !== base) return porDefecto;
    return url.pathname + url.search + url.hash;
  } catch {
    return porDefecto;
  }
}
