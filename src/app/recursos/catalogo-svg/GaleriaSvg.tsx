"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { ASSETS_SVG, type AssetSvg } from "@/lib/catalogo-svg";

// Los SVG se pintan como máscara para que tomen el color del tema; así una
// ilustración en negro sigue siendo visible en modo oscuro.
const TONOS = [
  { id: "texto", nombre: "Texto", fondo: "bg-fondo", tinta: "bg-texto" },
  { id: "rojo", nombre: "Rojo", fondo: "bg-fondo", tinta: "bg-rojo-acento" },
  { id: "invertido", nombre: "Sobre rojo", fondo: "bg-rojo", tinta: "bg-sobre-rojo" },
] as const;

type Tono = (typeof TONOS)[number];

export function GaleriaSvg() {
  const [tonoId, setTonoId] = useState<Tono["id"]>("texto");
  const tono = TONOS.find((opcion) => opcion.id === tonoId) ?? TONOS[0];

  return (
    <div className="mt-8">
      <div role="radiogroup" aria-label="Tono de la vista previa" className="flex flex-wrap items-center gap-2">
        {TONOS.map((opcion) => (
          <button
            key={opcion.id}
            type="button"
            role="radio"
            aria-checked={opcion.id === tonoId}
            onClick={() => setTonoId(opcion.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              opcion.id === tonoId
                ? "border-rojo-acento text-rojo-acento"
                : "border-borde text-texto-suave hover:text-texto"
            }`}
          >
            {opcion.nombre}
          </button>
        ))}
        <span className="ml-auto text-sm text-texto-tenue">
          {ASSETS_SVG.length} {ASSETS_SVG.length === 1 ? "asset" : "assets"}
        </span>
      </div>

      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ASSETS_SVG.map((asset) => (
          <TarjetaSvg key={asset.id} asset={asset} tono={tono} />
        ))}
      </ul>
    </div>
  );
}

function TarjetaSvg({ asset, tono }: { asset: AssetSvg; tono: Tono }) {
  const mascara = `url('${asset.archivo}')`;

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-borde bg-fondo">
      <div className={`flex h-48 items-center justify-center p-6 transition-colors ${tono.fondo}`}>
        <span
          role="img"
          aria-label={asset.nombre}
          className={`block size-full transition-colors ${tono.tinta}`}
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
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-base font-semibold">{asset.nombre}</h2>
        <p className="mt-1 text-sm leading-relaxed text-texto-suave">{asset.descripcion}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {asset.etiquetas.map((etiqueta) => (
            <li key={etiqueta} className="rounded-md bg-superficie px-2 py-0.5 text-xs text-texto-tenue ring-1 ring-inset ring-borde">
              {etiqueta}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-texto-tenue">{asset.origen}</p>
        {asset.usadoEn && (
          <p className="mt-1 text-xs leading-relaxed text-texto-tenue">Uso: {asset.usadoEn}</p>
        )}

        <div className="mt-auto flex items-center gap-2 border-t border-borde pt-4">
          <code className="min-w-0 flex-1 truncate text-xs text-texto-suave">{asset.archivo}</code>
          <BotonCopiar texto={asset.archivo} />
          <a
            href={asset.archivo}
            download
            aria-label={`Descargar ${asset.nombre}`}
            title="Descargar SVG"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-borde bg-fondo text-texto-tenue transition-colors hover:border-rojo-acento hover:text-rojo-acento"
          >
            <Download size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
    </li>
  );
}

function BotonCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  async function copiar() {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCopiado(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={`Copiar ruta: ${texto}`}
      title={copiado ? "Copiado" : "Copiar ruta"}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-borde bg-fondo text-texto-tenue transition-colors hover:border-rojo-acento hover:text-rojo-acento"
    >
      {copiado ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
    </button>
  );
}
