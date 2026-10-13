import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { usuarioActual } from "@/lib/supabase/servidor";
import { perfilActual } from "@/lib/matriculas";
import { cursoDelPanel } from "@/lib/cursos-panel";
import { Migas } from "@/components/Migas";
import { crearSesion } from "../acciones";
import { VistaCurso } from "./VistaCurso";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/panel/cursos/[curso]">): Promise<Metadata> {
  const { curso } = await params;
  return { title: `${curso} — Gestión de cursos — EDUQA.PE`, robots: { index: false, follow: false } };
}

/** Ficha de gestión de un curso: aquí se edita, no dentro de la grilla. */
export default async function Page({ params, searchParams }: PageProps<"/panel/cursos/[curso]">) {
  const { curso: slug } = await params;
  if (!(await usuarioActual())) redirect(`/acceder?volverA=/panel/cursos/${slug}`);
  if (!(await perfilActual())?.es_admin) redirect("/cursos");

  const curso = await cursoDelPanel(slug);
  if (!curso) notFound();

  const { creado, eliminada } = await searchParams;
  const aviso = creado
    ? "Curso creado en borrador. Empieza por la ficha técnica y la primera sesión."
    : typeof eliminada === "string"
      ? `Se eliminó «${eliminada.slice(0, 120)}».`
      : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6">
      <Migas
        items={[
          { texto: "Panel", href: "/panel" },
          { texto: "Gestión académica", href: "/panel/cursos" },
          { texto: curso.titulo },
        ]}
      />
      <VistaCurso curso={curso} aviso={aviso} crearSesion={crearSesion} />
    </div>
  );
}
