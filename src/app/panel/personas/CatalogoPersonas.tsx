"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List, Search, X } from "lucide-react";
import {
  ETIQUETA_GRUPO,
  ETIQUETA_ROL,
  GRUPOS_PERSONA,
  ROLES_PERSONA,
  grupoDeRol,
  type GrupoPersona,
  type RolPersona,
} from "@/lib/personas-tipos";
import type { Persona } from "@/lib/personas";
import { TarjetaPersona } from "./TarjetaPersona";
import type { VistaGestion } from "../TarjetaGestion";

type OrdenPersonas = "manual" | "nombre-az" | "nombre-za" | "recientes";

const TODOS = "todos";

/**
 * Buscador, filtros y vista del censo.
 *
 * El filtro es por rol y no por grupo, porque quien busca "profesor" quiere
 * encontrar a las profesoras tanto si están en la planta como si fueron
 * invitadas a dar una charla. El grupo sigue estando en los selectores, pero
 * como segundo eje: primero por rol, y dentro de él por grupo.
 */
export function CatalogoPersonas({ personas }: { personas: Persona[] }) {
  const [vista, setVista] = useState<VistaGestion>("grilla");
  const [busqueda, setBusqueda] = useState("");
  const [rol, setRol] = useState<string>(TODOS);
  const [grupo, setGrupo] = useState<string>(TODOS);
  const [publicadas, setPublicadas] = useState<string>(TODOS);
  const [orden, setOrden] = useState<OrdenPersonas>("manual");

  const visibles = useMemo(() => {
    // Se comparan sin tildes: quien escribe "ingenieria" espera encontrar
    // "Ingeniería".
    const sinTildes = (t: string) =>
      t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const q = sinTildes(busqueda.trim());

    const filtradas = personas.filter((persona) => {
      if (rol !== TODOS && !persona.roles.includes(rol as RolPersona)) return false;
      if (grupo !== TODOS && !persona.roles.some((r) => grupoDeRol(r) === grupo)) return false;
      if (publicadas === "si" && !persona.visible) return false;
      if (publicadas === "no" && persona.visible) return false;
      if (q === "") return true;

      return (
        sinTildes(persona.nombre).includes(q) ||
        sinTildes(persona.slug).includes(q) ||
        sinTildes(persona.titulo_profesional ?? "").includes(q) ||
        persona.roles.some((r) => sinTildes(ETIQUETA_ROL[r]).includes(q))
      );
    });

    return [...filtradas].sort((a, b) => {
      if (orden === "nombre-az") return a.nombre.localeCompare(b.nombre, "es");
      if (orden === "nombre-za") return b.nombre.localeCompare(a.nombre, "es");
      if (orden === "recientes") {
        return new Date(b.actualizado_en).getTime() - new Date(a.actualizado_en).getTime();
      }
      return a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es");
    });
  }, [personas, busqueda, rol, grupo, publicadas, orden]);

  const hayFiltros =
    busqueda !== "" || rol !== TODOS || grupo !== TODOS || publicadas !== TODOS;

  const limpiar = () => {
    setBusqueda("");
    setRol(TODOS);
    setGrupo(TODOS);
    setPublicadas(TODOS);
  };

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-tenue"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, título o rol"
            aria-label="Buscar una persona"
            className="h-9 w-full rounded-lg border border-borde-fuerte bg-fondo pl-9 pr-9 text-xs text-texto placeholder:text-texto-tenue focus:border-rojo-acento focus:outline-none focus:ring-1 focus:ring-rojo-acento"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              aria-label="Limpiar la búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-texto-tenue transition-colors hover:text-rojo-acento"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <label className="sr-only" htmlFor="filtro-rol-persona">Filtrar por rol</label>
        <select
          id="filtro-rol-persona"
          value={rol}
          onChange={(e) => setRol(e.target.value)}
          className="h-9 rounded-lg border border-borde bg-fondo px-3 text-xs text-texto outline-none transition-colors focus:border-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento"
        >
          <option value={TODOS}>Todos los roles</option>
          {ROLES_PERSONA.map((r) => (
            <option key={r} value={r}>
              {ETIQUETA_ROL[r]}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="filtro-grupo-persona">Filtrar por grupo</label>
        <select
          id="filtro-grupo-persona"
          value={grupo}
          onChange={(e) => setGrupo(e.target.value)}
          className="h-9 rounded-lg border border-borde bg-fondo px-3 text-xs text-texto outline-none transition-colors focus:border-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento"
        >
          <option value={TODOS}>Planta e invitados</option>
          {(Object.keys(GRUPOS_PERSONA) as GrupoPersona[]).map((g) => (
            <option key={g} value={g}>
              {ETIQUETA_GRUPO[g]}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="filtro-publicacion-persona">Filtrar por publicación</label>
        <select
          id="filtro-publicacion-persona"
          value={publicadas}
          onChange={(e) => setPublicadas(e.target.value)}
          className="h-9 rounded-lg border border-borde bg-fondo px-3 text-xs text-texto outline-none transition-colors focus:border-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento"
        >
          <option value={TODOS}>Publicadas y sin publicar</option>
          <option value="si">Solo publicadas</option>
          <option value="no">Solo sin publicar</option>
        </select>

        <label className="sr-only" htmlFor="orden-personas">Ordenar personas</label>
        <select
          id="orden-personas"
          value={orden}
          onChange={(e) => setOrden(e.target.value as OrdenPersonas)}
          className="h-9 rounded-lg border border-borde bg-fondo px-3 text-xs text-texto outline-none transition-colors focus:border-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento"
        >
          <option value="manual">Orden del panel</option>
          <option value="nombre-az">Nombre (A–Z)</option>
          <option value="nombre-za">Nombre (Z–A)</option>
          <option value="recientes">Editadas recientemente</option>
        </select>

        <span className="ml-auto text-xs text-texto-tenue">
          {visibles.length}{" "}
          {visibles.length === 1 ? "persona" : "personas"}
          {hayFiltros && ` de ${personas.length}`}
        </span>

        <div className="flex rounded-lg border border-borde bg-fondo p-0.5" aria-label="Vista del censo">
          <button
            type="button"
            onClick={() => setVista("grilla")}
            aria-label="Ver como grilla"
            aria-pressed={vista === "grilla"}
            className={`rounded-md p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-rojo-acento ${vista === "grilla" ? "bg-rojo-tenue text-rojo-acento" : "text-texto-tenue hover:bg-superficie"}`}
          >
            <LayoutGrid size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setVista("lista")}
            aria-label="Ver como lista"
            aria-pressed={vista === "lista"}
            className={`rounded-md p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-rojo-acento ${vista === "lista" ? "bg-rojo-tenue text-rojo-acento" : "text-texto-tenue hover:bg-superficie"}`}
          >
            <List size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {hayFiltros && (
        <button
          type="button"
          onClick={limpiar}
          className="mt-2 text-xs font-medium text-texto-suave transition-colors hover:text-rojo-acento"
        >
          Quitar los filtros
        </button>
      )}

      {visibles.length === 0 ? (
        <p className="mt-6 rounded-xl bg-superficie px-6 py-10 text-center text-sm text-texto-suave shadow-sm">
          {personas.length === 0
            ? "Todavía no hay nadie en el censo."
            : "Nadie coincide con ese filtro."}
        </p>
      ) : (
        <div
          className={
            vista === "grilla"
              ? "mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              : "mt-6 flex flex-col gap-3"
          }
        >
          {visibles.map((persona) => (
            <TarjetaPersona key={persona.id} persona={persona} vista={vista} />
          ))}
        </div>
      )}
    </>
  );
}