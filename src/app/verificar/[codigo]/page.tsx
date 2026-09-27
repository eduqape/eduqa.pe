import Link from "next/link";
import { BadgeCheck, CircleX, Clock3 } from "lucide-react";
import {
  fechaCertificado,
  fechaEmision,
  verificarCertificado,
} from "@/lib/certificados";

export default async function Page({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const certificado = await verificarCertificado(decodeURIComponent(codigo));

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <Link
        href="/"
        className="text-sm font-semibold tracking-[0.18em] text-rojo-acento"
      >
        EDUQA.PE
      </Link>

      {!certificado ? (
        <section className="mt-8 rounded-2xl border border-borde bg-superficie p-8">
          <CircleX size={32} className="text-rojo-acento" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold text-texto">
            Certificado no encontrado
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-texto-suave">
            No existe una certificación emitida con el código indicado.
          </p>
        </section>
      ) : (
        <section className="mt-8 rounded-2xl border border-borde bg-superficie p-8">
          <div className="flex items-start justify-between gap-4">
            <BadgeCheck size={34} className="text-rojo-acento" aria-hidden="true" />
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                certificado.vigente
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-red-500/10 text-red-500"
              }`}
            >
              {certificado.vigente ? "Vigente" : "Anulado"}
            </span>
          </div>

          <h1 className="mt-5 text-2xl font-semibold text-texto">
            {certificado.curso_nombre}
          </h1>
          <p className="mt-2 text-lg font-medium text-texto">
            {certificado.alumno}
          </p>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-texto-tenue">Código</dt>
              <dd className="mt-1 font-mono text-texto">{certificado.codigo}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-texto-tenue">Docente</dt>
              <dd className="mt-1 text-texto">{certificado.docente}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-texto-tenue">Duración</dt>
              <dd className="mt-1 flex items-center gap-1.5 text-texto">
                <Clock3 size={14} aria-hidden="true" />
                {certificado.horas} {certificado.horas === 1 ? "hora" : "horas"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-texto-tenue">Dictado</dt>
              <dd className="mt-1 text-texto">{fechaCertificado(certificado.dictada_en)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-texto-tenue">Emitido</dt>
              <dd className="mt-1 text-texto">{fechaEmision(certificado.emitido_en)}</dd>
            </div>
          </dl>
        </section>
      )}
    </main>
  );
}
