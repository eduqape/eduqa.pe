/** Esqueleto de la ficha de un curso. */
export default function Cargando() {
  const bloque = "animate-pulse rounded bg-borde motion-reduce:animate-none";
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6" role="status" aria-label="Cargando el curso">
      <div className={`h-4 w-64 ${bloque}`} aria-hidden="true" />
      <div className="mt-6 flex items-start gap-4" aria-hidden="true">
        <div className={`size-12 rounded-lg ${bloque}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-3 w-24 ${bloque}`} />
          <div className={`h-8 w-2/3 ${bloque}`} />
        </div>
      </div>
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]" aria-hidden="true">
        <div className="space-y-4">
          <div className={`h-10 w-full rounded-lg ${bloque}`} />
          <div className={`h-24 w-full rounded-lg ${bloque}`} />
          <div className={`h-20 w-full rounded-xl ${bloque}`} />
          <div className="mt-8 h-64 animate-pulse rounded-xl border border-borde bg-fondo motion-reduce:animate-none" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-9 w-full ${bloque}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
