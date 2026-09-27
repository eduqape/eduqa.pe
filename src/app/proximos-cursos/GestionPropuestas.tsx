"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ChevronDown,
  Plus,
  Save,
  Upload,
  X,
} from "lucide-react";
import { IconoPropuesta } from "@/components/IconoPropuesta";
import { claseInput, claseInputBase } from "@/components/ui";
import {
  agregarOpcionCatalogo,
  actualizarPropuesta,
  cargarIconoCatalogo,
  crearPropuesta,
} from "./gestion-acciones";

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

type OpcionCatalogo = {
  valor: string;
  svg: string | null;
};

type Catalogos = {
  niveles: OpcionCatalogo[];
  areas: OpcionCatalogo[];
  iconos: OpcionCatalogo[];
};

type PropuestaInterna = {
  id: string;
  titulo: string;
  subtitulo: string;
  precio: number;
  icono: string;
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

const PASOS = ["Información", "Clasificación", "Publicación"] as const;
type CampoValidable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function capitalizar(valor: string) {
  return valor ? valor.charAt(0).toLocaleUpperCase("es-PE") + valor.slice(1) : valor;
}

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
  campo.addEventListener("animationend", () => campo.classList.remove(clase), { once: true });
}

function pasoDe(campo: CampoValidable) {
  const contenedor = campo.closest<HTMLElement>("[data-paso]");
  return Number(contenedor?.dataset.paso ?? 0);
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
  catalogos,
  onCatalogos,
  onCancelar,
}: {
  propuesta?: PropuestaInterna;
  catalogos: Catalogos;
  onCatalogos: (catalogos: Catalogos) => void;
  onCancelar?: () => void;
}) {
  const [paso, setPaso] = useState(0);
  const [iconoSeleccionado, setIconoSeleccionado] = useState(
    propuesta?.icono ?? catalogos.iconos[0]?.valor ?? "libro",
  );
  const [nuevoNivel, setNuevoNivel] = useState("");
  const [nuevaArea, setNuevaArea] = useState("");
  const [nombreIcono, setNombreIcono] = useState("");
  const [archivoIcono, setArchivoIcono] = useState<File | null>(null);
  const [mensajeCatalogo, setMensajeCatalogo] = useState<string | null>(null);
  const [guardandoCatalogo, iniciarCatalogo] = useTransition();
  const esEdicion = Boolean(propuesta);

  function camposDelPaso(form: HTMLFormElement, indice: number) {
    return Array.from(
      form.querySelectorAll(
        `[data-paso="${indice}"] input, [data-paso="${indice}"] textarea, [data-paso="${indice}"] select`,
      ),
    ).filter(esCampoValidable);
  }

  function avanzar(form: HTMLFormElement) {
    const invalido = camposDelPaso(form, paso).find((campo) => !campo.validity.valid);
    if (!invalido) {
      setPaso((actual) => Math.min(actual + 1, PASOS.length - 1));
      return;
    }
    animarCampo(invalido);
    invalido.focus({ preventScroll: false });
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    const form = evento.currentTarget;
    const campos = Array.from(form.elements).filter(esCampoValidable);
    const invalido = campos.find((campo) => !campo.validity.valid);
    if (!invalido) return;

    evento.preventDefault();
    setPaso(pasoDe(invalido));
    requestAnimationFrame(() => {
      animarCampo(invalido);
      invalido.focus({ preventScroll: false });
    });
  }

  function agregarTexto(tipo: "nivel" | "area", valor: string) {
    iniciarCatalogo(async () => {
      try {
        const item = await agregarOpcionCatalogo(tipo, valor);
        onCatalogos({
          ...catalogos,
          niveles:
            tipo === "nivel" ? [...catalogos.niveles, item] : catalogos.niveles,
          areas: tipo === "area" ? [...catalogos.areas, item] : catalogos.areas,
        });
        if (tipo === "nivel") setNuevoNivel("");
        else setNuevaArea("");
        setMensajeCatalogo(`${tipo === "nivel" ? "Nivel" : "Área"} agregado.`);
      } catch (error) {
        setMensajeCatalogo(error instanceof Error ? error.message : "No se pudo agregar.");
      }
    });
  }

  function cargarIcono() {
    if (!archivoIcono) {
      setMensajeCatalogo("Selecciona un archivo SVG.");
      return;
    }

    iniciarCatalogo(async () => {
      try {
        const data = new FormData();
        data.set("archivo", archivoIcono);
        data.set("nombre", nombreIcono);
        const item = await cargarIconoCatalogo(data);
        onCatalogos({ ...catalogos, iconos: [...catalogos.iconos, item] });
        setIconoSeleccionado(item.valor);
        setArchivoIcono(null);
        setNombreIcono("");
        setMensajeCatalogo("Icono cargado.");
      } catch (error) {
        setMensajeCatalogo(error instanceof Error ? error.message : "No se pudo cargar el icono.");
      }
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
      <input type="hidden" name="icono" value={iconoSeleccionado} />

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

      <div data-paso="1" className={paso === 1 ? "grid gap-5" : "hidden"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-sm font-medium text-texto">Área</span>
            <select
              name="area"
              required
              defaultValue={propuesta?.area ?? catalogos.areas[0]?.valor ?? ""}
              className={claseInput}
            >
              {catalogos.areas.map((area) => (
                <option key={area.valor} value={area.valor}>
                  {area.valor}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1.5 block text-sm font-medium text-texto">Nivel</span>
            <select
              name="nivel"
              required
              defaultValue={propuesta?.nivel ?? catalogos.niveles[0]?.valor ?? "INTRODUCCIÓN"}
              className={claseInput}
            >
              {catalogos.niveles.map((nivel) => (
                <option key={nivel.valor} value={nivel.valor}>
                  {nivel.valor}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={nuevaArea}
              onChange={(evento) => setNuevaArea(evento.target.value)}
              placeholder="Nueva área"
              className={claseInput}
            />
            <button
              type="button"
              disabled={guardandoCatalogo || !nuevaArea.trim()}
              onClick={() => agregarTexto("area", nuevaArea)}
              className="shrink-0 rounded-lg border border-borde px-3 text-sm font-semibold text-texto disabled:opacity-50"
            >
              + Área
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={nuevoNivel}
              onChange={(evento) => setNuevoNivel(evento.target.value)}
              placeholder="Nuevo nivel"
              className={claseInput}
            />
            <button
              type="button"
              disabled={guardandoCatalogo || !nuevoNivel.trim()}
              onClick={() => agregarTexto("nivel", nuevoNivel)}
              className="shrink-0 rounded-lg border border-borde px-3 text-sm font-semibold text-texto disabled:opacity-50"
            >
              + Nivel
            </button>
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-texto">Icono</span>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {catalogos.iconos.map((icono) => {
              const activo = iconoSeleccionado === icono.valor;
              return (
                <button
                  key={icono.valor}
                  type="button"
                  onClick={() => setIconoSeleccionado(icono.valor)}
                  title={capitalizar(icono.valor)}
                  aria-pressed={activo}
                  className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center transition-colors ${
                    activo
                      ? "border-rojo-acento bg-rojo-tenue text-rojo-acento"
                      : "border-borde bg-fondo text-texto-suave hover:border-borde-fuerte"
                  }`}
                >
                  <IconoPropuesta
                    nombre={icono.valor}
                    svg={icono.svg}
                    className="size-6 [&>svg]:size-full"
                  />
                  <span className="max-w-full truncate text-[10px]">
                    {capitalizar(icono.valor)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid gap-2 rounded-xl border border-dashed border-borde p-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              type="text"
              value={nombreIcono}
              onChange={(evento) => setNombreIcono(evento.target.value)}
              placeholder="Nombre del icono"
              className={claseInput}
            />
            <input
              type="file"
              accept=".svg,image/svg+xml"
              onChange={(evento) => setArchivoIcono(evento.target.files?.[0] ?? null)}
              className="block w-full text-xs text-texto-suave file:mr-3 file:rounded-md file:border-0 file:bg-superficie file:px-3 file:py-2 file:text-xs file:font-semibold file:text-texto"
            />
            <button
              type="button"
              disabled={guardandoCatalogo || !archivoIcono}
              onClick={cargarIcono}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-borde px-3 text-sm font-semibold text-texto disabled:opacity-50"
            >
              <Upload size={14} aria-hidden="true" />
              Cargar SVG
            </button>
          </div>

          {mensajeCatalogo && (
            <p className="mt-2 text-xs text-texto-tenue" role="status">
              {mensajeCatalogo}
            </p>
          )}
        </div>
      </div>

      <div data-paso="2" className={paso === 2 ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-texto">Precio estimado</span>
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
          <span className="mb-1.5 block text-sm font-medium text-texto">Prioridad interna</span>
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
          <span className="mb-1.5 block text-sm font-medium text-texto">Slug publicado</span>
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
  catalogosIniciales,
}: {
  propuestas: PropuestaInterna[];
  catalogosIniciales: Catalogos;
}) {
  const [creando, setCreando] = useState(propuestas.length === 0);
  const [catalogos, setCatalogos] = useState(catalogosIniciales);

  return (
    <section
      id="gestion-propuestas"
      className="mt-8 scroll-mt-6 rounded-2xl border border-borde bg-superficie p-5 sm:p-6"
    >
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
          <FormularioPropuesta
            catalogos={catalogos}
            onCatalogos={setCatalogos}
            onCancelar={propuestas.length > 0 ? () => setCreando(false) : undefined}
          />
        </div>
      )}

      {propuestas.length === 0 ? (
        <p className="mt-5 text-center text-sm text-texto-tenue">
          La primera propuesta se crea directamente desde el formulario superior.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {propuestas.map((propuesta) => {
            const svg = catalogos.iconos.find((item) => item.valor === propuesta.icono)?.svg ?? null;
            return (
              <details
                key={propuesta.id}
                className="group rounded-xl border border-borde bg-fondo"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 [&::-webkit-details-marker]:hidden">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-borde bg-superficie">
                      <IconoPropuesta nombre={propuesta.icono} svg={svg} className="size-6 [&>svg]:size-full" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-texto">{propuesta.titulo}</p>
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
                  <FormularioPropuesta
                    propuesta={propuesta}
                    catalogos={catalogos}
                    onCatalogos={setCatalogos}
                  />
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
