/** Esqueleto del editor: barra fija y área de escritura. */
export default function Cargando() {
  const bloque = "animate-pulse rounded bg-borde motion-reduce:animate-none";
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6" role="status" aria-label="Abriendo el editor">
      <div className={`h-4 w-80 max-w-full ${bloque}`} aria-hidden="true" />
      <div className="mt-6 flex items-center gap-3 border-b border-borde pb-3" aria-hidden="true">
        <div className="flex-1 space-y-2">
          <div className={`h-4 w-56 ${bloque}`} />
          <div className={`h-3 w-32 ${bloque}`} />
        </div>
        <div className={`h-8 w-48 rounded-lg ${bloque}`} />
        <div className={`h-9 w-24 rounded-lg ${bloque}`} />
      </div>
      <div className="mt-6 h-[65vh] animate-pulse rounded-xl border border-borde bg-fondo motion-reduce:animate-none" aria-hidden="true" />
    </div>
  );
}
