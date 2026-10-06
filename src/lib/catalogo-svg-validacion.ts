// Reglas de los SVG del catálogo, sin dependencias de servidor: el formulario
// las aplica antes de enviar y la acción las repite, que es la que manda.
export const TAMANO_MAXIMO_SVG = 1024 * 1024;

export function slugAsset(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Motivo por el que un SVG no se acepta, o null si es válido.
 *
 * El bucket es público y el archivo se puede abrir directo en el navegador,
 * donde un SVG con scripts sí se ejecuta. Por eso se rechaza cualquier cosa
 * activa o que cargue recursos externos, no solo lo que afecta a la máscara.
 */
export function problemaSvg(contenido: string): string | null {
  const texto = contenido.trim();
  if (!/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(texto) || !/<\/svg>\s*$/i.test(texto)) {
    return "El archivo no es un SVG.";
  }
  const prohibidos: [RegExp, string][] = [
    [/<script/i, "scripts"],
    [/<foreignObject/i, "foreignObject"],
    [/<!ENTITY|<!DOCTYPE/i, "DOCTYPE o entidades"],
    [/\son[a-z]+\s*=/i, "atributos de evento"],
    [/javascript:/i, "URLs javascript:"],
    [/(?:xlink:)?href\s*=\s*["']\s*(?!#)/i, "referencias externas"],
    [/url\(\s*["']?\s*(?!#)/i, "url() externas"],
    [/@import/i, "@import"],
  ];
  for (const [patron, nombre] of prohibidos) {
    if (patron.test(texto)) return `El SVG contiene ${nombre}; expórtalo como trazos simples.`;
  }
  return null;
}
