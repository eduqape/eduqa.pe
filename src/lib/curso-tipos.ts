/**
 * Tipos y utilidades de un curso, sin ninguna dependencia.
 *
 * Están separados del registro de cursos a propósito. El registro carga los
 * cursos escritos en Markdown, y el lector de Markdown necesita estos tipos:
 * si todo viviera en el mismo archivo habría una dependencia circular, y que
 * funcionara dependería del orden en que se evaluaran los módulos.
 */

import type { IconoNombre } from "@/components/Iconos";
/** Referencia a documentación oficial. Regla del curso: casi todo ejemplo cita su fuente. */
export type Doc = { titulo: string; url: string };

/**
 * Formato del contenido educativo:
 * - curso: Formato estándar de sesiones completas.
 * - microcurso: Formación intensiva y concentrada de alta densidad práctica.
 * - pildora: Cápsula formativa ultra-corta enfocada en un concepto específico.
 */
export type FormatoCurso = "curso" | "microcurso" | "pildora";

/**
 * `nota` es la precisión técnica que no cabe en el texto principal sin
 * enturbiarlo: va debajo, en pequeño. Que algo sea introductorio no autoriza
 * a que sea impreciso.
 */
export type Bloque =
  | { tipo: "teoria"; contenido: string; docs?: Doc[]; nota?: string }
  | {
      tipo: "codigo";
      contenido: string;
      lenguaje: string;
      salida: string | null;
      docs?: Doc[];
      nota?: string;
      /**
       * Deja este bloque sin consola aunque la sesión sea ejecutable. Es para
       * el código que no se puede correr aquí: el que necesita una clave de
       * API, o el que depende de una respuesta que el modelo no repite igual
       * dos veces.
       */
      sinConsola?: boolean;
      /** La salida no es determinista: se ejecuta, pero no se promete literal. */
      salidaVariable?: boolean;
      /** Datos de entrada y archivos virtuales de una ejecución Fortran o Bash. */
      entrada?: string;
      archivos?: Record<string, string>;
    }
  | {
      /**
       * Diagrama de Venn de dos conjuntos.
       *
       * Va declarado y no como SVG escrito a mano: así todos los diagramas de
       * la plataforma salen con la misma forma, heredan los colores del tema
       * —incluido el monocromático— y quien escribe un curso no necesita saber
       * dibujar.
       */
      tipo: "venn";
      izquierda: string;
      derecha: string;
      resalta: RegionVenn;
      pie?: string;
      docs?: Doc[];
      nota?: string;
    };

/** Qué parte del diagrama se pinta. Cubre las operaciones de conjuntos. */
export type RegionVenn =
  | "interseccion"
  | "izquierda"
  | "derecha"
  | "union"
  | "solo-izquierda"
  | "solo-derecha"
  | "diferencia-simetrica"
  | "complemento-interseccion"
  | "complemento-union"
  | "ninguna";

export const REGIONES_VENN: RegionVenn[] = [
  "interseccion",
  "izquierda",
  "derecha",
  "union",
  "solo-izquierda",
  "solo-derecha",
  "diferencia-simetrica",
  "complemento-interseccion",
  "complemento-union",
  "ninguna",
];

/**
 * Ejercicios asociados a un punto de la sesión.
 *
 * El tipo de ejercicio depende de la competencia que se comprueba. Un concepto
 * arquitectónico no debe obligar al alumno a escribir Python para demostrar que
 * lo entendió; el completado de código se conserva donde ejecutar código sí es
 * la práctica adecuada.
 */
export type EjercicioCodigo = {
  /** Ausente en cursos antiguos; equivale a `codigo`. */
  tipo?: "codigo";
  /** Python por omisión; Fortran y Bash se ejecutan en WebAssembly en el navegador. */
  lenguaje?: "python" | "fortran" | "bash";
  enunciado: string;
  /** Lleva exactamente un hueco marcado con `___`. */
  plantilla: string;
  /** Salida que debe producir la solución correcta. */
  esperado: string;
  /** Se muestra a petición, nunca de entrada. */
  pista: string;
};

