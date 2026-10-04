import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Clock, Newspaper } from "lucide-react";
import {
  estadoFeedMedium,
  obtenerArticulosBlog,
  obtenerCategoriasBlog,
} from "@/lib/blog-medium";
import { BlogCard } from "@/components/BlogCard";
import { posicionObjetoCaratula, resolverCaratulaBlog } from "@/lib/blog-types";
import { Migas } from "@/components/Migas";
import { perfilActual } from "@/lib/matriculas";
import { GestionMedium } from "@/components/blog/GestionMedium";

const DESCRIPCION =
  "Ingeniería de software, inteligencia artificial y aprendizaje técnico: artículos de EDUQA.PE para leer con calma y llevar a la práctica.";

export const metadata: Metadata = {
  title: "Blog — EDUQA.PE",
  description: DESCRIPCION,
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — EDUQA.PE",
    description: DESCRIPCION,
    type: "website",
    url: "/blog",
  },
};

export const revalidate = 3600;

export default async function BlogPage({ searchParams }: PageProps<"/blog">) {
  const [articulos, categorias, perfil, consulta] = await Promise.all([
    obtenerArticulosBlog(),
    obtenerCategoriasBlog(),
    perfilActual(),
    searchParams,
  ]);
  const estadoFeed = perfil?.es_admin ? await estadoFeedMedium() : null;

  const tema =
    typeof consulta.tema === "string" && categorias.includes(consulta.tema)
      ? consulta.tema
      : "";
  const filtrados = tema
    ? articulos.filter((articulo) => articulo.categorias.includes(tema))
    : articulos;

  // El primero es el más reciente, no una selección editorial: se rotula así
  // para no prometer un criterio que no existe.
  const destacado = filtrados[0];
  const caratulaDestacada = destacado ? resolverCaratulaBlog(destacado) : null;
  const lista = filtrados.slice(1);

  const temas = categorias
    .map((categoria) => ({
      categoria,
      total: articulos.filter((articulo) => articulo.categorias.includes(categoria)).length,
    }))
    .sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria, "es"));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-14 lg:pl-64 xl:pl-32 2xl:pl-6">
      <Migas items={[{ texto: "Blog" }]} />

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-texto sm:text-4xl">Blog</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-texto-suave">{DESCRIPCION}</p>
      </header>

      {estadoFeed && <GestionMedium estado={estadoFeed} />}

      {/* Los temas son enlaces y no un select con botón: un clic filtra, el
          filtro queda en la URL y el botón atrás lo deshace. */}
      {temas.length > 1 && (
        <nav aria-label="Temas del blog" className="mt-8">
          <ul className="flex flex-wrap gap-2">
            <li>
              <ChipTema href="/blog" activo={!tema} texto="Todos" total={articulos.length} />
            </li>
            {temas.map(({ categoria, total }) => (
              <li key={categoria}>
                <ChipTema
                  href={`/blog?tema=${encodeURIComponent(categoria)}`}
                  activo={tema === categoria}
                  texto={categoria}
                  total={total}
                />
              </li>
            ))}
          </ul>
        </nav>
      )}

      {destacado ? (
        <section className="mt-8" aria-labelledby="titulo-destacado">
          <article className="group relative grid overflow-hidden rounded-xl border border-borde bg-fondo transition-colors hover:border-rojo-acento has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-rojo-acento md:grid-cols-12">
            {caratulaDestacada && (
              <div className="aspect-video w-full overflow-hidden border-b border-borde bg-superficie md:col-span-7 md:aspect-auto md:border-b-0 md:border-r">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={caratulaDestacada.url}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{ objectPosition: posicionObjetoCaratula(caratulaDestacada.posicion) }}
                />
              </div>
            )}

            <div
              className={`flex flex-col justify-center p-6 sm:p-8 ${
                caratulaDestacada ? "md:col-span-5" : "md:col-span-12"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-texto-tenue">
                {tema ? `Lo más reciente en ${tema}` : "Lo más reciente"}
              </p>

              <h2
                id="titulo-destacado"
                className={`mt-3 font-bold leading-tight tracking-tight text-texto text-balance ${
                  caratulaDestacada ? "text-2xl" : "max-w-3xl text-2xl sm:text-3xl"
                }`}
              >
                <Link
                  href={`/blog/${destacado.slug}`}
                  className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:text-rojo-acento"
                >
                  {destacado.titulo}
                </Link>
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-texto-suave sm:text-base">
                {destacado.resumen}
              </p>

              <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-tenue">
                {destacado.categorias.length > 0 && (
                  <>
                    <span className="font-semibold text-rojo-acento">
                      {destacado.categorias.slice(0, 2).join(" · ")}
                    </span>
                    <span aria-hidden="true" className="hidden sm:inline">·</span>
                  </>
                )}
                <time dateTime={destacado.fechaIso}>{destacado.fecha}</time>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} aria-hidden="true" />
                  {destacado.minutosLectura} min de lectura
                </span>
              </p>

              <span
                aria-hidden="true"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-rojo-acento"
              >
                Empezar a leer
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </article>
        </section>
      ) : (
        <div className="mt-10 rounded-xl border border-borde bg-fondo p-12 text-center">
          <Newspaper size={28} className="mx-auto text-texto-tenue" aria-hidden="true" />
          <p className="mt-3 text-sm text-texto-suave">Todavía no hay artículos publicados.</p>
        </div>
      )}

      {lista.length > 0 && (
        <section className="mt-12" aria-labelledby="titulo-mas-articulos">
          <h2 id="titulo-mas-articulos" className="text-xl font-semibold tracking-tight text-texto">
            {tema ? `Más sobre ${tema}` : "Más artículos"}
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {lista.map((articulo) => (
              <BlogCard key={articulo.guid} articulo={articulo} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ChipTema({
  href,
  activo,
  texto,
  total,
}: {
  href: string;
  activo: boolean;
  texto: string;
  total: number;
}) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento ${
        activo
          ? "border-rojo-acento bg-rojo-tenue font-semibold text-rojo-acento"
          : "border-borde bg-fondo text-texto-suave hover:border-rojo-acento hover:text-rojo-acento"
      }`}
    >
      {texto}
      <span className={`text-xs tabular-nums ${activo ? "text-rojo-acento" : "text-texto-tenue"}`}>
        {total}
      </span>
    </Link>
  );
}
