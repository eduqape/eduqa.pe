import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { perfilActual } from "@/lib/matriculas";
import { resumenCertificacionesAdmin } from "@/lib/certificaciones-admin";
import { usuarioActual } from "@/lib/supabase/servidor";
import { EditorPreviewCertificacion } from "./EditorPreviewCertificacion";

function fechaHoy() {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Lima",
  }).format(new Date());
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    curso?: string;
    alumno?: string;
    variante?: string;
  }>;
}) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/panel/certificaciones/preview");

  const perfil = await perfilActual();
  if (!perfil?.es_admin) redirect("/panel");

  const params = await searchParams;
  const resumen = await resumenCertificacionesAdmin();

  const cursoInicial =
    resumen.cursos.find((item) => item.id === params.curso)?.id ??
    resumen.cursos[0]?.id ??
    "";

  const varianteInicial =
    params.variante === "marco" || params.variante === "solido"
      ? params.variante
      : "banda";

  return (
    <main className="mx-auto w-full max-w-[1500px] px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6">
      <Link
        href="/panel/certificaciones"
        className="inline-flex items-center gap-2 text-sm font-medium text-texto-suave hover:text-rojo-acento"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Certificaciones
      </Link>

      <header className="mt-5">
        <div className="flex items-center gap-2">
          <Eye size={20} className="text-rojo-acento" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-texto">
            Preview de certificación
          </h1>
        </div>
        <p className="mt-2 text-sm text-texto-suave">
          Edita responsables, firmas y variante. El preview se actualiza en vivo.
        </p>
      </header>

      <EditorPreviewCertificacion
        cursos={resumen.cursos}
        configs={resumen.configs}
        cursoInicial={cursoInicial}
        alumnoInicial={params.alumno ?? ""}
        varianteInicial={varianteInicial}
        fecha={fechaHoy()}
      />
    </main>
  );
}
