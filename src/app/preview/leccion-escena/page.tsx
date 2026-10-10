import type { Metadata } from "next";
import { construirCurso } from "@/lib/curso-markdown";
import { agruparEnSecciones } from "@/lib/cursos";
import { renderSecciones } from "@/components/curso/SeccionesLeccion";
import { SelectorTema } from "@/components/Tema";

export const metadata: Metadata = {
  title: "Escena en la lección (vista previa)",
  robots: { index: false },
};

/*
 * Comprobación local de la valla ```escena: en local no hay Supabase, así que
 * el punto «Variables» de la sesión 1 de Python pasa por el mismo lector de
 * Markdown y el mismo `renderSecciones` que la lección publicada.
 */
const CURSO = `---
slug: prueba-escena
codigo: PESC
titulo: "Prueba de escena"
resumen: "Vista previa local."
area: "Programación"
nivel: INTRODUCCIÓN
horas: 1
icono: python
precio: 0
estado: borrador
acceso_libre: true
orden: 99
---
`;

const SESION = `---
numero: 1
titulo: "Variables, tipos y operaciones"
---

# Variables

Una variable es un nombre asociado a un valor. Se crea con el operador de asignación (=). No hay que declarar de qué tipo es el valor.

> Nota: Un nombre es una referencia a un objeto en memoria. La asignación vincula el nombre al objeto, no copia el valor. Dos nombres pueden referirse al mismo objeto.
> Doc: [Sentencias de asignación](https://docs.python.org/3/reference/simple_stmts.html#assignment-statements)

\`\`\`python
producto = "Laptop"
\`\`\`

\`\`\`escena
escena: variables-definicion
\`\`\`

## Nombres válidos

El nombre de una variable admite letras, números y guion bajo (_). No puede empezar por un número ni contener espacios.
`;

export default function Page() {
  const curso = construirCurso("prueba-escena", new Map([["curso.md", CURSO], ["sesion-1.md", SESION]]));
  const secciones = agruparEnSecciones(curso.lecciones[0].bloques);
  return (
    <main className="bg-fondo text-texto">
      <article className="mx-auto w-full max-w-3xl px-6 py-12 lg:px-10">
        <div className="mb-8 flex justify-end">
          <SelectorTema />
        </div>
        {renderSecciones(secciones)}
      </article>
    </main>
  );
}
