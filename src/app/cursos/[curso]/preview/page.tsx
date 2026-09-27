import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Clock, LockKeyhole } from "lucide-react";
import { obtenerCatalogoPublico } from "@/lib/catalogo-publico";
import { Icono } from "@/components/Iconos";
import { Migas } from "@/components/Migas";

async function cursoPorSlug(slug: string) {
  return (await obtenerCatalogoPublico()).find((curso) => curso.slug === slug);
}

export async function generateMetadata({
  params,
}: PageProps<"/cursos/[curso]/preview">): Promise<Metadata> {
  const { curso: slug } = await params;
  const curso = await cursoPorSlug(slug);

  if (!curso) {
    return {
      title: "Curso no encontrado — EDUQA.PE",
      robots: { index: false, follow: true },
    };
  }

  return {
    title: `Preview — ${curso.titulo} — EDUQA.PE`,
    description: curso.resumen,
    robots: { index: true, follow: true },
    alternates: { canonical: `/catalogo/${curso.slug}` },
  };
}

function formatoLegible(formato: string | undefined) {
  if (formato === "microcurso") return "Microcurso";
  if (formato === "pildora") return "Píldora";
  return "Curso";
}

export default async function PreviewCursoPage({
  params,
}: PageProps<"/cursos/[curso]/preview">) {
  const { curso: slug } = await params;
  const curso = await cursoPorSlug(slug);
  if (!curso) notFound();

  const primera = curso.lecciones[0];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <Migas
        items={[
          { texto: "Cursos", href: "/catalogo" },
          { texto: curso.titulo },
          { texto: "Preview" },
        ]}
      />

      <header className="mt-5 grid gap-8 border-b border-borde pb-10 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-rojo-acento">
            Preview público · {curso.area} · {formatoLegible(curso.formato)}
          </p>

          <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {curso.titulo}
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-relaxed text-texto-suave">
            {curso.resumen}
          </p>

          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-texto-tenue">
                Nivel
              </dt>
              <dd className="mt-0.5 font-medium">{curso.nivel}</dd>
            </div>

            <div>
              <dt className="text-xs uppercase tracking-wide text-texto-tenue">
                Duración
              </dt>
              <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
                <Clock size={14} aria-hidden="true" />
                {curso.horas} horas
              </dd>
            </div>

            <div>
              <dt className="text-xs uppercase tracking-wide text-texto-tenue">
                Sesiones
              </dt>
              <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
                <BookOpen size={14} aria-hidden="true" />
                {curso.lecciones.length}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex size-28 items-center justify-center rounded-3xl border border-borde bg-superficie">
          <Icono nombre={curso.icono} className="size-16 text-rojo-acento" />
        </div>
      </header>

      <section className="mt-10" aria-labelledby="temario-preview">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="temario-preview" className="text-2xl font-semibold tracking-tight">
              Temario del curso
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-texto-suave">
              Puedes revisar la estructura completa antes de matricularte. El contenido
              interno de cada sesión permanece reservado para quienes tengan acceso.
            </p>
          </div>
        </div>

        <ol className="mt-5 divide-y divide-borde overflow-hidden rounded-2xl border border-borde">
          {curso.lecciones.map((leccion) => (
            <li
              key={leccion.slug}
              className="flex items-start gap-4 bg-fondo px-5 py-4"
            >
              <span className="mt-0.5 font-mono text-xs text-texto-tenue">
                {String(leccion.numero).padStart(2, "0")}
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-texto">{leccion.titulo}</h3>
              </div>

              {!curso.accesoLibre && (
                <LockKeyhole
                  size={15}
                  className="mt-0.5 shrink-0 text-texto-tenue"
                  aria-label="Contenido disponible al obtener acceso"
                />
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 rounded-2xl border border-rojo-acento/30 bg-superficie p-6">
        <h2 className="text-xl font-semibold">
          {curso.accesoLibre ? "Empieza ahora" : "Obtén acceso al curso"}
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-texto-suave">
          {curso.accesoLibre
            ? "Este curso tiene acceso libre. Puedes entrar a la primera sesión y crear una cuenta cuando quieras guardar tu progreso."
            : `Puedes registrarte y matricularte si tienes cupo disponible. Si ya utilizaste tus cursos gratuitos, también puedes adquirirlo por S/${curso.precio.toFixed(2)}.`}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          {curso.accesoLibre && primera ? (
            <Link
              href={`/cursos/${curso.slug}/${primera.slug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-rojo px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover"
            >
              Ver primera sesión
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ) : (
            <Link
              href={`/registro?volverA=/cursos/${curso.slug}/preview`}
              className="inline-flex items-center gap-2 rounded-lg bg-rojo px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover"
            >
              Crear cuenta
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          )}

          {!curso.accesoLibre && (
            <Link
              href={`/pagar/${curso.slug}`}
              className="inline-flex items-center rounded-lg border border-borde px-5 py-3 text-sm font-semibold text-texto transition-colors hover:border-rojo-acento hover:text-rojo-acento"
            >
              Comprar por S/{curso.precio.toFixed(2)}
            </Link>
          )}

          <Link
            href={`/acceder?volverA=/cursos/${curso.slug}/preview`}
            className="inline-flex items-center rounded-lg border border-borde px-5 py-3 text-sm font-semibold text-texto transition-colors hover:border-rojo-acento hover:text-rojo-acento"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>
    </main>
  );
}
