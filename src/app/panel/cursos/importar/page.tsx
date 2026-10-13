import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { usuarioActual } from "@/lib/supabase/servidor";
import { perfilActual } from "@/lib/matriculas";
import { Migas } from "@/components/Migas";
import { FormularioCurso } from "../Formulario";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Importar curso en Markdown — EDUQA.PE", robots: { index: false, follow: false } };

export default async function Page() {
  if (!(await usuarioActual())) redirect("/acceder?volverA=/panel/cursos/importar");
  if (!(await perfilActual())?.es_admin) redirect("/cursos");
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6">
      <Migas items={[{ texto: "Panel", href: "/panel" }, { texto: "Gestión académica", href: "/panel/cursos" }, { texto: "Importar Markdown" }]} />
      <h1 className="text-2xl font-bold text-texto">Importar Markdown</h1>
      <p className="mt-2 text-sm text-texto-suave">Para cursos escritos fuera de la plataforma: sube la carpeta completa. Si el slug ya existe, reemplaza su material.</p>
      <div className="mt-6"><FormularioCurso /></div>
    </div>
  );
}
