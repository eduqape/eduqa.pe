"use client";

import { Reproductor3D } from "@/components/Reproductor3D";
import { DEFINICION, RECORRIDO } from "@/components/guiones-variables";
import { usePaletaTema } from "@/components/paleta-tema";
import { VariablesPython3D } from "@/components/VariablesPython3D";
import type { NombreEscena } from "@/lib/escenas";

const GUIONES = {
  "variables-definicion": DEFINICION,
  "variables-reasignacion": RECORRIDO,
} satisfies Record<NombreEscena, unknown>;

/**
 * Fragmento pesado de `EscenaCurso`: se importa solo al lanzar la animación.
 * Al cambiar de tema la escena se monta de nuevo con la paleta nueva; el
 * reproductor conserva el momento en que iba.
 */
export default function Escena3D({ escena }: { escena: NombreEscena }) {
  const guion = GUIONES[escena];
  const paleta = usePaletaTema();
  return (
    <Reproductor3D
      escena={(tiempo) =>
        paleta && (
          <VariablesPython3D key={paleta.clave} tiempo={tiempo} guion={guion} paleta={paleta} dentroDePagina />
        )
      }
      duracion={guion.duracion}
      registro={guion.registro}
    />
  );
}
