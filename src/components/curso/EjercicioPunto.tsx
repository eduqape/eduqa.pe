"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Lightbulb,
  Play,
  X,
} from "lucide-react";
import { ejecutarPython, estadoPython, suscribirsePython } from "@/lib/pyodide";
import { ejecutarFortran } from "@/lib/fortran-web";
import { ejecutarBash } from "@/lib/bash-web";
import { Selector } from "@/components/Selector";
import type {
  Ejercicio,
  EjercicioCodigo,
  EjercicioOpcionMultiple,
  EjercicioOrdenar,
  EjercicioRelacionar,
  EjercicioVerdaderoFalso,
} from "@/lib/cursos";

const HUECO = "___";

function CajaEjercicio({ correcto, children }: { correcto?: boolean; children: ReactNode }) {
  return (
    <Collapsible.Root className="group/ejp my-6 rounded-lg border border-borde bg-superficie">
      <Collapsible.Trigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:text-rojo-acento"
        >
          <ChevronDown
            size={15}
            aria-hidden="true"
            className="shrink-0 text-texto-tenue transition-transform group-data-[state=closed]/ejp:-rotate-90"
          />
          <span className="font-medium">Ejercicio</span>
          <span className="text-xs text-texto-tenue">opcional</span>
          {correcto && <Check size={14} className="ml-auto text-exito" aria-hidden="true" />}
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content className="animar-colapsable overflow-hidden">
        <div className="border-t border-borde px-4 py-4">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

function Pista({ texto }: { texto: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setVisible((valor) => !valor)}
        aria-expanded={visible}
        className="mt-3 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-texto-tenue transition-colors hover:text-rojo-acento"
      >
        <Lightbulb size={12} aria-hidden="true" />
        {visible ? "Ocultar la pista" : "Ver una pista"}
      </button>
      {visible && <p className="mt-2 text-xs leading-relaxed text-texto-suave">{texto}</p>}
    </>
  );
}

function Retroalimentacion({
  acierto,
  explicacion,
}: {
  acierto: boolean | null;
  explicacion: string;
}) {
  if (acierto === null) return null;
  return (
    <div
      role="status"
      className={`mt-4 rounded-lg border p-3 text-sm leading-relaxed ${
        acierto ? "border-borde-fuerte bg-fondo" : "border-rojo-acento/40 bg-rojo-tenue"
      }`}
    >
      <p
        className={`flex items-center gap-1.5 font-medium ${
          acierto ? "text-exito" : "text-rojo-acento"
        }`}
      >
        {acierto ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
        {acierto ? "Correcto" : "Todavía no"}
      </p>
      <p className="mt-1.5 text-texto-suave">{explicacion}</p>
    </div>
  );
}

function EjercicioCodigoPunto({
  ejercicio,
  paquetes,
  preludio,
}: {
  ejercicio: EjercicioCodigo;
  paquetes?: string[];
  preludio?: string;
}) {
  const [respuesta, setRespuesta] = useState("");
  const [resultado, setResultado] = useState<{ acierto: boolean; salida: string } | null>(null);
  const [comprobando, setComprobando] = useState(false);
  const controlador = useRef<AbortController | null>(null);
  useEffect(() => () => controlador.current?.abort(), []);

  const [antes, despues] = ejercicio.plantilla.split(HUECO);

  const comprobar = async () => {
    if (!respuesta.trim() || comprobando) return;
    controlador.current = new AbortController();
    setComprobando(true);
    setResultado(null);

    const codigo = ejercicio.plantilla.replace(HUECO, () => respuesta);
    const { salida, error } =
      ejercicio.lenguaje === "fortran"
        ? await ejecutarFortran(codigo, { signal: controlador.current.signal })
        : ejercicio.lenguaje === "bash"
          ? await ejecutarBash(codigo, { signal: controlador.current.signal })
          : await ejecutarPython(codigo, { aislado: true, paquetes, preludio });

    setComprobando(false);
    setResultado({
      acierto:
        !error &&
        (ejercicio.lenguaje === "fortran"
          ? salida.trim().replace(/\s+/g, " ") === ejercicio.esperado.trim().replace(/\s+/g, " ")
          : salida.trim() === ejercicio.esperado.trim()),
      salida,
    });
  };

  const preparacion = useSyncExternalStore(
    suscribirsePython,
    estadoPython,
    () => "sin-empezar" as const,
  );
  const preparando =
    comprobando &&
    ejercicio.lenguaje !== "fortran" &&
    ejercicio.lenguaje !== "bash" &&
    preparacion !== "listo";

  return (
    <CajaEjercicio correcto={resultado?.acierto}>
      <p className="text-sm leading-relaxed text-texto-suave">{ejercicio.enunciado}</p>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-md bg-fondo p-3 font-mono text-[0.8125rem] leading-relaxed">
        {antes}
        <input
          value={respuesta}
          disabled={comprobando}
          onChange={(evento) => setRespuesta(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              evento.preventDefault();
              void comprobar();
            }
          }}
          aria-label="Completa el hueco"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          size={Math.max(respuesta.length + 1, 6)}
          className="mx-0.5 inline-block border-b-2 border-rojo bg-transparent px-1 text-center font-mono text-[0.8125rem] text-texto focus:border-b-[3px] focus:outline-none"
        />
        {despues}
      </pre>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {comprobando && (ejercicio.lenguaje === "fortran" || ejercicio.lenguaje === "bash") && (
          <button
            type="button"
            onClick={() => controlador.current?.abort()}
            className="rounded border border-borde-fuerte px-3 py-1 text-xs"
          >
            Detener
          </button>
        )}
        <button
          type="button"
          onClick={() => void comprobar()}
          disabled={comprobando || !respuesta.trim()}
          className="flex items-center gap-1.5 rounded-md border border-borde-fuerte bg-fondo px-2.5 py-1 text-xs font-medium text-texto-suave transition-colors hover:border-rojo-acento hover:text-rojo-acento disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play size={12} aria-hidden="true" className={comprobando ? "animate-pulse" : ""} />
          {preparando ? "Cargando el curso…" : comprobando ? "Comprobando…" : "Comprobar"}
        </button>
      </div>
      <Pista texto={ejercicio.pista} />

      {resultado && (
        <div
          role="status"
          className={`mt-3 text-xs font-medium ${
            resultado.acierto ? "text-exito" : "text-rojo-acento"
          }`}
        >
          {resultado.acierto ? "Correcto" : "Todavía no"}
        </div>
      )}

      {resultado && !resultado.acierto && (
        <dl className="mt-2.5 space-y-1 font-mono text-[0.72rem] leading-relaxed">
          <div className="flex gap-2">
            <dt className="shrink-0 text-texto-tenue">Salió</dt>
            <dd className="whitespace-pre-wrap text-texto-suave">{resultado.salida || "nada"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-texto-tenue">Se esperaba</dt>
            <dd className="whitespace-pre-wrap text-texto-suave">{ejercicio.esperado}</dd>
          </div>
        </dl>
      )}
    </CajaEjercicio>
  );
}

function EjercicioVerdaderoFalsoPunto({ ejercicio }: { ejercicio: EjercicioVerdaderoFalso }) {
  const [seleccion, setSeleccion] = useState<boolean | null>(null);
  const acierto = seleccion === null ? null : seleccion === ejercicio.respuesta;
  return (
    <CajaEjercicio correcto={acierto === true}>
      <p className="text-sm leading-relaxed text-texto-suave">{ejercicio.enunciado}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {[
          { valor: true, etiqueta: "Verdadero" },
          { valor: false, etiqueta: "Falso" },
        ].map((opcion) => (
          <button
            key={opcion.etiqueta}
            type="button"
            aria-pressed={seleccion === opcion.valor}
            onClick={() => setSeleccion(opcion.valor)}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              seleccion === opcion.valor
                ? "border-rojo-acento bg-rojo-tenue text-rojo-acento"
                : "border-borde-fuerte bg-fondo hover:border-rojo-acento"
            }`}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>
      <Retroalimentacion acierto={acierto} explicacion={ejercicio.explicacion} />
      <Pista texto={ejercicio.pista} />
    </CajaEjercicio>
  );
}

function EjercicioOpcionMultiplePunto({ ejercicio }: { ejercicio: EjercicioOpcionMultiple }) {
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const acierto = seleccion === null ? null : seleccion === ejercicio.correcta;
  return (
    <CajaEjercicio correcto={acierto === true}>
      <p className="text-sm leading-relaxed text-texto-suave">{ejercicio.enunciado}</p>
      <div className="mt-4 grid gap-2">
        {ejercicio.opciones.map((opcion, indice) => (
          <button
            key={`${indice}-${opcion}`}
            type="button"
            aria-pressed={seleccion === indice}
            onClick={() => setSeleccion(indice)}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
              seleccion === indice
                ? "border-rojo-acento bg-rojo-tenue"
                : "border-borde-fuerte bg-fondo hover:border-rojo-acento"
            }`}
          >
            <span className="font-mono text-xs text-texto-tenue">{indice + 1}.</span>
            <span>{opcion}</span>
          </button>
        ))}
      </div>
      <Retroalimentacion acierto={acierto} explicacion={ejercicio.explicacion} />
      <Pista texto={ejercicio.pista} />
    </CajaEjercicio>
  );
}

