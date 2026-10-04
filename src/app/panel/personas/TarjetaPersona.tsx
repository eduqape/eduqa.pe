"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  CircleDashed,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  UserMinus,
  UserRound,
} from "lucide-react";
import { ETIQUETA_RED, IconoRed } from "@/components/Iconos";
import {
  ETIQUETA_ESTADO_FICHA,
  ETIQUETA_ROL,
  estadoFicha,
  faltantesFicha,
  iniciales,
  type EstadoFicha,
} from "@/lib/personas-tipos";
import type { Persona } from "@/lib/personas";
import { cambiarEstado, eliminarPersona, moverPersona, type EstadoPersona } from "./acciones";
import type { VistaGestion } from "../TarjetaGestion";

export type Aviso = {
  tipo: "ok" | "error";
  texto: string;
  accion?: { etiqueta: string; ejecutar: () => void };
};

/** Mismos colores que el estado de los cursos, para que "publicado" se lea igual en todo el panel. */
const ESTILO_ESTADO: Record<EstadoFicha, string> = {
  publicada:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  oculta: "bg-superficie text-texto-suave ring-borde-fuerte",
  baja: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
};

const ICONO_ESTADO: Record<EstadoFicha, typeof Eye> = {
  publicada: Globe,
  oculta: EyeOff,
  baja: UserMinus,
};

function InsigniaEstado({ estado }: { estado: EstadoFicha }) {
  const Icono = ICONO_ESTADO[estado];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${ESTILO_ESTADO[estado]}`}
    >
      <Icono size={11} aria-hidden="true" />
      {ETIQUETA_ESTADO_FICHA[estado]}
    </span>
  );
}

function Retrato({ persona, tamano }: { persona: Persona; tamano: "md" | "sm" }) {
  const clase = tamano === "md" ? "size-12 text-sm" : "size-10 text-xs";
  if (persona.foto_url) {
    return (
      // Foto del bucket: next/image no tiene declarado ese dominio.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={persona.foto_url} alt="" loading="lazy" className={`${clase} shrink-0 rounded-full object-cover`} />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${clase} flex shrink-0 items-center justify-center rounded-full bg-superficie font-semibold text-texto-suave`}
    >
      {iniciales(persona.nombre) || <UserRound size={16} />}
    </span>
  );
}

/**
 * Menú con las acciones que cambian mucho o no se deshacen. Fuera de la vista
 * principal para que "Eliminar" no esté a un clic de "Editar".
 */
