/**
 * Imágenes de los cursos publicados desde /panel/cursos.
 *
 * Las sesiones las citan con una ruta relativa, `![…](imagenes/figura.png)`,
 * igual que en la carpeta de autoría. Al publicar se suben al bucket público
 * `cursos-imagenes` bajo `<slug>/` y, al pintar la sesión, la ruta relativa
 * se resuelve contra ese prefijo. Así una figura nueva se publica con el
 * Markdown, sin copiarla a /public ni volver a desplegar.
 */
export const BUCKET_IMAGENES_CURSO = "cursos-imagenes";

/** Tamaño máximo por imagen; el bucket aplica el mismo límite. */
export const MAX_BYTES_IMAGEN = 2 * 1024 * 1024;

const TIPOS: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

function extension(nombre: string) {
  const punto = nombre.lastIndexOf(".");
  return punto === -1 ? "" : nombre.slice(punto + 1).toLowerCase();
}

/** Tipo MIME de una imagen admitida, o null si la extensión no lo es. */
export function tipoImagen(nombre: string): string | null {
  return TIPOS[extension(nombre)] ?? null;
}

/**
 * Comprueba que los primeros bytes correspondan al formato que declara la
 * extensión. Un archivo renombrado no debe llegar al bucket con un tipo falso.
 */
export function firmaImagenValida(bytes: Uint8Array, tipo: string): boolean {
  const empieza = (firma: number[], desde = 0) =>
    bytes.length >= desde + firma.length && firma.every((b, i) => bytes[desde + i] === b);
  switch (tipo) {
    case "image/png":
      return empieza([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/jpeg":
      return empieza([0xff, 0xd8, 0xff]);
    case "image/gif":
      return empieza([0x47, 0x49, 0x46, 0x38]);
    case "image/webp":
      return empieza([0x52, 0x49, 0x46, 0x46]) && empieza([0x57, 0x45, 0x42, 0x50], 8);
    default:
      return false;
  }
}

/** Nombre de archivo admitido dentro de `imagenes/`: sin carpetas ni rutas. */
const NOMBRE = /^[a-z0-9][a-z0-9._-]{0,119}$/i;

export function nombreImagenValido(nombre: string): boolean {
  return NOMBRE.test(nombre) && !nombre.includes("..") && tipoImagen(nombre) !== null;
}

/**
 * Rutas relativas de imagen que cita un Markdown, como `imagenes/figura.png`.
 * Las URL absolutas (`https://…`) y las rutas que empiezan por `/` no se
 * devuelven: no dependen del bucket.
 */
export function imagenesReferenciadas(texto: string): string[] {
  const rutas = new Set<string>();
  for (const m of texto.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
    const ruta = m[1].replace(/^\.\//, "");
    if (esRutaRelativa(ruta)) rutas.add(ruta);
  }
  return [...rutas];
}

export function esRutaRelativa(ruta: string): boolean {
  return !/^[a-z][a-z0-9+.-]*:/i.test(ruta) && !ruta.startsWith("/") && !ruta.startsWith("#");
}

/** Archivo dentro del bucket para una ruta relativa válida, o null. */
export function rutaEnBucket(slug: string, ruta: string): string | null {
  const limpia = ruta.replace(/^\.\//, "");
  const [carpeta, nombre, ...resto] = limpia.split("/");
  if (carpeta !== "imagenes" || !nombre || resto.length > 0 || !nombreImagenValido(nombre)) {
    return null;
  }
  return `${slug}/imagenes/${nombre}`;
}

/** Prefijo público de las imágenes de un curso en Supabase Storage. */
export function baseImagenesCurso(slug: string): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return undefined;
  return `${url.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET_IMAGENES_CURSO}/${slug}/`;
}

/**
 * Resuelve el `src` de una imagen de la teoría. Las rutas absolutas se
 * respetan; las relativas válidas se apuntan al bucket del curso.
 */
export function resolverImagenCurso(src: string, base?: string): string {
  if (!base || !esRutaRelativa(src)) return src;
  const limpia = src.replace(/^\.\//, "");
  if (!rutaEnBucket("x", limpia)) return src;
  return base + limpia;
}
