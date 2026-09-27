"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { VistaPrevia, type Variante } from "@/components/Certificado";
import Link from "next/link";
import {
  BadgeCheck,
  Bolt,
  Eye,
  Mail,
  Send,
  Users,
} from "lucide-react";
import type {
  CertificadoAdmin,
  ConfigCertificacionCurso,
  CursoCertificacion,
  EnvioCertificado,
  MatriculadoCertificacion,
  ReglaCertificacion,
} from "@/lib/certificaciones-admin";
import {
  alternarReglaCertificacion,
  crearReglaCertificacion,
  emitirCertificadoManual,
  emitirCertificadosLote,
  procesarEnviosPendientes,
} from "./acciones";

type Modo = "manual" | "lote" | "activadores" | "correos";

const MODOS: { id: Modo; texto: string; Icono: typeof BadgeCheck }[] = [
  { id: "manual", texto: "Manual", Icono: BadgeCheck },
  { id: "lote", texto: "Lotes", Icono: Users },
  { id: "activadores", texto: "Activadores", Icono: Bolt },
  { id: "correos", texto: "Correos", Icono: Mail },
];

function BotonEmitirManual({
  habilitado,
}: {
  habilitado: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={!habilitado || pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      <BadgeCheck size={16} aria-hidden="true" />
      {pending ? "Emitiendo certificación…" : "Emitir certificación"}
    </button>
  );
}

export function ConsolaCertificaciones({
  cursos,
  matriculados,
  reglas,
  envios,
  certificados,
  configs,
  modoInicial = "manual",
  cursoInicial = "",
  estado,
  cantidad,
}: {
  cursos: CursoCertificacion[];
  matriculados: MatriculadoCertificacion[];
  reglas: ReglaCertificacion[];
  envios: EnvioCertificado[];
  certificados: CertificadoAdmin[];
  configs: ConfigCertificacionCurso[];
  modoInicial?: string;
  cursoInicial?: string;
  estado?: string;
  cantidad?: string;
}) {
  const [modo, setModo] = useState<Modo>(
    MODOS.some((item) => item.id === modoInicial)
      ? (modoInicial as Modo)
      : "manual",
  );
  const [cursoId, setCursoId] = useState(
    cursoInicial || cursos[0]?.id || "",
  );
  const [usuarioId, setUsuarioId] = useState("");
  const configInicial = configs.find((item) => item.curso_id === (cursoInicial || cursos[0]?.id));
  const [varianteManual, setVarianteManual] = useState<Variante>(
    configInicial?.variante ?? "banda",
  );

  const alumnos = useMemo(
    () => matriculados.filter((item) => item.curso_id === cursoId),
    [matriculados, cursoId],
  );

  const alumnoSeleccionado = alumnos.find(
    (item) => item.usuario_id === usuarioId,
  );
  const cursoSeleccionado = cursos.find((item) => item.id === cursoId) ?? null;
  const configSeleccionada =
    configs.find((item) => item.curso_id === cursoId) ?? null;

  const fechaPreview = new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Lima",
  }).format(new Date());

  const datosPreviewManual = {
    alumno: alumnoSeleccionado?.nombre ?? "Nombre del alumno",
    curso: cursoSeleccionado?.titulo ?? "Curso EDUQA.PE",
    horas: Number(cursoSeleccionado?.horas ?? configSeleccionada?.horas ?? 0),
    fecha: fechaPreview,
    docente: configSeleccionada?.docente ?? "Docente EDUQA.PE",
    docenteFirmaUrl: configSeleccionada?.docente_firma_url ?? null,
    directorAcademico:
      configSeleccionada?.director_academico ?? "Director Académico EDUQA.PE",
    directorFirmaUrl: configSeleccionada?.director_firma_url ?? null,
    codigo: "EDUQA-PREVIEW-NO-VALIDO",
  };

  function cambiarCurso(id: string) {
    setCursoId(id);
    setUsuarioId("");
    setVarianteManual(
      configs.find((item) => item.curso_id === id)?.variante ?? "banda",
    );
  }

  return (
    <>
      <div
        className="mt-5 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Modo de gestión"
      >
        {MODOS.map(({ id, texto, Icono }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={modo === id}
            onClick={() => setModo(id)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
              modo === id
                ? "border-rojo-acento bg-rojo-tenue text-rojo-acento"
                : "border-borde bg-superficie text-texto hover:border-rojo-acento"
            }`}
          >
            <Icono size={16} aria-hidden="true" />
            {texto}
          </button>
        ))}

        <Link
          href={`/panel/certificaciones/preview${cursoId ? `?curso=${cursoId}` : ""}`}
          className="inline-flex items-center gap-2 rounded-lg border border-borde bg-superficie px-4 py-2.5 text-sm font-semibold text-texto hover:border-rojo-acento hover:text-rojo-acento"
        >
          <Eye size={16} aria-hidden="true" />
          Preview
        </Link>
      </div>

      {estado === "emitido" && (
        <p className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          Certificación emitida.
        </p>
      )}
      {estado === "lote" && (
        <p className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          Lote procesado: {cantidad ?? "0"} alumnos.
        </p>
      )}

      <section className="mt-6 rounded-2xl border border-borde bg-superficie p-5 sm:p-6">
        {modo === "manual" && (
          <div className="grid gap-6 2xl:grid-cols-[minmax(340px,430px)_minmax(0,1fr)] 2xl:items-start">
            <form action={emitirCertificadoManual} className="grid gap-5">
              <div>
                <h2 className="text-lg font-semibold text-texto">Emisión manual</h2>
                <p className="mt-1 text-sm text-texto-suave">
                  Elige curso, alumno y estilo. El certificado se previsualiza antes de emitir.
                </p>
              </div>

              <label>
                <span className="mb-1.5 block text-sm font-medium text-texto">
                  Curso
                </span>
                <select
                  name="cursoId"
                  value={cursoId}
                  onChange={(e) => cambiarCurso(e.target.value)}
                  required
                  className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto"
                >
                  {cursos.length === 0 && <option value="">No hay cursos</option>}
                  {cursos.map((curso) => (
                    <option key={curso.id} value={curso.id}>
                      {curso.titulo}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1.5 block text-sm font-medium text-texto">
                  Alumno matriculado
                </span>
                <select
                  name="usuarioId"
                  value={usuarioId}
                  onChange={(e) => setUsuarioId(e.target.value)}
                  required
                  disabled={!cursoId || alumnos.length === 0}
                  className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto disabled:opacity-50"
                >
                  <option value="">
                    {alumnos.length
                      ? "Seleccionar alumno…"
                      : "Este curso no tiene matriculados"}
                  </option>
                  {alumnos.map((alumno) => (
                    <option key={alumno.usuario_id} value={alumno.usuario_id}>
                      {alumno.nombre} · {alumno.email} · {alumno.estado}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1.5 block text-sm font-medium text-texto">
                  Estilo de certificación
                </span>
                <select
                  name="variante"
                  value={varianteManual}
                  onChange={(e) => setVarianteManual(e.target.value as Variante)}
                  className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto"
                >
                  <option value="banda">Banda</option>
                  <option value="marco">Marco</option>
                  <option value="solido">Sólido</option>
                </select>
              </label>

              {alumnoSeleccionado && (
                <div className="rounded-xl border border-borde bg-fondo p-4 text-sm">
                  <p className="font-semibold text-texto">
                    {alumnoSeleccionado.nombre}
                  </p>
                  <p className="mt-1 text-texto-suave">
                    {alumnoSeleccionado.email}
                  </p>
                  <p className="mt-1 text-xs text-texto-tenue">
                    Matrícula: {alumnoSeleccionado.estado}
                    {alumnoSeleccionado.certificado_id
                      ? ` · certificado ${alumnoSeleccionado.codigo ?? ""}`
                      : ""}
                  </p>
                </div>
              )}

              {!configSeleccionada && cursoId && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-500">
                  Configura docente, director y firmas en Preview antes de emitir este curso.
                </p>
              )}

              <label className="flex items-center gap-2 text-sm text-texto-suave">
                <input type="checkbox" name="enviar" />
                Encolar correo después de emitir
              </label>

              <BotonEmitirManual
                habilitado={Boolean(
                  cursoId && usuarioId && configSeleccionada,
                )}
              />
            </form>

            <section className="min-w-0 rounded-xl border border-borde bg-fondo p-4 2xl:sticky 2xl:top-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-texto">Preview en vivo</p>
                  <p className="mt-0.5 text-xs text-texto-tenue">
                    Alumno y estilo se actualizan antes de emitir.
                  </p>
                </div>
                <Link
                  href={`/panel/certificaciones/preview${cursoId ? `?curso=${cursoId}` : ""}`}
                  className="text-xs font-semibold text-rojo-acento hover:underline"
                >
                  Configurar firmas
                </Link>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[560px]">
                  <VistaPrevia
                    datos={datosPreviewManual}
                    variante={varianteManual}
                    escala={0.47}
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {modo === "lote" && (
          <form action={emitirCertificadosLote} className="grid gap-5">
            <div>
              <h2 className="text-lg font-semibold text-texto">Emisión por lote</h2>
              <p className="mt-1 text-sm text-texto-suave">
                Los alumnos se cargan automáticamente desde las matrículas del curso.
              </p>
            </div>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-texto">
                Curso
              </span>
              <select
                name="cursoId"
                value={cursoId}
                onChange={(e) => cambiarCurso(e.target.value)}
                required
                className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto"
              >
                {cursos.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.titulo}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-xl border border-borde bg-fondo p-4">
              <p className="text-sm font-semibold text-texto">
                {alumnos.length}{" "}
                {alumnos.length === 1 ? "matriculado" : "matriculados"}
              </p>
              <p className="mt-1 text-xs text-texto-tenue">
                {alumnos.filter((a) => a.estado === "completada").length} completados
              </p>
              {alumnos.length > 0 && (
                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {alumnos.map((alumno) => (
                    <div
                      key={alumno.usuario_id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="truncate text-texto">{alumno.nombre}</span>
                      <span className="shrink-0 text-xs text-texto-tenue">
                        {alumno.estado}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-texto-suave">
              <input type="checkbox" name="soloCompletadas" defaultChecked />
              Emitir solo a matrículas completadas
            </label>

            <label className="flex items-center gap-2 text-sm text-texto-suave">
              <input type="checkbox" name="enviar" />
              Encolar correo para cada certificado emitido
            </label>

            <button
              disabled={!cursoId || alumnos.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Users size={16} aria-hidden="true" />
              Emitir lote
            </button>
          </form>
        )}

        {modo === "activadores" && (
          <div>
            <form action={crearReglaCertificacion} className="grid gap-4">
              <div>
                <h2 className="text-lg font-semibold text-texto">
                  Activadores automáticos
                </h2>
                <p className="mt-1 text-sm text-texto-suave">
                  Emite al completar una matrícula del curso seleccionado.
                </p>
              </div>

              <input
                name="nombre"
                required
                placeholder="Ej. Certificar automáticamente Python"
                className="rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto"
              />

              <input type="hidden" name="activador" value="matricula_completada" />
              <input type="hidden" name="cohorteId" value="" />

              <label>
                <span className="mb-1.5 block text-sm font-medium text-texto">
                  Curso
                </span>
                <select
                  name="cursoId"
                  value={cursoId}
                  onChange={(e) => cambiarCurso(e.target.value)}
                  required
                  className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto"
                >
                  {cursos.map((curso) => (
                    <option key={curso.id} value={curso.id}>
                      {curso.titulo}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm text-texto-suave">
                <input type="checkbox" name="enviarCorreo" />
                Encolar correo automáticamente
              </label>

              <button className="rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white">
                Crear activador
              </button>
            </form>

            <div className="mt-6 space-y-2">
              {reglas.length === 0 ? (
                <p className="text-sm text-texto-tenue">
                  No hay activadores configurados.
                </p>
              ) : (
                reglas.map((regla) => {
                  const curso = cursos.find((item) => item.id === regla.curso_id);
                  return (
                    <div
                      key={regla.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-borde bg-fondo p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-texto">
                          {regla.nombre}
                        </p>
                        <p className="mt-0.5 text-xs text-texto-tenue">
                          {curso?.titulo ?? "Curso"}
                          {regla.enviar_correo ? " · correo automático" : ""}
                        </p>
                      </div>
                      <form action={alternarReglaCertificacion}>
                        <input type="hidden" name="id" value={regla.id} />
                        <input
                          type="hidden"
                          name="activa"
                          value={String(regla.activa)}
                        />
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
                  );
                })
              )}
            </div>
          </div>
        )}

        {modo === "correos" && (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-texto">Correos</h2>
                <p className="mt-1 text-sm text-texto-suave">
                  Cola de entrega de certificaciones.
                </p>
              </div>

              <form action={procesarEnviosPendientes}>
                <button className="inline-flex items-center gap-2 rounded-lg bg-rojo px-3 py-2 text-sm font-semibold text-white">
                  <Send size={14} aria-hidden="true" />
                  Procesar cola
                </button>
              </form>
            </div>

            <div className="mt-5 space-y-2">
              {envios.length === 0 ? (
                <p className="text-sm text-texto-tenue">
                  No hay envíos registrados.
                </p>
              ) : (
                envios.slice(0, 30).map((envio) => (
                  <div
                    key={envio.id}
                    className="rounded-lg border border-borde bg-fondo p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm text-texto">
                        {envio.destinatario}
                      </p>
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
                      <p className="mt-1 text-xs text-red-500">
                        {envio.ultimo_error}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      {certificados.length > 0 && (
        <section className="mt-6 rounded-2xl border border-borde bg-superficie p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-texto">
            Certificaciones recientes
          </h2>
          <div className="mt-3 space-y-2">
            {certificados.slice(0, 8).map((certificado) => (
              <div
                key={certificado.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-borde bg-fondo p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-texto">
                    {certificado.alumno}
                  </p>
                  <p className="truncate text-xs text-texto-tenue">
                    {certificado.curso_nombre ??
                      certificado.cohorte?.curso_nombre ??
                      "Curso"}{" "}
                    · {certificado.codigo}
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
        </section>
      )}
    </>
  );
}
