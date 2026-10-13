"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  ImagePlus,
  Info,
  Loader2,
  PencilLine,
  Trash2,
} from "lucide-react";
import type { ResultadoArchivo } from "../../../acciones";
import type { Vista } from "../../../render-vista";

export type AccionesEditor = {
  guardar: (slug: string, archivo: string, contenido: string, base: string) => Promise<ResultadoArchivo>;
  previsualizar: (slug: string, archivo: string, contenido: string) => Promise<Vista>;
  eliminar: (slug: string, archivo: string) => Promise<{ ok: boolean; error?: string }>;
  subirImagen: (slug: string, datos: FormData) => Promise<{ ok: true; ruta: string } | { ok: false; error: string }>;
};

type Vecina = { archivo: string; etiqueta: string } | null;

type Aviso = { tipo: "ok" | "error" | "aviso"; texto: string };

const FALLO_RED = "No se pudo confirmar con el servidor. Revisa tu conexión; lo escrito sigue aquí.";

/** Vallas que no son código: salidas, ejercicios, diagramas y datos de una ejecución. */
const NO_CODIGO = new Set([
  "salida", "preludio", "ejercicio", "opcion-multiple", "verdadero-falso", "relacionar",
  "ordenar", "archivo", "entrada", "venn", "escena",
]);

