"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ChevronDown,
  Plus,
  Save,
  X,
} from "lucide-react";
import { Icono } from "@/components/Iconos";
import { claseInput, claseInputBase } from "@/components/ui";
import { ICONOS_CURSO, type IconoNombre } from "@/lib/iconos-curso";

const ESTADOS_PROPUESTA = [
  "borrador",
  "en_votacion",
  "priorizado",
  "en_desarrollo",
  "publicado",
  "descartado",
] as const;

type EstadoPropuesta = (typeof ESTADOS_PROPUESTA)[number];

const ETIQUETA_ESTADO: Record<EstadoPropuesta, string> = {
  borrador: "Borrador",
  en_votacion: "En votación",
  priorizado: "Priorizado",
  en_desarrollo: "En desarrollo",
  publicado: "Publicado",
  descartado: "Descartado",
};

type PropuestaInterna = {
  id: string;
  titulo: string;
  subtitulo: string;
  precio: number;
  icono: IconoNombre;
  nivel: string;
  area: string;
  estado: EstadoPropuesta;
  cursoSlug: string | null;
  creadaEn: string;
  votos: number;
  prioridadInterna: number;
  creadoPor: string;
  actualizadaEn: string;
};
import { actualizarPropuesta, crearPropuesta } from "./gestion-acciones";

const NIVELES = ["INTRODUCCIÓN", "INTERMEDIO", "AVANZADO"] as const;
const PASOS = ["Información", "Clasificación", "Publicación"] as const;

type CampoValidable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function esCampoValidable(elemento: Element): elemento is CampoValidable {
  return (
    elemento instanceof HTMLInputElement ||
    elemento instanceof HTMLTextAreaElement ||
    elemento instanceof HTMLSelectElement
  );
}

function animarCampo(campo: CampoValidable) {
  const clase = campo.validity.valueMissing ? "animar-campo-bounce" : "animar-campo-buzz";
  campo.classList.remove("animar-campo-bounce", "animar-campo-buzz");
  void campo.offsetWidth;
  campo.classList.add(clase);
  campo.addEventListener(
    "animationend",
    () => campo.classList.remove(clase),
    { once: true },
  );
}

function pasoDe(campo: CampoValidable) {
  const contenedor = campo.closest<HTMLElement>("[data-paso]");
  return Number(contenedor?.dataset.paso ?? 0);
}

function validarCampos(campos: CampoValidable[]) {
  const invalido = campos.find((campo) => !campo.validity.valid);
  if (!invalido) return null;

  animarCampo(invalido);
  invalido.focus({ preventScroll: false });
  return invalido;
}

function Progreso({ paso }: { paso: number }) {
  return (
    <div className="mb-5 grid grid-cols-3 gap-2" aria-label={`Paso ${paso + 1} de 3`}>
      {PASOS.map((etiqueta, indice) => (
        <div key={etiqueta}>
          <div
            className={`h-1 rounded-full ${
              indice <= paso ? "bg-rojo-acento" : "bg-borde"
            }`}
          />
          <p
            className={`mt-1.5 text-[11px] font-medium ${
              indice === paso ? "text-texto" : "text-texto-tenue"
            }`}
          >
            {indice + 1}. {etiqueta}
          </p>
        </div>
      ))}
    </div>
  );
}

