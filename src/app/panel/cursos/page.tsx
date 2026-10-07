import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BookOpen, Database, HardDrive, User, Sparkles } from "lucide-react";
import { usuarioActual, clienteServidor } from "@/lib/supabase/servidor";
import { perfilActual } from "@/lib/matriculas";
import { obtenerCursos } from "@/lib/catalogo-cursos";
import { leerTodo } from "@/lib/supabase/paginar";
import { precios } from "@/lib/precios";
import { Migas } from "@/components/Migas";
import { PanelFormacionNav } from "@/components/PanelFormacionNav";
import { FormularioCurso } from "./Formulario";
import { CrearCurso } from "./Crear";
import { CatalogoGestion } from "./CatalogoGestion";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gestión de Cursos & Microcursos — EDUQA.PE",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/panel/cursos");

  const perfil = await perfilActual();
  if (!perfil?.es_admin) redirect("/cursos");

  const [tarifas, catalogoCursos, supabase] = await Promise.all([
    precios(),
    obtenerCursos(),
    clienteServidor(),
  ]);

  // El slug sale de `cursos` por el id (#112): es la llave para cruzar con el
  // catálogo, que se identifica por su URL.
  const { data: enLaBase } = await leerTodo((desde, hasta) =>
    supabase
      .from("curso_sesiones")
      .select("archivo, cursos(slug)")
      .order("curso_id")
      .order("archivo")
      .range(desde, hasta),
  );

  const sesionesPorCurso = new Map<string, number>();
  for (const s of (enLaBase ?? []) as unknown as { cursos: { slug: string } | null }[]) {
    const slug = s.cursos?.slug;
    if (slug) sesionesPorCurso.set(slug, (sesionesPorCurso.get(slug) ?? 0) + 1);
  }

  // Creadores: el nombre sale de `perfiles`, que es donde vive el del alumno.
  const { data: autorias } = await supabase
    .from("curso_creadores")
    .select("usuario_id, rol, orden, cursos(slug)")
    .order("orden");

  const { data: perfiles } = await supabase.from("perfiles").select("id, nombre");
  const nombrePorId = new Map((perfiles ?? []).map((p) => [p.id, p.nombre]));

  const creadoresPorCurso = new Map<string, string[]>();
  for (const a of (autorias ?? []) as unknown as { usuario_id: string; cursos: { slug: string } | null }[]) {
    const slug = a.cursos?.slug;
    if (!slug) continue;
    const lista = creadoresPorCurso.get(slug) ?? [];
    lista.push(nombrePorId.get(a.usuario_id) || "sin nombre");
    creadoresPorCurso.set(slug, lista);
  }

  const cursosGestion = catalogoCursos.map((curso) => {
    const tarifa = tarifas.get(curso.slug);
    return {
      slug: curso.slug,
      codigo: tarifa?.codigo ?? curso.codigoBase ?? null,
      titulo: tarifa?.titulo ?? curso.titulo,
      resumen: tarifa?.resumen ?? curso.resumen,
      estado: tarifa?.estado ?? "publico",
      precio: tarifa?.precio ?? 0,
      accesoLibre: tarifa?.acceso_libre ?? false,
      sesiones: curso.lecciones.length,
      horas: curso.horas,
      primeraLeccion: curso.lecciones[0].slug,
      formato: curso.formato,
      icono: curso.icono,
      area: curso.area,
      actualizadoEn: tarifa?.actualizado_en ?? "1970-01-01T00:00:00.000Z",
    };
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6">
      <Migas
        items={[
          { texto: "Panel", href: "/panel" },
          { texto: "Gestión académica", href: "/panel/cursos" },
        ]}
      />

      <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-rojo-tenue px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-rojo-acento">
            <Sparkles size={12} />
            Gestión Educativa
          </div>
          <h1 className="mt-2 text-2xl font-bold text-texto sm:text-3xl">
            Cursos & Microcursos
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-texto-suave">
            Publica nuevos contenidos en Markdown o actualiza tarifas, visibilidad (borrador, privado, público) y sesiones de cursos existentes directamente en Supabase sin necesidad de redesplegar.
          </p>
        </div>
      </div>

      <PanelFormacionNav activo="cursos" />

      <section className="mt-8 rounded-2xl border border-borde bg-superficie p-6 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-texto-tenue">
          Publicar o Modificar Contenido Markdown
        </h2>
        <div className="mt-4">
          <CrearCurso />
        </div>

        <div className="mt-6">
          <FormularioCurso />
        </div>
      </section>

      {/* Tarjetas de Administración de Precios y Estados */}
      <section className="mt-12">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-texto">
              Tarifas y Visibilidad de Cursos ({catalogoCursos.length})
            </h2>
            <p className="mt-1 text-xs text-texto-suave">
              Borrador: oculto en catálogo · Privado: solo con enlace directo · Público: visible en catálogo.
            </p>
          </div>
        </div>

        <CatalogoGestion cursos={cursosGestion} />
      </section>

      {/* Lista detallada de estado del repositorio vs base */}
      <section className="mt-14 border-t border-borde pt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-texto-tenue">
          Auditoría de Origen y Creadores
        </h2>
        <ul className="mt-3 divide-y divide-borde rounded-2xl border border-borde bg-superficie">
          {catalogoCursos.map((c) => {
            const enBase = sesionesPorCurso.has(c.slug);
            return (
              <li key={c.slug} className="flex items-center gap-3 px-4 py-3.5 text-xs">
                <BookOpen size={15} className="shrink-0 text-texto-tenue" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-texto">{c.titulo}</p>
                  <p className="font-mono text-[11px] text-texto-tenue">
                    {tarifas.get(c.slug)?.codigo ?? "Sin código"} · {c.slug}
                  </p>
                </div>
                {c.formato === "microcurso" && (
                  <span className="shrink-0 rounded-md bg-rojo-tenue px-2 py-0.5 text-[10px] font-semibold text-rojo-acento">
                    Microcurso
                  </span>
                )}
                <span className="shrink-0 text-xs text-texto-suave">
                  {c.lecciones.length} sesiones
                </span>
                <span
                  className="flex shrink-0 items-center gap-1 text-[11px] text-texto-tenue"
                  title={
                    creadoresPorCurso.get(c.slug)?.join(", ") ??
                    "Sin creador registrado"
                  }
                >
                  <User size={12} aria-hidden="true" />
                  {creadoresPorCurso.get(c.slug)?.length
                    ? creadoresPorCurso.get(c.slug)!.length === 1
                      ? creadoresPorCurso.get(c.slug)![0]
                      : `${creadoresPorCurso.get(c.slug)!.length} creadores`
                    : "sin creador"}
                </span>
                <span
                  title={enBase ? "Se sirve desde la base" : "Vive en el repositorio"}
                  className="flex shrink-0 items-center gap-1 text-[11px] text-texto-tenue"
                >
                  {enBase ? (
                    <>
                      <Database size={12} aria-hidden="true" /> base
                    </>
                  ) : (
                    <>
                      <HardDrive size={12} aria-hidden="true" /> repo
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
