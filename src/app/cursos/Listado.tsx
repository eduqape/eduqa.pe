"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, Flame, Route, Search, X } from "lucide-react";
import { TarjetaCursoMatricula, type DatosCurso } from "./TarjetaCursoMatricula";
import { Selector } from "@/components/Selector";
import { TarjetaRuta, type DatosRuta } from "@/components/TarjetaRuta";
import { TarjetaPopular } from "@/components/Populares";
import { TituloEditable } from "@/components/TituloEditable";

/**
 * `matriculadoEn` es la fecha de matrícula en milisegundos, o null si el
 * usuario todavía no se matriculó. Se pasa ya convertida desde el servidor:
 * mandar la cadena ISO obligaría a parsearla en cada comparación.
 */
export type CursoListado = DatosCurso & {
  area: string;
  matriculadoEn: number | null;
  /** Sesiones marcadas como completadas. */
  vistas: number;
};

// Todo criterio va en sus dos sentidos: quien ordena por título alguna vez
// quiere la Z arriba, y quien ordena por duración a veces busca el más corto
// y a veces el más largo.
const ORDENES = [
  { valor: "recientes", etiqueta: "Más recientes" },
  { valor: "antiguos", etiqueta: "Más antiguos" },
  { valor: "titulo-az", etiqueta: "Título (A–Z)" },
  { valor: "titulo-za", etiqueta: "Título (Z–A)" },
  { valor: "duracion-asc", etiqueta: "Duración: menor" },
  { valor: "duracion-desc", etiqueta: "Duración: mayor" },
  { valor: "progreso", etiqueta: "Más avanzado" },
] as const;

type Orden = (typeof ORDENES)[number]["valor"];

const TODAS = "todas";
const VENTANA_LANZAMIENTO_MS = 24 * 60 * 60 * 1000;
const DURACION_SHEEN_MS = 4500;
const PREFIJO_LANZAMIENTO_VISTO = "eduqa:curso-lanzamiento-visto:";

