// La vista previa combina un fondo y una tinta por separado. Con una lista de
// combinaciones fijas cada tono nuevo era un botón más; así cuatro fondos y
// seis tintas dan veinticuatro combinaciones con diez muestras.
//
// «Tema» sigue al modo claro u oscuro; el resto son fijos para ver el asset
// en el modo contrario sin cambiar el tema. Ningún fijo repite un token: los
// colores que coincidían (sobre-rojo es siempre blanco) se quitaron.
const TEMA = "bg-[linear-gradient(135deg,#ffffff_50%,#0b0b0d_50%)]";

export const FONDOS: readonly Color[] = [
  { id: "tema", nombre: "Fondo del tema", clase: "bg-fondo", muestra: TEMA },
  { id: "claro", nombre: "Claro", clase: "bg-white" },
  { id: "oscuro", nombre: "Oscuro", clase: "bg-[#0b0b0d]" },
  { id: "rojo", nombre: "Rojo de marca", clase: "bg-[#c70724]" },
];

export const TINTAS: readonly Color[] = [
  { id: "tema", nombre: "Texto del tema", clase: "bg-texto", muestra: TEMA },
  { id: "negro", nombre: "Negro", clase: "bg-zinc-900" },
  { id: "gris", nombre: "Gris", clase: "bg-zinc-500" },
  { id: "rojo", nombre: "Rojo de marca", clase: "bg-[#c70724]" },
  { id: "rosa", nombre: "Rojo acento oscuro", clase: "bg-[#ff6b7d]" },
  { id: "blanco", nombre: "Blanco", clase: "bg-white" },
];

/** `muestra` sustituye a `clase` en el círculo cuando el color no es fijo. */
export type Color = { id: string; nombre: string; clase: string; muestra?: string };

/**
 * Pinta el SVG como máscara para que tome la tinta elegida; así una
 * ilustración en negro sigue siendo visible sobre un fondo oscuro.
 */
export function Mascara({ url, nombre, tinta }: { url: string; nombre: string; tinta: string }) {
  const mascara = `url('${url}')`;
  return (
    <span
      role="img"
      aria-label={nombre}
      className={`block size-full transition-colors ${tinta}`}
      style={{
        WebkitMaskImage: mascara,
        maskImage: mascara,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

export function Muestras({
  etiqueta,
  colores,
  valor,
  alCambiar,
}: {
  etiqueta: string;
  colores: readonly Color[];
  valor: string;
  alCambiar: (id: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex items-center gap-2">
      <span className="text-xs font-medium text-texto-tenue">{etiqueta}</span>
      <div className="flex items-center gap-1.5">
        {colores.map((color) => {
          const activo = color.id === valor;
          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={activo}
              aria-label={color.nombre}
              title={color.nombre}
              onClick={() => alCambiar(color.id)}
              className={`size-6 rounded-full ring-1 ring-inset ring-borde-fuerte transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento ${color.muestra ?? color.clase} ${
                activo ? "shadow-[0_0_0_2px_var(--color-fondo),0_0_0_4px_var(--color-rojo-acento)]" : ""
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
