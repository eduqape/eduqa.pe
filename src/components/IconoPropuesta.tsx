"use client";

import { Icono } from "@/components/Iconos";
import { esIconoCurso } from "@/lib/iconos-curso";

export function IconoPropuesta({
  nombre,
  svg,
  className,
}: {
  nombre?: string | null;
  svg?: string | null;
  className?: string;
}) {
  if (nombre && esIconoCurso(nombre)) {
    return <Icono nombre={nombre} className={className} />;
  }

  // El SVG subido se usa como máscara y no como HTML: una imagen no ejecuta
  // scripts aunque alguno pase los filtros, y la máscara toma el color del
  // texto igual que los iconos propios.
  if (svg) {
    const url = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
    return (
      <span
        className={`inline-block bg-current ${className ?? ""}`}
        aria-hidden="true"
        style={{
          maskImage: url,
          WebkitMaskImage: url,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskSize: "contain",
          WebkitMaskSize: "contain",
        }}
      />
    );
  }

  return <Icono nombre="libro" className={className} />;
}