export function Listado({
  cursos,
  rutas = [],
  populares = [],
  alTope,
  esAdmin = false,
  cabecera,
  acciones,
  entreBarraYRejilla,
  titulosSeccion = {},
}: {
  cursos: CursoListado[];
  rutas?: DatosRuta[];
  /** Tres cursos más matriculados: abren el catálogo. */
  populares?: Parameters<typeof TarjetaPopular>[0]["curso"][];
  alTope: boolean;
  esAdmin?: boolean;
  /** Marca y tablero, a la izquierda de la barra de búsqueda. */
  cabecera?: ReactNode;
  /** Menú de la cuenta, al extremo derecho de la misma fila. */
  acciones?: ReactNode;
  /** Migas y título, entre la barra y la rejilla. */
  entreBarraYRejilla?: ReactNode;
  /** Títulos de sección personalizados (precargados en servidor). */
  titulosSeccion?: Partial<Record<string, string>>;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [area, setArea] = useState<string>(TODAS);
  const [orden, setOrden] = useState<Orden>("recientes");
  const [cursosConSheen, setCursosConSheen] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const ahora = Date.now();
    const candidatos = [...cursos, ...populares].filter((curso) => {
      if (!curso.publicadoEn) return false;
      const publicado = Date.parse(curso.publicadoEn);
      if (!Number.isFinite(publicado)) return false;
      const edad = ahora - publicado;
      return edad >= 0 && edad <= VENTANA_LANZAMIENTO_MS;
    });

    if (candidatos.length === 0) return;

    const activos = new Set<string>();

    for (const curso of candidatos) {
      const clave =
        PREFIJO_LANZAMIENTO_VISTO +
        curso.slug +
        ":" +
        encodeURIComponent(curso.publicadoEn ?? "");

      try {
        if (window.localStorage.getItem(clave)) continue;
        window.localStorage.setItem(clave, "1");
      } catch {
        // Si el navegador bloquea localStorage, el efecto sigue siendo visual
        // y no debe impedir que el catálogo funcione.
      }

      activos.add(curso.slug);
    }

    if (activos.size === 0) return;

    let temporizador: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      setCursosConSheen(activos);
      temporizador = window.setTimeout(
        () => setCursosConSheen(new Set()),
        DURACION_SHEEN_MS,
      );
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (temporizador !== undefined) window.clearTimeout(temporizador);
    };
  }, [cursos, populares]);

  // Solo las áreas que de verdad tienen cursos: un filtro que no filtra nada
  // es ruido.
  const areas = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const c of cursos) conteo.set(c.area, (conteo.get(c.area) ?? 0) + 1);
    return [...conteo.entries()]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [cursos]);

  const completados = useMemo(
    () => new Set(cursos.filter((c) => c.completado).map((c) => c.slug)),
    [cursos],
  );
  const matriculados = useMemo(
    () => new Set(cursos.filter((c) => c.matriculado).map((c) => c.slug)),
    [cursos],
  );
  const sinFiltrar = busqueda.trim() === "" && area === TODAS;

  const visibles = useMemo(() => {
    // Se comparan versiones sin tildes: quien escribe "ingenieria" espera
    // encontrar "Ingeniería".
    const sinTildes = (t: string) =>
      t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const q = sinTildes(busqueda.trim());

    const filtrados = cursos.filter(
      (c) =>
        (area === TODAS || c.area === area) &&
        (q === "" ||
          sinTildes(c.titulo).includes(q) ||
          sinTildes(c.resumen).includes(q) ||
          sinTildes(c.area).includes(q)),
    );

    return [...filtrados].sort((a, b) => {
      switch (orden) {
        case "titulo-az":
          return a.titulo.localeCompare(b.titulo, "es");
        case "titulo-za":
          return b.titulo.localeCompare(a.titulo, "es");
        case "duracion-asc":
          return a.horas - b.horas;
        case "duracion-desc":
          return b.horas - a.horas;
        case "progreso":
          return b.vistas / b.sesiones - a.vistas / a.sesiones;
        // En los dos órdenes por fecha, quien no está matriculado no tiene fecha
        // que comparar: va al final en lugar de colarse entre los matriculados.
        case "antiguos":
          if (a.matriculadoEn === null) return b.matriculadoEn === null ? 0 : 1;
          if (b.matriculadoEn === null) return -1;
          return a.matriculadoEn - b.matriculadoEn;
        default:
          if (a.matriculadoEn === null) return b.matriculadoEn === null ? 0 : 1;
          if (b.matriculadoEn === null) return -1;
          return b.matriculadoEn - a.matriculadoEn;
      }
    });
  }, [cursos, area, orden, busqueda]);

  const tPopulares = titulosSeccion["catalogo-populares"] ?? "Más elegidos";
  const tRutas = titulosSeccion["catalogo-rutas"] ?? "Rutas populares";
  const tTodos = titulosSeccion["catalogo-todos"] ?? "Todos los cursos";

  return (
    <>
      {/* El buscador abre la fila; los avisos quedan inmediatamente a su
          derecha y la cuenta al extremo. Los filtros pertenecen al listado
          total, no a la cabecera de toda la página. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <div className="relative min-w-40 flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-tenue"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar un curso"
            aria-label="Buscar un curso"
            className="buscador-cursos w-full rounded-lg border border-borde-fuerte bg-fondo py-2.5 pl-10 pr-10 text-sm text-texto placeholder:text-texto-tenue focus:border-rojo-acento focus:outline-none focus:ring-1 focus:ring-rojo-acento"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              aria-label="Limpiar la búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-texto-tenue transition-colors hover:text-rojo-acento"
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </div>

        {cabecera}
        {acciones}
      </div>

      {entreBarraYRejilla}

      <div className="mt-8 space-y-8">
          {sinFiltrar && populares.length > 0 && (
            <section aria-labelledby="catalogo-populares">
              <h2
                id="catalogo-populares"
                className="mb-4 flex items-center gap-2 pl-5 text-xl font-semibold tracking-tight"
              >
                <Flame size={20} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
                <TituloEditable
                  clave="catalogo-populares"
                  valorInicial={tPopulares}
                  esAdmin={esAdmin}
                />
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {populares.map((c) => (
                  <TarjetaPopular
                    key={c.slug}
                    curso={c}
                    alTope={alTope}
                    resaltarNuevo={cursosConSheen.has(c.slug)}
                  />
                ))}
              </div>
            </section>
          )}
          {sinFiltrar && rutas.length > 0 && (
            <section
              aria-labelledby="catalogo-rutas"
              className={populares.length > 0 ? "border-t border-borde pt-8" : undefined}
            >
              <h2
                id="catalogo-rutas"
                className="mb-4 flex items-center gap-2 text-xl font-semibold tracking-tight"
              >
                <Route size={20} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
                <TituloEditable
                  clave="catalogo-rutas"
                  valorInicial={tRutas}
                  esAdmin={esAdmin}
                />
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rutas.map((r) => (
                  <TarjetaRuta
                    key={r.slug}
                    ruta={r}
                    completados={completados}
                    matriculados={matriculados}
                  />
                ))}
              </div>
            </section>
          )}
          <section
            aria-labelledby="catalogo-todos"
            className={sinFiltrar && (populares.length > 0 || rutas.length > 0)
              ? "border-t border-borde pt-8"
              : undefined}
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2
                id="catalogo-todos"
                className="flex items-center gap-2 text-xl font-semibold tracking-tight"
              >
                <BookOpen size={20} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
                <TituloEditable
                  clave="catalogo-todos"
                  valorInicial={sinFiltrar ? tTodos : "Resultados"}
                  esAdmin={esAdmin && sinFiltrar}
                />
              </h2>
              <p className="mr-auto text-sm text-texto-suave">
                {visibles.length} {visibles.length === 1 ? "curso" : "cursos"}
              </p>
              <Selector
                etiqueta="Filtrar por área"
                valor={area}
                onCambio={setArea}
                opciones={[
                  { valor: TODAS, etiqueta: `Todas (${cursos.length})` },
                  ...areas.map((a) => ({
                    valor: a.nombre,
                    etiqueta: `${a.nombre} (${a.total})`,
                  })),
                ]}
              />
              <Selector
                etiqueta="Ordenar por"
                valor={orden}
                onCambio={(v) => setOrden(v as Orden)}
                opciones={ORDENES.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
              />
            </div>
            {visibles.length === 0 ? (
              <p className="rounded-xl border border-borde bg-superficie px-5 py-8 text-center text-sm text-texto-suave">
                {busqueda
                  ? `Ningún curso coincide con "${busqueda}".`
                  : "Todavía no hay cursos en esta área."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibles.map((c) => (
                  <TarjetaCursoMatricula
                    key={c.slug}
                    curso={c}
                    alTope={alTope}
                    esAdmin={esAdmin}
                    resaltarNuevo={cursosConSheen.has(c.slug)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
    </>
  );
}
