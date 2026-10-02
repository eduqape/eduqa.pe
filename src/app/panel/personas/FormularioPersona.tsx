"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Check, Globe, Loader2, Plus, Trash2 } from "lucide-react";
import { Boton, Campo, claseInput, claseInputBase } from "@/components/ui";
import { REDES_NOMBRE } from "@/components/Iconos";
import {
  ETIQUETA_GRUPO,
  ETIQUETA_ROL,
  GRUPOS_PERSONA,
  ROLES_PERSONA,
  type RolPersona,
} from "@/lib/personas-tipos";
import type { Persona } from "@/lib/personas";
import { actualizarPersona, crearPersona, type EstadoPersona } from "./acciones";

/** Cuántas filas de red se ofrecen sin que haya que tocar nada. */
const REDES_INICIALES = 2;

type FilaRed = { red: string; url: string };

type Borrador = {
  nombre: string;
  slug: string;
  titulo_profesional: string;
  correo: string;
  telefono: string;
  pais: string;
  biografia: string;
  foto_url: string;
  visible: boolean;
  activo: boolean;
  orden: string;
  roles: RolPersona[];
  redes: FilaRed[];
};

function borradorDe(persona?: Persona | null): Borrador {
  if (!persona) {
    return {
      nombre: "",
      slug: "",
      titulo_profesional: "",
      correo: "",
      telefono: "",
      pais: "",
      biografia: "",
      foto_url: "",
      visible: false,
      activo: true,
      orden: "50",
      roles: ["trabajador"],
      redes: Array.from({ length: REDES_INICIALES }, () => ({ red: "", url: "" })),
    };
  }

  // Las redes guardadas van primero y el resto se rellena con filas vacías, sin
  // borrar lo que ya hay: si una persona tiene tres redes, al abrir el
  // formulario salen tres, no tres menos las que no se rellenen.
  const redes: FilaRed[] = persona.redes.map((r) => ({ red: r.red, url: r.url }));
  for (let i = redes.length; i < Math.max(REDES_INICIALES, redes.length); i += 1) {
    redes.push({ red: "", url: "" });
  }

  return {
    nombre: persona.nombre,
    slug: persona.slug,
    titulo_profesional: persona.titulo_profesional ?? "",
    correo: persona.correo ?? "",
    telefono: persona.telefono ?? "",
    pais: persona.pais ?? "",
    biografia: persona.biografia ?? "",
    foto_url: persona.foto_url ?? "",
    visible: persona.visible,
    activo: persona.activo,
    orden: String(persona.orden),
    roles: persona.roles.length > 0 ? persona.roles : ["trabajador"],
    redes,
  };
}