function MenuAcciones({
  estado,
  deshabilitado,
  alDarDeBaja,
  alEliminar,
}: {
  estado: EstadoFicha;
  deshabilitado: boolean;
  alDarDeBaja: () => void;
  alEliminar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (evento: MouseEvent) => {
      if (!ref.current?.contains(evento.target as Node)) setAbierto(false);
    };
    const escape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  const elegir = (accion: () => void) => {
    setAbierto(false);
    accion();
  };

  const claseItem =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-texto transition-colors hover:bg-superficie focus-visible:bg-superficie focus-visible:outline-none";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        disabled={deshabilitado}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Más acciones"
        title="Más acciones"
        className="flex size-8 items-center justify-center rounded-lg text-texto-tenue transition-colors hover:bg-superficie hover:text-texto focus-visible:outline-2 focus-visible:outline-rojo-acento disabled:opacity-50"
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {abierto && (
        <div
          role="menu"
          className="absolute right-0 bottom-full z-20 mb-1 w-48 overflow-hidden rounded-lg border border-borde bg-fondo py-1 shadow-lg"
        >
          {estado !== "baja" && (
            <button type="button" role="menuitem" onClick={() => elegir(alDarDeBaja)} className={claseItem}>
              <UserMinus size={13} aria-hidden="true" />
              Dar de baja
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => elegir(alEliminar)}
            className={`${claseItem} text-rojo-acento`}
          >
            <Trash2 size={13} aria-hidden="true" />
            Eliminar ficha…
          </button>
        </div>
      )}
    </div>
  );
}

export function TarjetaPersona({
  persona,
  vista = "grilla",
  mover,
  alEditar,
  alAvisar,
}: {
  persona: Persona;
  vista?: VistaGestion;
  /** Si se puede reordenar y hacia dónde. `null` cuando el orden visible no es el del panel. */
  mover: { arriba: boolean; abajo: boolean } | null;
  alEditar: () => void;
  alAvisar: (aviso: Aviso) => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const estado = estadoFicha(persona);
  const faltan = faltantesFicha(persona);

  const ejecutar = (accion: () => Promise<EstadoPersona>, deshacer?: () => Promise<EstadoPersona>) => {
    iniciar(async () => {
      try {
        const resultado = await accion();
        if (!resultado.ok) {
          alAvisar({ tipo: "error", texto: resultado.error ?? "No se pudo completar la acción." });
          return;
        }
        if (resultado.detalle) {
          alAvisar({
            tipo: "ok",
            texto: resultado.detalle,
            accion: deshacer ? { etiqueta: "Deshacer", ejecutar: () => ejecutar(deshacer) } : undefined,
          });
        }
      } catch {
        alAvisar({ tipo: "error", texto: "Sin conexión con el servidor. Inténtalo de nuevo." });
      }
    });
  };

  const aEstado = (nuevo: EstadoFicha) =>
    ejecutar(
      () => cambiarEstado(persona.id, nuevo),
      () => cambiarEstado(persona.id, estado),
    );

  // El siguiente paso natural de cada estado: publicar lo oculto, ocultar lo
  // publicado y reactivar lo que está de baja (vuelve sin publicar).
  const siguiente: Record<EstadoFicha, { a: EstadoFicha; texto: string; Icono: typeof Eye }> = {
    publicada: { a: "oculta", texto: "Ocultar", Icono: EyeOff },
    oculta: { a: "publicada", texto: "Publicar", Icono: Eye },
    baja: { a: "oculta", texto: "Reactivar", Icono: RotateCcw },
  };
  const { a: destino, texto: textoEstado, Icono: IconoSiguiente } = siguiente[estado];

  const botonEstado = (
    <button
      type="button"
      onClick={() => aEstado(destino)}
      disabled={pendiente}
      className="inline-flex items-center gap-1.5 rounded-lg border border-borde-fuerte px-3 py-1.5 text-xs font-medium text-texto-suave transition-colors hover:border-rojo-acento hover:text-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento disabled:opacity-50"
    >
      {pendiente ? (
        <Loader2 size={13} className="animate-spin" aria-hidden="true" />
      ) : (
        <IconoSiguiente size={13} aria-hidden="true" />
      )}
      {textoEstado}
    </button>
  );

  const flechas = mover && (
    <div className="flex items-center" role="group" aria-label={`Orden de ${persona.nombre}`}>
      <button
        type="button"
        onClick={() => ejecutar(() => moverPersona(persona.id, "arriba"))}
        disabled={pendiente || !mover.arriba}
        aria-label={`Subir a ${persona.nombre} un puesto`}
        title="Subir un puesto"
        className="flex size-8 items-center justify-center rounded-lg text-texto-tenue transition-colors hover:bg-superficie hover:text-texto focus-visible:outline-2 focus-visible:outline-rojo-acento disabled:opacity-30"
      >
        <ArrowUp size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => ejecutar(() => moverPersona(persona.id, "abajo"))}
        disabled={pendiente || !mover.abajo}
        aria-label={`Bajar a ${persona.nombre} un puesto`}
        title="Bajar un puesto"
        className="flex size-8 items-center justify-center rounded-lg text-texto-tenue transition-colors hover:bg-superficie hover:text-texto focus-visible:outline-2 focus-visible:outline-rojo-acento disabled:opacity-30"
      >
        <ArrowDown size={15} aria-hidden="true" />
      </button>
    </div>
  );

  const acciones = confirmando ? (
    <div role="alertdialog" aria-labelledby={`borrar-${persona.id}`} className="space-y-2.5">
      <p id={`borrar-${persona.id}`} className="text-xs leading-relaxed text-texto">
        <span className="font-semibold">¿Eliminar la ficha de {persona.nombre}?</span> No se puede
        deshacer.{estado !== "baja" && " Si solo dejó el equipo, mejor dala de baja: sale de la web y se conserva."}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          autoFocus
          onClick={() => setConfirmando(false)}
          className="rounded-lg border border-borde-fuerte px-3 py-1.5 text-xs font-medium text-texto transition-colors hover:bg-superficie"
        >
          Cancelar
        </button>
        {estado !== "baja" && (
          <button
            type="button"
            onClick={() => {
              setConfirmando(false);
              aEstado("baja");
            }}
            className="rounded-lg border border-borde-fuerte px-3 py-1.5 text-xs font-medium text-texto transition-colors hover:bg-superficie"
          >
            Dar de baja
          </button>
        )}
        <button
          type="button"
          onClick={() => ejecutar(() => eliminarPersona(persona.id))}
          disabled={pendiente}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rojo px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rojo-hover disabled:opacity-50"
        >
          {pendiente && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
          Eliminar
        </button>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={alEditar}
        disabled={pendiente}
        className="inline-flex items-center gap-1.5 rounded-lg border border-borde-fuerte px-3 py-1.5 text-xs font-medium text-texto transition-colors hover:border-rojo-acento hover:text-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento disabled:opacity-50"
      >
        <Pencil size={13} aria-hidden="true" />
        Editar
      </button>
      {botonEstado}
      <div className="ml-auto flex items-center">
        {flechas}
        <MenuAcciones
          estado={estado}
          deshabilitado={pendiente}
          alDarDeBaja={() => aEstado("baja")}
          alEliminar={() => setConfirmando(true)}
        />
      </div>
    </div>
  );

  const redes =
    persona.redes.length > 0 ? (
      <ul className="flex flex-wrap items-center gap-0.5">
        {persona.redes.map((red) => (
          <li key={red.red}>
            <a
              href={red.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${ETIQUETA_RED[red.red]}: ${red.url}`}
              aria-label={`${ETIQUETA_RED[red.red]} de ${persona.nombre} (se abre en otra pestaña)`}
              className="flex size-7 items-center justify-center rounded-md text-texto-tenue transition-colors hover:bg-superficie hover:text-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento"
            >
              <IconoRed nombre={red.red} className="size-3.5" />
            </a>
          </li>
        ))}
      </ul>
    ) : null;

  const enlaceWeb =
    estado === "publicada" ? (
      <a
        href={`/equipo#${persona.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-texto-suave transition-colors hover:text-rojo-acento"
      >
        <Globe size={12} aria-hidden="true" />
        Ver en la web
      </a>
    ) : null;

  const pendientes =
    faltan.length > 0 ? (
      <p className="flex items-center gap-1.5 text-xs text-texto-tenue">
        <CircleDashed size={12} aria-hidden="true" />
        Falta: {faltan.join(", ")}
      </p>
    ) : null;

  if (vista === "lista") {
    return (
      <article
        aria-busy={pendiente}
        className="flex flex-col gap-3 rounded-xl border border-borde bg-fondo p-4 transition-colors hover:border-borde-fuerte md:flex-row md:items-center md:gap-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Retrato persona={persona} tamano="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-texto">{persona.nombre}</h3>
              <InsigniaEstado estado={estado} />
            </div>
            <p className="mt-0.5 truncate text-xs text-texto-suave">
              {persona.roles.map((rol) => ETIQUETA_ROL[rol]).join(" · ")}
              {persona.titulo_profesional && ` — ${persona.titulo_profesional}`}
            </p>
          </div>
        </div>
        <div className="hidden lg:block">{redes}</div>
        <div className="md:w-[22rem]">{acciones}</div>
      </article>
    );
  }

  return (
    <article
      aria-busy={pendiente}
      className="flex flex-col rounded-xl border border-borde bg-fondo p-5 transition-colors hover:border-borde-fuerte"
    >
      {/* El estado va junto al retrato y no junto al nombre: en una columna
          estrecha le quitaba ancho al nombre y el título se partía en tres. */}
      <div className="flex items-start justify-between gap-3">
        <Retrato persona={persona} tamano="md" />
        <InsigniaEstado estado={estado} />
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug text-texto">{persona.nombre}</h3>
      {persona.titulo_profesional && (
        <p className="mt-0.5 text-sm leading-snug text-rojo-acento">{persona.titulo_profesional}</p>
      )}

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Roles">
        {persona.roles.map((rol) => (
          <li
            key={rol}
            className="rounded-full bg-superficie px-2 py-0.5 text-[11px] font-medium text-texto-suave"
          >
            {ETIQUETA_ROL[rol]}
          </li>
        ))}
      </ul>

      {persona.biografia ? (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-texto-suave">{persona.biografia}</p>
      ) : null}

      <div className="mt-3 flex-1 space-y-2">
        {pendientes}
        {(redes || enlaceWeb) && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {redes ?? <span />}
            {enlaceWeb}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-borde pt-3">{acciones}</div>
    </article>
  );
}
