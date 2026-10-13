/** Esqueleto del listado: la misma silueta que la página, sin saltos al cargar. */
export default function Cargando() {
  const bloque = "animate-pulse rounded bg-borde motion-reduce:animate-none";
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6" role="status" aria-label="Cargando los cursos">
      <div className={`h-4 w-48 ${bloque}`} aria-hidden="true" />
      <div className="mt-6 flex items-end justify-between gap-4" aria-hidden="true">
        <div className="space-y-3">
          <div className={`h-5 w-36 rounded-full ${bloque}`} />
          <div className={`h-8 w-72 max-w-full ${bloque}`} />
          <div className={`h-4 w-96 max-w-full ${bloque}`} />
        </div>
        <div className={`hidden h-10 w-64 rounded-lg sm:block ${bloque}`} />
      </div>
      <div className={`mt-8 h-10 w-full rounded-lg ${bloque}`} aria-hidden="true" />
      <div className="mt-4 flex gap-2" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-6 w-20 rounded-full ${bloque}`} />
        ))}
      </div>
      <div className="mt-8 space-y-2" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-[62px] animate-pulse rounded-xl border border-borde bg-fondo motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
