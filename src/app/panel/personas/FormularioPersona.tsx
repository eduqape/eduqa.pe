"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, Camera, Check, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { Boton, claseInput, claseInputBase } from "@/components/ui";
import { TelefonoInternacional } from "@/app/perfil/TelefonoInternacional";
import { PAISES, paisPorCodigo } from "@/lib/paises";
import { IconoRed } from "@/components/Iconos";
import { detectarRed, ETIQUETA_RED, REDES_PERSONA, type RedNombre } from "@/lib/redes";
import {
  AYUDA_ESTADO_FICHA,
  ESTADOS_FICHA,
  ETIQUETA_ESTADO_FICHA,
  ETIQUETA_GRUPO,
  ETIQUETA_ROL,
  GRUPOS_PERSONA,
  PESO_MAXIMO_FOTO,
  TIPOS_FOTO,
  estadoFicha,
  iniciales,
  type EstadoFicha,
  type GrupoPersona,
  type RolPersona,
} from "@/lib/personas-tipos";
import type { Persona } from "@/lib/personas";
import { actualizarPersona, crearPersona, type CampoPersona, type EstadoPersona } from "./acciones";

const MAXIMO_BIOGRAFIA = 2000;


const NOMBRE_CAMPO: Record<CampoPersona, string> = {
  rol: "Rol en el equipo",
  nombre: "Nombre",
  titulo_profesional: "Título profesional",
  slug: "Dirección de la ficha",
  correo: "Correo",
  telefono: "Teléfono",
  biografia: "Biografía",
  foto: "Foto",
  redes: "Redes",
  estado: "Estado",
};

/**
 * Una fila de red. `elegida` distingue la red que alguien eligió a mano de la
 * deducida del enlace: la deducida se recalcula al cambiar el enlace, la
 * elegida se respeta.
 */
type FilaRed = { clave: number; red: RedNombre | ""; url: string; elegida: boolean };

type Borrador = {
  nombre: string;
  slug: string;
  slugTocado: boolean;
  titulo_profesional: string;
  correo: string;
  telefono: string;
  pais: string;
  biografia: string;
  estado: EstadoFicha;
  roles: RolPersona[];
  redes: FilaRed[];
};

/** Sin tildes, en minúsculas y con guiones: el mismo criterio que el servidor. */
function aSlug(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function borradorDe(persona?: Persona | null): Borrador {
  if (!persona) {
    return {
      nombre: "",
      slug: "",
      slugTocado: false,
      titulo_profesional: "",
      correo: "",
      telefono: "",
      pais: "",
      biografia: "",
      // Una ficha recién creada suele estar a medias: se guarda sin publicar y
      // se publica cuando está lista. Cambiarlo es un clic en esta misma hoja.
      estado: "oculta",
      // Sin rol marcado de antemano: uno preseleccionado se queda puesto
      // aunque no corresponda, y el error no se nota hasta verlo en la web.
      roles: [],
      redes: [{ clave: 0, red: "", url: "", elegida: false }],
    };
  }

  return {
    nombre: persona.nombre,
    slug: persona.slug,
    slugTocado: true,
    titulo_profesional: persona.titulo_profesional ?? "",
    correo: persona.correo ?? "",
    telefono: persona.telefono ?? "",
    pais: persona.pais ?? "",
    biografia: persona.biografia ?? "",
    estado: estadoFicha(persona),
    roles: persona.roles,
    redes:
      persona.redes.length > 0
        ? persona.redes.map((r, i) => ({
            clave: i,
            red: r.red,
            url: r.url,
            // Solo cuenta como elegida a mano si no es la que se deduciría del
            // enlace; así, al pegar otro enlace en la fila, la red se actualiza.
            elegida: detectarRed(r.url) !== r.red,
          }))
        : [{ clave: 0, red: "", url: "", elegida: false }],
  };
}

/** Lo que cuenta como cambio: sin las claves internas de las filas. */
function huella(b: Borrador): string {
  return JSON.stringify({
    ...b,
    slugTocado: undefined,
    redes: b.redes.filter((r) => r.url.trim()).map((r) => [r.red, r.url.trim()]),
  });
}

function Seccion({
  titulo,
  descripcion,
  icono,
  children,
}: {
  titulo: string;
  descripcion?: string;
  icono?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-texto">
          {icono}
          {titulo}
        </h3>
        {descripcion && <p className="mt-0.5 text-xs leading-relaxed text-texto-tenue">{descripcion}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Etiqueta, control, ayuda y error de un campo, enlazados para el lector de
 * pantalla. Se marca qué es opcional y no qué es obligatorio: son muchos más
 * los opcionales, y así la marca aparece donde se puede saltar.
 */
function CampoFormulario({
  id,
  etiqueta,
  opcional,
  ayuda,
  error,
  extra,
  children,
}: {
  id: string;
  etiqueta: string;
  opcional?: boolean;
  ayuda?: string;
  error?: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-texto">
          {etiqueta}
          {opcional && <span className="ml-1.5 text-xs font-normal text-texto-tenue">Opcional</span>}
        </label>
        {extra}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1 text-xs text-rojo-acento">
          <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="mt-1.5 text-xs text-texto-tenue">
            {ayuda}
          </p>
        )
      )}
    </div>
  );
}

/** Atributos de accesibilidad de un control según tenga error o ayuda. */
function describir(id: string, error?: string, ayuda?: boolean) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined,
  } as const;
}