function FormularioPropuesta({
  propuesta,
  onCancelar,
}: {
  propuesta?: PropuestaInterna;
  onCancelar?: () => void;
}) {
  const [paso, setPaso] = useState(0);
  const esEdicion = Boolean(propuesta);

  function camposDelPaso(form: HTMLFormElement, indice: number) {
    return Array.from(
      form.querySelectorAll(`[data-paso="${indice}"] input, [data-paso="${indice}"] textarea, [data-paso="${indice}"] select`),
    ).filter(esCampoValidable);
  }

  function avanzar(form: HTMLFormElement) {
    const invalido = validarCampos(camposDelPaso(form, paso));
    if (!invalido) setPaso((actual) => Math.min(actual + 1, PASOS.length - 1));
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    const form = evento.currentTarget;
    const campos = Array.from(form.elements).filter(esCampoValidable);
    const invalido = campos.find((campo) => !campo.validity.valid);

    if (!invalido) return;

    evento.preventDefault();
    const destino = pasoDe(invalido);
    setPaso(destino);
    requestAnimationFrame(() => {
      animarCampo(invalido);
      invalido.focus({ preventScroll: false });
    });
  }

  return (
    <form
      action={esEdicion ? actualizarPropuesta : crearPropuesta}
      onSubmit={enviar}
      noValidate
      className="mt-5"
    >
      {propuesta && <input type="hidden" name="id" value={propuesta.id} />}

      <Progreso paso={paso} />

      <div data-paso="0" className={paso === 0 ? "grid gap-4" : "hidden"}>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-texto">Título</span>
          <input
            name="titulo"
            required
            minLength={3}
            maxLength={140}
            defaultValue={propuesta?.titulo ?? ""}
            className={claseInput}
            placeholder="Ej. Python para automatización"
          />
        </label>

        <label>
          <span className="mb-1.5 block text-sm font-medium text-texto">Subtítulo</span>
          <textarea
            name="subtitulo"
            maxLength={240}
            rows={3}
            defaultValue={propuesta?.subtitulo ?? ""}
            className={claseInput}
            placeholder="Qué aprenderá o por qué existe esta propuesta."
          />
        </label>
      </div>

      <div data-paso="1" className={paso === 1 ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-texto">Área</span>
          <input
            name="area"
            required
            minLength={2}
            maxLength={80}
            defaultValue={propuesta?.area ?? ""}
            className={claseInput}
            placeholder="Ej. Lenguajes"
          />
        </label>

        <label>
          <span className="mb-1.5 block text-sm font-medium text-texto">Nivel</span>
          <select
            name="nivel"
            defaultValue={propuesta?.nivel ?? "INTRODUCCIÓN"}
            className={claseInput}
          >
            {NIVELES.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel}
              </option>
            ))}
          </select>
        </label>

        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-texto">Icono</span>
          <select
            name="icono"
            defaultValue={propuesta?.icono ?? "libro"}
            className={claseInput}
          >
            {ICONOS_CURSO.map((icono) => (
              <option key={icono} value={icono}>
                {icono}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div data-paso="2" className={paso === 2 ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-texto">
            Precio estimado
          </span>
          <input
            name="precio"
            type="number"
            min="0"
            step="0.01"
            defaultValue={propuesta?.precio ?? 20}
            className={claseInput}
          />
        </label>

        <label>
          <span className="mb-1.5 block text-sm font-medium text-texto">Estado</span>
          <select
            name="estado"
            defaultValue={propuesta?.estado ?? "borrador"}
            className={claseInput}
          >
            {ESTADOS_PROPUESTA.map((estado) => (
              <option key={estado} value={estado}>
                {ETIQUETA_ESTADO[estado]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-sm font-medium text-texto">
            Prioridad interna
          </span>
          <input
            name="prioridadInterna"
            type="number"
            min="0"
            max="100"
            step="1"
            defaultValue={propuesta?.prioridadInterna ?? 0}
            className={claseInput}
          />
        </label>

        <label>
          <span className="mb-1.5 block text-sm font-medium text-texto">
            Slug publicado
          </span>
          <input
            name="cursoSlug"
            defaultValue={propuesta?.cursoSlug ?? ""}
            className={claseInputBase + " w-full font-mono"}
            placeholder="Opcional"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-borde pt-4">
        <div>
          {paso > 0 && (
            <button
              type="button"
              onClick={() => setPaso((actual) => Math.max(actual - 1, 0))}
              className="inline-flex items-center gap-2 rounded-lg border border-borde px-4 py-2 text-sm font-semibold text-texto-suave hover:text-texto"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Anterior
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCancelar && (
            <button
              type="button"
              onClick={onCancelar}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-texto-tenue hover:text-texto"
            >
              <X size={15} aria-hidden="true" />
              Cancelar
            </button>
          )}

          {paso < PASOS.length - 1 ? (
            <button
              type="button"
              onClick={(evento) => avanzar(evento.currentTarget.form!)}
              className="inline-flex items-center gap-2 rounded-lg bg-rojo px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover"
            >
              Siguiente
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-rojo px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover"
            >
              {esEdicion ? <Save size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
              {esEdicion ? "Guardar cambios" : "Crear propuesta"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

export function GestionPropuestas({
  propuestas,
}: {
  propuestas: PropuestaInterna[];
}) {
  const [creando, setCreando] = useState(false);

  return (
    <section id="gestion-propuestas" className="mt-8 scroll-mt-6 rounded-2xl border border-borde bg-superficie p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={17} className="text-rojo-acento" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-texto">
              Gestión de propuestas
            </h2>
            <p className="mt-1 text-xs text-texto-tenue">
              Backlog interno · {propuestas.length} {propuestas.length === 1 ? "propuesta" : "propuestas"}
            </p>
          </div>
        </div>

        {!creando && (
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white hover:bg-rojo-hover"
          >
            <Plus size={16} aria-hidden="true" />
            Nueva propuesta
          </button>
        )}
      </div>

      {creando && (
        <div className="mt-5 rounded-xl border border-borde bg-fondo p-4 sm:p-5">
          <h3 className="text-base font-semibold text-texto">Nueva propuesta</h3>
          <FormularioPropuesta onCancelar={() => setCreando(false)} />
        </div>
      )}

      {propuestas.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-borde p-7 text-center text-sm text-texto-suave">
          Todavía no hay propuestas.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {propuestas.map((propuesta) => (
            <details
              key={propuesta.id}
              className="group rounded-xl border border-borde bg-fondo"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 [&::-webkit-details-marker]:hidden">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-borde bg-superficie">
                    <Icono nombre={propuesta.icono} className="size-6 text-texto-suave" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-texto">
                      {propuesta.titulo}
                    </p>
                    <p className="mt-0.5 text-xs text-texto-tenue">
                      {propuesta.votos} {propuesta.votos === 1 ? "voto" : "votos"} · prioridad {propuesta.prioridadInterna}/100 · {ETIQUETA_ESTADO[propuesta.estado]}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  size={17}
                  className="shrink-0 text-texto-tenue transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="border-t border-borde px-4 pb-5">
                <FormularioPropuesta propuesta={propuesta} />
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
