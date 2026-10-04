import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, Clock, ExternalLink, GraduationCap } from "lucide-react";
import { buscarArticuloBlog, obtenerArticulosBlog } from "@/lib/blog-medium";
import {
  type ArticuloBlog,
  articulosRelacionados,
  posicionObjetoCaratula,
  resolverCaratulaBlog,
  seccionesBlog,
} from "@/lib/blog-types";
import { Migas } from "@/components/Migas";
import { BlogCard } from "@/components/BlogCard";
import {
  ID_CUERPO_ARTICULO,
  IndiceLateral,
  IndicePlegable,
  MedicionLectura,
  ProgresoLectura,
} from "@/components/blog/LecturaArticulo";
import { BotonCompartirArticulo, ContenidoArticulo } from "@/components/blog/MotorBlog";

export async function generateStaticParams() {
  const articulos = await obtenerArticulosBlog();
  return articulos.map((articulo) => ({ slug: articulo.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const articulo = await buscarArticuloBlog(slug);
  if (!articulo) return { title: "Artículo no encontrado — EDUQA.PE" };

  const caratula = resolverCaratulaBlog(articulo);

  return {
    title: `${articulo.titulo} — Blog EDUQA.PE`,
    description: articulo.resumen,
    alternates: { canonical: `/blog/${articulo.slug}` },
    openGraph: {
      title: articulo.titulo,
      description: articulo.resumen,
      type: "article",
      publishedTime: articulo.fechaIso,
      authors: [articulo.autor],
      url: `/blog/${articulo.slug}`,
      images: caratula ? [{ url: caratula.url, alt: caratula.alt }] : [],
    },
  };
}

/** Corta en el último espacio para que la miga no termine a media palabra. */
function recortar(texto: string, maximo: number): string {
  if (texto.length <= maximo) return texto;
  const corte = texto.slice(0, maximo);
  return `${corte.slice(0, corte.lastIndexOf(" ")).trimEnd()}…`;
}

export default async function ArticuloPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [articulo, todos] = await Promise.all([buscarArticuloBlog(slug), obtenerArticulosBlog()]);

  if (!articulo) {
    notFound();
  }

  const caratula = resolverCaratulaBlog(articulo);
  const secciones = seccionesBlog(articulo.contenido);
  const conIndice = secciones.length >= 3;
  const relacionados = articulosRelacionados(articulo, todos);

  return (
    <>
      <ProgresoLectura />
      <MedicionLectura slug={articulo.slug} minutos={articulo.minutosLectura} />

      <div className="mx-auto w-full max-w-6xl px-6 py-14 lg:pl-64 xl:pl-32 2xl:pl-6">
        <Migas items={[{ texto: "Blog", href: "/blog" }, { texto: recortar(articulo.titulo, 40) }]} />

        <div className={conIndice ? "xl:grid xl:grid-cols-[minmax(0,1fr)_15rem] xl:gap-14" : ""}>
          <article className="mx-auto min-w-0 max-w-3xl xl:mx-0">
            <header className="border-b border-borde pb-8">
              {articulo.categorias.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label="Temas">
                  {articulo.categorias.map((categoria) => (
                    <li key={categoria}>
                      <Link
                        href={`/blog?tema=${encodeURIComponent(categoria)}`}
                        className="inline-flex rounded-full bg-rojo-tenue px-3 py-1 text-xs font-semibold text-rojo-acento transition-colors hover:bg-rojo hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento"
                      >
                        {categoria}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-texto text-balance sm:text-4xl lg:text-5xl lg:leading-tight">
                {articulo.titulo}
              </h1>

              <p className="mt-5 text-base leading-relaxed text-texto-suave sm:text-lg">{articulo.resumen}</p>

              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-texto-tenue">
                <span className="font-semibold text-texto">{articulo.autor}</span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <time dateTime={articulo.fechaIso}>{articulo.fecha}</time>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={13} aria-hidden="true" />
                  {articulo.minutosLectura} min de lectura
                </span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <BotonCompartirArticulo titulo={articulo.titulo} resumen={articulo.resumen} slug={articulo.slug} />
              </div>
            </header>

            {conIndice && (
              <div className="xl:hidden">
                <IndicePlegable secciones={secciones} />
              </div>
            )}

            {caratula && (
              <figure className="mt-8 overflow-hidden rounded-xl border border-borde bg-superficie">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={caratula.url}
                  alt={caratula.alt}
                  className="aspect-video w-full object-cover"
                  style={{ objectPosition: posicionObjetoCaratula(caratula.posicion) }}
                />
              </figure>
            )}

            <div id={ID_CUERPO_ARTICULO}>
              <ContenidoArticulo contenido={articulo.contenido} ocultarIndiceInterno={conIndice} />
            </div>

            <CierreArticulo articulo={articulo} />
          </article>

          {conIndice && (
            <aside className="hidden xl:block">
              <IndiceLateral secciones={secciones} minutos={articulo.minutosLectura} />
            </aside>
          )}
        </div>

        {relacionados.length > 0 && (
          <section className="mx-auto mt-16 max-w-3xl border-t border-borde pt-10 xl:mx-0 xl:max-w-none" aria-labelledby="titulo-sigue-leyendo">
            <h2 id="titulo-sigue-leyendo" className="text-xl font-semibold tracking-tight text-texto">
              Sigue leyendo
            </h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {relacionados.map((otro) => (
                <BlogCard key={otro.guid} articulo={otro} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

/**
 * El siguiente paso, al terminar de leer.
 *
 * Si el artículo declara cursos, se ofrecen esos: quien acaba de leer sobre
 * Python quiere el curso de Python, no el catálogo entero.
 */
function CierreArticulo({ articulo }: { articulo: ArticuloBlog }) {
  const cursos = articulo.cursos ?? [];

  return (
    <section
      className="mt-14 rounded-xl border border-borde bg-fondo p-6 sm:p-8"
      aria-labelledby="titulo-practica"
    >
      <div className="flex items-start gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rojo-tenue text-rojo-acento">
          <GraduationCap size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="titulo-practica" className="text-lg font-bold tracking-tight text-texto">
            Convierte la lectura en práctica
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-texto-suave">
            {cursos.length > 0
              ? "Lo que acabas de leer se practica, con ejercicios en el navegador, en:"
              : "En EDUQA.PE puedes seguir con cursos y ejercicios interactivos desde el navegador."}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {cursos.length > 0 ? (
          cursos.map((curso) => (
            <Link
              key={curso.slug}
              href={`/catalogo/${curso.slug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento"
            >
              <BookOpen size={15} aria-hidden="true" />
              {curso.titulo}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ))
        ) : (
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento"
          >
            <BookOpen size={15} aria-hidden="true" />
            Ver el catálogo de cursos
          </Link>
        )}
        {articulo.enlaceMedium && (
          <a
            href={articulo.enlaceMedium}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-borde-fuerte bg-fondo px-4 py-2.5 text-sm font-medium text-texto-suave transition-colors hover:border-rojo-acento hover:text-rojo-acento"
          >
            Leer en Medium
            <ExternalLink size={13} aria-hidden="true" />
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        )}
      </div>
    </section>
  );
}
