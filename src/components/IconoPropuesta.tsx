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

  if (svg) {
    return (
      <span
        className={className}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  return <Icono nombre="libro" className={className} />;
}
