"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Pencil,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { IconoRed } from "@/components/Iconos";
import { ETIQUETA_ROL, type RolPersona } from "@/lib/personas-tipos";
import type { Persona } from "@/lib/personas";
import { FormularioPersona } from "./FormularioPersona";
import { cambiarVisibilidad, eliminarPersona } from "./acciones";
import type { VistaGestion } from "../TarjetaGestion";

/**
 * Las iniciales de pie de foto.
 *
 * Nadie entra al panel a subir un retrato antes de dar de alta a alguien, así
 * que la tarjeta tiene que verse terminada con el nombre solo. Con la foto
 * puesta, esta no llega a dibujarse.
 */
function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

function Chip({ rol }: { rol: RolPersona }) {
  return (
    <span className="rounded-full bg-superficie px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-texto-suave">
      {ETIQUETA_ROL[rol]}
    </span>
  );
}

export function TarjetaPersona({
  persona,
  vista = "grilla",
}: {
  persona: Persona;
  vista?: VistaGestion;
}) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  /** Los toggles van en su propia acción, así que el resultado se muestra aquí. */
  const ejecutar = (accion: () => Promise<{ ok: boolean; detalle?: string; error?: string }>) => {
    setFallo(null);
    iniciar(async () => {
      const resultado = await accion();
      if (resultado.ok) setAviso(resultado.detalle ?? null);
      else setFallo(resultado.error ?? "No se pudo completar la acción.");
    });
  };

  if (editando) {
    return (
      <div className="rounded-xl bg-superficie p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-rojo-acento">
            Editando a {persona.nombre}
          </span>
          <button
            type="button"
            onClick={() => setEditando(false)}
            disabled={pendiente}
            aria-label="Cancelar la edición"
            className="rounded p-1 text-texto-tenue transition-colors hover:text-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <FormularioPersona persona={persona} compacto alGuardar={() => setEditando(false)} />
      </div>
    );
  }

  const etiquetas = (
    <>
      {persona.roles.map((rol) => (
        <Chip key={rol} rol={rol} />
      ))}
    </>
  );

  const acciones = (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => ejecutar(() => cambiarVisibilidad(persona.id, !persona.visible))}
        disabled={pendiente || !persona.activo}
        title={
          persona.activo
            ? persona.visible
              ? "Dejar de publicar"
              : "Publicar en la web"
            : "Activa a la persona antes de publicarla"
        }
        className="flex items-center justify-center gap-1.5 rounded-lg border border-borde-fuerte px-3 py-2 text-xs font-medium text-texto-suave transition-colors hover:border-rojo-acento hover:text-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pendiente ? (
          <Loader2 size={13} className="animate-spin" aria-hidden="true" />
        ) : persona.visible ? (
          <EyeOff size={13} aria-hidden="true" />
        ) : (
          <Eye size={13} aria-hidden="true" />
        )}
        {persona.visible ? "Despublicar" : "Publicar"}
      </button>

      <button
        type="button"
        onClick={() => setEditando(true)}
        disabled={pendiente}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-borde-fuerte px-3 py-2 text-xs font-medium text-texto-suave transition-colors hover:border-rojo-acento hover:text-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento disabled:opacity-50"
      >
        <Pencil size={13} aria-hidden="true" />
        Editar
      </button>

      {confirmando ? (
        <div className="flex items-center gap-2 rounded-lg bg-rojo-tenue px-2 py-1.5">
          <span className="text-xs text-texto-suave">¿Borrar la ficha?</span>
          <button
            type="button"
            onClick={() => ejecutar(() => eliminarPersona(persona.id))}
            disabled={pendiente}
            className="rounded px-2 py-1 text-xs font-semibold text-rojo-acento transition-colors hover:bg-rojo hover:text-white"
          >
            Sí, borrar
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            disabled={pendiente}
            className="rounded px-2 py-1 text-xs text-texto-suave transition-colors hover:text-texto"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          disabled={pendiente}
          aria-label={`Borrar la ficha de ${persona.nombre}`}
          className="rounded-lg border border-borde-fuerte p-2 text-texto-tenue transition-colors hover:border-rojo-acento hover:text-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento disabled:opacity-50"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      )}
    </div>
  );

  const pie = (
    <>
      {aviso && (
        <p role="status" className="flex items-center gap-1 text-[11px] text-exito">
          <Check size={12} aria-hidden="true" />
          {aviso}
        </p>
      )}
      {fallo && (
        <p role="alert" className="flex items-start gap-1 text-[11px] text-rojo-acento">
          <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fallo}
        </p>
      )}
    </>
  );

  const retrato = persona.foto_url ? (
    // Una foto de un tercero: el next.config no declara imágenes remotas, y esta
    // URL viene de la base, no de un archivo del repositorio.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={persona.foto_url}
      alt=""
      className="size-12 shrink-0 rounded-full object-cover"
      loading="lazy"
    />
  ) : (
    <span
      aria-hidden="true"
      className="flex size-12 shrink-0 items-center justify-center rounded-full bg-superficie text-sm font-semibold text-texto-suave"
    >
      {iniciales(persona.nombre) || <UserRound size={16} />}
    </span>
  );

  // El enlace solo aparece si la persona está visible *y* activa. Con `visible`
