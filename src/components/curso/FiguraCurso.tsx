"use client";

import { Shapes } from "lucide-react";
import { FIGURAS, type NombreFigura } from "@/lib/figuras";
import { VisualizacionOpcional } from "./VisualizacionOpcional";

/**
 * Figura isométrica opcional de una lección. Entra cerrada, como la animación
 * 3D, y su dibujo se pide al abrirla. El pie la describe; lo que enseña ya
 * está en el texto, así que cerrada o fallida no deja la lección incompleta.
 */
export function FiguraCurso({ figura, numero, pie }: { figura: NombreFigura; numero: number; pie?: string }) {
  const { titulo, pie: pieFigura } = FIGURAS[figura];
  return (
    <VisualizacionOpcional
      titulo={titulo}
      Icono={Shapes}
      abrir="Ver figura"
      que="la figura"
      cargar={() => import("./FiguraIso").then(({ default: FiguraIso }) => <FiguraIso figura={figura} numero={numero} />)}
      pie={pie ?? pieFigura}
    />
  );
}
