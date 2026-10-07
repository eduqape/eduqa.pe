import "server-only";

import { parse as parseYaml } from "yaml";
import { resolverIconoCurso } from "@/lib/iconos-curso";
import {
  REGIONES_VENN,
  derivarSecciones,
  idsDeSecciones,
  type RegionVenn,
  type Bloque,
  type Curso,
  type Ejercicio,
  type Leccion,
} from "@/lib/curso-tipos";

/**
 * Lector de cursos escritos en Markdown.
 *
 * Un curso es contenido, no código: quien lo escribe no debería tener que
 * tocar TypeScript ni saber qué es un `Bloque`. El Markdown es la fuente y
 * esto solo lo traduce a la estructura que la aplicación sabe pintar.
 *
 * El formato está descrito en FORMATO-CURSO.md, junto a los cursos.
 *
 * Va marcado como `server-only` porque el material se obtiene en el servidor
 * respetando las políticas de acceso de Supabase. Este módulo solo transforma
 * texto Markdown ya recuperado; no descubre ni lee cursos del sistema de archivos.
 */

type Frontmatter = Record<string, unknown>;

/** Separa el frontmatter del cuerpo. Sin frontmatter, todo es cuerpo. */
function separarFrontmatter(texto: string): [Frontmatter, string] {
  const limpio = texto.replace(/^\uFEFF/, "");
  if (!limpio.startsWith("---")) return [{}, limpio];

  const cierre = limpio.indexOf("\n---", 3);
  if (cierre === -1) return [{}, limpio];

  const cabecera = limpio.slice(3, cierre);
  const cuerpo = limpio.slice(cierre + 4);
  return [(parseYaml(cabecera) ?? {}) as Frontmatter, cuerpo.replace(/^\n/, "")];
}

/** El prefijo editorial vive en curso.md; la revisión la lleva la base. */
export function codigoBaseDeFicha(texto: string): string | null {
  const [ficha] = separarFrontmatter(texto);
  if (ficha.codigo === undefined || ficha.codigo === null) return null;
  if (typeof ficha.codigo !== "string" || !/^[A-Z]{4}$/.test(ficha.codigo)) {
    throw new Error("codigo debe contener exactamente cuatro letras mayúsculas (por ejemplo, INPY).");
  }
  return ficha.codigo;
}

/*
 * El cuerpo se recorre línea a línea y no con una expresión regular sobre el
 * texto entero: las vallas de código pueden contener cualquier cosa, incluidos
 * encabezados y comillas, y separarlas a ojo produce cortes en mitad de un
 * ejemplo.
 */
type Valla = { lenguaje: string; modificadores: string[]; contenido: string };

function esValla(linea: string) {
  return /^```/.test(linea);
}

function leerValla(lineas: string[], i: number): [Valla, number] {
  const info = lineas[i].slice(3).trim().split(/\s+/).filter(Boolean);
  const lenguaje = info[0] ?? "";
  const modificadores = info.slice(1);

  const cuerpo: string[] = [];
  let j = i + 1;
  while (j < lineas.length && !/^```\s*$/.test(lineas[j])) {
    cuerpo.push(lineas[j]);
    j++;
  }
  return [{ lenguaje, modificadores, contenido: cuerpo.join("\n") }, j + 1];
}

/** `> Doc: [Título](url)` y `> Nota: texto`, que modifican el bloque anterior. */
const RE_DOC = /^>\s*Doc:\s*\[([^\]]+)\]\(([^)]+)\)\s*$/;
const RE_NOTA = /^>\s*Nota:\s*(.*)$/;

/**
 * Convierte un ejercicio escrito con secciones a su estructura.
 *
 * Las cuatro partes van marcadas con encabezados dentro de la valla, porque
 * el enunciado y la pista son prosa y la plantilla es código: meterlos en
 * claves de YAML obligaría a escapar comillas y saltos de línea.
 */
