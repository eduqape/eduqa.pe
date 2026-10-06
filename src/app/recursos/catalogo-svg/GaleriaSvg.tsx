"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, Search, Trash2, X } from "lucide-react";
import type { AssetSvg } from "@/lib/catalogo-svg";
import { eliminarAsset } from "./acciones";
import { SubirSvg } from "./SubirSvg";
import { FONDOS, Mascara, Muestras, TINTAS } from "./tonos";

export function GaleriaSvg({ assets, administrador }: { assets: AssetSvg[]; administrador: boolean }) {
  const [fondoId, setFondoId] = useState("tema");
  const [tintaId, setTintaId] = useState("tema");
  const [consulta, setConsulta] = useState("");
  const [etiqueta, setEtiqueta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const fondo = FONDOS.find((opcion) => opcion.id === fondoId) ?? FONDOS[0];
  const tinta = TINTAS.find((opcion) => opcion.id === tintaId) ?? TINTAS[0];

  const visibles = useMemo(() => {
    const terminos = normalizar(consulta).split(/\s+/).filter(Boolean);
    return assets.filter((asset) => {
      if (etiqueta && !asset.etiquetas.includes(etiqueta)) return false;
      const texto = normalizar([asset.nombre, asset.descripcion, asset.origen, ...asset.etiquetas].join(" "));
      return terminos.every((termino) => texto.includes(termino));
    });
  }, [assets, consulta, etiqueta]);

  return (
    <div className="mt-8">
      {aviso && (
        <p role="status" className="mb-5 flex items-center gap-2 text-sm text-texto">
          <Check size={16} className="text-exito" aria-hidden="true" />
          {aviso}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 basis-60">
          <span className="sr-only">Buscar en el catálogo</span>
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-texto-tenue" aria-hidden="true" />
          <input
            type="search"
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
            placeholder="Buscar por nombre, etiqueta u origen"
            className="w-full rounded-lg border border-borde-fuerte bg-fondo py-2 pr-3 pl-9 text-sm text-texto placeholder:text-texto-tenue focus:border-rojo-acento focus:outline-none focus:ring-1 focus:ring-rojo-acento"
          />
        </label>
        {administrador && (
          <SubirSvg
            alSubir={(nombre) => {
              setAviso(`«${nombre}» se subió y ya está en el catálogo.`);
              setConsulta("");
              setEtiqueta(null);
            }}
          />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Muestras etiqueta="Fondo" colores={FONDOS} valor={fondoId} alCambiar={setFondoId} />
        <Muestras etiqueta="Tinta" colores={TINTAS} valor={tintaId} alCambiar={setTintaId} />
        <div className="ml-auto flex items-center gap-2 text-sm text-texto-tenue">
          {etiqueta && (
            <button
              type="button"
              onClick={() => setEtiqueta(null)}
              aria-label={`Quitar el filtro ${etiqueta}`}
              className="flex items-center gap-1 rounded-md bg-rojo-tenue px-2 py-0.5 text-xs font-medium text-rojo-acento"
            >
              {etiqueta}
              <X size={12} aria-hidden="true" />
            </button>
          )}
          <span aria-live="polite">
            {visibles.length === assets.length
              ? `${assets.length} ${assets.length === 1 ? "asset" : "assets"}`
              : `${visibles.length} de ${assets.length}`}
          </span>
        </div>
      </div>

      {visibles.length > 0 ? (
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((asset) => (
            <TarjetaSvg
              key={asset.id}
              asset={asset}
              fondo={fondo.clase}
              tinta={tinta.clase}
              etiquetaActiva={etiqueta}
              alFiltrar={setEtiqueta}
              administrador={administrador}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-6 py-16 text-center">
          <p className="text-sm text-texto-suave">Ningún asset coincide con la búsqueda.</p>
          <button
            type="button"
            onClick={() => {
              setConsulta("");
              setEtiqueta(null);
            }}
            className="mt-2 text-sm font-medium text-rojo-acento hover:underline"
          >
            Ver todo el catálogo
          </button>
        </div>
      )}
    </div>
  );
}

function TarjetaSvg({
  asset,
  fondo,
  tinta,
  etiquetaActiva,
  alFiltrar,
  administrador,
}: {
  asset: AssetSvg;
  fondo: string;
  tinta: string;
  etiquetaActiva: string | null;
  alFiltrar: (etiqueta: string | null) => void;
  administrador: boolean;
}) {
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-borde bg-fondo">
      <div className={`flex h-48 items-center justify-center p-6 transition-colors ${fondo}`}>
        <Mascara url={asset.archivo} nombre={asset.nombre} tinta={tinta} />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-base font-semibold">{asset.nombre}</h2>
        <p className="mt-1 text-sm leading-relaxed text-texto-suave">{asset.descripcion}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {asset.etiquetas.map((etiqueta) => {
            const activa = etiqueta === etiquetaActiva;
            return (
              <li key={etiqueta}>
                <button
                  type="button"
                  aria-pressed={activa}
                  title={activa ? "Quitar filtro" : `Ver solo «${etiqueta}»`}
                  onClick={() => alFiltrar(activa ? null : etiqueta)}
                  className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
                    activa
                      ? "bg-rojo-tenue text-rojo-acento"
                      : "bg-superficie text-texto-tenue ring-1 ring-inset ring-borde hover:text-rojo-acento"
                  }`}
                >
                  {etiqueta}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-texto-tenue">{asset.origen}</p>
        {asset.usado_en && (
          <p className="mt-1 text-xs leading-relaxed text-texto-tenue">Uso: {asset.usado_en}</p>
        )}

        <div className="mt-auto flex items-center gap-2 border-t border-borde pt-4">
          <code title={asset.archivo} className="min-w-0 flex-1 truncate text-xs text-texto-suave">{rutaVisible(asset)}</code>
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
          {administrador && <BotonEliminar asset={asset} />}
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

// Las URLs del bucket son largas; en la card basta con el nombre del archivo.
function rutaVisible(asset: AssetSvg) {
  return asset.ruta_storage ? `assets-svg/${asset.ruta_storage}` : asset.archivo;
}

function BotonEliminar({ asset }: { asset: AssetSvg }) {
  const aviso = asset.ruta_storage
    ? `¿Eliminar «${asset.nombre}» del catálogo? También se borrará el archivo.`
    : `¿Quitar «${asset.nombre}» del catálogo? El archivo sigue en /public porque lo usa el sitio.`;

  return (
    <form
      action={eliminarAsset}
      onSubmit={(evento) => {
        if (!window.confirm(aviso)) evento.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={asset.id} />
      <button
        type="submit"
        aria-label={`Eliminar ${asset.nombre}`}
        title="Eliminar del catálogo"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-borde bg-fondo text-texto-tenue transition-colors hover:border-rojo-acento hover:text-rojo-acento"
      >
        <Trash2 size={15} aria-hidden="true" />
      </button>
    </form>
  );
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}
