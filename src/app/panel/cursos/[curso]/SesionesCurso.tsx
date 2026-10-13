"use client";

import { useRef, useState, useTransition, type KeyboardEvent, type PointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, ChevronRight, FileCog, GripVertical, Loader2, Plus, Undo2 } from "lucide-react";
import type { SesionPanel } from "@/lib/cursos-panel";
import { desplazamiento, destinoArrastre, moverElemento } from "@/lib/ordenar-lista";

type ResultadoAccion = { ok: true; mensaje?: string; archivo?: string } | { ok: false; error: string };

type Arrastre = {
  indice: number;
  destino: number;
  inicioY: number;
  dy: number;
  centros: number[];
  altura: number;
};

/**
 * El contenido del curso: la ficha técnica y las sesiones, cada una con su
 * editor. Las sesiones se ordenan arrastrando el asa o, con el teclado, con
 * las flechas sobre ella; el orden nuevo no se escribe hasta «Guardar orden»,
 * porque renumera las sesiones.
 */
export function SesionesCurso({
  slug,
  sesiones,
  publico,
  crearSesion,
  reordenar,
}: {
  slug: string;
  sesiones: SesionPanel[];
  publico: boolean;
  crearSesion: (slug: string) => Promise<{ ok: true; archivo: string } | { ok: false; error: string }>;
  reordenar: (slug: string, orden: string[]) => Promise<{ ok: true; mensaje: string } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [creando, iniciarCreacion] = useTransition();
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<ResultadoAccion | null>(null);
  const [anuncio, setAnuncio] = useState("");

  const ordenServidor = sesiones.map((s) => s.archivo);
  const claveServidor = ordenServidor.join("|");
  const [orden, setOrden] = useState(ordenServidor);
  // Cuando el servidor trae otro orden (al guardar o al añadir una sesión),
  // la lista local lo adopta.
  const [clavePrevia, setClavePrevia] = useState(claveServidor);
  if (claveServidor !== clavePrevia) {
    setClavePrevia(claveServidor);
    setOrden(ordenServidor);
  }

  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  // Al soltar, cada fila ya está donde la dejó el desplazamiento: si su
  // transformación se animara de vuelta a cero, saltaría desde el hueco viejo.
  const [soltando, setSoltando] = useState(false);
  const filas = useRef(new Map<string, HTMLLIElement>());

  const porArchivo = new Map(sesiones.map((s) => [s.archivo, s]));
  const visibles = orden.map((archivo) => porArchivo.get(archivo)).filter((s): s is SesionPanel => Boolean(s));
  const sucio = orden.join("|") !== claveServidor;

  const anunciar = (archivo: string, posicion: number) => {
    const titulo = porArchivo.get(archivo)?.titulo || archivo;
    setAnuncio(`«${titulo}» pasa a la posición ${posicion + 1} de ${orden.length}.`);
  };

  const nueva = () =>
    iniciarCreacion(async () => {
      setAviso(null);
      const r = await crearSesion(slug).catch(() => ({ ok: false as const, error: "No se pudo confirmar con el servidor." }));
      if (r.ok) router.push(`/panel/cursos/${slug}/archivos/${r.archivo}`);
      else setAviso(r);
    });

  const guardarOrden = async () => {
    setGuardando(true);
    const r = await reordenar(slug, orden).catch(() => ({ ok: false as const, error: "No se pudo confirmar con el servidor." }));
    setGuardando(false);
    setAviso(r);
    if (r.ok) router.refresh();
  };

  const empezar = (evento: PointerEvent<HTMLButtonElement>, indice: number) => {
    if (evento.button !== 0 || guardando) return;
    evento.preventDefault();
    evento.currentTarget.setPointerCapture(evento.pointerId);
    const rectangulos = orden.map((archivo) => filas.current.get(archivo)!.getBoundingClientRect());
    setArrastre({
      indice,
      destino: indice,
      inicioY: evento.pageY,
      dy: 0,
      centros: rectangulos.map((r) => r.top + window.scrollY + r.height / 2),
      altura: rectangulos[indice].height,
    });
  };

  const mover = (evento: PointerEvent<HTMLButtonElement>) => {
    if (!arrastre) return;
    const dy = evento.pageY - arrastre.inicioY;
    const destino = destinoArrastre(arrastre.centros, arrastre.indice, arrastre.centros[arrastre.indice] + dy);
    // Cerca del borde de la ventana, la página se desplaza para seguir arrastrando.
    if (evento.clientY < 72) window.scrollBy(0, -12);
    else if (evento.clientY > window.innerHeight - 72) window.scrollBy(0, 12);
    setArrastre({ ...arrastre, dy, destino });
  };

  const soltar = () => {
    if (!arrastre) return;
    const { indice, destino } = arrastre;
    setSoltando(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setSoltando(false)));
    setArrastre(null);
    if (destino !== indice) {
      setOrden(moverElemento(orden, indice, destino));
      anunciar(orden[indice], destino);
      setAviso(null);
    }
  };

  const conTeclado = (evento: KeyboardEvent<HTMLButtonElement>, indice: number) => {
    const destino = evento.key === "ArrowUp" ? indice - 1 : evento.key === "ArrowDown" ? indice + 1 : null;
    if (destino === null) return;
    evento.preventDefault();
    if (destino < 0 || destino >= orden.length) return;
    setOrden(moverElemento(orden, indice, destino));
    anunciar(orden[indice], destino);
    setAviso(null);
  };

  // Abrir una sesión con el orden sin guardar lo perdería.
  const alAbrir = (evento: React.MouseEvent<HTMLAnchorElement>) => {
    if (sucio && !window.confirm("El nuevo orden no se ha guardado. ¿Abrir la sesión y descartarlo?")) evento.preventDefault();
  };

  const fila =
    "group flex min-w-0 flex-1 items-center gap-3 py-3 pr-4 transition-colors duration-150 hover:bg-superficie focus-visible:bg-superficie focus-visible:outline-none";

  return (
    <section aria-labelledby="titulo-contenido">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="titulo-contenido" className="text-base font-semibold text-texto">
            Contenido
          </h2>
          <p className="mt-0.5 text-xs text-texto-tenue">
            {sesiones.length} {sesiones.length === 1 ? "sesión" : "sesiones"}. Arrastra el asa para cambiar el orden; ábrelas para escribir.
          </p>
        </div>
        <button
          type="button"
          onClick={nueva}
          disabled={creando || sucio}
          title={sucio ? "Guarda o deshaz el orden antes de añadir una sesión" : undefined}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-borde-fuerte bg-fondo px-3 py-2 text-sm font-medium text-texto transition-colors hover:border-rojo-acento hover:text-rojo-acento disabled:opacity-50"
        >
          {creando ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
          {creando ? "Creando…" : "Nueva sesión"}
        </button>
      </div>

      {sucio && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-rojo-acento/50 bg-rojo-tenue px-4 py-3 transition-opacity duration-200 starting:opacity-0">
          <p className="min-w-0 flex-1 text-sm text-texto">
            Nuevo orden sin guardar.
            <span className="block text-xs text-texto-suave">
              Las sesiones se renumeran; sus direcciones no cambian{publico ? " y los alumnos lo ven al guardar" : ""}.
            </span>
          </p>
          <button
            type="button"
            onClick={() => {
              setOrden(ordenServidor);
              setAnuncio("Se recuperó el orden anterior.");
            }}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-texto-suave transition-colors hover:text-texto disabled:opacity-50"
          >
            <Undo2 size={14} aria-hidden="true" />
            Deshacer
          </button>
          <button
            type="button"
            onClick={guardarOrden}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rojo px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover disabled:opacity-50"
          >
            {guardando ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
            {guardando ? "Guardando…" : "Guardar orden"}
          </button>
        </div>
      )}

      {aviso && (
        <p
          role={aviso.ok ? "status" : "alert"}
          className={`mt-3 flex items-start gap-1.5 text-sm ${aviso.ok ? "text-exito" : "text-rojo-acento"}`}
        >
          {aviso.ok ? <Check size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />}
          {aviso.ok ? aviso.mensaje : aviso.error}
        </p>
      )}

      <p className="sr-only" aria-live="assertive">
        {anuncio}
      </p>

      <ul className={`mt-4 rounded-xl border border-borde bg-fondo ${arrastre ? "select-none" : ""}`}>
        <li className="border-b border-borde">
          <Link href={`/panel/cursos/${slug}/archivos/curso.md`} onClick={alAbrir} className={`${fila} rounded-t-xl pl-4`}>
            <FileCog size={18} className="shrink-0 text-texto-tenue transition-colors group-hover:text-rojo-acento" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-texto">Ficha técnica</span>
              <span className="block truncate text-xs text-texto-tenue">curso.md · área, nivel, horas, icono, paquetes y preludio</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-texto-tenue transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
          </Link>
        </li>
        {visibles.map((s, i) => {
          const arrastrada = arrastre?.indice === i;
          const dy = arrastre ? (arrastrada ? arrastre.dy : desplazamiento(i, arrastre.indice, arrastre.destino, arrastre.altura)) : 0;
          const movida = s.numero !== i + 1;
          return (
            <li
              key={s.archivo}
              ref={(nodo) => {
                if (nodo) filas.current.set(s.archivo, nodo);
                else filas.current.delete(s.archivo);
              }}
              style={{ transform: dy ? `translateY(${dy}px)` : undefined }}
              className={`relative flex items-stretch border-b border-borde bg-fondo last:rounded-b-xl last:border-b-0 ${
                arrastrada
                  ? "z-10 rounded-xl shadow-lg shadow-black/20 ring-1 ring-rojo-acento"
                  : soltando
                    ? ""
                    : "transition-transform duration-150 ease-out motion-reduce:transition-none"
              }`}
            >
              <button
                type="button"
                onPointerDown={(e) => empezar(e, i)}
                onPointerMove={mover}
                onPointerUp={soltar}
                onPointerCancel={() => setArrastre(null)}
                onKeyDown={(e) => conTeclado(e, i)}
                aria-label={`Mover «${s.titulo || s.archivo}», posición ${i + 1} de ${visibles.length}. Usa las flechas arriba y abajo.`}
                className={`flex shrink-0 touch-none items-center px-2 text-texto-tenue transition-colors hover:text-texto focus-visible:text-rojo-acento focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-rojo-acento ${
                  arrastrada ? "cursor-grabbing text-rojo-acento" : "cursor-grab"
                }`}
              >
                <GripVertical size={16} aria-hidden="true" />
              </button>
              <Link href={`/panel/cursos/${slug}/archivos/${s.archivo}`} onClick={alAbrir} className={fila}>
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold tabular-nums transition-colors ${
                    movida ? "bg-rojo-tenue text-rojo-acento" : "bg-superficie text-texto-suave group-hover:bg-rojo-tenue group-hover:text-rojo-acento"
                  }`}
                  title={movida ? `Antes era la ${s.numero ?? "?"}` : undefined}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-texto">{s.titulo || "Sin título"}</span>
                  <span className="block truncate text-xs tabular-nums text-texto-tenue">
                    {s.archivo} · {s.palabras.toLocaleString("es-PE")} palabras · {s.secciones}{" "}
                    {s.secciones === 1 ? "sección" : "secciones"} · {s.bloquesCodigo} de código
                    {s.ejercicios > 0 && ` · ${s.ejercicios} ${s.ejercicios === 1 ? "ejercicio" : "ejercicios"}`}
                  </span>
                </span>
                {s.sinSalida > 0 && (
                  <span className="hidden shrink-0 text-xs text-texto-suave sm:inline" title="Bloques de código sin salida">
                    {s.sinSalida} sin salida
                  </span>
                )}
                <ChevronRight size={16} className="shrink-0 text-texto-tenue transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
