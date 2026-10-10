import type { Ejercicio, Seccion } from "@/lib/cursos";
import { BloqueCodigo } from "@/components/curso/BloqueCodigo";
import { EjercicioPunto } from "@/components/curso/EjercicioPunto";
import { EscenaCurso } from "@/components/curso/EscenaCurso";
import { SeccionPlegable } from "@/components/curso/SeccionPlegable";
import { Teoria } from "@/components/curso/Teoria";
import { Venn } from "@/components/curso/Venn";

/** Pinta el árbol de secciones. Las hijas van dentro de la madre, de modo
 *  que plegar un encabezado pliega también todo lo que cuelga de él. */
/**
 * `ejercicios` trae el ejercicio de cada punto, indexado por el identificador
 * de su sección. Se pinta al final del cuerpo de esa sección, antes de sus
 * hijas, de modo que cierra el punto que acaba de explicarse.
 */
export type Opciones = {
  ejecutable?: boolean;
  ejercicios?: Record<string, Ejercicio>;
  paquetes?: string[];
  preludio?: string;
  baseImagenes?: string;
};

function renderCuerpoSeccion(sec: Seccion, op: Opciones) {
  const { ejecutable = false, ejercicios } = op;
  return (
    <>
      {sec.bloques.map((b, i) =>
          b.tipo === "teoria" ? (
            <Teoria key={i} contenido={b.contenido} docs={b.docs} nota={b.nota} baseImagenes={op.baseImagenes} />
          ) : b.tipo === "venn" ? (
            <Venn
              key={i}
              izquierda={b.izquierda}
              derecha={b.derecha}
              resalta={b.resalta}
              pie={b.pie}
            />
          ) : b.tipo === "escena" ? (
            <EscenaCurso key={i} escena={b.escena} pie={b.pie} />
          ) : (
            <BloqueCodigo
              key={i}
              codigo={b.contenido}
              lenguaje={b.lenguaje}
              salida={b.salida}
              docs={b.docs}
              nota={b.nota}
              ejecutable={(b.lenguaje === "fortran" || b.lenguaje === "bash" || ejecutable) && !b.sinConsola}
              entrada={b.entrada}
              archivos={b.archivos}
              paquetes={op.paquetes}
              preludio={op.preludio}
            />
          ),
        )}
      {ejercicios?.[sec.id] && (
          <EjercicioPunto
            ejercicio={ejercicios[sec.id]}
            paquetes={op.paquetes}
            preludio={op.preludio}
          />
        )}
    </>
  );
}

export function renderSecciones(secciones: Seccion[], op: Opciones = {}) {
  return secciones.map((sec) => {
    const cuerpo = <>{renderCuerpoSeccion(sec, op)}{renderSecciones(sec.hijas, op)}</>;

    // Los bloques anteriores al primer encabezado no tienen nada que plegar.
    if (!sec.titulo) return <div key={sec.id}>{cuerpo}</div>;

    return (
      <SeccionPlegable
        key={sec.id}
        id={sec.id}
        titulo={sec.titulo}
        nivel={sec.nivel}
      >
        {cuerpo}
      </SeccionPlegable>
    );
  });
}