export function FormularioPersona({
  persona,
  alGuardar,
  compacto = false,
}: {
  persona?: Persona | null;
  alGuardar?: () => void;
  compacto?: boolean;
}) {
  const [borrador, setBorrador] = useState<Borrador>(() => borradorDe(persona));
  const [estado, accion, guardando] = useActionState<EstadoPersona | null, FormData>(
    async (anterior, datos) => {
      try {
        const resultado = persona
          ? await actualizarPersona(anterior, datos)
          : await crearPersona(anterior, datos);
        if (resultado.ok) alGuardar?.();
        return resultado;
      } catch {
        return {
          ok: false,
          error:
            "No pudimos confirmar el guardado. Inténtalo de nuevo; lo que escribiste sigue en el formulario.",
        };
      }
    },
    null,
  );

  const alternarRol = (rol: RolPersona) =>
    setBorrador((b) => ({
      ...b,
      roles: b.roles.includes(rol) ? b.roles.filter((r) => r !== rol) : [...b.roles, rol],
    }));

  const cambiarRed = (indice: number, campo: keyof FilaRed, valor: string) =>
    setBorrador((b) => ({
      ...b,
      redes: b.redes.map((fila, i) => (i === indice ? { ...fila, [campo]: valor } : fila)),
    }));

  return (
    <form
      action={accion}
      onReset={(event) => event.preventDefault()}
      className={compacto ? "space-y-3" : "space-y-5"}
    >
      {persona && <input type="hidden" name="id" value={persona.id} />}

      {/* Una fila por rol, y no un select, porque la respuesta natural a
          "¿qué es?" son varias marcas y nadie entiende un select múltiple. */}
      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-texto">Rol en el equipo</legend>
        <div className="flex flex-wrap gap-1.5">
          {ROLES_PERSONA.map((rol) => {
            const marcado = borrador.roles.includes(rol);
            const grupo = ETIQUETA_GRUPO[
              (GRUPOS_PERSONA.huesped as readonly RolPersona[]).includes(rol) ? "huesped" : "interna"
            ];
            return (
              <label
                key={rol}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  marcado
                    ? "bg-rojo text-white"
                    : "bg-superficie text-texto-suave hover:bg-fondo hover:text-rojo-acento"
                }`}
              >
                <input
                  type="checkbox"
                  name="rol"
                  value={rol}
                  checked={marcado}
                  onChange={() => alternarRol(rol)}
                  className="sr-only"
                />
                {ETIQUETA_ROL[rol]}
                <span className="sr-only"> ({grupo})</span>
              </label>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-texto-tenue">
          Se puede marcar más de uno: un profesor que también desarrolla es las dos cosas.
        </p>
      </fieldset>

      <div className={compacto ? "space-y-3" : "grid gap-4 sm:grid-cols-2"}>
        <Campo etiqueta="Nombre" ayuda="Cómo se escribe en la web, tal cual.">
          <input
            name="nombre"
            value={borrador.nombre}
            onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
            required
            minLength={2}
            maxLength={120}
            placeholder="Ana Ramírez"
            className={claseInput}
          />
        </Campo>

        <Campo etiqueta="Título profesional" ayuda="La línea que va bajo el nombre.">
          <input
            name="titulo_profesional"
            value={borrador.titulo_profesional}
            onChange={(e) => setBorrador({ ...borrador, titulo_profesional: e.target.value })}
            maxLength={160}
            placeholder="Ingeniera de Sistemas"
            className={claseInput}
          />
        </Campo>

        <Campo
          etiqueta="Dirección de la ficha"
          ayuda="Vacío la genera desde el nombre. Solo minúsculas, números y guiones."
        >
          <input
            name="slug"
            value={borrador.slug}
            onChange={(e) => setBorrador({ ...borrador, slug: e.target.value })}
            placeholder="ana-ramirez"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            className={`${claseInput} font-mono text-xs`}
          />
        </Campo>

        <Campo etiqueta="Correo">
          <input
            name="correo"
            type="email"
            value={borrador.correo}
            onChange={(e) => setBorrador({ ...borrador, correo: e.target.value })}
            placeholder="ana@eduqa.pe"
            className={claseInput}
          />
        </Campo>

        <Campo etiqueta="Teléfono">
          <input
            name="telefono"
            type="tel"
            value={borrador.telefono}
            onChange={(e) => setBorrador({ ...borrador, telefono: e.target.value })}
            placeholder="+51 900 000 000"
            className={claseInput}
          />
        </Campo>

        <Campo etiqueta="País">
          <input
            name="pais"
            value={borrador.pais}
            onChange={(e) => setBorrador({ ...borrador, pais: e.target.value })}
            placeholder="Perú"
            className={claseInput}
          />
        </Campo>

        <div className="sm:col-span-2">
          <Campo etiqueta="Enlace de la foto" ayuda="Dirección de la imagen; se sube al bucket personas-fotos.">
            <input
              name="foto_url"
              type="url"
              value={borrador.foto_url}
              onChange={(e) => setBorrador({ ...borrador, foto_url: e.target.value })}
              placeholder="https://…/personas-fotos/ana.webp"
              className={claseInput}
            />
          </Campo>
        </div>

        <div className="sm:col-span-2">
          <Campo etiqueta="Biografía" ayuda="Uno o dos párrafos. Separate con una línea en blanco.">
            <textarea
              name="biografia"
              value={borrador.biografia}
              onChange={(e) => setBorrador({ ...borrador, biografia: e.target.value })}
              rows={compacto ? 3 : 5}
              className={`${claseInputBase} w-full resize-y leading-relaxed`}
            />
          </Campo>
        </div>
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-texto">Redes</legend>
        <div className="space-y-2">
          {borrador.redes.map((fila, indice) => (
            <div key={indice} className="flex gap-2">
              <label className="sr-only" htmlFor={`red-${indice}`}>
                Red {indice + 1}
              </label>
              <select
                id={`red-${indice}`}
                name="red"
                value={fila.red}
                onChange={(e) => cambiarRed(indice, "red", e.target.value)}
                className={`${claseInputBase} sm:w-44`}
              >
                <option value="">Sin red</option>
                {REDES_NOMBRE.map((red) => (
                  <option key={red} value={red}>
                    {red.charAt(0).toUpperCase() + red.slice(1)}
                  </option>
                ))}
              </select>

              <input
                name="red_url"
                type="url"
                value={fila.url}
                onChange={(e) => cambiarRed(indice, "url", e.target.value)}
                placeholder="https://…"
                aria-label={`Dirección de ${fila.red || `la red ${indice + 1}`}`}
                className={`${claseInputBase} flex-1`}
              />

              <button
                type="button"
                onClick={() =>
                  setBorrador((b) => ({
                    ...b,
                    redes: b.redes.filter((_, i) => i !== indice),
                  }))
                }
                aria-label={`Quitar la red ${indice + 1}`}
                className="shrink-0 rounded-lg px-2.5 text-texto-tenue transition-colors hover:text-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() =>
            setBorrador((b) => ({ ...b, redes: [...b.redes, { red: "", url: "" }] }))
          }
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-texto-suave transition-colors hover:text-rojo-acento"
        >
          <Plus size={13} aria-hidden="true" />
          Añadir otra red
        </button>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
        <Campo etiqueta="Orden" ayuda="Menor va antes.">
          <input
            name="orden"
            type="number"
            min={0}
            step={10}
            value={borrador.orden}
            onChange={(e) => setBorrador({ ...borrador, orden: e.target.value })}
            className={claseInput}
          />
        </Campo>

        <div className="space-y-2 self-end pb-1">
          <label className="flex items-start gap-2 text-xs leading-snug text-texto-suave">
            <input
              type="checkbox"
              name="visible"
              checked={borrador.visible}
              onChange={(e) => setBorrador({ ...borrador, visible: e.target.checked })}
              className="mt-0.5 size-3.5 shrink-0 accent-rojo"
            />
            <span>
              <Globe size={11} className="mr-1 inline align-[-1px]" aria-hidden="true" />
              Visible en la portada y en /equipo.
            </span>
          </label>

          <label className="flex items-start gap-2 text-xs leading-snug text-texto-suave">
            <input
              type="checkbox"
              name="activo"
              checked={borrador.activo}
              onChange={(e) => setBorrador({ ...borrador, activo: e.target.checked })}
              className="mt-0.5 size-3.5 shrink-0 accent-rojo"
            />
            <span>
              Trabaja aquí. Desmarcado conserva la ficha pero la saca de la web.
            </span>
          </label>
        </div>
      </div>

      {estado && !estado.ok && (
        <p
          role="alert"
          className="flex items-start gap-1.5 text-xs leading-snug text-rojo-acento"
        >
          <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {estado.error}
        </p>
      )}

      {estado?.ok && (
        <p role="status" className="flex items-center gap-1.5 text-xs text-exito">
          <Check size={14} aria-hidden="true" />
          {estado.detalle}
        </p>
      )}

      <Boton type="submit" disabled={guardando} className={compacto ? "w-full py-2 text-xs" : undefined}>
        {guardando && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        {guardando
          ? "Guardando…"
          : persona
            ? "Guardar cambios"
            : "Dar de alta"}
      </Boton>
    </form>
  );
}