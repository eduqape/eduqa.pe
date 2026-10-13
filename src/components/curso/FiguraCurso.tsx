import type { ComponentType } from "react";
import "@/components/iso/iso.css";
import { TARJETA_PERFORADA } from "@/components/figuras/tarjeta-perforada";
import type { NombreFigura } from "@/lib/figuras";

type Marca = "raised" | "flat" | "lit" | "edge" | "dim" | "dotted" | "dashed";

type Figura = {
  titulo: string;
  pista: string;
  lectura: string;
  claves: readonly { marca: Marca; texto: string }[];
  pie: string;
  Cuerpo: ComponentType;
};

const REGISTRO = {
  "tarjeta-perforada": TARJETA_PERFORADA,
} satisfies Record<NombreFigura, Figura>;

/** Muestra de la leyenda, la misma que dibuja el kit. */
function Muestra({ marca }: { marca: Marca }) {
  if (marca === "raised" || marca === "flat" || marca === "lit") {
    return (
      <svg className="iso-swatch" data-mark={marca} viewBox="0 0 16 10" aria-hidden="true" focusable="false">
        <path d={marca === "flat" ? "M2 6.5 8 3.5 14 6.5 8 9.5Z" : "M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z"} />
        {marca === "flat" ? null : <path className="iso-swatch-crease" d="M2 4.5 8 7.5 14 4.5" />}
      </svg>
    );
  }
  return (
    <svg className="iso-swatch" data-mark={marca} viewBox="0 0 16 10" aria-hidden="true" focusable="false">
      <path d="M1.5 5h13" />
    </svg>
  );
}

/**
 * Figura isométrica de una lección, en la tarjeta del kit: número, título,
 * pista y lectura en las esquinas, y leyenda y pie debajo. El dibujo se
 * genera en el servidor; solo su parte viva se hidrata.
 */
export function FiguraCurso({ figura, numero, pie }: { figura: NombreFigura; numero: number; pie?: string }) {
  const { titulo, pista, lectura, claves, pie: pieFigura, Cuerpo } = REGISTRO[figura];
  return (
    <div className="iso">
      <figure className="iso-figure">
        <div className="iso-plate">
          <div className="iso-plate-corners" aria-hidden="true">
            <span className="iso-plate-corner" data-corner="fig">
              Fig {numero}
            </span>
            <span className="iso-plate-corner" data-corner="title">
              {titulo}
            </span>
            <span className="iso-plate-corner" data-corner="hint">
              {pista}
            </span>
            <span className="iso-plate-corner" data-corner="readout" data-readout="">
              {lectura}
            </span>
          </div>
          <Cuerpo />
        </div>
        <figcaption className="iso-legend">
          <span className="iso-keys">
            {claves.map((clave) => (
              <span className="iso-key" key={clave.texto}>
                <Muestra marca={clave.marca} />
                {clave.texto}
              </span>
            ))}
          </span>
          <span className="iso-caption">{pie ?? pieFigura}</span>
        </figcaption>
      </figure>
    </div>
  );
}
