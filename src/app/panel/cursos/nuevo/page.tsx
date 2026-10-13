import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { usuarioActual } from "@/lib/supabase/servidor";
import { perfilActual } from "@/lib/matriculas";
import { Migas } from "@/components/Migas";
import { CrearCurso } from "../Crear";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nuevo curso — EDUQA.PE", robots: { index: false, follow: false } };

export default async function Page() {
  if (!(await usuarioActual())) redirect("/acceder?volverA=/panel/cursos/nuevo");
  if (!(await perfilActual())?.es_admin) redirect("/cursos");
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6">
      <Migas items={[{ texto: "Panel", href: "/panel" }, { texto: "Gestión académica", href: "/panel/cursos" }, { texto: "Nuevo curso" }]} />
      <h1 className="text-2xl font-bold text-texto">Nuevo curso</h1>
      <p className="mt-2 text-sm text-texto-suave">Lo mínimo para darlo de alta. Al crearlo se abre su ficha para escribir las sesiones.</p>
      <div className="mt-8"><CrearCurso /></div>
    </div>
  );
}
