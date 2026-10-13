"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { guardarCurso, type EstadoGuardado } from "../../acciones";
import { Boton, Campo, claseInput, claseInputBase } from "@/components/ui";

type Datos = { slug: string; titulo: string; resumen: string; estado: string; precio: number; accesoLibre: boolean };

const ESTADOS = [
  ["borrador", "Borrador", "Oculto: solo lo ve el equipo."],
  ["privado", "Privado", "Solo con enlace directo o matrícula."],
  ["publico", "Público", "Visible en el catálogo."],
  ["archivado", "Archivado", "Retirado del catálogo."],
] as const;

/** Ficha comercial del curso, con aviso de cambios sin guardar. */
export function FichaCurso({ curso }: { curso: Datos }) {
  const inicial = { titulo: curso.titulo, resumen: curso.resumen, estado: curso.estado, precio: String(curso.precio), accesoLibre: curso.accesoLibre };
  const [borrador, setBorrador] = useState(inicial);
  const [guardado, setGuardado] = useState(inicial);
  const [resultado, accion, guardando] = useActionState<EstadoGuardado | null, FormData>(async (previo, datos) => {
    const r = await guardarCurso(previo, datos).catch(() => ({ ok: false, error: "No se pudo confirmar el guardado." }));
    if (r.ok) setGuardado(borrador);
    return r;
  }, null);
  const sucio = JSON.stringify(borrador) !== JSON.stringify(guardado);

  return (
    <form action={accion} className="space-y-5">
      <input type="hidden" name="curso" value={curso.slug} />
      <Campo etiqueta="Título">
        <input name="titulo" required value={borrador.titulo} onChange={(e) => setBorrador({ ...borrador, titulo: e.target.value })} className={claseInput} />
      </Campo>
      <Campo etiqueta="Resumen">
        <textarea name="resumen" required rows={3} value={borrador.resumen} onChange={(e) => setBorrador({ ...borrador, resumen: e.target.value })} className={`${claseInputBase} w-full resize-y`} />
      </Campo>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-texto">Visibilidad</legend>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {ESTADOS.map(([valor, etiqueta, ayuda]) => (
            <label key={valor} className={`cursor-pointer rounded-xl border p-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-rojo-acento ${borrador.estado === valor ? "border-rojo-acento bg-rojo-tenue" : "border-borde bg-fondo hover:border-texto-tenue"}`}>
              <input type="radio" name="estado" value={valor} checked={borrador.estado === valor} onChange={() => setBorrador({ ...borrador, estado: valor })} className="sr-only" />
              <span className="block text-sm font-semibold text-texto">{etiqueta}</span>
              <span className="mt-0.5 block text-xs text-texto-suave">{ayuda}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Campo etiqueta="Precio en soles">
        <input name="precio" type="number" min={0} step="0.10" value={borrador.precio} onChange={(e) => setBorrador({ ...borrador, precio: e.target.value })} className={claseInput} />
      </Campo>
      <label className="flex items-start gap-2 text-sm text-texto-suave">
        <input type="checkbox" name="acceso_libre" checked={borrador.accesoLibre} onChange={(e) => setBorrador({ ...borrador, accesoLibre: e.target.checked })} className="mt-1 size-4 accent-rojo" />
        Acceso libre: se lee sin cuenta ni matrícula. Solo tiene efecto si el curso es público.
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Boton type="submit" disabled={guardando || !sucio}>
          {guardando && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
          {guardando ? "Guardando…" : "Guardar cambios"}
        </Boton>
        <span aria-live="polite" className="flex items-center gap-1.5 text-sm">
          {resultado && !resultado.ok ? (
            <span className="flex items-center gap-1.5 text-rojo-acento"><AlertCircle size={15} aria-hidden="true" />{resultado.error}</span>
          ) : sucio ? (
            <span className="text-texto-tenue">Cambios sin guardar</span>
          ) : resultado?.ok ? (
            <span className="flex items-center gap-1.5 text-exito"><Check size={15} aria-hidden="true" />Guardado</span>
          ) : null}
        </span>
      </div>
    </form>
  );
}
