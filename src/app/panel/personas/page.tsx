import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { usuarioActual } from "@/lib/supabase/servidor";
import { perfilActual } from "@/lib/matriculas";
import { personasDelPanel } from "@/lib/personas";
import { ETIQUETA_GRUPO, GRUPOS_PERSONA, grupoDeRol, type GrupoPersona } from "@/lib/personas-tipos";
import { Migas } from "@/components/Migas";
import { CrearPersona } from "./CrearPersona";
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

  // El recuento por grupo va arriba para responder de un vistazo a "cuántos
  // somos y cuántos salen en la web", que es lo primero que se pregunta de un
  // equipo.
  const porGrupo = (Object.keys(GRUPOS_PERSONA) as GrupoPersona[]).map((grupo) => ({
    grupo,
    etiqueta: ETIQUETA_GRUPO[grupo],
    total: personas.filter((p) => p.roles.some((r) => grupoDeRol(r) === grupo)).length,
  }));

  const publicadas = personas.filter((p) => p.visible && p.activo).length;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6">
      <Migas
        items={[
          { texto: "Panel", href: "/panel" },
          { texto: "Equipo", href: "/panel/personas" },
        ]}
      />

      <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-rojo-tenue px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-rojo-acento">
            <Users size={12} aria-hidden="true" />
            Personas
          </div>
          <h1 className="mt-2 text-2xl font-bold text-texto sm:text-3xl">Equipo</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-texto-suave">
            Alta y edición de quienes forman el equipo: planta, docentes y las
            personas que se suman como ponentes o invitados. Lo que se publica
            aquí aparece en la portada y en /equipo sin tocar código ni redesplegar.
          </p>
        </div>
      </div>

      {/* Resumen del censo. No son enlaces: son la respuesta a "cuántos somos
          y cuántos salen en la web", que es lo primero que se pregunta de un
          equipo. */}
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-superficie p-4 shadow-sm">
          <dt className="text-xs text-texto-tenue">En el censo</dt>
          <dd className="mt-1 text-2xl font-semibold text-texto">{personas.length}</dd>
        </div>
        <div className="rounded-xl bg-superficie p-4 shadow-sm">
          <dt className="text-xs text-texto-tenue">Publicadas</dt>
          <dd className="mt-1 text-2xl font-semibold text-rojo-acento">{publicadas}</dd>
        </div>
        {porGrupo.map(({ grupo, etiqueta, total }) => (
          <div key={grupo} className="rounded-xl bg-superficie p-4 shadow-sm">
            <dt className="text-xs text-texto-tenue">{etiqueta}</dt>
            <dd className="mt-1 text-2xl font-semibold text-texto">{total}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8">
        <CrearPersona />
      </section>

      <section className="mt-10 border-t border-borde pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-texto">
          Censo ({personas.length})
        </h2>
        <p className="mt-1 text-xs text-texto-suave">
          Publicar hace que la persona salga en la portada y en /equipo. Dar de
          baja la saca de la web y conserva la ficha.
        </p>

        <CatalogoPersonas personas={personas} />
      </section>
    </div>
  );
}