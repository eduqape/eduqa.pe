"use client";

import { MonitorPlay } from "lucide-react";
import { ESCENAS, type NombreEscena } from "@/lib/escenas";
import { VisualizacionOpcional } from "./VisualizacionOpcional";

/**
 * Animación 3D opcional de un punto de la lección. three.js y el guion van en
 * un fragmento aparte que solo se pide al lanzarla: la lección se descarga sin
 * ellos y quien no quiera la animación no los paga. Cerrarla libera el
 * contexto WebGL; si el navegador no lo tiene, el aviso queda en la tarjeta.
 */
export function EscenaCurso({ escena, pie }: { escena: NombreEscena; pie?: string }) {
  return (
    <VisualizacionOpcional
      titulo={ESCENAS[escena].titulo}
      Icono={MonitorPlay}
      abrir="Ver animación"
      que="la animación"
      cargar={() => import("./Escena3D").then(({ default: Escena3D }) => <Escena3D escena={escena} />)}
      claseCuerpo="h-[28rem] sm:h-[30rem]"
      pie={pie}
    />
  );
}
