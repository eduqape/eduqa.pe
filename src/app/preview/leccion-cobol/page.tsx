import type { Metadata } from "next";
import { construirCurso } from "@/lib/curso-markdown";
import { agruparEnSecciones } from "@/lib/cursos";
import { renderSecciones } from "@/components/curso/SeccionesLeccion";
import { PreparacionCobol } from "@/components/curso/PreparacionCobol";
import { SelectorTema } from "@/components/Tema";
import { BarraLateral } from "@/components/curso/BarraLateral";

export const metadata: Metadata = {
  title: "COBOL en la lección (vista previa)",
  robots: { index: false },
};

/*
 * Comprobación local del motor de COBOL: en local no hay Supabase, así que una
 * sesión de ejemplo pasa por el mismo lector de Markdown y el mismo
 * `renderSecciones` que una lección publicada. Cubre la consola, los datos de
 * entrada, un archivo escrito, un ejercicio de completado y la figura de la
 * tarjeta perforada.
 */
const CURSO = `---
slug: prueba-cobol
codigo: PCOB
titulo: "Prueba de COBOL"
resumen: "Vista previa local."
area: "Programación"
nivel: INTRODUCCIÓN
horas: 1
icono: cobol
precio: 0
estado: borrador
acceso_libre: true
orden: 99
---
`;

const SESION = `---
numero: 1
titulo: "El motor de COBOL"
---

# El formato de referencia

Cada línea de un programa en formato fijo tiene 80 columnas, las de una
tarjeta perforada.

\`\`\`figura
figura: tarjeta-perforada
\`\`\`

# La memoria

\`\`\`escena
escena: cobol-registro
\`\`\`

\`\`\`escena
escena: cobol-move-alfanumerico
\`\`\`

\`\`\`escena
escena: cobol-move-numerico
\`\`\`

# Un programa mínimo

\`\`\`cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. SALUDO.
       PROCEDURE DIVISION.
           DISPLAY "Hola desde GnuCOBOL".
           STOP RUN.
\`\`\`

\`\`\`salida
Hola desde GnuCOBOL
\`\`\`

\`\`\`ejercicio cobol
# Enunciado
Completa el verbo que muestra el texto en la salida estándar.

# Plantilla
       IDENTIFICATION DIVISION.
       PROGRAM-ID. AVISO.
       PROCEDURE DIVISION.
           ___ "Cierre de caja".
           STOP RUN.

# Esperado
Cierre de caja

# Pista
Es el verbo del ejemplo anterior.
\`\`\`

# Leer un archivo y escribir otro

\`\`\`cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COPIA.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT CLIENTES ASSIGN TO "clientes.txt"
               ORGANIZATION IS LINE SEQUENTIAL.
           SELECT LISTADO ASSIGN TO "listado.txt"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  CLIENTES.
       01  CLIENTE         PIC X(20).
       FD  LISTADO.
       01  LINEA           PIC X(20).
       WORKING-STORAGE SECTION.
       01  FIN-ARCHIVO     PIC X VALUE "N".
       PROCEDURE DIVISION.
           OPEN INPUT CLIENTES OUTPUT LISTADO
           PERFORM UNTIL FIN-ARCHIVO = "S"
               READ CLIENTES
                   AT END MOVE "S" TO FIN-ARCHIVO
                   NOT AT END
                       MOVE CLIENTE TO LINEA
                       WRITE LINEA
               END-READ
           END-PERFORM
           CLOSE CLIENTES LISTADO
           DISPLAY "Copia terminada".
           STOP RUN.
\`\`\`

\`\`\`archivo clientes.txt
Ana Torres
Luis Quispe
\`\`\`

\`\`\`salida
Copia terminada
\`\`\`

\`\`\`escrito listado.txt
Ana Torres
Luis Quispe
\`\`\`

# Leer la entrada estándar

\`\`\`cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. ENTRADA.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  NOMBRE          PIC X(15).
       PROCEDURE DIVISION.
           ACCEPT NOMBRE
           DISPLAY "Cliente: " NOMBRE.
           STOP RUN.
\`\`\`

\`\`\`entrada
Rosa Mamani
\`\`\`

\`\`\`salida
Cliente: Rosa Mamani
\`\`\`
`;

export default function Page() {
  const curso = construirCurso("prueba-cobol", new Map([["curso.md", CURSO], ["sesion-1.md", SESION]]));
  const secciones = agruparEnSecciones(curso.lecciones[0].bloques);
  return (
    <div className="flex min-h-dvh bg-fondo text-texto">
      <BarraLateral curso={curso} actual={curso.lecciones[0]} inicio="/preview/leccion-cobol" />
      <main className="min-w-0 flex-1">
        <article className="mx-auto w-full max-w-3xl px-6 py-12 lg:px-10">
          <div className="mb-8 flex items-center justify-between">
            <PreparacionCobol />
            <SelectorTema />
          </div>
          {renderSecciones(secciones, { ejercicios: curso.lecciones[0].ejercicios })}
        </article>
      </main>
    </div>
  );
}
