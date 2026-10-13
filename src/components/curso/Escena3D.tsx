"use client";

import type { ReactNode, RefObject } from "react";
import { Reproductor3D } from "@/components/Reproductor3D";
import type { Paso } from "@/components/Reproductor3D";
import { DEFINICION, RECORRIDO } from "@/components/guiones-variables";
import { MOVE_ALFANUMERICO, MOVE_NUMERICO, REGISTRO_CLIENTE } from "@/components/guiones-cobol";
import { MemoriaCobol3D, type GuionMemoria } from "@/components/MemoriaCobol3D";
import { usePaletaTema, type PaletaTema } from "@/components/paleta-tema";
import { VariablesPython3D, type Guion } from "@/components/VariablesPython3D";
import type { NombreEscena } from "@/lib/escenas";

type Montar = (tiempo: RefObject<number>, paleta: PaletaTema) => ReactNode;
const python = (guion: Guion): { montar: Montar; duracion: number; registro: Paso[] } => ({
  montar: (tiempo, paleta) => <VariablesPython3D key={paleta.clave} tiempo={tiempo} guion={guion} paleta={paleta} dentroDePagina />,
  duracion: guion.duracion,
  registro: guion.registro,
});
const cobol = (guion: GuionMemoria): { montar: Montar; duracion: number; registro: Paso[] } => ({
  montar: (tiempo, paleta) => <MemoriaCobol3D key={paleta.clave} tiempo={tiempo} guion={guion} paleta={paleta} dentroDePagina />,
  duracion: guion.duracion,
  registro: guion.registro,
});

const ESCENAS = {
  "variables-definicion": python(DEFINICION),
  "variables-reasignacion": python(RECORRIDO),
  "cobol-registro": cobol(REGISTRO_CLIENTE),
  "cobol-move-alfanumerico": cobol(MOVE_ALFANUMERICO),
  "cobol-move-numerico": cobol(MOVE_NUMERICO),
} satisfies Record<NombreEscena, unknown>;

/**
 * Fragmento pesado de `EscenaCurso`: se importa solo al lanzar la animación.
 * Al cambiar de tema la escena se monta de nuevo con la paleta nueva; el
 * reproductor conserva el momento en que iba.
 */
export default function Escena3D({ escena }: { escena: NombreEscena }) {
  const { montar, duracion, registro } = ESCENAS[escena];
  const paleta = usePaletaTema();
  return <Reproductor3D escena={(tiempo) => paleta && montar(tiempo, paleta)} duracion={duracion} registro={registro} />;
}
