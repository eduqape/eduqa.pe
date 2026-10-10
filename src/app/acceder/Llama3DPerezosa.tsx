"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

/**
 * three.js y los modelos pesan cerca de 3 MB: la llama se descarga aparte
 * para que el formulario aparezca y responda sin esperarla, y solo en
 * pantallas anchas, que son las únicas donde se muestra.
 */
const Llama3D = dynamic(
  () => import("@/components/Llama3D").then((m) => m.Llama3D),
  { ssr: false },
);

const ANCHA = "(min-width: 1024px)";

function suscribir(avisar: () => void) {
  const consulta = window.matchMedia(ANCHA);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

export function Llama3DPerezosa() {
  const ancha = useSyncExternalStore(
    suscribir,
    () => window.matchMedia(ANCHA).matches,
    () => false,
  );
  return ancha ? <Llama3D /> : null;
}
