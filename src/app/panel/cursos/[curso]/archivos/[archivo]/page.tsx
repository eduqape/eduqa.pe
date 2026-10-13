import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { usuarioActual } from "@/lib/supabase/servidor";
import { perfilActual } from "@/lib/matriculas";
import { archivoDelPanel } from "@/lib/cursos-panel";
import { Migas } from "@/components/Migas";
import { eliminarSesion, guardarArchivoCurso, subirImagenCurso } from "../../../acciones";
import { previsualizarArchivo } from "../../../vista-previa";
import { EditorArchivo } from "./EditorArchivo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editar curso — Panel de EDUQA.PE",
  robots: { index: false, follow: false },
};

const etiquetaDe = (s: { numero: number; titulo: string }) =>
  Number.isFinite(s.numero) ? `Sesión ${s.numero} · ${s.titulo}` : s.titulo;

export default async function Page({ params }: PageProps<"/panel/cursos/[curso]/archivos/[archivo]">) {
  const { curso: slug, archivo: crudo } = await params;
  const archivo = decodeURIComponent(crudo);
  if (!(await usuarioActual())) redirect(`/acceder?volverA=/panel/cursos/${slug}/archivos/${archivo}`);
  if (!(await perfilActual())?.es_admin) redirect("/cursos");
  // Un nombre que no puede existir no llega a la base.
  if (!/^[a-z0-9][a-z0-9_-]*\.md$/.test(archivo)) notFound();

  const datos = await archivoDelPanel(slug, archivo);
  if (!datos) notFound();

  // Orden de lectura: la ficha primero y después las sesiones por número.
  const recorrido = [
    { archivo: "curso.md", etiqueta: "Ficha del curso" },
    ...datos.sesiones.map((s) => ({ archivo: s.archivo, etiqueta: etiquetaDe(s) })),
  ];
  const posicion = recorrido.findIndex((r) => r.archivo === archivo);
  const etiqueta = recorrido[posicion]?.etiqueta ?? archivo;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6">
      <Migas
        items={[
          { texto: "Panel", href: "/panel" },
          { texto: "Gestión académica", href: "/panel/cursos" },
          { texto: datos.curso.titulo, href: `/panel/cursos/${slug}` },
          { texto: etiqueta },
        ]}
      />
      <EditorArchivo
        key={archivo}
        slug={slug}
        archivo={archivo}
        etiqueta={etiqueta}
        estadoCurso={datos.curso.estado}
        contenido={datos.contenido}
        huella={datos.huella}
        anterior={recorrido[posicion - 1] ?? null}
        siguiente={recorrido[posicion + 1] ?? null}
        acciones={{
          guardar: guardarArchivoCurso,
          previsualizar: previsualizarArchivo,
          eliminar: eliminarSesion,
          subirImagen: subirImagenCurso,
        }}
      />
    </div>
  );
}
