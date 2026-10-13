"use client";

import { Reproductor3D } from "@/components/Reproductor3D";
import { MOVE_ALFANUMERICO, MOVE_NUMERICO, REGISTRO_CLIENTE } from "@/components/guiones-cobol";
import { MemoriaCobol3D, type GuionMemoria } from "@/components/MemoriaCobol3D";
import { usePaletaTema } from "@/components/paleta-tema";

const ESCENAS_COBOL = {
  registro: { guion: REGISTRO_CLIENTE, titulo: "Un registro: bytes seguidos de tamaño fijo", curso: "Nivelación de COBOL" },
  alfanumerico: { guion: MOVE_ALFANUMERICO, titulo: "MOVE a un campo alfanumérico", curso: "Introducción a COBOL" },
  numerico: { guion: MOVE_NUMERICO, titulo: "MOVE a un campo numérico", curso: "Introducción a COBOL" },
} as const;

/** Las líneas del programa: las ya ejecutadas, la última resaltada, y sus salidas. */
function Codigo({ t, guion }: { t: number; guion: GuionMemoria }) {
  const ejecutadas = guion.codigo.filter((l) => l.t <= t);
  return (
    <div className="hidden w-80 rounded-lg border border-borde bg-fondo px-4 py-3 font-mono text-xs text-texto shadow-sm sm:block">
      <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-texto-tenue">DATA DIVISION</p>
      <pre className="mb-3 text-[11px] leading-relaxed text-texto-suave">{guion.datos.join("\n")}</pre>
      <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-texto-tenue">PROCEDURE DIVISION</p>
      <ol className="space-y-1">
        {guion.codigo.map((l, i) => {
          const hecha = l.t <= t;
          const actual = hecha && i === ejecutadas.length - 1;
          return (
            <li key={i} className={hecha ? "" : "opacity-30"}>
              <span className={actual ? "rounded bg-rojo px-1 text-sobre-rojo" : ""}>{l.linea}</span>
              {hecha && l.salida !== undefined && <span className="ml-4 block whitespace-pre text-texto-suave">[{l.salida}]</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function VistaMemoria({ cual }: { cual: keyof typeof ESCENAS_COBOL }) {
  const { guion, titulo, curso } = ESCENAS_COBOL[cual];
  const paleta = usePaletaTema();
  return (
    <div className="h-svh">
      <Reproductor3D
        escena={(tiempo) => paleta && <MemoriaCobol3D key={paleta.clave} tiempo={tiempo} guion={guion} paleta={paleta} />}
        duracion={guion.duracion}
        registro={guion.registro}
        antetitulo={curso}
        titulo={titulo}
        lateral={(t) => <Codigo t={t} guion={guion} />}
      />
    </div>
  );
}
