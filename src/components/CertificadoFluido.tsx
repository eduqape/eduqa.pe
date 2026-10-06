"use client";

import { useEffect, useRef, useState } from "react";
import { Certificado, type DatosCertificado, type Variante } from "./Certificado";

/** 297 mm en px CSS (96 dpi): el ancho natural del A4 apaisado. */
const ANCHO_A4_PX = (297 / 25.4) * 96;

/**
 * Como `VistaPrevia`, pero la escala la decide el ancho del contenedor: ocupa
 * todo el espacio disponible sin desbordar en el móvil. Hasta medirlo se
 * reserva el hueco con la proporción del A4 para no mover la página.
 */
export function CertificadoFluido({
  datos,
  variante,
  className = "",
}: {
  datos: DatosCertificado;
  variante?: Variante;
  className?: string;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState<number | null>(null);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setEscala(el.clientWidth / ANCHO_A4_PX);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={caja}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: "297 / 210" }}
    >
      {escala !== null && (
        <div
          className="absolute left-0 top-0"
          style={{ transform: `scale(${escala})`, transformOrigin: "top left" }}
        >
          <Certificado datos={datos} variante={variante} />
        </div>
      )}
    </div>
  );
}
