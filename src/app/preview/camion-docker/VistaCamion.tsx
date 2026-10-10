"use client";

import { CamionDocker3D, DURACION, REGISTRO } from "@/components/CamionDocker3D";
import { Reproductor3D } from "@/components/Reproductor3D";

export function VistaCamion() {
  return (
    <div className="h-svh">
      <Reproductor3D
        escena={(tiempo) => <CamionDocker3D tiempo={tiempo} />}
        duracion={DURACION}
        registro={REGISTRO}
        antetitulo="eduqa.pe · prueba de concepto"
        titulo="Docker: de tu PC al servidor"
      />
    </div>
  );
}
