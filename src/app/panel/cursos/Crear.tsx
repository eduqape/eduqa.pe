"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AREAS } from "@/lib/curso-tipos";
import { ICONOS_CURSO } from "@/lib/iconos-curso";
import { crearCurso, type EstadoPublicacion } from "./acciones";

const NIVELES = ["INTRODUCCIÓN", "INTERMEDIO", "AVANZADO", "HARDMODE"];

/**
 * Alta de un curso nuevo.
 *
 * Vive en `/panel/cursos/nuevo`: crear es ocasional y no debe empujar hacia
 * abajo el listado. Al crearse, la acción abre la ficha del curso nuevo.
 */
export function CrearCurso() {
  const [estado, accion, enviando] = useActionState<EstadoPublicacion | null, FormData>(
    crearCurso,
    null,
  );

  return (
    <form action={accion} className="rounded-xl border border-borde bg-superficie p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2 block text-xs font-medium text-texto-suave">
          Título
          <input
            name="titulo"
            required
            minLength={4}
            placeholder="Introducción a Matplotlib"
            className="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto outline-none focus:border-rojo-acento"
          />
        </label>

        <label className="block text-xs font-medium text-texto-suave">
          Código (4 letras)
          <input
            name="codigo"
            required
            minLength={4}
            maxLength={4}
            pattern="[A-Za-z]{4}"
            placeholder="INPY"
            className="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 font-mono text-sm uppercase tracking-wider text-texto outline-none focus:border-rojo-acento"
          />
        </label>

        <label className="block text-xs font-medium text-texto-suave">
          Área
          <select
            name="area"
            required
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto outline-none focus:border-rojo-acento"
          >
            <option value="" disabled>
              Elige una
            </option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-texto-suave">
          Nivel
          <select
            name="nivel"
            defaultValue="INTRODUCCIÓN"
            className="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto outline-none focus:border-rojo-acento"
          >
            {NIVELES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-texto-suave">
          Icono del curso
          <select
            name="icono"
            required
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto outline-none focus:border-rojo-acento"
          >
            <option value="" disabled>Elige un logotipo o símbolo</option>
            {ICONOS_CURSO.map((icono) => (
              <option key={icono} value={icono}>{icono.charAt(0).toUpperCase() + icono.slice(1)}</option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-texto-suave">
          Horas
          <input
            name="horas"
            type="number"
            min={1}
            defaultValue={16}
            className="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto outline-none focus:border-rojo-acento"
          />
        </label>

        <label className="block text-xs font-medium text-texto-suave">
          Precio en soles
          <input
            name="precio"
            type="number"
            min={0}
            step="0.01"
            defaultValue={20}
            className="mt-1 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto outline-none focus:border-rojo-acento"
          />
        </label>
      </div>

      <p className="mt-3 text-xs text-texto-tenue">
        Nace en borrador, así que no lo verá nadie hasta que lo publiques.
      </p>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-rojo px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover disabled:opacity-50"
        >
          {enviando ? "Creando…" : "Crear"}
        </button>
        <Link href="/panel/cursos" className="text-sm text-texto-suave hover:text-texto">
          Cancelar
        </Link>
        {estado && (
          <span
            role="status"
            className={`text-xs ${estado.ok ? "text-exito" : "text-rojo-acento"}`}
          >
            {estado.ok ? estado.detalle : estado.error}
          </span>
        )}
      </div>
    </form>
  );
}
