import { Certificado, VistaPrevia, type Variante } from "@/components/Certificado";
import { notFound } from "next/navigation";

// Esta página usa datos de prueba para comprobar el diseño; no es un certificado emitido.

const MUESTRA = {
  alumno: "Ana Lucía Quispe Rojas",
  curso: "Docker avanzado",
  horas: 4,
  fecha: "23 de agosto de 2026",
  docente: "Alejandro Seminario",
  docenteFirmaUrl: null,
  directorAcademico: "Director Académico EDUQA.PE",
  directorFirmaUrl: null,
  codigo: "EDUQA-DK03-2026-XGPGBC",
};

const VARIANTES: { id: Variante; nombre: string; nota: string }[] = [
  {
    id: "banda",
    nombre: "Banda",
    nota: "Barra roja arriba, cuerpo blanco. La más sobria y la que mejor se fotocopia.",
  },
  {
    id: "marco",
    nombre: "Marco",
    nota: "Filete rojo perimetral. Lee como diploma clásico sin gastar tinta.",
  },
  {
    id: "solido",
    nombre: "Sólido",
    nota: "Rojo a sangre. El de más carácter de marca; también el que más tinta consume.",
  },
];

// Un nombre largo y uno corto: es donde se rompen los certificados.
const CASOS_BORDE = [
  { ...MUESTRA, alumno: "Ma. Fernanda Del Águila Villanueva-Echecopar" },
  { ...MUESTRA, alumno: "Li Wu", curso: "Introducción a NotebookLM", horas: 2 },
];

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Certificados</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-texto-suave">
        Tres variantes sobre A4 apaisado, tipografía Exo 2. Están definidas en
        milímetros, así que lo que ves aquí es exactamente lo que sale exportado.
      </p>

      <div className="mt-12 space-y-14">
        {VARIANTES.map((v) => (
          <section key={v.id}>
            <div className="mb-4 flex items-baseline gap-3">
              <h2 className="text-xl font-semibold">{v.nombre}</h2>
              <p className="text-sm text-texto-suave">{v.nota}</p>
            </div>
            <VistaPrevia datos={MUESTRA} variante={v.id} escala={0.62} />
          </section>
        ))}
      </div>

      <section className="mt-16 border-t border-borde pt-12">
        <h2 className="text-xl font-semibold">Casos que suelen romper el diseño</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-texto-suave">
          Un nombre muy largo con apellido compuesto y uno muy corto, sobre la
          variante Banda.
        </p>
        <div className="mt-6 flex flex-wrap gap-6">
          {CASOS_BORDE.map((c) => (
            <VistaPrevia key={c.alumno} datos={c} variante="banda" escala={0.42} />
          ))}
        </div>
      </section>

      {/* Sólo para imprimir: el A4 real, sin escalar. */}
      <div className="hidden print:block">
        <Certificado datos={MUESTRA} variante="banda" />
      </div>
    </main>
  );
}