function EjercicioOrdenarPunto({ ejercicio }: { ejercicio: EjercicioOrdenar }) {
  const [orden, setOrden] = useState(() => ejercicio.elementos.map((_, indice) => indice));
  const [resultado, setResultado] = useState<boolean | null>(null);

  function mover(posicion: number, desplazamiento: -1 | 1) {
    const destino = posicion + desplazamiento;
    if (destino < 0 || destino >= orden.length) return;
    setOrden((actual) => {
      const siguiente = [...actual];
      [siguiente[posicion], siguiente[destino]] = [siguiente[destino], siguiente[posicion]];
      return siguiente;
    });
    setResultado(null);
  }

  function comprobar() {
    setResultado(
      orden.length === ejercicio.correcta.length &&
        orden.every((valor, indice) => valor === ejercicio.correcta[indice]),
    );
  }

  return (
    <CajaEjercicio correcto={resultado === true}>
      <p className="text-sm leading-relaxed text-texto-suave">{ejercicio.enunciado}</p>
      <ol className="mt-4 space-y-2">
        {orden.map((indiceElemento, posicion) => {
          const texto = ejercicio.elementos[indiceElemento];
          return (
            <li
              key={indiceElemento}
              className="flex items-center gap-3 rounded-lg border border-borde bg-fondo px-3 py-2.5"
            >
              <span className="w-5 shrink-0 text-center font-mono text-xs text-texto-tenue">
                {posicion + 1}
              </span>
              <span className="min-w-0 flex-1 text-sm">{texto}</span>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={posicion === 0}
                  onClick={() => mover(posicion, -1)}
                  aria-label={`Subir «${texto}»`}
                  className="rounded border border-borde p-1.5 text-texto-tenue hover:border-rojo-acento hover:text-rojo-acento disabled:opacity-30"
                >
                  <ArrowUp size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={posicion === orden.length - 1}
                  onClick={() => mover(posicion, 1)}
                  aria-label={`Bajar «${texto}»`}
                  className="rounded border border-borde p-1.5 text-texto-tenue hover:border-rojo-acento hover:text-rojo-acento disabled:opacity-30"
                >
                  <ArrowDown size={14} aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <PieEjercicio pista={ejercicio.pista}>
        <BotonComprobar onClick={comprobar}>Comprobar orden</BotonComprobar>
      </PieEjercicio>
      <Retroalimentacion acierto={resultado} explicacion={ejercicio.explicacion} />
    </CajaEjercicio>
  );
}

/** Fisher-Yates sobre una copia. */
function barajar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Pie de los ejercicios con botón: la pista a la izquierda y, a la derecha, el
 * estado y la acción. El texto de la pista se abre debajo de la franja para no
 * desplazar el botón.
 */
function PieEjercicio({ pista, children }: { pista: string; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-borde pt-3">
        <button
          type="button"
          onClick={() => setVisible((valor) => !valor)}
          aria-expanded={visible}
          className="flex items-center gap-1.5 rounded-md py-1 text-xs font-medium text-texto-tenue transition-colors hover:text-rojo-acento"
        >
          <Lightbulb size={12} aria-hidden="true" />
          {visible ? "Ocultar la pista" : "Ver una pista"}
        </button>
        <div className="ml-auto flex items-center gap-3">{children}</div>
      </div>
      {visible && <p className="mt-2 text-xs leading-relaxed text-texto-suave">{pista}</p>}
    </>
  );
}

function BotonComprobar({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md border border-borde-fuerte bg-fondo px-3 py-1.5 text-xs font-medium text-texto transition-colors hover:border-rojo-acento hover:text-rojo-acento"
    >
      <Check size={13} aria-hidden="true" />
      {children}
    </button>
  );
}

function EjercicioRelacionarPunto({ ejercicio }: { ejercicio: EjercicioRelacionar }) {
  const soluciones = ejercicio.pares.map((par) => par.derecha);
  // Barajar en el inicializador no rompe la hidratación: el cuerpo del
  // ejercicio está plegado y las opciones solo se pintan al abrir el
  // desplegable, así que nada de esto llega al HTML del servidor.
  const [opciones] = useState(() => {
    if (soluciones.length < 2) return soluciones;
    let nuevas = barajar(soluciones);
    while (nuevas.every((opcion, i) => opcion === soluciones[i])) nuevas = barajar(soluciones);
    return nuevas;
  });

  const [selecciones, setSelecciones] = useState(() => ejercicio.pares.map(() => ""));
  const [comprobado, setComprobado] = useState(false);
  const [aviso, setAviso] = useState(false);
  const elegidas = selecciones.filter(Boolean).length;
  const aciertos = ejercicio.pares.filter((par, i) => selecciones[i] === par.derecha).length;
  const todoBien = comprobado && aciertos === ejercicio.pares.length;

  function elegir(indice: number, valor: string) {
    setSelecciones((actual) => actual.map((s, i) => (i === indice ? valor : s)));
    setComprobado(false);
    setAviso(false);
  }

  function comprobar() {
    if (elegidas < ejercicio.pares.length) {
      setAviso(true);
      return;
    }
    setComprobado(true);
  }

  return (
    <CajaEjercicio correcto={todoBien}>
      <p className="text-sm leading-relaxed text-texto-suave">{ejercicio.enunciado}</p>
      <div className="mt-4 space-y-2">
        {ejercicio.pares.map((par, indice) => {
          const estado = !comprobado ? null : selecciones[indice] === par.derecha;
          return (
            <div
              key={par.izquierda}
              className={`grid gap-2 rounded-lg border bg-fondo p-3 transition-colors sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] sm:items-center ${
                estado === null ? "border-borde" : estado ? "border-exito/50" : "border-rojo-acento/60"
              }`}
            >
              <span className="flex items-center justify-between gap-2 text-sm font-medium">
                {par.izquierda}
                {/* En móvil la marca va junto al nombre; desde sm, en su columna. */}
                <span className="sm:hidden">
                  {estado === true && <Check size={16} className="text-exito" aria-hidden="true" />}
                  {estado === false && <X size={16} className="text-rojo-acento" aria-hidden="true" />}
                </span>
              </span>
              <Selector
                valor={selecciones[indice]}
                onCambio={(valor) => elegir(indice, valor)}
                opciones={opciones.map((opcion) => ({ valor: opcion, etiqueta: opcion }))}
                etiqueta={`Relaciona ${par.izquierda}`}
                marcador="Elige una relación"
                className="w-full min-w-0 text-left [&>span:first-child]:min-w-0 [&>span:first-child]:whitespace-normal"
              />
              <span className="hidden w-4 sm:block" aria-hidden={estado === null}>
                {estado === true && <Check size={16} className="text-exito" aria-label="Correcta" />}
                {estado === false && <X size={16} className="text-rojo-acento" aria-label="Incorrecta" />}
              </span>
            </div>
          );
        })}
      </div>

      <PieEjercicio pista={ejercicio.pista}>
        <span className="text-xs text-texto-tenue" aria-live="polite">
          {elegidas} de {ejercicio.pares.length}
        </span>
        <BotonComprobar onClick={comprobar}>Comprobar</BotonComprobar>
      </PieEjercicio>

      {aviso && (
        <p role="alert" className="mt-3 text-xs text-rojo-acento">
          Relaciona todos los elementos antes de comprobar.
        </p>
      )}
      {comprobado && (
        <div
          role="status"
          className={`mt-3 rounded-lg border p-3 text-sm leading-relaxed ${
            todoBien ? "border-borde-fuerte bg-fondo" : "border-rojo-acento/40 bg-rojo-tenue"
          }`}
        >
          <p className={`flex items-center gap-1.5 font-medium ${todoBien ? "text-exito" : "text-rojo-acento"}`}>
            {todoBien ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
            {todoBien
              ? "Correcto"
              : `${aciertos} de ${ejercicio.pares.length} relaciones correctas`}
          </p>
          <p className="mt-1.5 text-texto-suave">
            {todoBien ? ejercicio.explicacion : "Corrige las marcadas en rojo y vuelve a comprobar."}
          </p>
        </div>
      )}
    </CajaEjercicio>
  );
}

export function EjercicioPunto({
  ejercicio,
  paquetes,
  preludio,
}: {
  ejercicio: Ejercicio;
  paquetes?: string[];
  preludio?: string;
}) {
  if (ejercicio.tipo === "verdadero-falso") {
    return <EjercicioVerdaderoFalsoPunto ejercicio={ejercicio} />;
  }
  if (ejercicio.tipo === "opcion-multiple") {
    return <EjercicioOpcionMultiplePunto ejercicio={ejercicio} />;
  }
  if (ejercicio.tipo === "ordenar") {
    return <EjercicioOrdenarPunto ejercicio={ejercicio} />;
  }
  if (ejercicio.tipo === "relacionar") {
    return <EjercicioRelacionarPunto ejercicio={ejercicio} />;
  }
  return <EjercicioCodigoPunto ejercicio={ejercicio} paquetes={paquetes} preludio={preludio} />;
}
