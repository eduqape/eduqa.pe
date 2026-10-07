"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

/**
 * Desplegable sobre Radix Select.
 *
 * El `select` nativo lo pinta el sistema operativo: en macOS es una lista
 * gris con su propia tipografía, en Windows otra y en Android otra más, y
 * ninguna respeta el tema de la página. Radix lo reconstruye con elementos
 * propios manteniendo el teclado y las etiquetas ARIA que el nativo trae de
 * fábrica, así que el aspecto es el mismo en todas partes sin perder
 * accesibilidad.
 */
export function Selector({
  valor,
  onCambio,
  opciones,
  etiqueta,
  talla = "campo",
  marcador,
  className,
}: {
  valor: string;
  onCambio: (v: string) => void;
  opciones: { valor: string; etiqueta: string }[];
  /** Nombre para lectores de pantalla cuando no hay <label> visible. */
  etiqueta?: string;
  /**
   * `campo` iguala la altura de los inputs de texto, que es lo que se
   * necesita cuando el desplegable comparte fila con uno. `compacta` es
   * para filas de tabla, donde un control de altura completa las separa
   * más de lo que la densidad de la tabla admite.
   */
  talla?: "campo" | "compacta";
  /** Texto que se muestra mientras no hay nada elegido (`valor` vacío). */
  marcador?: string;
  className?: string;
}) {
  return (
    <Select.Root value={valor} onValueChange={onCambio}>
      <Select.Trigger
        aria-label={etiqueta}
        className={`inline-flex items-center justify-between gap-2 rounded-lg border border-borde-fuerte bg-fondo px-3 ${
          talla === "campo" ? "py-2.5" : "py-1.5"
        } text-sm text-texto transition-colors hover:border-rojo-acento focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento ${className ?? ""}`}
      >
        <Select.Value placeholder={marcador} />
        <Select.Icon>
          <ChevronDown size={14} aria-hidden="true" className="text-texto-tenue" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] max-w-[min(32rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-borde bg-fondo shadow-lg"
        >
          <Select.Viewport className="p-1">
            {opciones.map((o) => (
              <Select.Item
                key={o.valor}
                value={o.valor}
                className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-md px-3 py-1.5 text-left text-sm text-texto-suave outline-none data-[highlighted]:bg-superficie data-[state=checked]:font-medium data-[highlighted]:text-texto data-[state=checked]:text-rojo-acento"
              >
                <Select.ItemText>{o.etiqueta}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={14} aria-hidden="true" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
