import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUp, Check, Clock3, ListChecks } from "lucide-react";
import { IconoPropuesta } from "@/components/IconoPropuesta";
import { Migas } from "@/components/Migas";
import { perfilActual } from "@/lib/matriculas";
import {
  catalogosPropuestas,
  ETIQUETA_ESTADO,
  miEstadoDeVoto,
  proximosCursos,
  propuestasInternas,
  type EstadoPropuesta,
} from "@/lib/proximos-cursos";
import { esInterno } from "@/lib/roles";
import { usuarioActual } from "@/lib/supabase/servidor";
import { votarPropuesta } from "./acciones";
import { GestionPropuestas } from "./GestionPropuestas";

export const metadata: Metadata = {
  title: "Próximos cursos — EDUQA.PE",
  description:
    "Vota por los cursos que quieres ver primero en EDUQA.PE. Un voto por día y un voto máximo por propuesta.",
  robots: { index: false, follow: false },
};

const ESTILO_ESTADO: Record<EstadoPropuesta, string> = {
  borrador: "border-borde bg-superficie text-texto-tenue",
  en_votacion: "border-rojo-acento/30 bg-rojo-tenue text-rojo-acento",
  priorizado: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  en_desarrollo: "border-sky-500/30 bg-sky-500/10 text-sky-500",
  publicado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  descartado: "border-borde bg-superficie text-texto-tenue",
};

const MENSAJES: Record<string, { texto: string; exito?: boolean }> = {
  "voto-registrado": {
    texto: "Tu voto quedó registrado. Mañana tendrás un nuevo voto para otra propuesta.",
    exito: true,
  },
  "ya-votaste": { texto: "Ya votaste por esa propuesta anteriormente." },
  "voto-diario-usado": {
    texto: "Ya usaste tu voto de hoy. El siguiente se habilita a las 00:00, hora de Perú.",
  },
  "votacion-cerrada": { texto: "Esa propuesta ya no está recibiendo votos." },
  "propuesta-invalida": { texto: "No se pudo identificar la propuesta." },
  error: { texto: "No se pudo registrar el voto. Intenta nuevamente." },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/proximos-cursos");

  const [perfil, propuestas, voto, parametros, catalogos] = await Promise.all([
    perfilActual(),
    proximosCursos(),
    miEstadoDeVoto(),
    searchParams,
    catalogosPropuestas(),
  ]);

  const puedeGestionar = esInterno(perfil);
  const propuestasGestion = puedeGestionar ? await propuestasInternas() : [];
  const mensaje = parametros.estado ? MENSAJES[parametros.estado] : undefined;
  const mensajeGestion =
    parametros.estado === "creada"
      ? "Propuesta creada."
      : parametros.estado === "actualizada"
        ? "Propuesta actualizada."
        : null;

  const iconosPorNombre = new Map(catalogos.iconos.map((icono) => [icono.valor, icono.svg]));
  const ranking = propuestas.map((propuesta) => ({
    ...propuesta,
    puesto:
      propuestas.findIndex((candidata) => candidata.votos === propuesta.votos) + 1,
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6">
      <Migas items={[{ texto: "Próximos cursos" }]} />

      <header className="mt-4 border-b border-borde pb-7">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rojo-tenue px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rojo-acento">
            <ListChecks size={14} aria-hidden="true" />
            Prioridad de la comunidad
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-texto sm:text-4xl">
            Próximos cursos
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-texto-suave">
            El ranking se ordena únicamente por votos. Tienes un voto por día y
            cada propuesta puede recibir como máximo un voto tuyo.
          </p>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-borde bg-superficie px-4 py-3 text-sm text-texto-suave">
          <Clock3 size={16} className="mt-0.5 shrink-0 text-rojo-acento" aria-hidden="true" />
          <p>
            El voto es positivo e irreversible. Si ya votaste hoy, tu siguiente
            voto se habilita a las 00:00 en la zona horaria de Perú.
          </p>
        </div>

        {mensaje && (
          <p
            role="status"
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              mensaje.exito
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-borde bg-superficie text-texto-suave"
            }`}
          >
            {mensaje.texto}
          </p>
        )}
      </header>

      {puedeGestionar && (
        <>
          {mensajeGestion && (
            <p className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
              {mensajeGestion}
            </p>
          )}
          <GestionPropuestas
            propuestas={propuestasGestion}
            catalogosIniciales={catalogos}
          />
        </>
      )}

      {ranking.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-borde p-10 text-center">
          <h2 className="text-base font-semibold text-texto">
            Todavía no hay propuestas en votación
          </h2>
          <p className="mt-2 text-sm text-texto-suave">
            Cuando el equipo publique candidatos aparecerán aquí ordenados por demanda.
          </p>
        </section>
      ) : (
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {ranking.map((propuesta) => {
            const yaVoto = voto.propuestasVotadas.has(propuesta.id);
            const recibeVotos = propuesta.estado === "en_votacion";
            const puedeVotar = recibeVotos && !yaVoto && !voto.votoDeHoyUsado;

            return (
              <article
                key={propuesta.id}
                className="flex min-h-[300px] flex-col rounded-2xl border border-borde bg-superficie p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl border border-borde bg-fondo">
                      <IconoPropuesta
                        nombre={propuesta.icono}
                        svg={iconosPorNombre.get(propuesta.icono) ?? null}
                        className="size-6 text-texto-suave [&>svg]:size-full"
                      />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-texto-tenue">
                        #{String(propuesta.puesto).padStart(2, "0")} · {propuesta.area}
                      </p>
                      <p className="mt-0.5 text-xs text-texto-suave">
                        {propuesta.nivel}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      ESTILO_ESTADO[propuesta.estado]
                    }`}
                  >
                    {ETIQUETA_ESTADO[propuesta.estado]}
                  </span>
                </div>

                <h2 className="mt-5 text-lg font-semibold leading-snug text-texto">
                  {propuesta.titulo}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-texto-suave">
                  {propuesta.subtitulo}
                </p>

                <div className="mt-auto pt-6">
                  <div className="flex items-center justify-between border-t border-borde pt-4">
                    <div className="flex items-center gap-2">
                      <ArrowUp size={16} className="text-rojo-acento" aria-hidden="true" />
                      <span className="text-sm font-semibold text-texto">
                        {propuesta.votos} {propuesta.votos === 1 ? "voto" : "votos"}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-texto-suave">
                      S/{propuesta.precio.toFixed(2)}
                    </span>
                  </div>

                  {recibeVotos ? (
                    <form action={votarPropuesta} className="mt-4">
                      <input type="hidden" name="propuestaId" value={propuesta.id} />
                      <button
                        type="submit"
                        disabled={!puedeVotar}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {yaVoto ? (
                          <>
                            <Check size={16} aria-hidden="true" />
                            Ya votaste
                          </>
                        ) : voto.votoDeHoyUsado ? (
                          "Voto de hoy usado"
                        ) : (
                          "Quiero este curso"
                        )}
                      </button>
                    </form>
                  ) : propuesta.cursoSlug && propuesta.estado === "publicado" ? (
                    <Link
                      href={`/cursos/${propuesta.cursoSlug}`}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-borde-fuerte bg-fondo px-4 py-2.5 text-sm font-semibold text-texto transition-colors hover:border-rojo-acento hover:text-rojo-acento"
                    >
                      Ver curso publicado
                    </Link>
                  ) : (
                    <p className="mt-4 text-center text-xs text-texto-tenue">
                      La votación de esta propuesta ya cerró.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
