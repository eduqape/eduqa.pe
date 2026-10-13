import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BookOpen, Plus, Upload } from "lucide-react";
import { usuarioActual } from "@/lib/supabase/servidor";
import { perfilActual } from "@/lib/matriculas";
import { filasDelPanel, sesionesDe } from "@/lib/cursos-panel";
import { filtrarCursos, leerFiltros } from "@/lib/cursos-panel-filtro";
import { Migas } from "@/components/Migas";
import { PanelFormacionNav } from "@/components/PanelFormacionNav";
import { CatalogoPanel } from "./CatalogoPanel";
import { TarjetaCurso } from "./TarjetaCurso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gestión de Cursos & Microcursos — EDUQA.PE",
  robots: { index: false, follow: false },
};

/**
 * Listado de gestión de cursos.
 *
 * Lo que se hace a diario —buscar un curso y abrirlo— ocupa la pantalla. Crear
 * e importar son acciones ocasionales y viven en sus propias páginas, a un
 * botón de distancia. Editar un curso abre su ficha en `/panel/cursos/[curso]`.
 */
export default async function Page({ searchParams }: PageProps<"/panel/cursos">) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/panel/cursos");

  const perfil = await perfilActual();
  if (!perfil?.es_admin) redirect("/cursos");

  const filtros = leerFiltros(await searchParams);
  const todas = await filasDelPanel();
  const resultado = filtrarCursos(todas, filtros);
  // Las sesiones se cuentan solo para la página visible.
  const sesiones = await sesionesDe(resultado.filas.map((fila) => fila.id));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6">
      <Migas items={[{ texto: "Panel", href: "/panel" }, { texto: "Gestión académica" }]} />

      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center rounded-full bg-rojo-tenue px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-rojo-acento">
            Gestión educativa
          </span>
          <h1 className="mt-2 text-2xl font-bold text-texto sm:text-3xl">Cursos & Microcursos</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-texto-suave">
            Busca un curso y ábrelo para editar su ficha, sus sesiones y su visibilidad. Los cambios
            se publican al guardar, sin desplegar.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/panel/cursos/importar"
            className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-borde-fuerte bg-fondo px-3.5 py-2.5 text-sm font-medium text-texto transition-colors hover:border-rojo-acento hover:text-rojo-acento focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento"
          >
            <Upload size={15} aria-hidden="true" />
            Importar<span className="hidden sm:inline"> Markdown</span>
          </Link>
          <Link
            href="/panel/cursos/nuevo"
            className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento"
          >
            <Plus size={16} aria-hidden="true" />
            Nuevo curso
          </Link>
        </div>
      </div>

      <PanelFormacionNav activo="cursos" />

      {todas.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-borde bg-fondo px-6 py-14 text-center">
          <BookOpen size={28} className="text-texto-tenue" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-texto">Todavía no hay cursos</h2>
          <p className="mt-1 max-w-md text-sm text-texto-suave">
            Crea uno desde cero y escríbelo aquí, o importa la carpeta de Markdown de un curso ya escrito.
          </p>
          <div className="mt-5 flex gap-2">
            <Link href="/panel/cursos/importar" className="rounded-lg border border-borde-fuerte px-4 py-2.5 text-sm font-medium text-texto transition-colors hover:border-rojo-acento hover:text-rojo-acento">
              Importar Markdown
            </Link>
            <Link href="/panel/cursos/nuevo" className="rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover">
              Nuevo curso
            </Link>
          </div>
        </div>
      ) : (
        <CatalogoPanel
          filtros={{ ...filtros, pagina: resultado.pagina }}
          areas={resultado.areas}
          porEstado={resultado.porEstado}
          total={resultado.total}
          paginas={resultado.paginas}
          desde={resultado.desde}
          hasta={resultado.hasta}
        >
          {resultado.filas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-borde-fuerte px-6 py-12 text-center">
              <p className="text-sm font-medium text-texto">Ningún curso coincide con la búsqueda</p>
              <p className="mt-1 text-sm text-texto-suave">Prueba con menos palabras, otra área u otro estado.</p>
            </div>
          ) : (
            <ul
              className={
                filtros.vista === "grilla"
                  ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  : "flex flex-col gap-2"
              }
            >
              {resultado.filas.map((fila, i) => (
                <TarjetaCurso
                  key={fila.id}
                  curso={fila}
                  sesiones={sesiones.get(fila.id) ?? 0}
                  vista={filtros.vista}
                  indice={i}
                />
              ))}
            </ul>
          )}
        </CatalogoPanel>
      )}
    </div>
  );
}