export function FormularioPersona({
  persona,
  alGuardar,
  alCancelar,
  alCambiar,
}: {
  persona?: Persona | null;
  alGuardar: (resultado: EstadoPersona) => void;
  alCancelar: () => void;
  /** Avisa si hay cambios sin guardar, para pedir confirmación al cerrar. */
  alCambiar: (sucio: boolean) => void;
}) {
  const inicial = useMemo(() => borradorDe(persona), [persona]);
  const [borrador, setBorrador] = useState<Borrador>(inicial);
  const siguienteClave = useRef(inicial.redes.length);

  const entradaFoto = useRef<HTMLInputElement>(null);
  // El formulario vive dentro de un <dialog> modal; las listas desplegables
  // tienen que montarse dentro de él para verse (ver TelefonoInternacional).
  const [formulario, setFormulario] = useState<HTMLFormElement | null>(null);
  const [foto, setFoto] = useState<{ archivo: File; vista: string } | null>(null);
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  const [estado, accion, guardando] = useActionState<EstadoPersona | null, FormData>(
    async (anterior, datos) => {
      try {
        const resultado = persona
          ? await actualizarPersona(anterior, datos)
          : await crearPersona(anterior, datos);
        if (resultado.ok) alGuardar(resultado);
        return resultado;
      } catch {
        return {
          ok: false,
          error: "No pudimos confirmar el guardado. Revisa tu conexión e inténtalo de nuevo; lo escrito sigue aquí.",
        };
      }
    },
    null,
  );

  // El error del servidor se deja de mostrar en cuanto se corrige el campo que
  // lo causó; se guarda qué resultado se descartó en vez de copiarlo a otro
  // estado.
  const [descartado, setDescartado] = useState<EstadoPersona | null>(null);
  const fallo = estado && !estado.ok && estado !== descartado ? estado : null;
  const errorDe = (campo: CampoPersona) => (fallo?.campo === campo ? fallo.error : undefined);
  const corregir = (campo: CampoPersona) => {
    if (fallo?.campo === campo) setDescartado(estado);
  };

  // Lleva el foco al campo con error: en un formulario largo, el aviso del pie
  // no dice dónde mirar.
  useEffect(() => {
    if (!estado || estado.ok || !estado.campo) return;
    const id =
      estado.campo === "redes" && estado.indiceRed !== undefined
        ? `persona-red-${estado.indiceRed}`
        : `persona-${estado.campo}`;
    const control = document.getElementById(id);
    control?.scrollIntoView({ block: "center", behavior: "smooth" });
    control?.focus({ preventScroll: true });
  }, [estado]);

  const slugVisible = borrador.slugTocado ? borrador.slug : aSlug(borrador.nombre);
  const sucio = huella(borrador) !== huella(inicial) || foto !== null || quitarFoto;

  useEffect(() => {
    alCambiar(sucio);
  }, [sucio, alCambiar]);

  useEffect(() => () => {
    if (foto) URL.revokeObjectURL(foto.vista);
  }, [foto]);

  const actualizar = <K extends keyof Borrador>(campo: K, valor: Borrador[K]) =>
    setBorrador((b) => ({ ...b, [campo]: valor }));

  const alternarRol = (rol: RolPersona) => {
    corregir("rol");
    setBorrador((b) => ({
      ...b,
      roles: b.roles.includes(rol) ? b.roles.filter((r) => r !== rol) : [...b.roles, rol],
    }));
  };

  const cambiarRed = (clave: number, cambio: Partial<FilaRed>) => {
    corregir("redes");
    setBorrador((b) => ({
      ...b,
      redes: b.redes.map((fila) => {
        if (fila.clave !== clave) return fila;
        const nueva = { ...fila, ...cambio };
        if (cambio.url !== undefined && !nueva.elegida) nueva.red = detectarRed(nueva.url) ?? "";
        return nueva;
      }),
    }));
  };

  const elegirFoto = (archivo: File | undefined) => {
    corregir("foto");
    setErrorFoto(null);
    if (!archivo) return;
    if (!(TIPOS_FOTO as readonly string[]).includes(archivo.type)) {
      setErrorFoto("La foto tiene que ser JPG, PNG o WEBP.");
      if (entradaFoto.current) entradaFoto.current.value = "";
      return;
    }
    if (archivo.size > PESO_MAXIMO_FOTO) {
      setErrorFoto(`Pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB; el máximo es 2 MB.`);
      if (entradaFoto.current) entradaFoto.current.value = "";
      return;
    }
    setFoto({ archivo, vista: URL.createObjectURL(archivo) });
    setQuitarFoto(false);
  };

  const descartarFoto = () => {
    if (entradaFoto.current) entradaFoto.current.value = "";
    if (foto) {
      setFoto(null);
    } else {
      setQuitarFoto(true);
    }
  };

  const retrato = foto?.vista ?? (quitarFoto ? null : persona?.foto_url ?? null);
  const redesUsadas = new Set(borrador.redes.map((r) => r.red).filter(Boolean));
  const largoBio = borrador.biografia.length;
  const errorGeneral = fallo && !fallo.campo ? fallo.error : null;

  return (
    // React reinicia el formulario tras cada acción; aquí el estado vive en
    // React y un error de validación no debe vaciar selects ni la foto elegida.
    <form
      ref={setFormulario}
      action={accion}
      onReset={(evento) => evento.preventDefault()}
      className="flex h-full flex-col"
    >
      {persona && <input type="hidden" name="id" value={persona.id} />}
      <input type="hidden" name="slug" value={slugVisible} />
      <input type="hidden" name="quitar_foto" value={quitarFoto ? "1" : ""} />

      <div className="flex-1 space-y-9 overflow-y-auto px-6 py-6">
        <Seccion titulo="Datos básicos" descripcion="Lo que se ve primero en la ficha.">
          <CampoFormulario id="persona-nombre" etiqueta="Nombre" error={errorDe("nombre")} ayuda="Tal como debe aparecer en la web.">
            <input
              {...describir("persona-nombre", errorDe("nombre"), true)}
              name="nombre"
              value={borrador.nombre}
              onChange={(e) => {
                corregir("nombre");
                actualizar("nombre", e.target.value);
              }}
              required
              minLength={2}
              maxLength={120}
              autoComplete="off"
              placeholder="Ej.: Ana Ramírez"
              className={claseInput}
            />
          </CampoFormulario>

          <CampoFormulario
            id="persona-titulo_profesional"
            etiqueta="Título profesional"
            opcional
            error={errorDe("titulo_profesional")}
            ayuda="La línea en rojo bajo el nombre."
          >
            <input
              {...describir("persona-titulo_profesional", errorDe("titulo_profesional"), true)}
              name="titulo_profesional"
              value={borrador.titulo_profesional}
              onChange={(e) => {
                corregir("titulo_profesional");
                actualizar("titulo_profesional", e.target.value);
              }}
              maxLength={160}
              placeholder="Ej.: Ingeniera de Sistemas"
              className={claseInput}
            />
          </CampoFormulario>

          {/* Casillas y no un select múltiple: la respuesta natural a "¿qué
              es?" son varias marcas, y un select múltiple nadie lo entiende. */}
          <fieldset
            id="persona-rol"
            tabIndex={-1}
            aria-invalid={errorDe("rol") ? true : undefined}
            aria-describedby={errorDe("rol") ? "persona-rol-error" : "persona-rol-ayuda"}
            className="outline-none"
          >
            <legend className="mb-1.5 text-sm font-medium text-texto">Rol en el equipo</legend>
            <div className="space-y-3">
              {(Object.keys(GRUPOS_PERSONA) as GrupoPersona[]).map((grupo) => (
                <div key={grupo}>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-texto-tenue">
                    {ETIQUETA_GRUPO[grupo]}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {GRUPOS_PERSONA[grupo].map((rol) => {
                      const marcado = borrador.roles.includes(rol);
                      return (
                        <label
                          key={rol}
                          className={`relative inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-rojo-acento ${
                            marcado
                              ? "bg-rojo-tenue text-rojo-acento ring-rojo-acento"
                              : "bg-fondo text-texto-suave ring-borde-fuerte hover:text-texto"
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
                          {marcado && <Check size={12} aria-hidden="true" />}
                          {ETIQUETA_ROL[rol]}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {errorDe("rol") ? (
              <p id="persona-rol-error" className="mt-1.5 flex items-start gap-1 text-xs text-rojo-acento">
                <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
                {errorDe("rol")}
              </p>
            ) : (
              <p id="persona-rol-ayuda" className="mt-1.5 text-xs text-texto-tenue">
                Marca todos los que correspondan. Profesor, ingeniero y director salen en la portada.
              </p>
            )}
          </fieldset>
        </Seccion>

        <Seccion titulo="Foto" descripcion="Opcional. Sin foto se muestran las iniciales.">
          <div className="flex items-center gap-4">
            {retrato ? (
              // Una vista previa local o una foto del bucket: next/image no
              // puede medir ninguna de las dos.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={retrato} alt="" className="size-20 shrink-0 rounded-full object-cover" />
            ) : (
              <span
                aria-hidden="true"
                className="flex size-20 shrink-0 items-center justify-center rounded-full bg-superficie text-xl font-semibold text-texto-suave"
              >
                {iniciales(borrador.nombre) || "?"}
              </span>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <label
                  htmlFor="persona-foto"
                  className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-borde-fuerte bg-fondo px-3 py-2 text-xs font-medium text-texto transition-colors hover:border-rojo-acento hover:text-rojo-acento has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-rojo-acento"
                >
                  <Camera size={14} aria-hidden="true" />
                  {retrato ? "Cambiar foto" : "Elegir foto"}
                  <input
                    ref={entradaFoto}
                    {...describir("persona-foto", errorFoto ?? errorDe("foto"), true)}
                    type="file"
                    name="foto"
                    accept={TIPOS_FOTO.join(",")}
                    onChange={(e) => elegirFoto(e.target.files?.[0])}
                    className="sr-only"
                  />
                </label>
                {retrato && (
                  <button
                    type="button"
                    onClick={descartarFoto}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-texto-suave transition-colors hover:text-rojo-acento"
                  >
                    {foto ? "Descartar la nueva" : "Quitar foto"}
                  </button>
                )}
              </div>
              {errorFoto ?? errorDe("foto") ? (
                <p id="persona-foto-error" className="flex items-start gap-1 text-xs text-rojo-acento">
                  <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
                  {errorFoto ?? errorDe("foto")}
                </p>
              ) : (
                <p id="persona-foto-ayuda" className="text-xs text-texto-tenue">
                  {foto ? `${foto.archivo.name} · se sube al guardar.` : "JPG, PNG o WEBP de hasta 2 MB. Mejor cuadrada."}
                </p>
              )}
            </div>
          </div>
        </Seccion>

        <Seccion titulo="Presentación">
          <CampoFormulario
            id="persona-biografia"
            etiqueta="Biografía"
            opcional
            error={errorDe("biografia")}
            ayuda="Uno o dos párrafos. Deja una línea en blanco entre párrafos."
            extra={
              <span
                className={`text-xs tabular-nums ${largoBio > MAXIMO_BIOGRAFIA * 0.9 ? "text-rojo-acento" : "text-texto-tenue"}`}
                aria-live="polite"
              >
                {largoBio} / {MAXIMO_BIOGRAFIA}
              </span>
            }
          >
            <textarea
              {...describir("persona-biografia", errorDe("biografia"), true)}
              name="biografia"
              value={borrador.biografia}
              onChange={(e) => {
                corregir("biografia");
                actualizar("biografia", e.target.value);
              }}
              rows={6}
              maxLength={MAXIMO_BIOGRAFIA}
              className={`${claseInputBase} w-full resize-y leading-relaxed`}
            />
          </CampoFormulario>
        </Seccion>

        <Seccion
          titulo="Redes y enlaces"
          descripcion="Opcional. Pega el enlace y la red se reconoce sola; puedes cambiarla en el selector."
        >
          <fieldset aria-describedby={errorDe("redes") ? "persona-redes-error" : undefined} className="space-y-2">
            <legend className="sr-only">Redes y enlaces</legend>
            {borrador.redes.map((fila, indice) => {
              const conError = fallo?.campo === "redes" && fallo.indiceRed === indice;
              // Aviso inmediato si la red ya está en una fila anterior; el
              // servidor lo rechazaría igual, pero así se ve antes de guardar.
              const repetida =
                fila.red !== "" && borrador.redes.slice(0, indice).some((otra) => otra.red === fila.red);
              return (
                <div key={fila.clave}>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <span
                      aria-hidden="true"
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-superficie text-texto-suave"
                    >
                      {fila.red ? <IconoRed nombre={fila.red} className="size-4" /> : <Plus size={14} className="text-texto-tenue" />}
                    </span>
                    <input
                      id={`persona-red-${indice}`}
                      name="red_url"
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      value={fila.url}
                      onChange={(e) => cambiarRed(fila.clave, { url: e.target.value })}
                      placeholder="Pega un enlace: linkedin.com/in/…"
                      aria-label={`Enlace ${indice + 1}`}
                      aria-invalid={conError ? true : undefined}
                      className={`${claseInputBase} min-w-0 flex-1 basis-48 ${conError ? "border-rojo-acento" : ""}`}
                    />
                    <select
                      name="red"
                      value={fila.red}
                      onChange={(e) =>
                        cambiarRed(fila.clave, {
                          red: e.target.value as RedNombre | "",
                          elegida: e.target.value !== "",
                        })
                      }
                      aria-label={`Red del enlace ${indice + 1}`}
                      className={`${claseInputBase} w-40 shrink-0`}
                    >
                      <option value="">Detectar</option>
                      {REDES_PERSONA.map((red) => (
                        <option key={red} value={red} disabled={red !== fila.red && redesUsadas.has(red)}>
                          {ETIQUETA_RED[red]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        corregir("redes");
                        setBorrador((b) => ({
                          ...b,
                          redes:
                            b.redes.length > 1
                              ? b.redes.filter((r) => r.clave !== fila.clave)
                              : [{ clave: siguienteClave.current++, red: "", url: "", elegida: false }],
                        }));
                      }}
                      aria-label={`Quitar el enlace ${indice + 1}`}
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg text-texto-tenue transition-colors hover:bg-superficie hover:text-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                  {repetida && (
                    <p className="mt-1 pl-12 text-xs text-amber-700 dark:text-amber-300">
                      Ya hay un enlace de {ETIQUETA_RED[fila.red as RedNombre]}. Deja uno solo o elige otra red.
                    </p>
                  )}
                </div>
              );
            })}
            {errorDe("redes") && (
              <p id="persona-redes-error" className="flex items-start gap-1 text-xs text-rojo-acento">
                <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
                {errorDe("redes")}
              </p>
            )}
          </fieldset>

          {borrador.redes.length < REDES_PERSONA.length && (
            <button
              type="button"
              onClick={() =>
                setBorrador((b) => ({
                  ...b,
                  redes: [...b.redes, { clave: siguienteClave.current++, red: "", url: "", elegida: false }],
                }))
              }
              className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-medium text-texto-suave transition-colors hover:text-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento"
            >
              <Plus size={14} aria-hidden="true" />
              Añadir otro enlace
            </button>
          )}
        </Seccion>

        <Seccion
          titulo="Contacto interno"
          icono={<Lock size={13} className="text-texto-tenue" aria-hidden="true" />}
          descripcion="Opcional. Solo se ve en este panel; nunca aparece en el sitio web."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <CampoFormulario id="persona-correo" etiqueta="Correo" opcional error={errorDe("correo")}>
                <input
                  {...describir("persona-correo", errorDe("correo"))}
                  name="correo"
                  type="email"
                  autoComplete="off"
                  value={borrador.correo}
                  onChange={(e) => {
                    corregir("correo");
                    actualizar("correo", e.target.value);
                  }}
                  placeholder="Ej.: ana@gmail.com"
                  className={claseInput}
                />
              </CampoFormulario>
            </div>

            <CampoFormulario id="persona-telefono" etiqueta="Teléfono" opcional error={errorDe("telefono")}>
              {/* El mismo selector de país y prefijo que el perfil del alumno. */}
              <TelefonoInternacional
                telefonoInicial={persona?.telefono}
                nombrePais={null}
                contenedorLista={formulario}
                idNumero="persona-telefono"
                invalido={Boolean(errorDe("telefono"))}
                descritoPor={errorDe("telefono") ? "persona-telefono-error" : undefined}
                alCambiar={(telefono, codigo) => {
                  corregir("telefono");
                  // Si aún no se eligió país, el del teléfono es la mejor pista.
                  setBorrador((b) => ({
                    ...b,
                    telefono,
                    pais: b.pais || (telefono ? paisPorCodigo(codigo)?.nombre ?? "" : ""),
                  }));
                }}
              />
            </CampoFormulario>

            <CampoFormulario id="persona-pais" etiqueta="País" opcional>
              <select
                id="persona-pais"
                name="pais"
                value={borrador.pais}
                onChange={(e) => actualizar("pais", e.target.value)}
                className={claseInput}
              >
                <option value="">Sin indicar</option>
                {/* Un país escrito a mano antes de que hubiera lista no se pierde. */}
                {borrador.pais && !PAISES.some((p) => p.nombre === borrador.pais) && (
                  <option value={borrador.pais}>{borrador.pais}</option>
                )}
                {PAISES.map((pais) => (
                  <option key={pais.codigo} value={pais.nombre}>
                    {pais.nombre}
                  </option>
                ))}
              </select>
            </CampoFormulario>
          </div>
        </Seccion>

        <Seccion
          titulo="¿Se muestra en el sitio web?"
          descripcion="El sitio web es lo que ve cualquier visitante en la página /equipo y en la portada."
        >
          <fieldset id="persona-estado" tabIndex={-1} className="grid gap-2 outline-none sm:grid-cols-3">
            <legend className="sr-only">Estado de la ficha</legend>
            {ESTADOS_FICHA.map((opcion) => {
              const elegido = borrador.estado === opcion;
              return (
                <label
                  key={opcion}
                  className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-rojo-acento ${
                    elegido ? "border-rojo-acento bg-rojo-tenue" : "border-borde-fuerte hover:border-texto-tenue"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-texto">
                    <input
                      type="radio"
                      name="estado"
                      value={opcion}
                      checked={elegido}
                      onChange={() => actualizar("estado", opcion)}
                      className="size-3.5 accent-rojo"
                    />
                    {ETIQUETA_ESTADO_FICHA[opcion]}
                  </span>
                  <span className="text-xs leading-snug text-texto-tenue">{AYUDA_ESTADO_FICHA[opcion]}</span>
                </label>
              );
            })}
          </fieldset>
        </Seccion>

        <details className="group rounded-lg" open={Boolean(errorDe("slug"))}>
          <summary className="cursor-pointer select-none text-sm font-medium text-texto-suave transition-colors hover:text-texto">
            Opciones avanzadas
          </summary>
          <div className="mt-4">
            <CampoFormulario
              id="persona-slug"
              etiqueta="Dirección de la ficha"
              error={errorDe("slug")}
              ayuda={`Enlace: /equipo#${slugVisible || "…"}. Se genera desde el nombre; cámbiala solo si choca con otra.`}
            >
              <input
                {...describir("persona-slug", errorDe("slug"), true)}
                value={slugVisible}
                onChange={(e) => {
                  corregir("slug");
                  setBorrador((b) => ({ ...b, slug: e.target.value, slugTocado: true }));
                }}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                spellCheck={false}
                autoComplete="off"
                className={`${claseInput} font-mono text-xs`}
              />
            </CampoFormulario>
          </div>
        </details>
      </div>

      <div className="border-t border-borde bg-fondo px-6 py-4">
        {errorGeneral && (
          <p role="alert" className="mb-3 flex items-start gap-1.5 text-xs leading-snug text-rojo-acento">
            <AlertCircle size={14} className="mt-px shrink-0" aria-hidden="true" />
            {errorGeneral}
          </p>
        )}
        {fallo?.campo && (
          <p role="alert" className="mb-3 flex items-start gap-1.5 text-xs leading-snug text-rojo-acento">
            <AlertCircle size={14} className="mt-px shrink-0" aria-hidden="true" />
            Revisa «{NOMBRE_CAMPO[fallo.campo]}»: {fallo.error}
          </p>
        )}
        <div className="flex items-center justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={alCancelar} disabled={guardando} className="px-4 py-2.5">
            Cancelar
          </Boton>
          <Boton type="submit" disabled={guardando || (Boolean(persona) && !sucio)} className="px-5 py-2.5">
            {guardando && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {guardando
              ? "Guardando…"
              : persona
                ? sucio
                  ? "Guardar cambios"
                  : "Sin cambios"
                : borrador.estado === "publicada"
                  ? "Agregar y mostrar en la web"
                  : "Agregar persona"}
          </Boton>
        </div>
      </div>
    </form>
  );
}
