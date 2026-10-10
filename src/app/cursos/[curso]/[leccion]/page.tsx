import Link from "next/link";
import { buscarLeccion } from "@/lib/catalogo-cursos";
import { miValoracion } from "@/lib/valoraciones";
import { Valorar } from "./Valorar";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { agruparEnSecciones } from "@/lib/cursos";
import { estaMatriculado, perfilActual } from "@/lib/matriculas";
import { baseImagenesCurso } from "@/lib/imagenes-curso";
import { codigoDeCurso, esAccesoLibre } from "@/lib/precios";
import { vistasDe } from "@/lib/progreso";
import { idDeCurso } from "@/lib/curso-id";
import { AvanceLeccion } from "./AvanceLeccion";
import { EnlaceAvance } from "./EnlaceAvance";
import { segundosMinimosDeLectura } from "@/lib/lectura";
import { usuarioActual } from "@/lib/supabase/servidor";
import { marcaActual } from "@/lib/marca";
import { Boton } from "@/components/ui";
import {
  BarraLateral,
  type HerramientaCurso,
} from "@/components/curso/BarraLateral";
import { Migas } from "@/components/Migas";
import { SelectorTema } from "@/components/Tema";
import { CargandoCurso } from "@/components/curso/CargandoCurso";
import { PreparacionFortran } from "@/components/curso/PreparacionFortran";
import { PreparacionBash } from "@/components/curso/PreparacionBash";
import { rutaDeCadaCurso } from "@/lib/rutas";
import { Ejercicios } from "@/components/curso/Ejercicios";
import { renderSecciones, type Opciones } from "@/components/curso/SeccionesLeccion";
import { ejerciciosPython1 } from "@/content/python-ejercicios";
import { VistaDiapositivas } from "@/components/sqlite/VistaDiapositivas";
import { SincronizarCurso } from "@/components/curso/SincronizarCurso";

export const dynamic = "force-dynamic";

/*
 * Lecciones que traen consola. Es una prueba acotada a propósito: el
 * intérprete pesa decenas de megabytes y conviene ver cómo se comporta en una
 * sola sesión antes de ofrecerlo en todo el catálogo.
 */
const CON_CONSOLA = new Set([
  "python/sesion-1",
  "redis/sesion-1",
  "redis/sesion-2",
  "redis/sesion-3",
  "redis/sesion-4",
  "python-bioingenieria/sesion-1",
  "python-bioingenieria/sesion-2",
  "python-bioingenieria/sesion-3",
  "python-bioingenieria/sesion-4",
  "ia-generativa/sesion-1",
  "ia-generativa/sesion-2",
  "ia-generativa/sesion-3",
  "ia-generativa/sesion-4",
]);

// Sin generateStaticParams: el acceso depende de la sesión y de la matrícula,
// así que estas páginas no pueden prerenderizarse como HTML estático.

export async function generateMetadata({
  params,
}: PageProps<"/cursos/[curso]/[leccion]">): Promise<Metadata> {
  const { curso, leccion } = await params;
  const dato = await buscarLeccion(curso, leccion);
  if (!dato) return { title: "Curso no encontrado — EDUQA.PE" };
  return {
    title: `${dato.leccion.titulo} — ${dato.curso.titulo}`,
    description: dato.curso.resumen,
  };
}

