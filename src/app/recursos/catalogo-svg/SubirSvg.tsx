"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { FileUp, Plus, RefreshCw } from "lucide-react";
import { HojaLateral } from "@/components/HojaLateral";
import { TAMANO_MAXIMO_SVG, problemaSvg } from "@/lib/catalogo-svg-validacion";
import { subirAsset, type EstadoSubida } from "./acciones";
import { Mascara } from "./tonos";

const CAMPO =
  "mt-1.5 w-full rounded-lg border border-borde-fuerte bg-fondo px-3.5 py-2.5 text-sm text-texto placeholder:text-texto-tenue focus:border-rojo-acento focus:outline-none focus:ring-1 focus:ring-rojo-acento";

// Las tres situaciones en que se usa un asset: si el SVG trae relleno o un
// rectángulo de fondo, aquí se ve como un bloque sólido antes de subirlo.
const PREVIAS = [
  { nombre: "Claro", fondo: "bg-white", tinta: "bg-zinc-900" },
  { nombre: "Oscuro", fondo: "bg-[#0b0b0d]", tinta: "bg-zinc-100" },
  { nombre: "Rojo", fondo: "bg-[#c70724]", tinta: "bg-white" },
];

export function SubirSvg({ alSubir }: { alSubir: (nombre: string) => void }) {
  const [abierta, setAbierta] = useState(false);
  const [sucio, setSucio] = useState(false);

  const cerrar = () => {
    setAbierta(false);
    setSucio(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className="flex items-center gap-1.5 rounded-lg bg-rojo px-3.5 py-2 text-sm font-semibold text-sobre-rojo transition-colors hover:bg-rojo-hover"
      >
        <Plus size={16} aria-hidden="true" />
        Subir SVG
      </button>

      <HojaLateral
        abierta={abierta}
        titulo="Subir un SVG"
        subtitulo="Queda disponible en el catálogo al instante."
        sucio={sucio}
        alCerrar={cerrar}
      >
        {(pedirCierre) => (
          <Formulario
            alCambiar={() => setSucio(true)}
            alCancelar={pedirCierre}
            alSubir={(nombre) => {
              cerrar();
              alSubir(nombre);
            }}
          />
        )}
      </HojaLateral>
    </>
  );
}

function Formulario({
  alCambiar,
  alCancelar,
  alSubir,
}: {
  alCambiar: () => void;
  alCancelar: () => void;
  alSubir: (nombre: string) => void;
}) {
  const [estado, accion, enviando] = useActionState<EstadoSubida, FormData>(subirAsset, { estado: "inicial" });
  const entrada = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<{ nombre: string; peso: number; url: string } | null>(null);
  const [problema, setProblema] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [nombreEditado, setNombreEditado] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);

  const avisado = useRef<EstadoSubida | null>(null);
  useEffect(() => {
    if (estado.estado !== "subido" || avisado.current === estado) return;
    avisado.current = estado;
    alSubir(estado.nombre);
  }, [estado, alSubir]);

  // La vista previa usa una URL de objeto; se libera al cambiar de archivo.
  useEffect(() => () => {
    if (archivo) URL.revokeObjectURL(archivo.url);
  }, [archivo]);

  async function elegir(elegido: File | undefined) {
    if (!elegido) return;
    alCambiar();
    const contenido = await elegido.text();
    const motivo =
      elegido.size > TAMANO_MAXIMO_SVG ? "El SVG pesa más de 1 MB." : problemaSvg(contenido);
    setProblema(motivo);
    setArchivo(
      motivo
        ? null
        : {
            nombre: elegido.name,
            peso: elegido.size,
            url: URL.createObjectURL(new Blob([contenido], { type: "image/svg+xml" })),
          },
    );
    if (!motivo && !nombreEditado) setNombre(nombreDesdeArchivo(elegido.name));
  }

  function soltar(evento: React.DragEvent) {
    evento.preventDefault();
    setArrastrando(false);
    const soltado = evento.dataTransfer.files[0];
    if (!soltado || !entrada.current) return;
    // El archivo soltado pasa al input para que viaje con el formulario.
    const transferencia = new DataTransfer();
    transferencia.items.add(soltado);
    entrada.current.files = transferencia.files;
    void elegir(soltado);
  }

  return (
    <form
      // Con `action` React vacía el formulario al terminar y un error haría
      // perder lo escrito y el archivo; enviando a mano se conserva todo.
      onSubmit={(evento) => {
        evento.preventDefault();
        const datos = new FormData(evento.currentTarget);
        startTransition(() => accion(datos));
      }}
      onChange={alCambiar}
      className="flex h-full flex-col"
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <input
          ref={entrada}
          id="archivo-svg"
          name="archivo"
          type="file"
          accept="image/svg+xml,.svg"
          required
          className="sr-only"
          onChange={(evento) => void elegir(evento.target.files?.[0])}
        />

        {archivo ? (
          <div>
            <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-borde">
              {PREVIAS.map((previa) => (
                <figure key={previa.nombre} className={`flex flex-col items-center gap-2 p-3 ${previa.fondo}`}>
                  <div className="h-24 w-full">
                    <Mascara url={archivo.url} nombre={`${archivo.nombre} sobre fondo ${previa.nombre.toLowerCase()}`} tinta={previa.tinta} />
                  </div>
                </figure>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-texto-tenue">
              <span className="min-w-0 flex-1 truncate">
                {archivo.nombre} · {formatoPeso(archivo.peso)}
              </span>
              <label
                htmlFor="archivo-svg"
                className="flex cursor-pointer items-center gap-1 font-medium text-texto-suave transition-colors hover:text-rojo-acento"
              >
                <RefreshCw size={12} aria-hidden="true" />
                Cambiar archivo
              </label>
            </div>
            <p className="mt-1 text-xs text-texto-tenue">
              Así se verá como máscara. Si alguna muestra es un bloque sólido, el SVG trae relleno o fondo.
            </p>
          </div>
        ) : (
          <label
            htmlFor="archivo-svg"
            onDragOver={(evento) => {
              evento.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={soltar}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
              arrastrando ? "border-rojo-acento bg-rojo-tenue" : "border-borde-fuerte hover:border-rojo-acento"
            }`}
          >
            <FileUp size={24} className="text-rojo-acento" aria-hidden="true" />
            <span className="text-sm font-medium text-texto">Arrastra un SVG o haz clic para elegirlo</span>
            <span className="text-xs text-texto-tenue">
              Hasta 1 MB. Solo trazos: sin scripts, imágenes incrustadas ni enlaces externos.
            </span>
          </label>
        )}
        {problema && (
          <p role="alert" className="text-sm text-rojo-acento">
            {problema}
          </p>
        )}

        <label className="block text-sm font-medium">
          Nombre
          <input
            name="nombre"
            required
            minLength={2}
            maxLength={120}
            value={nombre}
            onChange={(evento) => {
              setNombre(evento.target.value);
              setNombreEditado(true);
            }}
            placeholder="Llama pastando"
            className={CAMPO}
          />
        </label>
        <label className="block text-sm font-medium">
          Etiquetas
          <input name="etiquetas" maxLength={300} placeholder="llama, línea, pasto" className={CAMPO} />
          <span className="mt-1 block text-xs font-normal text-texto-tenue">Separadas por comas. Sirven para buscarlo.</span>
        </label>
        <label className="block text-sm font-medium">
          Descripción
          <textarea name="descripcion" maxLength={400} rows={2} className={`${CAMPO} resize-none`} />
        </label>
        <label className="block text-sm font-medium">
          Origen
          <input name="origen" maxLength={300} placeholder="Vectorizada con potrace…" className={CAMPO} />
        </label>
        <label className="block text-sm font-medium">
          Dónde se usa <span className="font-normal text-texto-tenue">(opcional)</span>
          <input name="usado_en" maxLength={300} className={CAMPO} />
        </label>
      </div>

      <footer className="border-t border-borde px-6 py-4">
        {estado.estado === "error" && (
          <p role="alert" className="mb-3 text-sm text-rojo-acento">
            {estado.mensaje}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={alCancelar}
            className="rounded-lg border border-borde-fuerte bg-fondo px-4 py-2 text-sm font-medium text-texto transition-colors hover:bg-superficie"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!archivo || nombre.trim().length < 2 || enviando}
            className="rounded-lg bg-rojo px-4 py-2 text-sm font-semibold text-sobre-rojo transition-colors hover:bg-rojo-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando ? "Subiendo…" : "Subir al catálogo"}
          </button>
        </div>
      </footer>
    </form>
  );
}

function nombreDesdeArchivo(archivo: string) {
  const base = archivo.replace(/\.svg$/i, "").replace(/[-_]+/g, " ").trim();
  return base.charAt(0).toLocaleUpperCase("es") + base.slice(1);
}

function formatoPeso(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}
