"use client";

import { useActionState, useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { publicarCurso, type EstadoPublicacion } from "./acciones";
import { tipoImagen } from "@/lib/imagenes-curso";

/**
 * Publicación de un curso arrastrando sus archivos.
 *
 * Se sube la carpeta entera del curso —la ficha y las sesiones— porque el
 * temario se deriva del propio Markdown: mandar las sesiones sueltas dejaría
 * el índice a merced de que alguien se acuerde de actualizarlo aparte.
 * Las imágenes que citan las sesiones (`imagenes/figura.png`) viajan en el
 * mismo envío y se suben al bucket del curso.
 */
export function FormularioCurso() {
  const [estado, accion, pendiente] = useActionState<EstadoPublicacion | null, FormData>(
    publicarCurso,
    null,
  );
  const [nombres, setNombres] = useState<string[]>([]);
  const [encima, setEncima] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const recoger = (lista: FileList | null) => {
    if (!lista) return;
    // Se pasan al input real para que viajen con el formulario: asignar
    // `files` es la única forma de que un arrastre acabe en el envío.
    const dt = new DataTransfer();
    for (const f of Array.from(lista)) if (f.name.endsWith(".md") || tipoImagen(f.name)) dt.items.add(f);
    if (entrada.current) entrada.current.files = dt.files;
    setNombres(Array.from(dt.files).map((f) => f.name).sort());
  };

  return (
    <form action={accion} className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => { e.preventDefault(); setEncima(false); recoger(e.dataTransfer.files); }}
        onClick={() => entrada.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          encima ? "border-rojo-acento bg-rojo-tenue" : "border-borde-fuerte bg-superficie"
        }`}
      >
        <Upload size={22} className="mx-auto text-texto-tenue" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-texto">
          Arrastra aquí los archivos del curso
        </p>
        <p className="mt-1 text-xs text-texto-suave">
          La ficha <code className="font-mono">curso.md</code> y una sesión por archivo.
          El icono es obligatorio. La ficha también puede publicar precio, estado y ruta.
          Suma las imágenes que citan las sesiones (PNG, JPG, WebP o GIF, hasta 2 MB cada una).
        </p>
        <input
          ref={entrada}
          type="file"
          name="archivos"
          multiple
          accept=".md,.png,.jpg,.jpeg,.webp,.gif"
          className="hidden"
          onChange={(e) => recoger(e.target.files)}
        />
      </div>

      {nombres.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-borde bg-fondo p-3">
          {nombres.map((n) => (
            <li key={n} className="flex items-center gap-2 text-xs text-texto-suave">
              <FileText size={13} aria-hidden="true" />
              <span className="font-mono">{n}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={pendiente || nombres.length === 0}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-rojo px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pendiente ? "Publicando…" : "Publicar"}
      </button>

      {estado && (
        <p
          role="status"
          className={`text-sm ${estado.ok ? "text-exito" : "text-rojo-acento"}`}
        >
          {estado.ok ? estado.detalle : estado.error}
        </p>
      )}
    </form>
  );
}
