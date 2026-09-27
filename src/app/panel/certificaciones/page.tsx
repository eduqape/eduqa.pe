import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Bolt,
  Eye,
  Mail,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import { Migas } from "@/components/Migas";
import { perfilActual } from "@/lib/matriculas";
import {
  alumnosCohorteCertificacion,
  resumenCertificacionesAdmin,
} from "@/lib/certificaciones-admin";
import { usuarioActual } from "@/lib/supabase/servidor";
import {
  alternarReglaCertificacion,
  anularCertificado,
  crearReglaCertificacion,
  emitirCertificadoManual,
  emitirCertificadosLote,
  procesarEnviosPendientes,
  solicitarEnvioCertificado,
} from "./acciones";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ cohorte?: string; estado?: string; cantidad?: string }>;
}) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/panel/certificaciones");

  const perfil = await perfilActual();
  if (!perfil?.es_admin) redirect("/panel");

  const params = await searchParams;
  const resumen = await resumenCertificacionesAdmin();
  const cohorteId = params.cohorte || resumen.cohortes[0]?.id || "";
  const alumnos = cohorteId ? await alumnosCohorteCertificacion(cohorteId) : [];
  const cohorteSeleccionada = resumen.cohortes.find((c) => c.id === cohorteId) ?? null;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6">
      <Migas
        items={[
          { texto: "Panel", href: "/panel" },
          { texto: "Certificaciones" },
        ]}
      />

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-borde pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-texto">
            Certificaciones
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-suave">
            Emisión manual, por lotes, automática mediante activadores y envío por correo.
          </p>
        </div>

        <Link
          href="/panel/certificaciones/preview"
          className="inline-flex items-center gap-2 rounded-lg border border-borde px-4 py-2.5 text-sm font-semibold text-texto hover:border-rojo-acento hover:text-rojo-acento"
        >
          <Eye size={16} aria-hidden="true" />
          Preview
        </Link>
      </header>

      {params.estado === "emitido" && (
        <p className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          Certificación emitida.
        </p>
      )}
      {params.estado === "lote" && (
        <p className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          Lote procesado: {params.cantidad ?? "0"} alumnos.
        </p>
      )}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-borde bg-superficie p-5">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-rojo-acento" aria-hidden="true" />
            <h2 className="font-semibold text-texto">Emisión por cohorte</h2>
          </div>

          <form method="get" className="mt-4">
            <label className="text-sm font-medium text-texto">Cohorte</label>
            <select
              name="cohorte"
              defaultValue={cohorteId}
              className="mt-1.5 w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto"
            >
              {resumen.cohortes.map((cohorte) => (
                <option key={cohorte.id} value={cohorte.id}>
                  {cohorte.curso_nombre} · {cohorte.dictada_en}
                </option>
              ))}
            </select>
            <button className="mt-3 rounded-lg border border-borde px-3 py-2 text-sm font-semibold text-texto">
              Cargar alumnos
            </button>
          </form>

          {cohorteSeleccionada && (
            <div className="mt-5 rounded-xl border border-borde bg-fondo p-4 text-sm">
              <p className="font-semibold text-texto">{cohorteSeleccionada.curso_nombre}</p>
              <p className="mt-1 text-texto-suave">
                {cohorteSeleccionada.horas} h · {cohorteSeleccionada.docente}
              </p>
            </div>
          )}

          <form action={emitirCertificadosLote} className="mt-4 grid gap-3">
            <input type="hidden" name="cohorteId" value={cohorteId} />
            <label className="flex items-center gap-2 text-sm text-texto-suave">
              <input type="checkbox" name="soloCompletadas" defaultChecked />
              Solo matrículas completadas
            </label>
            <label className="flex items-center gap-2 text-sm text-texto-suave">
              <input type="checkbox" name="enviar" />
              Dejar correos en cola después de emitir
            </label>
            <button
              disabled={!cohorteId}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <BadgeCheck size={16} aria-hidden="true" />
              Emitir lote
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-borde bg-superficie p-5">
          <div className="flex items-center gap-2">
            <Bolt size={18} className="text-rojo-acento" aria-hidden="true" />
            <h2 className="font-semibold text-texto">Activadores automáticos</h2>
          </div>

          <form action={crearReglaCertificacion} className="mt-4 grid gap-3">
            <input
              name="nombre"
              required
              placeholder="Ej. Emitir al completar Python"
              className="rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto"
            />
            <select
              name="activador"
              className="rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto"
            >
              <option value="matricula_completada">Matrícula completada</option>
              <option value="cohorte_cerrada">Cohorte cerrada</option>
            </select>
            <select
              name="cohorteId"
              defaultValue=""
              className="rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto"
            >
              <option value="">Seleccionar cohorte…</option>
              {resumen.cohortes.map((cohorte) => (
                <option key={cohorte.id} value={cohorte.id}>
                  {cohorte.curso_nombre} · {cohorte.dictada_en}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-texto-suave">
              <input type="checkbox" name="enviarCorreo" />
              Encolar correo al emitir automáticamente
            </label>
            <button className="rounded-lg border border-borde px-4 py-2.5 text-sm font-semibold text-texto hover:border-rojo-acento">
              Crear activador
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {resumen.reglas.length === 0 ? (
              <p className="text-sm text-texto-tenue">No hay activadores configurados.</p>
            ) : (
              resumen.reglas.map((regla) => (
                <div
                  key={regla.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-borde bg-fondo p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-texto">{regla.nombre}</p>
                    <p className="mt-0.5 text-xs text-texto-tenue">
                      {regla.activador === "matricula_completada"
                        ? "Al completar matrícula"
                        : "Al cerrar cohorte"}
                      {regla.enviar_correo ? " · correo automático" : ""}
                    </p>
                  </div>
                  <form action={alternarReglaCertificacion}>
                    <input type="hidden" name="id" value={regla.id} />
                    <input type="hidden" name="activa" value={String(regla.activa)} />
                    <button
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        regla.activa
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-superficie text-texto-tenue ring-1 ring-borde"
                      }`}
                    >
                      {regla.activa ? "Activa" : "Pausada"}
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-2xl border border-borde bg-superficie p-5">
        <h2 className="font-semibold text-texto">Alumnos de la cohorte</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-texto-tenue">
              <tr>
                <th className="pb-3">Alumno</th>
                <th className="pb-3">Estado</th>
                <th className="pb-3">Certificación</th>
                <th className="pb-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {alumnos.map((alumno) => (
                <tr key={alumno.usuario_id}>
                  <td className="py-3">
                    <p className="font-medium text-texto">{alumno.nombre}</p>
                    <p className="text-xs text-texto-tenue">{alumno.email}</p>
                  </td>
                  <td className="py-3 text-texto-suave">{alumno.estado}</td>
                  <td className="py-3">
                    {alumno.certificado_id ? (
                      <div>
                        <Link
                          href={`/certificaciones/${alumno.certificado_id}`}
                          className="font-mono text-xs text-rojo-acento hover:underline"
                        >
                          {alumno.codigo}
                        </Link>
                        {alumno.anulado_en && (
                          <p className="mt-1 text-xs text-red-500">Anulada</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-texto-tenue">No emitida</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-2">
                      {!alumno.certificado_id ? (
                        <form action={emitirCertificadoManual}>
                          <input type="hidden" name="cohorteId" value={cohorteId} />
                          <input type="hidden" name="usuarioId" value={alumno.usuario_id} />
                          <button className="rounded-lg border border-borde px-3 py-1.5 text-xs font-semibold text-texto hover:border-rojo-acento">
                            Emitir
                          </button>
                        </form>
                      ) : !alumno.anulado_en ? (
                        <>
                          <form action={solicitarEnvioCertificado}>
                            <input
                              type="hidden"
                              name="certificadoId"
                              value={alumno.certificado_id}
                            />
                            <button
                              title="Encolar correo"
                              className="rounded-lg border border-borde p-2 text-texto-suave hover:text-rojo-acento"
                            >
                              <Mail size={14} aria-hidden="true" />
                            </button>
                          </form>
                          <form action={anularCertificado} className="flex gap-1">
                            <input
                              type="hidden"
                              name="certificadoId"
                              value={alumno.certificado_id}
                            />
                            <input
                              name="motivo"
                              placeholder="Motivo"
                              className="w-28 rounded-lg border border-borde bg-fondo px-2 py-1 text-xs text-texto"
                            />
                            <button
                              title="Anular"
                              className="rounded-lg border border-borde p-2 text-texto-suave hover:text-red-500"
                            >
                              <XCircle size={14} aria-hidden="true" />
                            </button>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {alumnos.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-texto-tenue">
                    Esta cohorte no tiene matrículas vinculadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-borde bg-superficie p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-texto">Cola de correos</h2>
              <p className="mt-1 text-xs text-texto-tenue">
                Pendientes, enviados y errores del proveedor.
              </p>
            </div>
            <form action={procesarEnviosPendientes}>
              <button className="inline-flex items-center gap-2 rounded-lg bg-rojo px-3 py-2 text-xs font-semibold text-white">
                <Send size={14} aria-hidden="true" />
                Procesar cola
              </button>
            </form>
          </div>

          <div className="mt-4 space-y-2">
            {resumen.envios.slice(0, 12).map((envio) => (
              <div key={envio.id} className="rounded-lg border border-borde bg-fondo p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm text-texto">{envio.destinatario}</p>
                  <span
                    className={`text-xs font-semibold ${
                      envio.estado === "enviado"
                        ? "text-emerald-500"
                        : envio.estado === "error"
                          ? "text-red-500"
                          : "text-amber-500"
                    }`}
                  >
                    {envio.estado}
                  </span>
                </div>
                {envio.ultimo_error && (
                  <p className="mt-1 text-xs text-red-500">{envio.ultimo_error}</p>
                )}
              </div>
            ))}
            {resumen.envios.length === 0 && (
              <p className="text-sm text-texto-tenue">No hay envíos registrados.</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-borde bg-superficie p-5">
          <h2 className="font-semibold text-texto">Certificaciones recientes</h2>
          <div className="mt-4 space-y-2">
            {resumen.certificados.slice(0, 12).map((certificado) => (
              <div
                key={certificado.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-borde bg-fondo p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-texto">
                    {certificado.alumno}
                  </p>
                  <p className="truncate text-xs text-texto-tenue">
                    {certificado.cohorte?.curso_nombre ?? "Curso"} · {certificado.codigo}
                  </p>
                </div>
                <Link
                  href={`/certificaciones/${certificado.id}`}
                  className="text-xs font-semibold text-rojo-acento hover:underline"
                >
                  Ver
                </Link>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
