/**
 * Esqueleto del panel de equipo.
 *
 * Reproduce la forma de la página (encabezado, contadores, filtros y tres
 * tarjetas) para que al llegar los datos nada salte de sitio.
 */
export default function CargandoEquipo() {
  const bloque = "animate-pulse rounded bg-borde";

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto w-full max-w-5xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6"
    >
      <span className="sr-only">Cargando el equipo…</span>

      <div aria-hidden="true">
        <div className={`h-4 w-28 ${bloque}`} />

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-3">
            <div className={`h-5 w-24 rounded-full ${bloque}`} />
            <div className={`h-8 w-36 ${bloque}`} />
            <div className={`h-4 w-80 max-w-full ${bloque}`} />
          </div>
          <div className={`h-10 w-44 rounded-lg ${bloque}`} />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-xl border border-borde bg-fondo p-4">
              <div className={`h-3 w-16 ${bloque}`} />
              <div className={`mt-2 h-7 w-8 ${bloque}`} />
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row">
          <div className={`h-10 flex-1 rounded-lg ${bloque}`} />
          <div className="flex gap-2">
            <div className={`h-10 w-40 rounded-lg ${bloque}`} />
            <div className={`h-10 w-40 rounded-lg ${bloque}`} />
            <div className={`h-10 w-20 rounded-lg ${bloque}`} />
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-xl border border-borde bg-fondo p-5">
              <div className="flex items-start justify-between">
                <div className={`size-12 rounded-full ${bloque}`} />
                <div className={`h-5 w-20 rounded-full ${bloque}`} />
              </div>
              <div className={`mt-3 h-4 w-3/4 ${bloque}`} />
              <div className={`mt-2 h-3.5 w-1/2 ${bloque}`} />
              <div className="mt-4 flex gap-1.5">
                <div className={`h-5 w-16 rounded-full ${bloque}`} />
                <div className={`h-5 w-24 rounded-full ${bloque}`} />
              </div>
              <div className="mt-4 space-y-2">
                <div className={`h-3.5 w-full ${bloque}`} />
                <div className={`h-3.5 w-11/12 ${bloque}`} />
                <div className={`h-3.5 w-2/3 ${bloque}`} />
              </div>
              <div className="mt-5 flex gap-2 border-t border-borde pt-3">
                <div className={`h-8 w-20 rounded-lg ${bloque}`} />
                <div className={`h-8 w-24 rounded-lg ${bloque}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