// basta no bastaría: RLS filtra por las dos, así que una persona dada de baja
// con `visible` puesto apuntaría a un ancla que en /equipo no existe.
const enlace = persona.visible && persona.activo ? (
    <a
      href={`/equipo#${persona.slug}`}
      className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-texto-suave transition-colors hover:text-rojo-acento"
    >
      <Globe size={12} aria-hidden="true" />
      Ver en la web
    </a>
  ) : null;

  if (vista === "lista") {
    return (
      <div className="flex flex-col gap-4 rounded-xl bg-superficie p-4 shadow-sm sm:flex-row sm:items-center">
        {retrato}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {etiquetas}
            {!persona.activo && (
              <span className="rounded-full bg-superficie px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-texto-tenue ring-1 ring-inset ring-borde-fuerte">
                Inactiva
              </span>
            )}
          </div>
          <h3 className="mt-1.5 truncate text-sm font-semibold text-texto">{persona.nombre}</h3>
          <p className="mt-0.5 truncate text-xs text-texto-suave">
            {persona.titulo_profesional ?? "Sin título profesional"}
          </p>
        </div>

        {persona.redes.length > 0 && (
          <div className="hidden shrink-0 items-center gap-1.5 text-texto-tenue sm:flex">
            {persona.redes.map((red) => (
              <IconoRed key={red.red} nombre={red.red} className="size-3.5" />
            ))}
          </div>
        )}

        <div className="flex flex-col items-end gap-1.5">
          {enlace}
          {acciones}
        </div>
        {pie}
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl bg-superficie p-5 shadow-sm">
      <div className="flex items-start gap-3">
        {retrato}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug text-texto">{persona.nombre}</h3>
          {/* El rojo es el color del acento, no el de un dato incompleto: sin
              título la línea se apaga en vez de avisar de un error. */}
          <p
            className={`mt-0.5 text-sm leading-snug ${
              persona.titulo_profesional ? "text-rojo-acento" : "text-texto-tenue"
            }`}
          >
            {persona.titulo_profesional ?? "Sin título profesional"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {etiquetas}
        {!persona.activo && (
          <span className="rounded-full bg-superficie px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-texto-tenue ring-1 ring-inset ring-borde-fuerte">
            Inactiva
          </span>
        )}
      </div>

      {persona.biografia && (
        <p className="mt-3 line-clamp-4 flex-1 text-sm leading-relaxed text-texto-suave">
          {persona.biografia}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-borde pt-3 text-xs">
        <span className="font-mono text-[10px] text-texto-tenue">{persona.slug}</span>
        {persona.redes.length > 0 && (
          <span className="flex items-center gap-1.5 text-texto-tenue">
            {persona.redes.map((red) => (
              <IconoRed key={red.red} nombre={red.red} className="size-3.5" />
            ))}
          </span>
        )}
      </div>

      {/* El enlace va en su propia línea: metido en la fila de botones, a lo
          ancho de una tarjeta de grilla se partía en tres líneas. */}
      <div className="mt-3 space-y-2.5">
        {enlace}
        {acciones}
      </div>

      {pie}
    </div>
  );
}