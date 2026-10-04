"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { AlertCircle, Check, LayoutGrid, List, Plus, Search, X } from "lucide-react";
import { Boton } from "@/components/ui";
import {
  ESTADOS_FICHA,
  ETIQUETA_GRUPO,
  ETIQUETA_ROL,
  GRUPOS_PERSONA,
  estadoFicha,
  faltantesFicha,
  grupoDeRol,
  type EstadoFicha,
  type GrupoPersona,
  type RolPersona,
} from "@/lib/personas-tipos";
import type { Persona } from "@/lib/personas";
import { cambiarEstado, type EstadoPersona } from "./acciones";
import { FormularioPersona } from "./FormularioPersona";
import { HojaPersona } from "./HojaPersona";
import { TarjetaPersona, type Aviso } from "./TarjetaPersona";
import type { VistaGestion } from "../TarjetaGestion";

type OrdenPersonas = "manual" | "nombre-az" | "recientes";
type FiltroEstado = "todas" | EstadoFicha;
type FiltroGrupo = typeof TODOS | GrupoPersona;
type Hoja = { modo: "crear" } | { modo: "editar"; persona: Persona };

const TODOS = "todos";
const CLAVE_VISTA = "panel-personas-vista";

const TITULO_FILTRO_ESTADO: Record<FiltroEstado, string> = {
  todas: "Toda visibilidad",
  publicada: "Visibles en la web",
  oculta: "Ocultas",
  baja: "Ex-integrantes",
};

/**
 * La vista elegida se recuerda en este navegador. Es una comodidad: si el
 * almacenamiento no está disponible, vale para la sesión y se pierde al salir.
 */
let vistaEnMemoria: VistaGestion = "grilla";
const avisarVista = new Set<() => void>();

function leerVista(): VistaGestion {
  try {
    const guardada = localStorage.getItem(CLAVE_VISTA);
    if (guardada === "lista" || guardada === "grilla") return guardada;
  } catch {}
  return vistaEnMemoria;
}

