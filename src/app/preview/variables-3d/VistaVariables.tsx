"use client";

import { Reproductor3D } from "@/components/Reproductor3D";
import { DEFINICION, RECORRIDO } from "@/components/guiones-variables";
import { usePaletaTema } from "@/components/paleta-tema";
import { VariablesPython3D, type Guion } from "@/components/VariablesPython3D";

const GUIONES = {
  definicion: { guion: DEFINICION, titulo: "Variables: un nombre ligado a un valor" },
  recorrido: { guion: RECORRIDO, titulo: "Variables: nombres que señalan valores" },
} as const;

/** Editor mínimo: las líneas ya ejecutadas, la última resaltada, y sus salidas. */
function Codigo({ t, codigo }: { t: number; codigo: Guion["codigo"] }) {
  const ejecutadas = codigo.filter((l) => l.t <= t);
  return (
    <div className="hidden w-72 rounded-lg border border-borde bg-fondo px-4 py-3 font-mono text-xs text-texto shadow-sm sm:block">
      <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-texto-tenue">sesion_1.py</p>
      <ol className="space-y-1">
        {codigo.map((l, i) => {
          const hecha = l.t <= t;
          const actual = hecha && i === ejecutadas.length - 1;
          return (
            <li key={i} className={hecha ? "" : "opacity-30"}>
              <span className="mr-3 inline-block w-3 text-right text-texto-tenue">{i + 1}</span>
              <span className={actual ? "rounded bg-rojo px-1 text-sobre-rojo" : ""}>{l.linea}</span>
              {hecha && l.salida && <span className="ml-6 block text-texto-suave">{l.salida}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function VistaVariables({ cual }: { cual: keyof typeof GUIONES }) {
  const { guion, titulo } = GUIONES[cual];
  const paleta = usePaletaTema();
  return (
    <div className="h-svh">
      <Reproductor3D
        escena={(tiempo) =>
          paleta && <VariablesPython3D key={paleta.clave} tiempo={tiempo} guion={guion} paleta={paleta} />
        }
        duracion={guion.duracion}
        registro={guion.registro}
        antetitulo="Introducción a Python · Sesión 01"
        titulo={titulo}
        lateral={(t) => <Codigo t={t} codigo={guion.codigo} />}
      />
    </div>
  );
}
