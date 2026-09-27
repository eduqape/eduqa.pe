"use client";

import { useActionState, useMemo, useState } from "react";
import type { Variante } from "@/components/Certificado";
import { VistaPrevia } from "@/components/Certificado";
import type {
  ConfigCertificacionCurso,
  CursoCertificacion,
} from "@/lib/certificaciones-admin";
import {
  actualizarResponsablesCertificacion,
  type EstadoGuardadoCertificacion,
} from "../acciones";

const ESTADO_INICIAL: EstadoGuardadoCertificacion = { ok: false };

function EditorCurso({
  curso,
  config,
  alumnoInicial,
  varianteInicial,
  fecha,
  onCambiarCurso,
  cursos,
}: {
  curso: CursoCertificacion | null;
  config: ConfigCertificacionCurso | null;
  alumnoInicial: string;
  varianteInicial: Variante;
  fecha: string;
  onCambiarCurso: (id: string) => void;
  cursos: CursoCertificacion[];
}) {
  const [alumno, setAlumno] = useState(alumnoInicial || "Nombre del alumno");
  const [variante, setVariante] = useState<Variante>(varianteInicial);
  const [docente, setDocente] = useState(config?.docente ?? "");
  const [director, setDirector] = useState(config?.director_academico ?? "");
  const [firmaDocente, setFirmaDocente] = useState<File | null>(null);
  const [firmaDirector, setFirmaDirector] = useState<File | null>(null);
  const [previewFirmaDocente, setPreviewFirmaDocente] = useState<string | null>(null);
  const [previewFirmaDirector, setPreviewFirmaDirector] = useState<string | null>(null);
  const [estado, formAction, pendiente] = useActionState(
    actualizarResponsablesCertificacion,
    ESTADO_INICIAL,
  );

  function cambiarFirmaDocente(file: File | null) {
    if (previewFirmaDocente?.startsWith("blob:")) URL.revokeObjectURL(previewFirmaDocente);
    setFirmaDocente(file);
    setPreviewFirmaDocente(file ? URL.createObjectURL(file) : null);
  }

  function cambiarFirmaDirector(file: File | null) {
    if (previewFirmaDirector?.startsWith("blob:")) URL.revokeObjectURL(previewFirmaDirector);
    setFirmaDirector(file);
    setPreviewFirmaDirector(file ? URL.createObjectURL(file) : null);
  }

  const datos = {
    alumno: alumno.trim() || "Nombre del alumno",
    curso: curso?.titulo ?? "Curso EDUQA.PE",
    horas: Number(curso?.horas ?? 0),
    fecha,
    docente: docente.trim() || "Docente EDUQA.PE",
    docenteFirmaUrl: previewFirmaDocente ?? config?.docente_firma_url ?? null,
    directorAcademico: director.trim() || "Director Académico EDUQA.PE",
    directorFirmaUrl: previewFirmaDirector ?? config?.director_firma_url ?? null,
    codigo: "EDUQA-PREVIEW-NO-VALIDO",
  };

  const subiendo = Boolean(firmaDocente || firmaDirector);

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(380px,480px)_minmax(0,1fr)] 2xl:items-start">
      <form
        action={formAction}
        className="rounded-2xl border border-borde bg-superficie p-5"
      >
        <input type="hidden" name="cursoId" value={curso?.id ?? ""} />

        <div className="grid gap-4">
          <label className="text-sm font-medium text-texto">
            Curso
            <select
              value={curso?.id ?? ""}
              onChange={(event) => onCambiarCurso(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto"
            >
              {cursos.length === 0 && (
                <option value="">No hay cursos disponibles</option>
              )}
              {cursos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.titulo}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-texto">
            Alumno de prueba
            <input
              value={alumno}
              onChange={(event) => setAlumno(event.target.value)}
              placeholder="Nombre para probar"
              className="mt-1.5 w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto"
            />
          </label>

          <label className="text-sm font-medium text-texto">
            Variante
            <select
              value={variante}
              onChange={(event) => setVariante(event.target.value as Variante)}
              className="mt-1.5 w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto"
            >
              <option value="banda">Banda</option>
              <option value="marco">Marco</option>
              <option value="solido">Sólido</option>
            </select>
          </label>

          <div className="rounded-lg border border-borde bg-fondo px-3 py-2.5">
            <p className="text-xs uppercase tracking-wide text-texto-tenue">
              Horas del curso
            </p>
            <p className="mt-1 text-sm font-semibold text-texto">
              {curso?.horas ?? 0} {curso?.horas === 1 ? "hora" : "horas"}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-borde pt-5">
          <h2 className="font-semibold text-texto">Docente</h2>

          <label className="mt-3 block text-sm font-medium text-texto">
            Nombre
            <input
              name="docente"
              required
              value={docente}
              onChange={(event) => setDocente(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto"
            />
          </label>

          <label className="mt-3 block text-sm font-medium text-texto">
            Firma
            <input
              name="firmaDocente"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) =>
                cambiarFirmaDocente(event.target.files?.[0] ?? null)
              }
              className="mt-1.5 block w-full text-xs text-texto-suave file:mr-3 file:rounded-md file:border-0 file:bg-fondo file:px-3 file:py-2 file:text-xs file:font-semibold file:text-texto"
            />
          </label>
        </div>

        <div className="mt-6 border-t border-borde pt-5">
          <h2 className="font-semibold text-texto">Director académico</h2>

          <label className="mt-3 block text-sm font-medium text-texto">
            Nombre
            <input
              name="directorAcademico"
              required
              value={director}
              onChange={(event) => setDirector(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm text-texto"
            />
          </label>

          <label className="mt-3 block text-sm font-medium text-texto">
            Firma
            <input
              name="firmaDirector"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) =>
                cambiarFirmaDirector(event.target.files?.[0] ?? null)
              }
              className="mt-1.5 block w-full text-xs text-texto-suave file:mr-3 file:rounded-md file:border-0 file:bg-fondo file:px-3 file:py-2 file:text-xs file:font-semibold file:text-texto"
            />
          </label>
        </div>

        {estado.error && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-500"
          >
            {estado.error}
          </p>
        )}

        {estado.ok && !pendiente && (
          <p
            role="status"
            className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-500"
          >
            Responsables y firmas guardados.
          </p>
        )}

        <button
          disabled={!curso || pendiente}
          className="mt-5 w-full rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendiente
            ? subiendo
              ? "Subiendo firmas…"
              : "Guardando…"
            : "Guardar responsables y firmas"}
        </button>
      </form>

      <section className="min-w-0 rounded-2xl border border-borde bg-superficie p-5 2xl:sticky 2xl:top-6">
        <div className="mb-4">
          <p className="text-sm font-semibold text-texto">Preview en vivo</p>
          <p className="mt-1 text-xs text-texto-tenue">
            Los cambios se reflejan sin recargar ni presionar otro botón.
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[650px]">
            <VistaPrevia datos={datos} variante={variante} escala={0.55} />
          </div>
        </div>
      </section>
    </div>
  );
}

export function EditorPreviewCertificacion({
  cursos,
  configs,
  cursoInicial,
  alumnoInicial,
  varianteInicial,
  fecha,
}: {
  cursos: CursoCertificacion[];
  configs: ConfigCertificacionCurso[];
  cursoInicial: string;
  alumnoInicial: string;
  varianteInicial: Variante;
  fecha: string;
}) {
  const [cursoId, setCursoId] = useState(cursoInicial || cursos[0]?.id || "");

  const curso = useMemo(
    () => cursos.find((item) => item.id === cursoId) ?? null,
    [cursos, cursoId],
  );

  const config = useMemo(
    () => configs.find((item) => item.curso_id === cursoId) ?? null,
    [configs, cursoId],
  );

  return (
    <div className="mt-6">
      <EditorCurso
        key={cursoId || "sin-curso"}
        curso={curso}
        config={config}
        alumnoInicial={alumnoInicial}
        varianteInicial={varianteInicial}
        fecha={fecha}
        onCambiarCurso={setCursoId}
        cursos={cursos}
      />
    </div>
  );
}
