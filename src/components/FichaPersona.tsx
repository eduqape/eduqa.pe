import { IconoRed } from "@/components/Iconos";
import { ETIQUETA_RED } from "@/lib/redes";
import { ETIQUETA_ROL, iniciales } from "@/lib/personas-tipos";
import type { Persona } from "@/lib/personas";

/**
 * La biografía se guarda como un bloque de texto y no como una lista.
 *
 * Es lo que se escribe al darla de alta: una textarea con párrafos separados
 * por una línea en blanco. Partirlo al pintar evita que la persona que gestiona
 * el panel tenga que añadir guiones, asteriscos ni comillas para conseguir un
 * salto de línea.
 */
function parrafos(biografia: string | null): string[] {
  if (!biografia) return [];
  return biografia
    .split(/\n\s*\n/)
    .map((parrafo) => parrafo.trim())
    .filter(Boolean);
}

/**
 * Ficha de una persona, tal como sale en la web.
 *
 * Usa los mismos tokens que el resto de cards de contenido (`bg-fondo`, borde
 * y `rounded-xl`, ver AGENTS.md), para que una ficha se lea igual que un curso.
 */
export function FichaPersona({
  persona,
  conAncla = false,
  roles = false,
}: {
  persona: Persona;
  /** El ancla permite enlazar a /equipo#slug desde el panel. */
  conAncla?: boolean;
  /** Muestra los roles como etiquetas. En la portada distraen; en /equipo, no. */
  roles?: boolean;
}) {
  const texto = parrafos(persona.biografia);

  return (
    <article
      id={conAncla ? persona.slug : undefined}
      className="flex scroll-mt-24 flex-col rounded-xl border border-borde bg-fondo p-6 target:border-rojo-acento"
    >
      <div className="flex items-start gap-4">
        {persona.foto_url ? (
          // Una foto de un tercero: la dirección viene de la base, no de un
          // archivo del repositorio, así que next/image no la puede medir.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={persona.foto_url}
            alt={persona.nombre}
            loading="lazy"
            className="size-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          // Sin foto, las iniciales: igual que en el panel, para que todas las
          // fichas tengan la misma forma y no salten de alineación.
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-superficie text-lg font-semibold text-texto-suave"
          >
            {iniciales(persona.nombre)}
          </span>
        )}

        <div className="min-w-0">
          <h3 className="text-lg font-medium text-texto">{persona.nombre}</h3>
          {persona.titulo_profesional && (
            <p className="mt-0.5 text-sm font-medium text-rojo-acento">
              {persona.titulo_profesional}
            </p>
          )}
        </div>
      </div>

      {roles && persona.roles.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {persona.roles.map((rol) => (
            <li
              key={rol}
              className="rounded-full bg-superficie px-2.5 py-0.5 text-[11px] font-medium text-texto-suave"
            >
              {ETIQUETA_ROL[rol]}
            </li>
          ))}
        </ul>
      )}

      {texto.length > 0 && (
        <div className="mt-4 flex-1 space-y-3">
          {texto.map((parrafo) => (
            <p key={parrafo} className="text-sm leading-relaxed text-texto-suave">
              {parrafo}
            </p>
          ))}
        </div>
      )}

      {persona.redes.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {persona.redes.map((red) => (
            <a
              key={red.red}
              href={red.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-borde-fuerte bg-fondo px-3 py-1.5 text-sm font-medium text-texto-suave transition-colors hover:border-rojo-acento hover:text-rojo-acento focus-visible:outline-2 focus-visible:outline-rojo-acento"
            >
              <IconoRed nombre={red.red} className="size-4" />
              {ETIQUETA_RED[red.red]}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}