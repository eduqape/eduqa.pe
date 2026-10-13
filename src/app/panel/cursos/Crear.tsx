"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { Icono } from "@/components/Iconos";
import { claseInput } from "@/components/ui";
import { AREAS } from "@/lib/curso-tipos";
import { ICONOS_CURSO } from "@/lib/iconos-curso";
import { crearCurso, type EstadoPublicacion } from "./acciones";

const NIVELES = ["INTRODUCCIÓN", "INTERMEDIO", "AVANZADO", "HARDMODE"];

/** La misma regla que aplica `crearCurso` en el servidor. */
function slugDe(titulo: string) {
  return titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const etiqueta = "mb-1.5 block text-sm font-medium text-texto";
const ayuda = "mt-1.5 block text-xs text-texto-tenue";

/**
 * Alta de un curso nuevo.
 *
 * Vive en `/panel/cursos/nuevo`: crear es ocasional y no debe empujar hacia
 * abajo el listado. Al crearse, la acción abre la ficha del curso nuevo.
 *
 * Los campos son controlados: React reinicia el formulario al terminar la
 * acción, y un error del servidor no debe borrar lo que ya se escribió.
 */
export function CrearCurso() {
  const [estado, accion, enviando] = useActionState<EstadoPublicacion | null, FormData>(
    crearCurso,
    null,
  );
  const [campos, setCampos] = useState({
    titulo: "",
    codigo: "",
    area: "",
    nivel: "INTRODUCCIÓN",
    icono: "",
    horas: "16",
    precio: "20",
  });
  const cambiar = (clave: keyof typeof campos, valor: string) => setCampos((actual) => ({ ...actual, [clave]: valor }));
  const slug = slugDe(campos.titulo);

  return (
    <form action={accion} className="space-y-6">
      <div>
        <label htmlFor="titulo" className={etiqueta}>
          Título
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          minLength={4}
          value={campos.titulo}
          onChange={(e) => cambiar("titulo", e.target.value)}
          placeholder="Introducción a Matplotlib"
          className={`${claseInput} text-base font-medium`}
        />
        <span className={ayuda}>
          {slug ? (
            <>
              Dirección: <span className="font-mono text-texto-suave">/cursos/{slug}</span>. No cambia después.
            </>
          ) : (
            "La dirección del curso sale del título."
          )}
        </span>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="codigo" className={etiqueta}>
            Código
          </label>
          <input
            id="codigo"
            name="codigo"
            required
            minLength={4}
            maxLength={4}
            pattern="[A-Za-z]{4}"
            value={campos.codigo}
            onChange={(e) => cambiar("codigo", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
            placeholder="INMP"
            autoComplete="off"
            className={`${claseInput} font-mono uppercase tracking-widest`}
          />
          <span className={ayuda}>
            Cuatro letras, único. La revisión se suma sola: <span className="whitespace-nowrap">INMP-0001</span>.
          </span>
        </div>

        <div>
          <label htmlFor="area" className={etiqueta}>
            Área
          </label>
          <select id="area" name="area" required value={campos.area} onChange={(e) => cambiar("area", e.target.value)} className={claseInput}>
            <option value="" disabled>
              Elige una
            </option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="nivel" className={etiqueta}>
            Nivel
          </label>
          <select id="nivel" name="nivel" value={campos.nivel} onChange={(e) => cambiar("nivel", e.target.value)} className={claseInput}>
            {NIVELES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="horas" className={etiqueta}>
              Horas
            </label>
            <input id="horas" name="horas" type="number" min={1} value={campos.horas} onChange={(e) => cambiar("horas", e.target.value)} className={claseInput} />
          </div>
          <div>
            <label htmlFor="precio" className={etiqueta}>
              Precio (S/)
            </label>
            <input id="precio" name="precio" type="number" min={0} step="0.01" value={campos.precio} onChange={(e) => cambiar("precio", e.target.value)} className={claseInput} />
          </div>
        </div>
      </div>

      <fieldset>
        <legend className={etiqueta}>Icono</legend>
        <p className="-mt-1 mb-3 text-xs text-texto-tenue">Obligatorio: el logotipo del producto o el símbolo de la materia.</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {ICONOS_CURSO.map((icono) => {
            const elegido = campos.icono === icono;
            return (
              <label
                key={icono}
                title={icono}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-1 py-2.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-rojo-acento ${
                  elegido ? "border-rojo-acento bg-rojo-tenue text-rojo-acento" : "border-borde text-texto-tenue hover:border-texto-tenue hover:text-texto"
                }`}
              >
                <input
                  type="radio"
                  name="icono"
                  value={icono}
                  required
                  checked={elegido}
                  onChange={() => cambiar("icono", icono)}
                  className="sr-only"
                />
                <Icono nombre={icono} className="size-7" />
                <span className="w-full truncate text-center text-[11px]">{icono}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {estado && !estado.ok && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-rojo-acento">
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          {estado.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-borde pt-5">
        <button
          type="submit"
          disabled={enviando}
          className="inline-flex items-center gap-2 rounded-lg bg-rojo px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover disabled:opacity-50"
        >
          {enviando && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
          {enviando ? "Creando…" : "Crear curso"}
        </button>
        <Link href="/panel/cursos" className="rounded-lg px-3 py-2.5 text-sm text-texto-suave transition-colors hover:text-texto">
          Cancelar
        </Link>
        <span className="text-xs text-texto-tenue">Nace en borrador con una sesión de ejemplo: nadie lo ve hasta que lo publiques.</span>
      </div>
    </form>
  );
}
