import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { VistaPrevia } from "@/components/Certificado";
import { perfilActual } from "@/lib/matriculas";
import { resumenCertificacionesAdmin } from "@/lib/certificaciones-admin";
import { usuarioActual } from "@/lib/supabase/servidor";

function fecha(fechaISO: string) {
  return new Date(`${fechaISO}T12:00:00-05:00`).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Lima",
  });
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ cohorte?: string; alumno?: string; variante?: string }>;
}) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/panel/certificaciones/preview");

  const perfil = await perfilActual();
  if (!perfil?.es_admin) redirect("/panel");

  const params = await searchParams;
  const resumen = await resumenCertificacionesAdmin();
  const cohorte =
    resumen.cohortes.find((item) => item.id === params.cohorte) ??
    resumen.cohortes[0] ??
    null;

  const variante =
    params.variante === "marco" || params.variante === "solido"
      ? params.variante
      : "banda";

  const datos = {
    alumno: params.alumno?.trim() || "Nombre del alumno",
    curso: cohorte?.curso_nombre ?? "Curso EDUQA.PE",
    horas: Number(cohorte?.horas ?? 4),
    fecha: cohorte?.dictada_en ? fecha(cohorte.dictada_en) : "fecha del dictado",
    docente: cohorte?.docente ?? "Docente EDUQA.PE",
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
          <h1 className="text-2xl font-semibold text-texto">Preview de certificación</h1>
        </div>
        <p className="mt-2 text-sm text-texto-suave">
          Vista no válida para verificar ni acreditar participación.
        </p>
      </header>

      <form method="get" className="mt-6 grid gap-3 rounded-2xl border border-borde bg-superficie p-5 md:grid-cols-3">
        <label className="text-sm font-medium text-texto">
          Cohorte
          <select
            name="cohorte"
            defaultValue={cohorte?.id ?? ""}
            className="mt-1.5 w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm"
          >
            {resumen.cohortes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.curso_nombre} · {item.dictada_en}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-texto">
          Alumno
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

        <button className="rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white md:col-span-3">
          Actualizar preview
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