export type EjercicioVerdaderoFalso = {
  tipo: "verdadero-falso";
  enunciado: string;
  respuesta: boolean;
  explicacion: string;
  pista: string;
};

export type EjercicioOpcionMultiple = {
  tipo: "opcion-multiple";
  enunciado: string;
  opciones: string[];
  /** Índice cero-based de la alternativa correcta. */
  correcta: number;
  explicacion: string;
  pista: string;
};

export type EjercicioOrdenar = {
  tipo: "ordenar";
  enunciado: string;
  /** Elementos en el orden inicial que verá el alumno. */
  elementos: string[];
  /** Índices cero-based de `elementos` en el orden correcto. */
  correcta: number[];
  explicacion: string;
  pista: string;
};

export type ParRelacion = {
  izquierda: string;
  derecha: string;
};

export type EjercicioRelacionar = {
  tipo: "relacionar";
  enunciado: string;
  pares: ParRelacion[];
  explicacion: string;
  pista: string;
};

export type Ejercicio =
  | EjercicioCodigo
  | EjercicioVerdaderoFalso
  | EjercicioOpcionMultiple
  | EjercicioOrdenar
  | EjercicioRelacionar;

export type Leccion = {
  slug: string;
  numero: number;
  titulo: string;
  bloques: Bloque[];
  secciones: { id: string; titulo: string; nivel: number }[];
  /**
   * Ejercicio de cada punto, indexado por el identificador de su sección.
   * El identificador sale de `idsDeSecciones`, o sea del título convertido
   * en slug.
   */
  ejercicios?: Record<string, Ejercicio>;
  /**
   * Paquetes y preparación propios de esta sesión, que sustituyen a los del
   * curso. Sirven para no descargar en la primera sesión una biblioteca que
   * solo hace falta en la última: algunas pesan decenas de megabytes.
   */
  paquetes?: string[];
  preludio?: string;
};

/** Las mismas áreas del catálogo de la portada, para poder filtrar por ellas. */
export const AREAS = [
  "Matemáticas",
  "Bioingeniería",
  "Farmacología",
  "Lenguajes",
  "Bases de Datos",
  "Ingeniería de Datos",
  "Inteligencia Artificial",
  "Machine Learning",
  "DevOps",
  "Backend",
] as const;

export type Area = (typeof AREAS)[number];

export type Curso = {
  slug: string;
  /** Prefijo editorial declarado en curso.md; la revisión completa vive en Supabase. */
  codigoBase?: string;
  titulo: string;
  resumen: string;
  area: Area;
  nivel: string;
  horas: number;
  /** Formato del contenido: curso estándar, microcurso intensivo o píldora rápida. */
  formato?: FormatoCurso;
  /** Obligatorio: logotipo del producto o símbolo de la materia. */
  icono: IconoNombre;
  /**
   * Paquetes de PyPI que hacen falta para ejecutar el código del curso. Se
   * instalan con micropip la primera vez que alguien ejecuta algo, no al
   * abrir la página.
   */
  paquetes?: string[];
  /**
   * Código que se ejecuta antes de cada ejercicio, para dejar preparado lo
   * que el enunciado da por hecho. En un curso de Redis, por ejemplo, la
   * conexión: pedirla en cada ejercicio sería repetir diez veces la misma
   * línea sin enseñar nada.
   */
  preludio?: string;
  lecciones: Leccion[];
};

/**
 * Convierte un título en un identificador para la URL.
 *
 * Se usa como ancla (`#ordenar`), así que tiene que ser legible y estable:
 * un id derivado de la posición del bloque cambiaría en cuanto se inserte un
 * párrafo antes, y los enlaces que alguien haya guardado dejarían de apuntar
 * a donde apuntaban.
 */
