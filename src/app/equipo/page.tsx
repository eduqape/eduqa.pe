import type { Metadata } from "next";
import { Mail, UserPlus, Users } from "lucide-react";
import { personasPublicas } from "@/lib/personas";
import {
  ETIQUETA_GRUPO,
  GRUPOS_PERSONA,
  grupoDeRol,
  type GrupoPersona,
} from "@/lib/personas-tipos";
import { plazaLibre } from "@/lib/catalogo";
import { FichaPersona } from "@/components/FichaPersona";
import { Migas } from "@/components/Migas";

export const metadata: Metadata = {
  title: "Equipo — EDUQA.PE",
  description:
    "Quiénes forman EDUQA.PE: docentes, ingenieros, practicantes, directores, y las personas que se suman como ponentes o invitados.",
  alternates: { canonical: "/equipo" },
};

/**
 * El censo publicado del equipo.
 *
 * La lista sale de `personas`, la misma tabla que gestiona el panel: no hay
 * copia en el código. Si aquí no aparece alguien, es que en /panel/personas no
 * está marcado como visible, y no que la página esté desactualizada.
 */
export default async function Page() {
  const personas = await personasPublicas();

  const grupos = (Object.keys(GRUPOS_PERSONA) as GrupoPersona[])
    .map((clave) => ({
      clave,
      titulo: ETIQUETA_GRUPO[clave],
      personas: personas.filter((persona) =>
        persona.roles.some((rol) => grupoDeRol(rol) === clave),
      ),
    }))
    .filter((grupo) => grupo.personas.length > 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <Migas items={[{ texto: "Equipo" }]} />

      <header>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-rojo-tenue px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-rojo-acento">
          <Users size={12} aria-hidden="true" />
          Quiénes somos
        </div>
        <h1 className="mt-2 text-2xl font-bold text-texto sm:text-3xl">Equipo</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-texto-suave">
          Quienes dan las clases, desarrollan lo que usamos y sostienen EDUQA.PE,
          junto con las personas que se suman a dar una charla.
        </p>
      </header>

      {personas.length === 0 ? (
        <p className="mt-10 rounded-xl bg-superficie px-6 py-12 text-center text-sm text-texto-suave shadow-sm">
          Estamos preparando esta sección. Vuelve en un momento.
        </p>
      ) : (
        grupos.map((grupo) => (
          <section key={grupo.clave} className="mt-12 border-t border-borde pt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-texto">
              {grupo.titulo} ({grupo.personas.length})
            </h2>

            <div className="mt-5 grid items-stretch gap-5 sm:grid-cols-2">
              {grupo.personas.map((persona) => (
                <FichaPersona key={persona.id} persona={persona} conAncla roles />
              ))}
            </div>
          </section>
        ))
      )}

      {/* La llamada a dictar vive aquí y no en la tabla: es un texto editorial, no
          el registro de una persona, y no cambia al dar de alta a nadie nuevo. */}
      <section className="mt-12 border-t border-borde pt-8">
        <div className="flex flex-col items-center rounded-xl bg-superficie p-8 text-center shadow-sm">
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-fondo"
          >
            <UserPlus size={22} className="text-texto-tenue" />
          </span>

          <h2 className="mt-5 font-medium text-texto">{plazaLibre.titulo}</h2>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-texto-suave">
            {plazaLibre.texto}
          </p>

          <a
            href={`mailto:${plazaLibre.correo}?subject=Quiero dictar en EDUQA.PE`}
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-rojo-acento underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-rojo-acento"
          >
            <Mail size={16} aria-hidden="true" />
            {plazaLibre.correo}
          </a>
        </div>
      </section>
    </div>
  );
}