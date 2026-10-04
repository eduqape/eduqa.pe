import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { usuarioActual } from "@/lib/supabase/servidor";
import { perfilActual } from "@/lib/matriculas";
import { personasDelPanel } from "@/lib/personas";
import { Migas } from "@/components/Migas";
import { CatalogoPersonas } from "./CatalogoPersonas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Equipo — Panel de EDUQA.PE",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/panel/personas");

  const perfil = await perfilActual();
  if (!perfil?.es_admin) redirect("/cursos");

  const personas = await personasDelPanel();

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6">
      <Migas items={[{ texto: "Panel", href: "/panel" }, { texto: "Equipo" }]} />

      <CatalogoPersonas
        personas={personas}
        encabezado={
          <>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-rojo-tenue px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-rojo-acento">
              <Users size={12} aria-hidden="true" />
              Personas
            </div>
            <h1 className="mt-2 text-2xl font-bold text-texto sm:text-3xl">Equipo</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-texto-suave">
              Quienes enseñan, desarrollan y se suman como ponentes o invitados. Las
              fichas publicadas salen en{" "}
              <a href="/equipo" target="_blank" rel="noopener noreferrer" className="font-medium text-texto underline-offset-4 hover:text-rojo-acento hover:underline">
                /equipo
              </a>{" "}
              y, si enseñan, en la portada.
            </p>
          </>
        }
      />
    </div>
  );
}
