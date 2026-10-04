// Catálogo de ilustraciones vectoriales de EDUQA.PE. Cada archivo vive en
// `public/` y se obtuvo con herramientas de vectorización, nunca dibujado a
// mano (ver AGENTS.md). Para sumar un asset: copiar el SVG a `public/` y
// agregar su entrada aquí.
export type AssetSvg = {
  id: string;
  nombre: string;
  archivo: string;
  descripcion: string;
  etiquetas: string[];
  origen: string;
  usadoEn?: string;
};

export const ASSETS_SVG: AssetSvg[] = [
  {
    id: "llama-rigor-verificable",
    nombre: "Llama · rigor verificable",
    archivo: "/llama-rigor-verificable.svg",
    descripcion: "Llama de pie junto a una escala de medición, en trazo de línea.",
    etiquetas: ["llama", "línea", "medición"],
    origen: "Vectorizada a partir de una ilustración de línea.",
    usadoEn: "Landing, pilar «Rigor verificable».",
  },
  {
    id: "llama-dormida",
    nombre: "Llama dormida",
    archivo: "/llama-dormida.svg",
    descripcion: "Llama recostada y dormida sobre su lana, en trazo de línea grueso.",
    etiquetas: ["llama", "línea", "descanso"],
    origen: "Vectorizada con potrace a partir de una ilustración blanca sobre rojo.",
  },
];