/** Cuenta lo que se ve en el índice: encabezados y bloques de código fuera de las vallas. */
function medir(texto: string) {
  let enValla = false;
  let secciones = 0;
  let codigo = 0;
  for (const linea of texto.split("\n")) {
    const valla = linea.match(/^(`{3,}|~{3,})\s*([\w+-]*)/);
    if (valla) {
      if (!enValla && valla[2] && !NO_CODIGO.has(valla[2])) codigo++;
      enValla = !enValla;
      continue;
    }
    if (!enValla && /^#{1,3}\s+\S/.test(linea)) secciones++;
  }
  return { palabras: texto.trim().split(/\s+/).filter(Boolean).length, secciones, codigo };
}

/** Primer carácter después del encabezado `---`: ahí empieza lo que se puede editar libremente. */
function finCabecera(texto: string): number {
  if (!texto.startsWith("---")) return 0;
  const cierre = texto.indexOf("\n---", 3);
  if (cierre === -1) return 0;
  const salto = texto.indexOf("\n", cierre + 4);
  return salto === -1 ? texto.length : salto + 1;
}

/**
 * Editor de un archivo del curso: la ficha o una sesión.
 *
 * Guarda solo este archivo, pero el servidor valida el curso entero con él
 * dentro antes de escribir. Si alguien guardó otra versión mientras tanto, el
 * guardado se rechaza y el texto se queda aquí para no perder ninguna de las dos.
 */
export function EditorArchivo({
  slug,
  archivo,
  etiqueta,
  estadoCurso,
  contenido,
  huella: huellaInicial,
  anterior,
  siguiente,
  acciones,
}: {
  slug: string;
  archivo: string;
  etiqueta: string;
  estadoCurso: string;
  contenido: string;
  huella: string;
  anterior: Vecina;
  siguiente: Vecina;
  acciones: AccionesEditor;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(contenido);
  const [guardado, setGuardado] = useState(contenido);
  const [huella, setHuella] = useState(huellaInicial);
  const [pestana, setPestana] = useState<"escribir" | "vista">("escribir");
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [conflicto, setConflicto] = useState(false);
  const [vista, setVista] = useState<{ texto: string; resultado: Vista } | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  // El guardado no va en una transición: su estado pendiente seguiría activo
  // mientras se refresca la página y bloquearía un Ctrl+S inmediatamente
  // posterior al resultado.
  const [guardando, setGuardando] = useState(false);
  const [cargandoVista, iniciarVista] = useTransition();
  const [subiendo, iniciarSubida] = useTransition();
  const [eliminando, iniciarEliminacion] = useTransition();

  const area = useRef<HTMLTextAreaElement>(null);
  const selectorImagen = useRef<HTMLInputElement>(null);
  // Si nunca se colocó el cursor, la imagen va al final y no en la posición 0,
  // que es la del encabezado.
  const cursorElegido = useRef(false);

  const sucio = texto !== guardado;
  const esFicha = archivo === "curso.md";
  const publico = estadoCurso === "publico";
  const medidas = useMemo(() => medir(texto), [texto]);

  const guardar = async () => {
    if (guardando || !sucio) return;
    const enviado = texto;
    setGuardando(true);
    const r = await acciones.guardar(slug, archivo, enviado, huella).catch(
      (): ResultadoArchivo => ({ ok: false, error: FALLO_RED }),
    );
    setGuardando(false);
    if (r.ok) {
      setGuardado(enviado);
      setHuella(r.huella);
      setConflicto(false);
      setAviso(r.aviso ? { tipo: "aviso", texto: `${r.mensaje} ${r.aviso}` } : { tipo: "ok", texto: r.mensaje });
    } else {
      setConflicto(Boolean(r.conflicto));
      setAviso({ tipo: "error", texto: r.error });
    }
  };

  const verVista = () => {
    setPestana("vista");
    if (vista?.texto === texto) return;
    const enviado = texto;
    iniciarVista(async () => {
      const resultado = await acciones.previsualizar(slug, archivo, enviado).catch(
        (): Vista => ({ ok: false, error: FALLO_RED }),
      );
      setVista({ texto: enviado, resultado });
    });
  };

  const insertarImagen = (archivoImagen: File) => {
    const datos = new FormData();
    datos.set("imagen", archivoImagen);
    iniciarSubida(async () => {
      const r = await acciones.subirImagen(slug, datos).catch(() => ({ ok: false as const, error: FALLO_RED }));
      if (!r.ok) {
        setAviso({ tipo: "error", texto: r.error });
        return;
      }
      const campo = area.current;
      const actual = campo?.value ?? texto;
      const minimo = finCabecera(actual);
      let inicio = cursorElegido.current && campo ? campo.selectionStart : actual.length;
      let fin = cursorElegido.current && campo ? campo.selectionEnd : actual.length;
      // Dentro del encabezado YAML la cita rompería el archivo.
      if (inicio < minimo) inicio = fin = minimo;
      const antes = actual.slice(0, inicio);
      const despues = actual.slice(fin);
      // La imagen es un párrafo propio: separada por líneas en blanco.
      const previo = antes === "" || antes.endsWith("\n\n") ? "" : antes.endsWith("\n") ? "\n" : "\n\n";
      const siguiente = despues.startsWith("\n\n") ? "" : despues.startsWith("\n") ? "\n" : "\n\n";
      const descripcion = "Describe aquí la imagen";
      const marca = `${previo}![${descripcion}](${r.ruta})${siguiente}`;
      setTexto(antes + marca + despues);
      setAviso({ tipo: "ok", texto: `Imagen subida como ${r.ruta}. Cambia la descripción por lo que muestra.` });
      // El cursor queda seleccionando la descripción, lista para escribirla.
      const desde = antes.length + previo.length + 2;
      requestAnimationFrame(() => {
        campo?.focus();
        campo?.setSelectionRange(desde, desde + descripcion.length);
      });
    });
  };

  const eliminar = () =>
    iniciarEliminacion(async () => {
      const r = await acciones.eliminar(slug, archivo).catch(() => ({ ok: false, error: FALLO_RED }));
      if (r.ok) router.push(`/panel/cursos/${slug}?eliminada=${encodeURIComponent(etiqueta)}`);
      else {
        setConfirmando(false);
        setAviso({ tipo: "error", texto: r.error ?? "No se pudo eliminar." });
      }
    });

  // Ctrl/Cmd + S guarda, como en cualquier editor.
  const guardarRef = useRef(guardar);
  useEffect(() => {
    guardarRef.current = guardar;
  });
  useEffect(() => {
    const atajo = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "s") {
        evento.preventDefault();
        guardarRef.current();
      }
    };
    window.addEventListener("keydown", atajo);
    return () => window.removeEventListener("keydown", atajo);
  }, []);

  // Cerrar o recargar la pestaña con cambios pendientes pide confirmación.
  useEffect(() => {
    if (!sucio) return;
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  // La navegación interna no dispara beforeunload: se pregunta aquí.
  const alSalir = (evento: MouseEvent<HTMLAnchorElement>) => {
    if (sucio && !window.confirm("Tienes cambios sin guardar. ¿Salir sin guardarlos?")) evento.preventDefault();
  };

  const estadoGuardado = guardando
    ? { texto: "Guardando…", clase: "text-texto-suave" }
    : sucio
      ? { texto: "Cambios sin guardar", clase: "text-texto-suave" }
      : { texto: "Todo guardado", clase: "text-texto-tenue" };

  return (
    <div>
      {/* Barra fija: el estado y los botones siguen a mano en una sesión larga. */}
      <div className="sticky top-0 z-20 -mx-6 border-b border-borde bg-fondo/95 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            href={`/panel/cursos/${slug}`}
            onClick={alSalir}
            aria-label="Volver al curso"
            className="rounded-lg p-1.5 text-texto-tenue transition-colors hover:bg-superficie hover:text-texto"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1 basis-40">
            <p className="truncate text-sm font-semibold text-texto">{etiqueta}</p>
            <p className={`flex items-center gap-1.5 whitespace-nowrap text-xs transition-colors ${estadoGuardado.clase}`} aria-live="polite">
              {guardando ? (
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              ) : sucio ? (
                <span className="size-1.5 rounded-full bg-rojo-acento" aria-hidden="true" />
              ) : (
                <Check size={12} aria-hidden="true" />
              )}
              {estadoGuardado.texto}
              <span className="hidden truncate text-texto-tenue sm:inline">· {archivo}</span>
            </p>
          </div>

          <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
          <div role="tablist" aria-label="Modo del editor" className="flex rounded-lg border border-borde bg-fondo p-0.5">
            {(
              [
                ["escribir", "Escribir", PencilLine],
                ["vista", "Vista previa", Eye],
              ] as const
            ).map(([valor, nombre, IconoModo]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                id={`pestana-${valor}`}
                aria-selected={pestana === valor}
                aria-controls={`panel-${valor}`}
                onClick={() => (valor === "vista" ? verVista() : setPestana("escribir"))}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  pestana === valor ? "bg-rojo-tenue text-rojo-acento" : "text-texto-suave hover:text-texto"
                }`}
              >
                <IconoModo size={13} aria-hidden="true" />
                {nombre}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={guardar}
            disabled={guardando || !sucio}
            title="Ctrl + S"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-rojo px-4 py-2 text-sm font-semibold text-white transition-[background-color,opacity] hover:bg-rojo-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
            Guardar
            {publico && <span className="hidden sm:inline"> y publicar</span>}
          </button>
          </div>
        </div>

        {aviso && (
          <p
            role={aviso.tipo === "error" ? "alert" : "status"}
            className={`mt-2.5 flex items-start gap-1.5 text-sm transition-opacity starting:opacity-0 ${
              aviso.tipo === "error" ? "text-rojo-acento" : aviso.tipo === "aviso" ? "text-texto" : "text-exito"
            }`}
          >
            {aviso.tipo === "error" ? (
              <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            ) : aviso.tipo === "aviso" ? (
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-rojo-acento" aria-hidden="true" />
            ) : (
              <Check size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            )}
            <span>
              {aviso.texto}
              {conflicto && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(texto).then(() => setAviso({ tipo: "aviso", texto: "Tu versión está en el portapapeles. Recarga la página para ver la otra." }))}
                    className="font-semibold underline underline-offset-2"
                  >
                    Copiar mi versión
                  </button>
                </>
              )}
            </span>
          </p>
        )}
      </div>

      {publico && (
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-texto-suave">
          <Info size={14} className="mt-0.5 shrink-0 text-texto-tenue" aria-hidden="true" />
          Este curso es público: lo que guardes llega a los alumnos al instante. Para cambios grandes,
          pásalo a borrador desde su ficha y vuelve a publicarlo al terminar.
        </p>
      )}

      <div id="panel-escribir" role="tabpanel" aria-labelledby="pestana-escribir" hidden={pestana !== "escribir"} className="mt-4">
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-texto-tenue">
          <span className="tabular-nums">
            {medidas.palabras} palabras · {medidas.secciones} {medidas.secciones === 1 ? "sección" : "secciones"} ·{" "}
            {medidas.codigo} {medidas.codigo === 1 ? "bloque" : "bloques"} de código
          </span>
          {!esFicha && (
            <button
              type="button"
              onClick={() => selectorImagen.current?.click()}
              disabled={subiendo}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-borde-fuerte px-2.5 py-1.5 font-medium text-texto-suave transition-colors hover:border-rojo-acento hover:text-rojo-acento disabled:opacity-50"
            >
              {subiendo ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <ImagePlus size={13} aria-hidden="true" />}
              {subiendo ? "Subiendo…" : "Insertar imagen"}
            </button>
          )}
          <input
            ref={selectorImagen}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.gif"
            className="hidden"
            onChange={(e) => {
              const elegido = e.target.files?.[0];
              e.target.value = "";
              if (elegido) insertarImagen(elegido);
            }}
          />
        </div>
        <label htmlFor="contenido-archivo" className="sr-only">
          Contenido de {etiqueta} en Markdown
        </label>
        <textarea
          id="contenido-archivo"
          ref={area}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onSelect={() => {
            cursorElegido.current = true;
          }}
          spellCheck
          className="min-h-[65vh] w-full resize-y rounded-xl border border-borde-fuerte bg-fondo px-4 py-3 font-mono text-[13px] leading-relaxed text-texto outline-none transition-colors focus:border-rojo-acento focus:ring-1 focus:ring-rojo-acento"
        />
        <details className="mt-2 rounded-lg text-xs text-texto-suave">
          <summary className="cursor-pointer py-1 font-medium">Formato de {esFicha ? "la ficha" : "una sesión"}</summary>
          <dl className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-[auto_1fr]">
            {(esFicha
              ? [
                  ["titulo, resumen", "Lo que se lee en el catálogo"],
                  ["area, nivel, horas", "Clasificación del curso"],
                  ["icono", "Obligatorio: python, bash, libro, datos…"],
                  ["paquetes", "Paquetes de PyPI para ejecutar el código"],
                  ["precio, estado, acceso_libre, orden, ruta", "Se aplican al guardar, como al importar"],
                  ["slug, codigo", "Fijos: no se cambian desde aquí"],
                ]
              : [
                  ["numero, titulo", "Obligatorios en el encabezado ---"],
                  ["# / ## / ###", "Abren sección y entran en el índice"],
                  ["```python … ```", "Bloque de código"],
                  ["```salida … ```", "Salida real, obtenida ejecutando el código"],
                  ["> Nota: …", "Precisión técnica plegada"],
                  ["> Doc: [título](url)", "Cita a la documentación oficial"],
                  ["![texto](imagenes/x.png)", "Imagen del curso (usa «Insertar imagen»)"],
                ]
            ).map(([sintaxis, efecto]) => (
              <div key={sintaxis} className="contents">
                <dt className="font-mono text-texto">{sintaxis}</dt>
                <dd className="text-texto-tenue">{efecto}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>

      <div
        id="panel-vista"
        role="tabpanel"
        aria-labelledby="pestana-vista"
        hidden={pestana !== "vista"}
        aria-busy={cargandoVista}
        className="mt-4"
      >
        {cargandoVista || !vista ? (
          <div className="space-y-3 rounded-xl border border-borde bg-fondo p-6" aria-label="Preparando la vista previa">
            <div className="h-3 w-24 animate-pulse rounded bg-borde motion-reduce:animate-none" />
            <div className="h-7 w-2/3 animate-pulse rounded bg-borde motion-reduce:animate-none" />
            <div className="h-4 w-full animate-pulse rounded bg-borde motion-reduce:animate-none" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-borde motion-reduce:animate-none" />
            <div className="h-28 w-full animate-pulse rounded-lg bg-borde motion-reduce:animate-none" />
          </div>
        ) : !vista.resultado.ok ? (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-rojo-acento/40 bg-rojo-tenue p-4 text-sm text-rojo-acento">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Así no se puede publicar</p>
              <p className="mt-1 text-texto">{vista.resultado.error}</p>
            </div>
          </div>
        ) : (
          <div className="transition-opacity duration-200 starting:opacity-0">
            {vista.resultado.avisos.length > 0 && (
              <ul className="mb-4 space-y-1.5 text-sm text-texto-suave">
                {vista.resultado.avisos.map((texto) => (
                  <li key={texto} className="flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rojo-acento" aria-hidden="true" />
                    {texto}
                  </li>
                ))}
              </ul>
            )}
            <div className="rounded-xl border border-borde bg-fondo p-6 sm:p-8">{vista.resultado.vista}</div>
            <p className="mt-2 text-xs text-texto-tenue">
              Vista previa sin guardar. Las consolas para ejecutar código aparecen en la lección publicada.
            </p>
          </div>
        )}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-borde pt-6">
        {anterior ? (
          <Link
            href={`/panel/cursos/${slug}/archivos/${anterior.archivo}`}
            onClick={alSalir}
            className="inline-flex min-w-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-texto-suave transition-colors hover:bg-superficie hover:text-texto"
          >
            <ArrowLeft size={15} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{anterior.etiqueta}</span>
          </Link>
        ) : (
          <span />
        )}
        {siguiente && (
          <Link
            href={`/panel/cursos/${slug}/archivos/${siguiente.archivo}`}
            onClick={alSalir}
            className="ml-auto inline-flex min-w-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-texto-suave transition-colors hover:bg-superficie hover:text-texto"
          >
            <span className="truncate">{siguiente.etiqueta}</span>
            <ArrowRight size={15} className="shrink-0" aria-hidden="true" />
          </Link>
        )}
      </div>

      {!esFicha && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-borde p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-texto">Eliminar esta sesión</p>
            <p className="mt-0.5 text-xs text-texto-tenue">
              Desaparece del temario. El avance que los alumnos guardaron en ella deja de contar.
            </p>
          </div>
          {confirmando ? (
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={eliminar}
                disabled={eliminando}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rojo px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-rojo-hover disabled:opacity-50"
              >
                {eliminando && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
                Sí, eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="rounded-lg px-3 py-2 text-xs text-texto-suave transition-colors hover:text-texto"
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-borde-fuerte px-3 py-2 text-xs font-medium text-texto-suave transition-colors hover:border-rojo-acento hover:text-rojo-acento"
            >
              <Trash2 size={13} aria-hidden="true" />
              Eliminar sesión
            </button>
          )}
        </div>
      )}
    </div>
  );
}
