"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Colores del tema activo, leídos de los tokens CSS (`--color-*` de
 * `globals.css`). Las escenas 3D no pueden usar clases de Tailwind, así que
 * toman los mismos valores de aquí: siguen al modo claro, al oscuro y al
 * monocromático sin tener una paleta propia por cada uno.
 */
const TOKENS = [
  "rojo",
  "rojo-tenue",
  "sobre-rojo",
  "fondo",
  "superficie",
  "borde",
  "borde-fuerte",
  "texto",
  "texto-suave",
  "texto-tenue",
] as const;

export type PaletaTema = Record<(typeof TOKENS)[number], string> & {
  oscuro: boolean;
  /** Cambia cuando cambia el tema; sirve de `key` para repintar una escena. */
  clave: string;
};

// El tema vive en las clases de <html> (`dark`, `mono`), que gestionan
// next-themes y `cromatismo.ts`.
function suscribir(avisar: () => void) {
  const vigia = new MutationObserver(avisar);
  vigia.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  return () => vigia.disconnect();
}
const clasesHtml = () => document.documentElement.className;

export function usePaletaTema(): PaletaTema | null {
  const clases = useSyncExternalStore(suscribir, clasesHtml, () => null);
  return useMemo(() => {
    if (clases === null) return null;
    const estilo = getComputedStyle(document.documentElement);
    const paleta = Object.fromEntries(
      TOKENS.map((t) => [t, estilo.getPropertyValue(`--color-${t}`).trim()]),
    ) as Record<(typeof TOKENS)[number], string>;
    return {
      ...paleta,
      oscuro: document.documentElement.classList.contains("dark"),
      clave: TOKENS.map((t) => paleta[t]).join(","),
    };
  }, [clases]);
}
