import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { VistaPrevia } from "@/components/Certificado";
import { perfilActual } from "@/lib/matriculas";
import { resumenCertificacionesAdmin } from "@/lib/certificaciones-admin";
import { usuarioActual } from "@/lib/supabase/servidor";
import { actualizarResponsablesCertificacion } from "../acciones";

function fechaHoy() {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Lima",
  }).format(new Date());
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    curso?: string;
    alumno?: string;
    variante?: string;
    estado?: string;
  }>;
}) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/panel/certificaciones/preview");

  const perfil = await perfilActual();
  if (!perfil?.es_admin) redirect("/panel");

  const params = await searchParams;
  const resumen = await resumenCertificacionesAdmin();

  const curso =
    resumen.cursos.find((item) => item.id === params.curso) ??
    resumen.cursos[0] ??
    null;

  const config = curso
    ? resumen.configs.find((item) => item.curso_id === curso.id) ?? null
    : null;

  const variante =
    params.variante === "marco" || params.variante === "solido"
      ? params.variante
      : "banda";

  const datos = {
    alumno: params.alumno?.trim() || "Nombre del alumno",
    curso: curso?.titulo ?? "Curso EDUQA.PE",
    horas: Number(config?.horas ?? 4),
    fecha: fechaHoy(),
    docente: config?.docente ?? "Docente EDUQA.PE",
    docenteFirmaUrl: config?.docente_firma_url ?? null,
    directorAcademico:
      config?.director_academico ?? "Director Académico EDUQA.PE",
    directorFirmaUrl: config?.director_firma_url ?? null,
    codigo: "EDUQA-PREVIEW-NO-VALIDO",
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6">
      <Link
        href="/panel/certificaciones"
        className="inline-flex items-center gap-2 text-sm font-medium text-texto-suave hover:text-rojo-acento"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Certificaciones
      </Link>

      <header className="mt-5">
        <div className="flex items-center gap-2">
          <Eye size={20} className="text-rojo-acento" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-texto">
            Preview de certificación
          </h1>
        </div>
        <p className="mt-2 text-sm text-texto-suave">
          Configura responsables, firmas y apariencia por curso antes de emitir.
        </p>
      </header>

      {params.estado === "responsables-actualizados" && (
        <p className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          Responsables y firmas actualizados.
        </p>
      )}

      <form
        method="get"
        className="mt-6 grid gap-3 rounded-2xl border border-borde bg-superficie p-5 md:grid-cols-3"
      >
        <label className="text-sm font-medium text-texto">
          Curso
          <select
            name="curso"
            defaultValue={curso?.id ?? ""}
            className="mt-1.5 w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm"
          >
            {resumen.cursos.length === 0 && (
              <option value="">No hay cursos disponibles</option>
            )}
            {resumen.cursos.map((item) => (
              <option key={item.id} value={item.id}>
                {item.titulo}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-texto">
          Alumno de prueba
          <input
            name="alumno"
            defaultValue={params.alumno ?? ""}
            placeholder="Nombre para probar"
            className="mt-1.5 w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm"
          />
        </label>

        <label className="text-sm font-medium text-texto">
          Variante
          <select
            name="variante"
            defaultValue={variante}
            className="mt-1.5 w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm"
          >
            <option value="banda">Banda</option>
            <option value="marco">Marco</option>
            <option value="solido">Sólido</option>
          </select>
        </label>

        <button
          disabled={!curso}
          className="rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 md:col-span-3"
        >
          Actualizar preview
        </button>
      </form>

      <form
        action={actualizarResponsablesCertificacion}
        className="mt-6 grid gap-4 rounded-2xl border border-borde bg-superficie p-5 md:grid-cols-2"
      >
        <input type="hidden" name="cursoId" value={curso?.id ?? ""} />

        <label className="text-sm font-medium text-texto md:col-span-2">
          Horas certificadas
          <input
            name="horas"
            type="number"
            min="0.5"
            step="0.5"
            required
            defaultValue={config?.horas ?? 4}
            className="mt-1.5 w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm"
          />
        </label>

        <div>
          <h2 className="font-semibold text-texto">Docente</h2>
          <label className="mt-3 block text-sm font-medium text-texto">
            Nombre
            <input
              name="docente"
              required
              defaultValue={config?.docente ?? ""}
              className="mt-1.5 w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-texto">
            Firma
            <input
              name="firmaDocente"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="mt-1.5 block w-full text-xs text-texto-suave file:mr-3 file:rounded-md file:border-0 file:bg-fondo file:px-3 file:py-2 file:text-xs file:font-semibold file:text-texto"
            />
          </label>
          {config?.docente_firma_url && (
            <img
              src={config.docente_firma_url}
              alt="Firma actual del docente"
              className="mt-3 h-16 max-w-48 object-contain object-left"
            />
          )}
        </div>

        <div>
          <h2 className="font-semibold text-texto">Director académico</h2>
          <label className="mt-3 block text-sm font-medium text-texto">
            Nombre
            <input
              name="directorAcademico"
              required
              defaultValue={config?.director_academico ?? ""}
              className="mt-1.5 w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-texto">
            Firma
            <input
              name="firmaDirector"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="mt-1.5 block w-full text-xs text-texto-suave file:mr-3 file:rounded-md file:border-0 file:bg-fondo file:px-3 file:py-2 file:text-xs file:font-semibold file:text-texto"
            />
          </label>
          {config?.director_firma_url && (
            <img
              src={config.director_firma_url}
              alt="Firma actual del director académico"
              className="mt-3 h-16 max-w-48 object-contain object-left"
            />
          )}
        </div>

        <button
          disabled={!curso}
          className="rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
        >
          Guardar responsables y firmas
        </button>
      </form>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-borde bg-superficie p-5">
        <div className="min-w-[720px]">
          <VistaPrevia datos={datos} variante={variante} escala={0.62} />
        </div>
      </div>
    </main>
  );
}
