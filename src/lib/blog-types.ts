export type PosicionCaratulaBlog = "arriba" | "centro" | "abajo";

export type CaratulaBlog = {
  url: string;
  alt: string;
  posicion?: PosicionCaratulaBlog;
};

export type ArticuloBlog = {
  guid: string;
  slug: string;
  titulo: string;
  resumen: string;
  contenido: string;
  /**
   * Carátula editorial opcional para artículos nativos.
   * Permite controlar el texto alternativo y el punto vertical de recorte.
   */
  caratula?: CaratulaBlog | null;
  /**
   * Campo heredado de Medium. Se mantiene como fallback de compatibilidad.
   */
  portada: string | null;
  fecha: string;
  fechaIso: string;
  autor: string;
  enlaceMedium: string | null;
  categorias: string[];
  minutosLectura: number;
  /**
   * Cursos de la plataforma donde se practica lo que cuenta el artículo. El
   * cierre los ofrece como siguiente paso en vez de mandar al catálogo entero.
   */
  cursos?: CursoRelacionadoBlog[];
};


/**
 * Cómo respondió el feed la última vez.
 *
 * El panel lo necesita para explicar un cero: no es lo mismo «el feed está
 * vacío» que «Medium respondió 404 porque el usuario no existe». Antes los dos
 * casos se veían igual, como «0 artículos disponibles».
 */
export type EstadoFeedMedium =
  | { tipo: "ok"; url: string; articulos: number }
  | { tipo: "vacio"; url: string }
  | { tipo: "http"; url: string; codigo: number }
  | { tipo: "red"; url: string };

export type CursoRelacionadoBlog = { slug: string; titulo: string };

export type SeccionBlog = { id: string; titulo: string };

/** Texto plano de un fragmento HTML, con las entidades más comunes resueltas. */
export function textoPlanoHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Las secciones de un artículo: cada `<h2>` que lleva `id`.
 *
 * Es la única fuente del índice. Un `<h2>` sin `id` no entra porque no habría
 * a dónde saltar; los artículos de Medium no traen ids y por eso no muestran
 * índice.
 */
export function seccionesBlog(contenido: string): SeccionBlog[] {
  const secciones: SeccionBlog[] = [];
  for (const [, atributos, interior] of contenido.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi)) {
    const id = atributos.match(/\bid=["']([^"']+)["']/i)?.[1];
    // Dentro de un título solo hay etiquetas en línea (`<code>`, `<em>`): se
    // quitan sin dejar espacio, o «<code>lazy</code>:» se leería «lazy :».
    const titulo = textoPlanoHtml(interior.replace(/<[^>]+>/g, ""));
    if (id && titulo) secciones.push({ id, titulo });
  }
  return secciones;
}

/**
 * Qué leer después de un artículo.
 *
 * Primero los que comparten más temas; a igualdad, los más recientes. Si no
 * hay ninguno relacionado se rellena con los más recientes, porque un cierre
 * sin siguiente lectura es el punto donde más lectores abandonan.
 */
export function articulosRelacionados(
  actual: ArticuloBlog,
  todos: ArticuloBlog[],
  cantidad = 2,
): ArticuloBlog[] {
  const temas = new Set(actual.categorias);
  return todos
    .filter((otro) => otro.slug !== actual.slug)
    .map((otro) => ({
      otro,
      comunes: otro.categorias.filter((tema) => temas.has(tema)).length,
    }))
    .sort(
      (a, b) =>
        b.comunes - a.comunes ||
        new Date(b.otro.fechaIso).getTime() - new Date(a.otro.fechaIso).getTime(),
    )
    .slice(0, cantidad)
    .map(({ otro }) => otro);
}

/** Minutos de lectura a 180 palabras por minuto, el mismo ritmo que el feed de Medium. */
export function minutosDeLectura(html: string): number {
  const palabras = textoPlanoHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palabras / 180));
}

export function resolverCaratulaBlog(
  articulo: ArticuloBlog,
): CaratulaBlog | null {
  if (articulo.caratula?.url) return articulo.caratula;
  if (!articulo.portada) return null;

  return {
    url: articulo.portada,
    alt: articulo.titulo,
    posicion: "centro",
  };
}

export function posicionObjetoCaratula(
  posicion: PosicionCaratulaBlog | undefined,
): string {
  if (posicion === "arriba") return "center top";
  if (posicion === "abajo") return "center bottom";
  return "center center";
}