function slugificar(titulo: string) {
  return titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita las tildes, deja la letra
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Identificador de cada encabezado, indexado por posición del bloque.
 *
 * Lo calcula una sola función para que el índice lateral y el árbol que se
 * pinta lleguen exactamente al mismo id: si divergieran, los enlaces del
 * índice apuntarían a anclas que no existen. Los títulos repetidos dentro de
 * una lección reciben un sufijo numérico.
 */
export function idsDeSecciones(bloques: Bloque[]) {
  const ids = new Map<number, string>();
  const vistos = new Map<string, number>();

  bloques.forEach((b, idx) => {
    if (b.tipo !== "teoria") return;
    const m = b.contenido.match(/^(#{1,3})\s+(.+)$/m);
    if (!m) return;

    const base = slugificar(m[2].replace(/[*_`#]/g, "").trim()) || `seccion-${idx}`;
    const repeticion = vistos.get(base) ?? 0;
    vistos.set(base, repeticion + 1);
    ids.set(idx, repeticion === 0 ? base : `${base}-${repeticion + 1}`);
  });

  return ids;
}

/** Índice lateral: los tres niveles de encabezado, con el suyo para indentar. */
export function derivarSecciones(bloques: Bloque[]) {
  const ids = idsDeSecciones(bloques);
  const secciones: { id: string; titulo: string; nivel: number }[] = [];

  bloques.forEach((b, idx) => {
    if (b.tipo !== "teoria") return;
    const m = b.contenido.match(/^(#{1,3})\s+(.+)$/m);
    if (!m) return;
    const titulo = m[2].replace(/[*_`#]/g, "").trim();
    const id = ids.get(idx);
    if (titulo && id && !secciones.some((s) => s.titulo === titulo)) {
      secciones.push({ id, titulo, nivel: m[1].length });
    }
  });
  return secciones;
}

export type Seccion = {
  id: string;
  titulo: string | null;
  /** 1 para encabezado principal, 2 para subtítulo, 3 para sub-subtítulo. */
  nivel: number;
  bloques: Bloque[];
  /** Subsecciones anidadas. Plegar la madre pliega también a las hijas. */
  hijas: Seccion[];
};

/**
 * Agrupa los bloques en un árbol según el nivel de sus encabezados.
 *
 * El anidamiento importa: un `##` que sigue a un `#` es su hijo, no su
 * hermano. Con una lista plana, plegar "Tipos de datos" dejaba NULL,
 * INTEGER y el resto colgando fuera, que es justo lo contrario de lo
 * que el encabezado promete.
 */
export function agruparEnSecciones(bloques: Bloque[]): Seccion[] {
  const ids = idsDeSecciones(bloques);
  const raiz: Seccion[] = [];
  // Pila de ancestros abiertos; la cima es la sección que recibe lo que sigue.
  const pila: Seccion[] = [];

  const nueva = (id: string, titulo: string | null, nivel: number): Seccion => ({
    id,
    titulo,
    nivel,
    bloques: [],
    hijas: [],
  });

  bloques.forEach((b, idx) => {
    const encabezado =
      b.tipo === "teoria" ? b.contenido.match(/^(#{1,3})\s+(.+)$/m) : null;

    // Se comprueba también el tipo para que TypeScript sepa que aquí el
    // bloque lleva contenido: solo uno de teoría puede abrir sección.
    if (encabezado && b.tipo === "teoria") {
      const nivel = encabezado[1].length;
      // El título pasa al disparador del plegable: se quita del cuerpo
      // para no pintarlo dos veces.
      const cuerpo = b.contenido.replace(/^#{1,3}\s+.+$/m, "").trim();

      const seccion = nueva(
        ids.get(idx) ?? `seccion-${idx}`,
        encabezado[2].replace(/[*_`]/g, "").trim(),
        nivel,
      );
      if (cuerpo) seccion.bloques.push({ ...b, contenido: cuerpo });

      // Se cierran los ancestros de nivel igual o mayor: ya no pueden ser madres.
      while (pila.length > 0 && pila[pila.length - 1].nivel >= nivel) pila.pop();

      if (pila.length === 0) raiz.push(seccion);
      else pila[pila.length - 1].hijas.push(seccion);

      pila.push(seccion);
      return;
    }

    // Bloque sin encabezado: pertenece a la sección abierta más profunda.
    if (pila.length === 0) {
      const preambulo = nueva(`preambulo-${idx}`, null, 1);
      raiz.push(preambulo);
      pila.push(preambulo);
    }
    pila[pila.length - 1].bloques.push(b);
  });

  return raiz;
}
