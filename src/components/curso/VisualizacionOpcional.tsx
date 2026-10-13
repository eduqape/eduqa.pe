"use client";

import { Component, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Play, RotateCcw, X, type LucideIcon } from "lucide-react";

/** Atrapa un fallo al dibujar (WebGL ausente, un error del guion…) dentro de la tarjeta. */
class Limite extends Component<{ alFallar: () => void; children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  componentDidCatch() {
    this.props.alFallar();
  }
  render() {
    return this.state.fallo ? null : this.props.children;
  }
}

type Estado = { fase: "cerrada" } | { fase: "cargando" } | { fase: "lista"; contenido: ReactNode } | { fase: "fallo" };

const BOTON =
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento";
const PRIMARIO = `${BOTON} bg-rojo text-sobre-rojo hover:bg-rojo-hover`;
const SECUNDARIO = `${BOTON} border border-borde-fuerte bg-fondo text-texto hover:bg-superficie`;

/**
 * Figura o animación de una lección que el alumno abre si quiere. Entra
 * cerrada y su código se pide solo al abrirla: quien no la abre no la
 * descarga. Si no se puede cargar o falla al dibujarse, el aviso queda dentro
 * de la tarjeta y la lección sigue; por eso nada de lo que muestra puede
 * faltar en el texto. Cerrarla la desmonta y libera lo que ocupaba.
 */
export function VisualizacionOpcional({
  titulo,
  Icono,
  abrir,
  que,
  cargar,
  claseCuerpo = "",
  pie,
}: {
  titulo: string;
  Icono: LucideIcon;
  /** Texto del botón: «Ver animación», «Ver figura». */
  abrir: string;
  /** Con artículo, para los avisos: «la animación», «la figura». */
  que: string;
  cargar: () => Promise<ReactNode>;
  claseCuerpo?: string;
  pie?: string;
}) {
  const [estado, setEstado] = useState<Estado>({ fase: "cerrada" });
  // Cada apertura tiene su número: una carga que llega después de cerrar se descarta.
  const intento = useRef(0);

  const lanzar = () => {
    const este = ++intento.current;
    setEstado({ fase: "cargando" });
    cargar().then(
      (contenido) => este === intento.current && setEstado({ fase: "lista", contenido }),
      () => este === intento.current && setEstado({ fase: "fallo" }),
    );
  };

  const cerrar = () => {
    intento.current++;
    setEstado({ fase: "cerrada" });
  };

  const abierta = estado.fase !== "cerrada";

  return (
    <figure className="my-6">
      <div className="overflow-hidden rounded-xl border border-borde bg-fondo">
        <div className="flex items-center gap-3 px-4 py-3">
          <Icono className="h-5 w-5 shrink-0 text-rojo-acento" aria-hidden />
          <p className="min-w-0 flex-1 text-sm font-semibold text-texto">{titulo}</p>
          {abierta ? (
            <button type="button" onClick={cerrar} className={SECUNDARIO}>
              <X className="h-3.5 w-3.5" aria-hidden />
              Cerrar
            </button>
          ) : (
            <button type="button" onClick={lanzar} className={PRIMARIO}>
              <Play className="h-3.5 w-3.5" aria-hidden />
              {abrir}
            </button>
          )}
        </div>
        {estado.fase === "cargando" && (
          <p className="border-t border-borde px-4 py-10 text-center text-sm text-texto-tenue" role="status">
            Cargando {que}…
          </p>
        )}
        {estado.fase === "fallo" && (
          <div className="flex flex-wrap items-center gap-3 border-t border-borde px-4 py-4" role="status">
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-texto-suave">
              No se pudo mostrar {que} en este navegador. No hace falta para seguir: lo que muestra está explicado en
              el texto.
            </p>
            <button type="button" onClick={lanzar} className={SECUNDARIO}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reintentar
            </button>
          </div>
        )}
        {estado.fase === "lista" && (
          <div className={`border-t border-borde ${claseCuerpo}`}>
            <Limite alFallar={() => setEstado({ fase: "fallo" })}>
              {estado.contenido}
            </Limite>
          </div>
        )}
      </div>
      {pie && <figcaption className="mt-2 text-center text-xs leading-relaxed text-texto-suave">{pie}</figcaption>}
    </figure>
  );
}
