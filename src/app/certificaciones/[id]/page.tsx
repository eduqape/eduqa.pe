import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BadgeCheck, ExternalLink } from "lucide-react";
import { Certificado, VistaPrevia } from "@/components/Certificado";
import {
  certificacionPorId,
  fechaCertificado,
  fechaEmision,
} from "@/lib/certificados";
import { usuarioActual } from "@/lib/supabase/servidor";
import { ImprimirCertificado } from "../ImprimirCertificado";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/certificaciones");

  const { id } = await params;
  const certificacion = await certificacionPorId(id);
  if (!certificacion) notFound();

  const cohorte = certificacion.cohorte;
  const datos = {
    alumno: certificacion.alumno,
    curso: cohorte?.curso_nombre ?? "Curso EDUQA.PE",
    horas: Number(cohorte?.horas ?? 0),
    fecha: fechaCertificado(cohorte?.dictada_en),
    docente: cohorte?.docente ?? "EDUQA.PE",
    codigo: certificacion.codigo,
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6">
      <div className="print:hidden">
        <Link
          href="/certificaciones"
          className="inline-flex items-center gap-2 text-sm font-medium text-texto-suave transition-colors hover:text-rojo-acento"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Mis certificaciones
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BadgeCheck size={20} className="text-rojo-acento" aria-hidden="true" />
              <h1 className="text-2xl font-semibold tracking-tight text-texto">
                {datos.curso}
              </h1>
            </div>
            <p className="mt-2 text-sm text-texto-suave">
              Emitida el {fechaEmision(certificacion.emitido_en)} · {certificacion.codigo}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/verificar/${encodeURIComponent(certificacion.codigo)}`}
              className="inline-flex items-center gap-2 rounded-lg border border-borde px-4 py-2.5 text-sm font-semibold text-texto transition-colors hover:border-rojo-acento hover:text-rojo-acento"
            >
              Verificar
              <ExternalLink size={15} aria-hidden="true" />
            </Link>
            {!certificacion.anulado_en && <ImprimirCertificado />}
          </div>
        </div>

        {certificacion.anulado_en && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            Esta certificación fue anulada.
            {certificacion.motivo_anulado ? ` Motivo: ${certificacion.motivo_anulado}` : ""}
          </div>
        )}

        <div className="mt-8 overflow-x-auto rounded-2xl border border-borde bg-superficie p-4 sm:p-6">
          <div className="min-w-[580px]">
            <VistaPrevia datos={datos} variante="banda" escala={0.52} />
          </div>
        </div>
      </div>

      {!certificacion.anulado_en && (
        <div className="hidden print:block">
          <Certificado datos={datos} variante="banda" />
        </div>
      )}
    </main>
  );
}
