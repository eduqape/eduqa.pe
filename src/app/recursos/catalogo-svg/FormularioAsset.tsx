import { subirAsset } from "./acciones";

const CAMPO =
  "w-full rounded-lg border border-borde-fuerte bg-fondo px-3.5 py-2.5 text-sm text-texto focus:border-rojo-acento focus:outline-none focus:ring-1 focus:ring-rojo-acento";

export function FormularioAsset() {
  return (
    <details className="mt-8 rounded-xl border border-borde bg-fondo p-5">
      <summary className="cursor-pointer text-sm font-semibold text-rojo-acento">Subir un SVG nuevo</summary>
      <form action={subirAsset} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium sm:col-span-2">
          Archivo SVG
          <input
            name="archivo"
            type="file"
            accept="image/svg+xml,.svg"
            required
            className="mt-1.5 block w-full text-sm text-texto-suave file:mr-3 file:rounded-lg file:border file:border-borde-fuerte file:bg-fondo file:px-3 file:py-1.5 file:text-sm file:text-texto"
          />
          <span className="mt-1 block text-xs font-normal text-texto-tenue">
            Hasta 1 MB. Solo trazos: sin scripts, imágenes incrustadas ni enlaces externos.
          </span>
        </label>
        <label className="block text-sm font-medium">
          Nombre
          <input name="nombre" required minLength={2} maxLength={120} placeholder="Llama pastando" className={`mt-1.5 ${CAMPO}`} />
        </label>
        <label className="block text-sm font-medium">
          Etiquetas
          <input name="etiquetas" maxLength={300} placeholder="llama, línea, pasto" className={`mt-1.5 ${CAMPO}`} />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Descripción
          <input name="descripcion" maxLength={400} className={`mt-1.5 ${CAMPO}`} />
        </label>
        <label className="block text-sm font-medium">
          Origen
          <input name="origen" maxLength={300} placeholder="Vectorizada con potrace…" className={`mt-1.5 ${CAMPO}`} />
        </label>
        <label className="block text-sm font-medium">
          Dónde se usa <span className="font-normal text-texto-tenue">(opcional)</span>
          <input name="usado_en" maxLength={300} className={`mt-1.5 ${CAMPO}`} />
        </label>
        <div className="sm:col-span-2">
          <button className="rounded-lg bg-rojo px-4 py-2 text-sm font-semibold text-sobre-rojo hover:bg-rojo-hover">
            Subir al catálogo
          </button>
        </div>
      </form>
    </details>
  );
}