function suscribirVista(avisar: () => void) {
  avisarVista.add(avisar);
  window.addEventListener("storage", avisar);
  return () => {
    avisarVista.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}

function guardarVista(vista: VistaGestion) {
  vistaEnMemoria = vista;
  try {
    localStorage.setItem(CLAVE_VISTA, vista);
  } catch {}
  avisarVista.forEach((avisar) => avisar());
}

const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Censo del equipo: resumen, filtros, tarjetas y el panel de alta y edición.
 *
 * Los contadores de arriba son también los filtros de estado. Antes había
 * cuatro números que no se podían pulsar y, debajo, un select con la misma
 * información; ahora el número es el atajo.
 */
export function CatalogoPersonas({
  personas,
  encabezado,
}: {
  personas: Persona[];
  encabezado: ReactNode;
}) {
  const vista = useSyncExternalStore(suscribirVista, leerVista, () => "grilla" as const);
  const [busqueda, setBusqueda] = useState("");
  const [grupo, setGrupo] = useState<FiltroGrupo>(TODOS);
  const [rol, setRol] = useState<string>(TODOS);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todas");
  const [soloIncompletas, setSoloIncompletas] = useState(false);
  const [orden, setOrden] = useState<OrdenPersonas>("manual");

  const [hoja, setHoja] = useState<Hoja | null>(null);
  const [claveHoja, setClaveHoja] = useState(0);
  const [sucio, setSucio] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avisar = useCallback((nuevo: Aviso) => {
    setAviso(nuevo);
    if (temporizador.current) clearTimeout(temporizador.current);
    // Los errores se quedan hasta cerrarlos; los avisos con una acción dan
    // tiempo de pulsarla.
    if (nuevo.tipo === "ok") {
      temporizador.current = setTimeout(() => setAviso(null), nuevo.accion ? 8000 : 5000);
    }
  }, []);

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  const conteo = useMemo(() => {
    const porEstado: Record<FiltroEstado, number> = { todas: personas.length, publicada: 0, oculta: 0, baja: 0 };
    const porGrupo: Record<FiltroGrupo, number> = { [TODOS]: personas.length, interna: 0, huesped: 0 };
    let incompletas = 0;
    for (const persona of personas) {
      porEstado[estadoFicha(persona)] += 1;
      for (const clave of Object.keys(GRUPOS_PERSONA) as GrupoPersona[]) {
        if (persona.roles.some((r) => grupoDeRol(r) === clave)) porGrupo[clave] += 1;
      }
      if (faltantesFicha(persona).length > 0) incompletas += 1;
    }
    return { porEstado, porGrupo, incompletas };
  }, [personas]);

  const visibles = useMemo(() => {
    // Cada palabra por separado: "maria huaman" tiene que encontrar a
    // "María Quispe Huamán", aunque falte el apellido del medio.
    const palabras = sinTildes(busqueda.trim()).split(/\s+/).filter(Boolean);

    const filtradas = personas.filter((persona) => {
      if (filtroEstado !== "todas" && estadoFicha(persona) !== filtroEstado) return false;
      if (soloIncompletas && faltantesFicha(persona).length === 0) return false;
      if (grupo !== TODOS && !persona.roles.some((r) => grupoDeRol(r) === grupo)) return false;
      if (rol !== TODOS && !persona.roles.includes(rol as RolPersona)) return false;
      if (palabras.length === 0) return true;

      const texto = sinTildes(
        [persona.nombre, persona.slug, persona.titulo_profesional ?? "", persona.correo ?? "", persona.pais ?? ""]
          .concat(persona.roles.map((r) => ETIQUETA_ROL[r]))
          .join(" "),
      );
      return palabras.every((palabra) => texto.includes(palabra));
    });

    return [...filtradas].sort((a, b) => {
      if (orden === "nombre-az") return a.nombre.localeCompare(b.nombre, "es");
      if (orden === "recientes") {
        return new Date(b.actualizado_en).getTime() - new Date(a.actualizado_en).getTime();
      }
      return a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es");
    });
  }, [personas, busqueda, grupo, rol, filtroEstado, soloIncompletas, orden]);

  const hayFiltros =
    busqueda !== "" || grupo !== TODOS || rol !== TODOS || filtroEstado !== "todas" || soloIncompletas;
  // Las flechas solo tienen sentido si lo que se ve es el orden real completo.
  const sePuedeMover = orden === "manual" && !hayFiltros && personas.length > 1;

  const limpiar = () => {
    setBusqueda("");
    setGrupo(TODOS);
    setRol(TODOS);
    setFiltroEstado("todas");
    setSoloIncompletas(false);
  };

  const abrir = (nueva: Hoja) => {
    setSucio(false);
    setClaveHoja((c) => c + 1);
    setHoja(nueva);
  };

  const cerrar = useCallback(() => {
    setHoja(null);
    setSucio(false);
  }, []);

  const alGuardar = useCallback(
    (resultado: EstadoPersona) => {
      cerrar();
      const { id, slug, estado } = resultado;
      let accion: Aviso["accion"];
      if (id && estado === "oculta") {
        accion = {
          etiqueta: "Mostrar en la web",
          ejecutar: async () => {
            const publicado = await cambiarEstado(id, "publicada");
            avisar(
              publicado.ok
                ? { tipo: "ok", texto: publicado.detalle ?? "Ahora aparece en el sitio web." }
                : { tipo: "error", texto: publicado.error ?? "No se pudo mostrar en la web." },
            );
          },
        };
      } else if (slug && estado === "publicada") {
        accion = { etiqueta: "Ver en el sitio", ejecutar: () => window.open(`/equipo#${slug}`, "_blank", "noopener") };
      }
      avisar({ tipo: "ok", texto: resultado.detalle ?? "Guardado.", accion });
    },
    [avisar, cerrar],
  );

  const claseSelect =
    "h-10 rounded-lg border border-borde-fuerte bg-fondo px-3 text-sm text-texto outline-none transition-colors focus:border-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento";

  return (
    <>
      <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>{encabezado}</div>
        <Boton type="button" onClick={() => abrir({ modo: "crear" })} className="shrink-0 px-4 py-2.5">
          <Plus size={16} aria-hidden="true" />
          Agregar persona
        </Boton>
      </div>

      {personas.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-borde bg-fondo px-6 py-14 text-center">
          <span
            aria-hidden="true"
            className="block h-24 w-32 bg-texto-tenue"
            style={{
              WebkitMaskImage: "url('/llama-dormida.svg')",
              maskImage: "url('/llama-dormida.svg')",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskPosition: "center",
              maskPosition: "center",
            }}
          />
          <h2 className="mt-5 text-base font-semibold text-texto">Todavía no hay nadie en el equipo</h2>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-texto-suave">
            Agrega a la primera persona. Se guarda oculta hasta que decidas mostrarla en el sitio web.
          </p>
          <Boton type="button" onClick={() => abrir({ modo: "crear" })} className="mt-5 px-4 py-2.5">
            <Plus size={16} aria-hidden="true" />
            Agregar persona
          </Boton>
        </div>
      ) : (
        <>
          {/* Las pestañas son los grupos del equipo, que es como se piensa en
              él. La visibilidad en la web es un filtro más, no la portada. */}
          <div role="group" aria-label="Grupo" className="mt-8 flex gap-x-5 border-b border-borde sm:gap-x-6">
            {([TODOS, ...(Object.keys(GRUPOS_PERSONA) as GrupoPersona[])] as FiltroGrupo[]).map((clave) => {
              const activa = grupo === clave;
              return (
                <button
                  key={clave}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => {
                    setGrupo(clave);
                    setRol(TODOS);
                  }}
                  className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-rojo-acento ${
                    activa ? "border-rojo-acento text-texto" : "border-transparent text-texto-suave hover:text-texto"
                  }`}
                >
                  {clave === TODOS ? (
                    "Todos"
                  ) : clave === "huesped" ? (
                    // En un teléfono las tres pestañas no caben con el nombre largo.
                    <>
                      <span className="sm:hidden">Invitados</span>
                      <span className="hidden sm:inline">{ETIQUETA_GRUPO[clave]}</span>
                    </>
                  ) : (
                    ETIQUETA_GRUPO[clave]
                  )}
                  <span
                    className={`rounded-full px-1.5 py-px text-xs tabular-nums ${
                      activa ? "bg-rojo-tenue text-rojo-acento" : "bg-superficie text-texto-tenue"
                    }`}
                  >
                    {conteo.porGrupo[clave]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-tenue"
              />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, rol, título…"
                aria-label="Buscar una persona"
                className="h-10 w-full rounded-lg border border-borde-fuerte bg-fondo pl-9 pr-9 text-sm text-texto placeholder:text-texto-tenue focus:border-rojo-acento focus:outline-none focus:ring-1 focus:ring-rojo-acento [&::-webkit-search-cancel-button]:hidden"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  aria-label="Borrar la búsqueda"
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-texto-tenue transition-colors hover:text-rojo-acento"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <label className="sr-only" htmlFor="filtro-rol-persona">Filtrar por rol</label>
              <select
                id="filtro-rol-persona"
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                className={`${claseSelect} min-w-0 sm:flex-1 lg:flex-none`}
              >
                <option value={TODOS}>Todos los roles</option>
                {(grupo === TODOS ? (Object.keys(GRUPOS_PERSONA) as GrupoPersona[]) : [grupo]).flatMap((g) =>
                  GRUPOS_PERSONA[g].map((r) => (
                    <option key={r} value={r}>
                      {ETIQUETA_ROL[r]}
                    </option>
                  )),
                )}
              </select>

              <label className="sr-only" htmlFor="filtro-visibilidad-persona">Filtrar por visibilidad en la web</label>
              <select
                id="filtro-visibilidad-persona"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
                className={`${claseSelect} min-w-0 sm:flex-1 lg:flex-none`}
              >
                {(["todas", ...ESTADOS_FICHA] as FiltroEstado[]).map((clave) => (
                  <option key={clave} value={clave}>
                    {TITULO_FILTRO_ESTADO[clave]}
                    {clave !== "todas" && ` (${conteo.porEstado[clave]})`}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="orden-personas">Ordenar</label>
              <select
                id="orden-personas"
                value={orden}
                onChange={(e) => setOrden(e.target.value as OrdenPersonas)}
                className={`${claseSelect} min-w-0 sm:flex-1 lg:flex-none`}
              >
                <option value="manual">Orden manual</option>
                <option value="nombre-az">Nombre (A–Z)</option>
                <option value="recientes">Editadas recientemente</option>
              </select>

              <div className="flex h-10 shrink-0 items-center justify-self-start rounded-lg border border-borde-fuerte bg-fondo p-0.5" role="group" aria-label="Vista">
                {(
                  [
                    ["grilla", LayoutGrid, "Ver como grilla"],
                    ["lista", List, "Ver como lista"],
                  ] as const
                ).map(([clave, Icono, etiqueta]) => (
                  <button
                    key={clave}
                    type="button"
                    onClick={() => guardarVista(clave)}
                    aria-label={etiqueta}
                    title={etiqueta}
                    aria-pressed={vista === clave}
                    className={`flex h-full items-center rounded-md px-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-rojo-acento ${
                      vista === clave ? "bg-rojo-tenue text-rojo-acento" : "text-texto-tenue hover:text-texto"
                    }`}
                  >
                    <Icono size={16} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <p role="status" className="text-texto-suave">
              {visibles.length} {visibles.length === 1 ? "persona" : "personas"}
              {hayFiltros && ` de ${personas.length}`}
            </p>
            {conteo.incompletas > 0 && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-texto-suave">
                <input
                  type="checkbox"
                  checked={soloIncompletas}
                  onChange={(e) => setSoloIncompletas(e.target.checked)}
                  className="size-3.5 accent-rojo"
                />
                Solo fichas incompletas ({conteo.incompletas})
              </label>
            )}
            {hayFiltros && (
              <button
                type="button"
                onClick={limpiar}
                className="font-medium text-rojo-acento underline-offset-4 hover:underline"
              >
                Quitar filtros
              </button>
            )}
            {orden === "manual" && hayFiltros && personas.length > 1 && (
              <p className="text-xs text-texto-tenue">Quita los filtros para reordenar.</p>
            )}
          </div>

          {visibles.length === 0 ? (
            <div className="mt-6 rounded-xl border border-borde bg-fondo px-6 py-12 text-center">
              <p className="text-sm font-medium text-texto">Nadie coincide con estos filtros.</p>
              <button
                type="button"
                onClick={limpiar}
                className="mt-3 text-sm font-medium text-rojo-acento underline-offset-4 hover:underline"
              >
                Quitar filtros
              </button>
            </div>
          ) : (
            <div
              className={
                vista === "grilla"
                  ? "mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
                  : "mt-4 flex flex-col gap-3"
              }
            >
              {visibles.map((persona, indice) => (
                <TarjetaPersona
                  key={persona.id}
                  persona={persona}
                  vista={vista}
                  mover={sePuedeMover ? { arriba: indice > 0, abajo: indice < visibles.length - 1 } : null}
                  alEditar={() => abrir({ modo: "editar", persona })}
                  alAvisar={avisar}
                />
              ))}
            </div>
          )}
        </>
      )}

      <HojaPersona
        abierta={hoja !== null}
        titulo={hoja?.modo === "editar" ? `Editar a ${hoja.persona.nombre}` : "Agregar persona"}
        subtitulo={
          hoja?.modo === "editar"
            ? "Si la ficha es visible en la web, los cambios aparecen ahí al guardar."
            : "Solo nombre y rol son obligatorios. Lo demás puedes completarlo después."
        }
        sucio={sucio}
        alCerrar={cerrar}
      >
        {(pedirCierre) =>
          hoja && (
            <FormularioPersona
              key={claveHoja}
              persona={hoja.modo === "editar" ? hoja.persona : null}
              alGuardar={alGuardar}
              alCancelar={pedirCierre}
              alCambiar={setSucio}
            />
          )
        }
      </HojaPersona>

      {aviso && (
        <div
          role={aviso.tipo === "error" ? "alert" : "status"}
          className="fixed inset-x-4 bottom-6 z-50 mx-auto flex max-w-lg items-start gap-3 rounded-xl border border-borde bg-fondo px-4 py-3 text-sm text-texto shadow-lg sm:inset-x-0"
        >
          {aviso.tipo === "ok" ? (
            <Check size={16} className="mt-0.5 shrink-0 text-exito" aria-hidden="true" />
          ) : (
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-rojo-acento" aria-hidden="true" />
          )}
          <p className="flex-1 leading-snug">{aviso.texto}</p>
          {aviso.accion && (
            <button
              type="button"
              onClick={() => {
                const accion = aviso.accion;
                setAviso(null);
                accion?.ejecutar();
              }}
              className="shrink-0 font-semibold text-rojo-acento underline-offset-4 hover:underline"
            >
              {aviso.accion.etiqueta}
            </button>
          )}
          <button
            type="button"
            onClick={() => setAviso(null)}
            aria-label="Cerrar el aviso"
            className="-mr-1 shrink-0 rounded p-0.5 text-texto-tenue transition-colors hover:text-texto"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