export default async function Page({
  params,
}: PageProps<"/cursos/[curso]/[leccion]">) {
  // Next 16: params llega como promesa, el acceso síncrono ya no existe.
  const { curso: cursoSlug, leccion: leccionSlug } = await params;
  const dato = await buscarLeccion(cursoSlug, leccionSlug);
  if (!dato) notFound();

  // Un curso de acceso libre se lee sin cuenta: ni sesión ni matrícula.
  // Esta es la única barrera de estas páginas, porque proxy.ts no filtra
  // las hijas de /cursos.
  const [libre, codigo, usuario] = await Promise.all([
    esAccesoLibre(cursoSlug),
    codigoDeCurso(cursoSlug),
    usuarioActual(),
  ]);

  if (!libre) {
    if (!usuario) {
      redirect(`/acceder?volverA=/cursos/${cursoSlug}/${leccionSlug}`);
    }

    // Quien mantiene el catálogo entra a cualquier curso: revisar lo que uno
    // publica no debería exigir comprarlo. Esta comprobación es la que
    // autoriza de verdad; el botón de la interfaz solo cambia lo que se ve.
    const perfil = await perfilActual();

    // El contenido es solo para quien está matriculado en ese curso.
    if (!perfil?.es_admin && !(await estaMatriculado(cursoSlug))) {
      redirect(`/cursos?matricularse=${cursoSlug}`);
    }
  }

  const { curso, leccion, anterior, siguiente } = dato;
  const valoracionPropia = siguiente ? null : await miValoracion(cursoSlug);

  const ejecutable = CON_CONSOLA.has(`${cursoSlug}/${leccionSlug}`);
  const esFortran = curso.icono === "fortran" || leccion.bloques.some(b => b.tipo === "codigo" && b.lenguaje === "fortran");
  const esBash =
    leccion.bloques.some((b) => b.tipo === "codigo" && b.lenguaje === "bash" && !b.sinConsola) ||
    Object.values(leccion.ejercicios ?? {}).some((e) => (e.tipo ?? "codigo") === "codigo" && "lenguaje" in e && e.lenguaje === "bash");
  const rutaFortran = esFortran ? (await rutaDeCadaCurso()).get(cursoSlug) : undefined;
  const herramientas: HerramientaCurso[] = rutaFortran
    ? [
        {
          href: `/rutas/${rutaFortran.ruta}/sandbox`,
          etiqueta: "Sandbox de Fortran",
          tipo: "sandbox",
        },
      ]
    : cursoSlug === "python"
      ? [
          {
            href: "/cursos/python/sandbox",
            etiqueta: "Sandbox de Python",
            tipo: "sandbox",
          },
          {
            href: "/cursos/python/quiz",
            etiqueta: "Quiz de Python",
            tipo: "quiz",
          },
        ]
      : [];

  // Sin sesión no hay progreso que guardar: el botón no se pinta.
  const vistas = usuario ? await vistasDe(cursoSlug) : new Set<string>();
  const cursoId = await idDeCurso(cursoSlug);
  // La pantalla de cierre pinta la marca personalizada si la hay.
  const marca = await marcaActual();
  const secciones = agruparEnSecciones(leccion.bloques);
  const opciones: Opciones = {
    ejecutable,
    ejercicios: leccion.ejercicios,
    paquetes: leccion.paquetes ?? curso.paquetes,
    preludio: leccion.preludio ?? curso.preludio,
    baseImagenes: baseImagenesCurso(curso.slug),
  };

  return (
    <div className="flex min-h-dvh">
      {cursoId && <SincronizarCurso cursoId={cursoId} />}
      {/* El intérprete se trae al abrir la sesión, no al pulsar Ejecutar. */}
      {ejecutable && <CargandoCurso paquetes={curso.paquetes} />}

      <BarraLateral
        curso={curso}
        actual={leccion}
        codigo={codigo}
        inicio={usuario ? "/cursos" : "/"}
        herramientas={herramientas}
      />

      <main className="min-w-0 flex-1">
        <article className="mx-auto w-full max-w-3xl px-6 py-12 lg:px-10">
          <Migas
            items={[
              // Sin sesión no hay lista de matrículas que enseñar: la miga
              // lleva a la portada, que es la única página que sí puede ver.
              { texto: "Cursos", href: usuario ? "/cursos" : "/" },
              { texto: curso.titulo, href: `/cursos/${curso.slug}/${curso.lecciones[0].slug}` },
              { texto: leccion.titulo },
            ]}
          />

          <header className="border-b border-borde pb-6">
            <div className="flex items-start justify-between gap-4">
              <p className="font-mono text-sm text-rojo-acento">
                Sesión {String(leccion.numero).padStart(2, "0")}
              </p>
              <SelectorTema />
            </div>
            <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {leccion.titulo}
            </h1>
            {esFortran && <PreparacionFortran />}
            {esBash && <PreparacionBash />}
          </header>

          <div className="mt-8">
            {cursoSlug === "sqlite" ? (
              <VistaDiapositivas
                archivo={`/cursos/sqlite/${leccionSlug}.pdf`}
                titulo={leccion.titulo}
                lectura={renderSecciones(secciones, opciones)}
              />
            ) : renderSecciones(secciones, opciones)}
          </div>

          {/* El curso de Python agrupa sus ejercicios al final. Los cursos
              más nuevos los reparten punto por punto y no llevan este bloque:
              se comprueba el curso en concreto, no que sea ejecutable. */}
          {cursoSlug === "python" && leccionSlug === "sesion-1" && (
            <Ejercicios ejercicios={ejerciciosPython1} />
          )}

          {/* Quien lee sin cuenta ve el material completo; lo que le falta es
              la matrícula, que es lo que da constancia y clase en vivo. */}
          {libre && !usuario && (
            <aside className="mt-12 rounded-xl border border-borde bg-superficie p-6">
              <h2 className="text-lg font-medium">
                Estás leyendo {curso.titulo} sin cuenta
              </h2>
              <p className="mt-2 leading-relaxed text-texto-suave">
                El material es abierto. Con una cuenta gratuita te matriculas, se
                guarda tu avance y puedes recibir la constancia de participación
                cuando asistas a un dictado en vivo.
              </p>
              <Link href="/registro" className="mt-5 inline-block">
                <Boton>
                  Crear cuenta gratis
                  <ArrowRight size={16} aria-hidden="true" />
                </Boton>
              </Link>
            </aside>
          )}

          {usuario && (
            <AvanceLeccion
              curso={curso.slug}
              leccion={leccion.slug}
              vista={vistas.has(leccion.slug)}
              tituloLeccion={leccion.titulo}
              siguiente={
                siguiente ? { slug: siguiente.slug, titulo: siguiente.titulo } : undefined
              }
              volverA="/cursos"
              marcaCierre={marca.cierre ?? null}
              segundosMinimos={segundosMinimosDeLectura(leccion.bloques)}
            />
          )}

          <nav className="mt-10 flex flex-wrap items-stretch justify-between gap-4 border-t border-borde pt-6">
            {anterior ? (
              <Link
                href={`/cursos/${curso.slug}/${anterior.slug}`}
                className="group flex max-w-[47%] flex-col rounded-lg border border-borde px-4 py-3 transition-colors hover:border-rojo-acento"
              >
                <span className="flex items-center gap-1.5 text-xs text-texto-tenue">
                  <ArrowLeft size={13} aria-hidden="true" />
                  Anterior
                </span>
                <span className="mt-0.5 text-sm font-medium group-hover:text-rojo-acento">
                  {anterior.titulo}
                </span>
              </Link>
            ) : (
              <span />
            )}

            {/* En la última sesión no hay "Siguiente": el curso se acabó y lo
                que toca es volver, no quedarse en un callejón sin salida. */}
            {!siguiente && (
              <EnlaceAvance
                href={usuario ? "/cursos" : "/"}
                curso={curso.slug}
                leccion={leccion.slug}
                marcar={!!usuario && !vistas.has(leccion.slug)}
                className="group ml-auto flex flex-col rounded-lg border border-borde px-4 py-3 text-right transition-colors hover:border-rojo-acento"
              >
                <span className="flex items-center justify-end gap-1.5 text-xs text-texto-tenue">
                  Terminaste el curso
                  <ArrowRight size={13} aria-hidden="true" />
                </span>
                <span className="mt-0.5 text-sm font-medium group-hover:text-rojo-acento">
                  {usuario ? "Volver a mis cursos" : "Ir al inicio"}
                </span>
              </EnlaceAvance>
            )}

            {/* Pasar a la siguiente sesión también da esta por completada. */}
            {siguiente && (
              <EnlaceAvance
                href={`/cursos/${curso.slug}/${siguiente.slug}`}
                curso={curso.slug}
                leccion={leccion.slug}
                marcar={!!usuario && !vistas.has(leccion.slug)}
                className="group ml-auto flex max-w-[47%] flex-col rounded-lg border border-borde px-4 py-3 text-right transition-colors hover:border-rojo-acento"
              >
                <span className="flex items-center justify-end gap-1.5 text-xs text-texto-tenue">
                  Siguiente
                  <ArrowRight size={13} aria-hidden="true" />
                </span>
                <span className="mt-0.5 text-sm font-medium group-hover:text-rojo-acento">
                  {siguiente.titulo}
                </span>
              </EnlaceAvance>
            )}
          </nav>

          {/* Valorar solo tiene sentido al final y con el curso ya cursado:
              una nota puesta antes de leer no informa de nada. */}
          {!siguiente && usuario && !libre && (
            <Valorar curso={curso.slug} inicial={valoracionPropia?.estrellas ?? null} />
          )}
        </article>
      </main>
    </div>
  );
}
