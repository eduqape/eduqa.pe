"use client";

import type { ComponentType } from "react";
import "@/components/iso/iso.css";
import { TARJETA_PERFORADA } from "@/components/figuras/tarjeta-perforada";
import type { NombreFigura } from "@/lib/figuras";

type Marca = "raised" | "flat" | "lit" | "edge" | "dim" | "dotted" | "dashed";

type Figura = {
  pista: string;
  lectura: string;
  claves: readonly { marca: Marca; texto: string }[];
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
 * Fragmento pesado de `FiguraCurso`: la geometría, el kit y la parte viva se
 * piden solo al abrir la figura. Número, pista y lectura en las esquinas de la
 * lámina; la leyenda, que nombra marcas del dibujo, va con él.
 */
export default function FiguraIso({ figura, numero }: { figura: NombreFigura; numero: number }) {
  const { pista, lectura, claves, Cuerpo } = REGISTRO[figura];
  return (
    <div className="iso">
      <div className="iso-plate">
        <div className="iso-plate-corners" aria-hidden="true">
          <span className="iso-plate-corner" data-corner="fig">
            Fig {numero}
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
      <div className="iso-legend">
        <span className="iso-keys">
          {claves.map((clave) => (
            <span className="iso-key" key={clave.texto}>
              <Muestra marca={clave.marca} />
              {clave.texto}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
