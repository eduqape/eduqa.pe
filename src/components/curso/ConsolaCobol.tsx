"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { CornerDownRight, Play, RotateCcw, Square } from "lucide-react";
import { ejecutarCobol, estadoCobol, suscribirseCobol, type FaseCobol, type ResultadoCobol } from "@/lib/cobol-web";

const ETIQUETAS: Record<FaseCobol, string> = {
  cargando: "Cargando GnuCOBOL…",
  compilando: "Compilando con cobc…",
  ejecutando: "Ejecutando…",
};

function SalidaReferencia({ salida }: { salida: string }) {
  return (
    <div className="border-t border-borde bg-superficie">
      <div className="flex items-center gap-1.5 px-4 pt-2.5 text-[11px] uppercase tracking-wide text-texto-tenue">
        <CornerDownRight size={12} aria-hidden="true" />
        Salida
      </div>
      <pre className="overflow-x-auto px-4 pb-3.5 pt-1.5 font-mono text-[0.78rem] leading-relaxed text-texto-suave">{salida}</pre>
    </div>
  );
}

export function ConsolaCobol({
  codigo,
  salida,
  entrada = "",
  archivos = {},
  formatoLibre = false,
}: {
  codigo: string;
  salida: string | null;
  entrada?: string;
  archivos?: Record<string, string>;
  formatoLibre?: boolean;
}) {
  const estado = useSyncExternalStore(suscribirseCobol, estadoCobol, () => "sin-empezar" as const);
  const id = useId();
  const [fuente, setFuente] = useState(codigo);
  const [datos, setDatos] = useState(entrada);
  const [ficheros, setFicheros] = useState(archivos);
  const [editando, setEditando] = useState(false);
  const [fase, setFase] = useState<FaseCobol | null>(null);
  const [resultado, setResultado] = useState<ResultadoCobol | null>(null);
  const controlador = useRef<AbortController | null>(null);
  useEffect(() => () => controlador.current?.abort(), []);

  // Si el motor no se pudo cargar, se enseña la salida comprobada del temario.
  if (estado === "error" && !resultado && !fase) return salida ? <SalidaReferencia salida={salida} /> : null;

  async function ejecutar() {
    controlador.current = new AbortController();
    setResultado(null);
    setFase("cargando");
    setResultado(
      await ejecutarCobol(fuente, {
        signal: controlador.current.signal,
        alCambiarFase: setFase,
        entrada: datos,
        archivos: ficheros,
        formato: formatoLibre ? "free" : "fixed",
      }),
    );
    setFase(null);
  }

  const escritos = Object.entries(resultado?.archivos ?? {});
  return (
    <div className="border-t border-borde bg-superficie" data-consola-cobol>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <span className="text-xs font-medium text-texto-suave">GnuCOBOL en el navegador</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!!fase}
            onClick={() => setEditando(!editando)}
            aria-expanded={editando}
            aria-controls={id}
            className="rounded px-2 py-1 text-xs text-texto-suave hover:text-rojo-acento"
          >
            {editando ? "Ocultar editor" : "Editar código"}
          </button>
          {fase ? (
            <button type="button" onClick={() => controlador.current?.abort()} className="flex items-center gap-1 rounded border border-borde-fuerte px-2 py-1 text-xs">
              <Square size={12} />
              Detener
            </button>
          ) : (
            <button type="button" onClick={ejecutar} className="flex items-center gap-1 rounded border border-borde-fuerte bg-fondo px-3 py-1 text-xs font-medium hover:text-rojo-acento">
              <Play size={12} />
              Ejecutar
            </button>
          )}
        </div>
      </div>
      {editando && (
        <div id={id} className="px-4 pb-3">
          <label htmlFor={`${id}-fuente`} className="sr-only">
            Código COBOL
          </label>
          <textarea
            id={`${id}-fuente`}
            value={fuente}
            onChange={(e) => setFuente(e.target.value)}
            disabled={!!fase}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            rows={Math.min(24, fuente.split("\n").length + 1)}
            className="w-full resize-y rounded border border-borde-fuerte bg-fondo p-3 font-mono text-xs leading-relaxed"
          />
          {!formatoLibre && (
            <p className="mt-1 text-[11px] text-texto-tenue">
              Formato fijo: el código empieza en la columna 8 y termina en la 72.
            </p>
          )}
          <button
            type="button"
            disabled={!!fase}
            onClick={() => {
              setFuente(codigo);
              setDatos(entrada);
              setFicheros(archivos);
              setResultado(null);
            }}
            className="mt-2 flex items-center gap-1 text-xs text-texto-suave"
          >
            <RotateCcw size={12} />
            Restaurar código
          </button>
        </div>
      )}
      {(editando || entrada || Object.keys(archivos).length > 0) && (
        // Los datos son parte del ejemplo: abiertos si el bloque trae alguno.
        <details open={Boolean(entrada) || Object.keys(archivos).length > 0} className="px-4 pb-3 text-xs">
          <summary className="cursor-pointer text-texto-suave">Datos de entrada</summary>
          {(editando || entrada) && (
            <label className="mt-2 block">
              Entrada estándar (ACCEPT)
              <textarea value={datos} disabled={!!fase} onChange={(e) => setDatos(e.target.value)} rows={2} className="mt-1 w-full rounded border border-borde-fuerte bg-fondo p-2 font-mono" />
            </label>
          )}
          {Object.entries(ficheros).map(([nombre, texto]) => (
            <label key={nombre} className="mt-2 block">
              {nombre}
              <textarea
                value={texto}
                disabled={!!fase}
                onChange={(e) => setFicheros({ ...ficheros, [nombre]: e.target.value })}
                rows={4}
                className="mt-1 w-full rounded border border-borde-fuerte bg-fondo p-2 font-mono"
              />
            </label>
          ))}
        </details>
      )}
      <div role="status" aria-live="polite" className="px-4 pb-3 text-xs">
        {fase && <p className="text-texto-suave">{ETIQUETAS[fase]}</p>}
        {resultado && !resultado.compilo && (
          <>
            <p className="font-medium text-rojo-acento">{resultado.diagnosticos ? "Error de compilación" : "Error"}</p>
            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono leading-relaxed">{resultado.salida}</pre>
          </>
        )}
        {resultado?.compilo && (
          <>
            {resultado.diagnosticos && (
              <>
                <p className="font-medium text-texto-suave">Avisos del compilador</p>
                <pre className="mb-3 mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono leading-relaxed text-texto-tenue">
                  {resultado.diagnosticos}
                </pre>
              </>
            )}
            <p className={resultado.error ? "font-medium text-rojo-acento" : "font-medium text-texto-suave"}>
              {resultado.error ? "Error en la ejecución" : "Salida"}
              {/* RETURN-CODE es parte de lo que se enseña: se muestra cuando no es 0. */}
              {!resultado.error && resultado.codigo !== 0 && resultado.codigo !== null && (
                <span className="ml-2 font-normal">· código de salida {resultado.codigo}</span>
              )}
            </p>
            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono leading-relaxed">{resultado.salida || "Sin salida."}</pre>
            {escritos.map(([nombre, texto]) => (
              <div key={nombre} className="mt-3">
                <p className="font-medium text-texto-suave">
                  Archivo escrito: <span className="font-mono">{nombre}</span>
                  {resultado.binarios.includes(nombre) && <span className="ml-2 font-normal text-texto-tenue">· binario, en hexadecimal</span>}
                </p>
                <pre className="mt-2 max-h-60 overflow-auto rounded border border-borde bg-fondo p-2 font-mono leading-relaxed">{texto || "(vacío)"}</pre>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