function claveParte(titulo: string) {
  return titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function leerPartesEjercicio(texto: string) {
  const partes: Record<string, string[]> = {};
  let actual: string | null = null;
  for (const linea of texto.split("\n")) {
    const encabezado = linea.match(/^#\s+(.+?)\s*$/);
    if (encabezado) {
      actual = claveParte(encabezado[1]);
      partes[actual] = [];
      continue;
    }
    if (actual) partes[actual].push(linea);
  }
  return Object.fromEntries(
    Object.entries(partes).map(([clave, lineas]) => [clave, lineas.join("\n").trim()]),
  );
}

function exigirParte(
  partes: Record<string, string>,
  clave: string,
  donde: string,
  etiqueta = clave,
) {
  const valor = partes[clave]?.trim() ?? "";
  if (!valor) throw new Error(`Ejercicio sin ${etiqueta} en ${donde}.`);
  return valor;
}

function leerLista(texto: string, donde: string, etiqueta: string) {
  const elementos = texto
    .split("\n")
    .map((linea) => linea.match(/^\s*-\s+(.+?)\s*$/)?.[1]?.trim())
    .filter((valor): valor is string => Boolean(valor));
  if (elementos.length < 2) {
    throw new Error(`${etiqueta} necesita al menos dos elementos en ${donde}.`);
  }
  return elementos;
}

function baseConceptual(texto: string, donde: string) {
  const partes = leerPartesEjercicio(texto);
  return {
    partes,
    enunciado: exigirParte(partes, "enunciado", donde),
    explicacion: exigirParte(partes, "explicacion", donde, "explicación"),
    pista: exigirParte(partes, "pista", donde),
  };
}

function leerEjercicio(texto: string, donde: string) {
  const partes = leerPartesEjercicio(texto);
  const enunciado = exigirParte(partes, "enunciado", donde);
  const plantilla = exigirParte(partes, "plantilla", donde);
  const esperado = partes.esperado?.trim() ?? "";
  const pista = exigirParte(partes, "pista", donde);
  const huecos = plantilla.match(/___/g)?.length ?? 0;
  if (huecos !== 1) {
    throw new Error(
      `El ejercicio de ${donde} debe tener exactamente un hueco (___); tiene ${huecos}.`,
    );
  }
  return { tipo: "codigo" as const, enunciado, plantilla, esperado, pista };
}

function leerVerdaderoFalso(texto: string, donde: string) {
  const { partes, enunciado, explicacion, pista } = baseConceptual(texto, donde);
  const literal = exigirParte(partes, "respuesta", donde).toLowerCase();
  if (!["verdadero", "falso", "true", "false"].includes(literal)) {
    throw new Error(
      `La respuesta de verdadero-falso en ${donde} debe ser verdadero o falso.`,
    );
  }
  return {
    tipo: "verdadero-falso" as const,
    enunciado,
    respuesta: literal === "verdadero" || literal === "true",
    explicacion,
    pista,
  };
}

function leerOpcionMultiple(texto: string, donde: string) {
  const { partes, enunciado, explicacion, pista } = baseConceptual(texto, donde);
  const opciones = leerLista(exigirParte(partes, "opciones", donde), donde, "Opción múltiple");
  const correctaHumana = Number(exigirParte(partes, "correcta", donde));
  if (!Number.isInteger(correctaHumana) || correctaHumana < 1 || correctaHumana > opciones.length) {
    throw new Error(
      `La opción correcta de ${donde} debe estar entre 1 y ${opciones.length}.`,
    );
  }
  return {
    tipo: "opcion-multiple" as const,
    enunciado,
    opciones,
    correcta: correctaHumana - 1,
    explicacion,
    pista,
  };
}

function leerOrdenar(texto: string, donde: string) {
  const { partes, enunciado, explicacion, pista } = baseConceptual(texto, donde);
  const elementos = leerLista(exigirParte(partes, "elementos", donde), donde, "Ordenar");
  const numeros = exigirParte(partes, "orden", donde).match(/\d+/g)?.map(Number) ?? [];
  const esperados = Array.from({ length: elementos.length }, (_, i) => i + 1);
  const normalizados = [...numeros].sort((a, b) => a - b);
  if (
    numeros.length !== elementos.length ||
    normalizados.some((numero, i) => numero !== esperados[i])
  ) {
    throw new Error(
      `El orden de ${donde} debe ser una permutación de 1 a ${elementos.length}, sin repetir ni omitir posiciones.`,
    );
  }
  return {
    tipo: "ordenar" as const,
    enunciado,
    elementos,
    correcta: numeros.map((numero) => numero - 1),
    explicacion,
    pista,
  };
}

function leerRelacionar(texto: string, donde: string) {
  const { partes, enunciado, explicacion, pista } = baseConceptual(texto, donde);
  const filas = leerLista(exigirParte(partes, "pares", donde), donde, "Relacionar");
  const pares = filas.map((fila) => {
    const separador = fila.indexOf("=>");
    if (separador < 1 || separador >= fila.length - 2) {
      throw new Error(
        `Cada par de ${donde} debe escribirse como «izquierda => derecha».`,
      );
    }
    return {
      izquierda: fila.slice(0, separador).trim(),
      derecha: fila.slice(separador + 2).trim(),
    };
  });
  const izquierdas = pares.map((par) => par.izquierda);
  const derechas = pares.map((par) => par.derecha);
  if (new Set(izquierdas).size !== pares.length || new Set(derechas).size !== pares.length) {
    throw new Error(
      `Relacionar exige lados únicos en ${donde}; un valor repetido haría ambigua la corrección.`,
    );
  }
  return {
    tipo: "relacionar" as const,
    enunciado,
    pares,
    explicacion,
    pista,
  };
}

/**
 * Lee un diagrama de Venn declarado en YAML.
 *
 * Se valida al leer y no al pintar: un nombre de región mal escrito tiene que
 * romper la carga del curso, no dibujar un diagrama vacío que nadie note.
 */
function leerVenn(texto: string, donde: string): Bloque {
  const datos = (parseYaml(texto) ?? {}) as Record<string, unknown>;
  const izquierda = String(datos.izquierda ?? "").trim();
  const derecha = String(datos.derecha ?? "").trim();
  const resalta = String(datos.resalta ?? "ninguna").trim() as RegionVenn;

  if (!izquierda || !derecha) {
    throw new Error(`Un diagrama sin los dos conjuntos, en ${donde}.`);
  }
  if (!REGIONES_VENN.includes(resalta)) {
    throw new Error(
      `Región «${resalta}» desconocida en ${donde}. Las válidas son: ${REGIONES_VENN.join(", ")}.`,
    );
  }

  return {
    tipo: "venn",
    izquierda,
    derecha,
    resalta,
    ...(datos.pie ? { pie: String(datos.pie) } : {}),
  };
}

type ResultadoSesion = {
  bloques: Bloque[];
  ejercicios: Record<string, Ejercicio>;
  frontmatter: Frontmatter;
};

function leerSesion(texto: string, donde: string): ResultadoSesion {
  const [frontmatter, cuerpo] = separarFrontmatter(texto);
  const lineas = cuerpo.split("\n");

  const bloques: Bloque[] = [];
  const ejercicios: Record<string, Ejercicio> = {};
  // Sección en curso: el ejercicio que aparezca se le asigna a ella. Así el
  // ejercicio vive donde se lee, y no en un índice aparte que puede quedarse
  // apuntando a una sección renombrada.
  let seccionActual: string | null = null;
  let parrafo: string[] = [];

  const ultimo = () => bloques[bloques.length - 1];

  const cerrarParrafo = () => {
    const texto = parrafo.join("\n").trim();
    parrafo = [];
    if (texto) bloques.push({ tipo: "teoria", contenido: texto });
  };

  let i = 0;
  while (i < lineas.length) {
    const linea = lineas[i];

    if (esValla(linea)) {
      cerrarParrafo();
      const [valla, siguiente] = leerValla(lineas, i);
      i = siguiente;

      if (valla.lenguaje === "entrada" || valla.lenguaje === "archivo") {
        const bloque = ultimo();
        if (!bloque || bloque.tipo !== "codigo" || !["fortran", "bash"].includes(bloque.lenguaje)) {
          throw new Error(`Datos de entrada sin programa Fortran o Bash delante, en ${donde}.`);
        }
        if (valla.lenguaje === "entrada") bloque.entrada = valla.contenido + "\n";
        else {
          const nombre = valla.modificadores[0];
          if (!nombre || !/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(nombre)) throw new Error(`Nombre de archivo inválido en ${donde}.`);
          bloque.archivos = { ...bloque.archivos, [nombre]: valla.contenido + "\n" };
        }
        continue;
      }

      if (valla.lenguaje === "salida") {
        const bloque = ultimo();
        if (!bloque || bloque.tipo !== "codigo") {
          throw new Error(`Una salida sin bloque de código delante, en ${donde}.`);
        }
        bloque.salida = valla.contenido;
        continue;
      }

      if (valla.lenguaje === "venn") {
        bloques.push(leerVenn(valla.contenido, donde));
        continue;
      }

      if (
        ["ejercicio", "verdadero-falso", "opcion-multiple", "ordenar", "relacionar"].includes(
          valla.lenguaje,
        )
      ) {
        if (!seccionActual) {
          throw new Error(`Un ejercicio fuera de toda sección, en ${donde}.`);
        }
        if (ejercicios[seccionActual]) {
          throw new Error(
            `Dos ejercicios para la misma sección (${seccionActual}) en ${donde}.`,
          );
        }
        if (valla.lenguaje === "verdadero-falso") {
          ejercicios[seccionActual] = leerVerdaderoFalso(valla.contenido, donde);
        } else if (valla.lenguaje === "opcion-multiple") {
          ejercicios[seccionActual] = leerOpcionMultiple(valla.contenido, donde);
        } else if (valla.lenguaje === "ordenar") {
          ejercicios[seccionActual] = leerOrdenar(valla.contenido, donde);
        } else if (valla.lenguaje === "relacionar") {
          ejercicios[seccionActual] = leerRelacionar(valla.contenido, donde);
        } else {
          ejercicios[seccionActual] = {
            ...leerEjercicio(valla.contenido, donde),
            ...(valla.modificadores.includes("fortran")
              ? { lenguaje: "fortran" as const }
              : valla.modificadores.includes("bash")
                ? { lenguaje: "bash" as const }
                : {}),
          };
        }
        continue;
      }

      bloques.push({
        tipo: "codigo",
        contenido: valla.contenido,
        lenguaje: valla.lenguaje || "text",
        salida: null,
        // Marca los bloques que no se pueden ejecutar aquí, por ejemplo los
        // que necesitan una clave de API.
        ...(valla.modificadores.includes("!sin-consola")
          ? { sinConsola: true }
          : {}),
        // Se ejecuta, pero su salida cambia en cada ejecución (fechas, PID…):
        // no lleva valla salida y la verificación no la compara.
        ...(valla.modificadores.includes("!variable")
          ? { salidaVariable: true }
          : {}),
      });
      continue;
    }

    const doc = linea.match(RE_DOC);
    if (doc) {
      cerrarParrafo();
      const bloque = ultimo();
      if (!bloque) throw new Error(`Una cita sin bloque delante, en ${donde}.`);
      bloque.docs = [...(bloque.docs ?? []), { titulo: doc[1], url: doc[2] }];
      i++;
      continue;
    }

    const nota = linea.match(RE_NOTA);
    if (nota) {
      cerrarParrafo();
      // Una nota puede ocupar varias líneas mientras sigan citadas.
      const trozos = [nota[1]];
      i++;
      while (i < lineas.length && /^>\s*(?!Doc:|Nota:)/.test(lineas[i])) {
        trozos.push(lineas[i].replace(/^>\s?/, ""));
        i++;
      }
      const bloque = ultimo();
      if (!bloque) throw new Error(`Una nota sin bloque delante, en ${donde}.`);
      bloque.nota = trozos.join("\n").trim();
      continue;
    }

    // Un encabezado abre sección y, con ella, un bloque de teoría nuevo.
    if (/^#{1,6}\s+/.test(linea)) cerrarParrafo();

    parrafo.push(linea);
    i++;

    // La sección en curso se recalcula con los ids reales, que salen del
    // título: así el ejercicio y el índice lateral usan el mismo.
    if (/^#{1,3}\s+/.test(linea)) {
      const provisional = [...bloques, { tipo: "teoria" as const, contenido: linea }];
      const ids = idsDeSecciones(provisional);
      seccionActual = ids.get(provisional.length - 1) ?? null;
    }
  }
  cerrarParrafo();

  return { bloques, ejercicios, frontmatter };
}

/** Construye una lección a partir del texto de su archivo. */
function construirSesion(donde: string, texto: string): Leccion {
  const { bloques, ejercicios, frontmatter } = leerSesion(texto, donde);

  const numero = Number(frontmatter.numero);
  const titulo = String(frontmatter.titulo ?? "");
  if (!Number.isInteger(numero) || numero < 1) {
    throw new Error(`${donde}: falta el número de sesión.`);
  }
  if (!titulo) {
    throw new Error(`${donde}: falta el título de la sesión.`);
  }

  return {
    slug: String(frontmatter.slug ?? `sesion-${numero}`),
    numero,
    titulo,
    bloques,
    secciones: derivarSecciones(bloques),
    ...(Object.keys(ejercicios).length > 0 ? { ejercicios } : {}),
    ...(frontmatter.paquetes ? { paquetes: frontmatter.paquetes as string[] } : {}),
    ...(frontmatter.preludio ? { preludio: String(frontmatter.preludio) } : {}),
  };
}

/**
 * Construye un curso a partir de sus archivos ya leídos.
 *
 * Recibe el contenido, no rutas, para no atarse a que los archivos estén en el
 * disco: los mismos textos pueden venir de la base de datos, y así publicar un
 * curso nuevo no obliga a volver a desplegar la aplicación.
 *
 * Las sesiones se ordenan por su número, no por el nombre del archivo:
 * renombrarlos no debe cambiar el orden del temario.
 */
export function construirCurso(
  nombre: string,
  archivos: Map<string, string>,
  /**
   * Sesiones que existen aunque su texto no se haya podido leer. Con el
   * material en la base, a quien no está matriculado las políticas solo le
   * dejan ver la ficha; el temario sí es público, así que las sesiones que
   * falten se rellenan vacías para que el catálogo cuente bien y el enlace
   * lleve a la pantalla de compra en lugar de a un 404.
   */
  indice: { numero: number; titulo: string; slug: string }[] = [],
): Curso {
  const fichaTexto = archivos.get("curso.md");
  if (!fichaTexto) {
    throw new Error(`El curso ${nombre} no tiene curso.md.`);
  }
  const [ficha, cuerpo] = separarFrontmatter(fichaTexto);
  const codigoBase = codigoBaseDeFicha(fichaTexto);

  // El preludio del curso va como una valla dentro de curso.md: es código y
  // en el frontmatter habría que escaparlo.
  let preludio: string | undefined;
  const lineas = cuerpo.split("\n");
  for (let i = 0; i < lineas.length; i++) {
    if (esValla(lineas[i])) {
      const [valla] = leerValla(lineas, i);
      if (valla.lenguaje === "preludio") preludio = valla.contenido;
    }
  }

  const lecciones = [...archivos.entries()]
    .filter(([archivo]) => archivo.endsWith(".md") && archivo !== "curso.md")
    .map(([archivo, texto]) => construirSesion(`${nombre}/${archivo}`, texto));

  const leidas = new Set(lecciones.map((l) => l.slug));
  for (const s of indice) {
    if (!leidas.has(s.slug)) {
      lecciones.push({ ...s, bloques: [], secciones: [] });
    }
  }
  lecciones.sort((a, b) => a.numero - b.numero);

  if (lecciones.length === 0) {
    throw new Error(`El curso ${nombre} no tiene ninguna sesión.`);
  }

  return {
    slug: String(ficha.slug ?? nombre),
    ...(codigoBase ? { codigoBase } : {}),
    titulo: String(ficha.titulo ?? ""),
    resumen: String(ficha.resumen ?? ""),
    area: ficha.area as Curso["area"],
    nivel: String(ficha.nivel ?? "INTRODUCCIÓN"),
    formato: (ficha.formato as Curso["formato"]) ?? (ficha.tipo as Curso["formato"]) ?? "curso",
    horas: Number(ficha.horas ?? 0),
    icono: resolverIconoCurso(String(ficha.slug ?? nombre), String(ficha.area ?? ""), ficha.icono),
    ...(ficha.paquetes ? { paquetes: ficha.paquetes as string[] } : {}),
    ...(preludio ? { preludio } : {}),
    lecciones,
  };
}
