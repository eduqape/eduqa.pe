"use client";

import { Printer } from "lucide-react";

export function ImprimirCertificado() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover print:hidden"
    >
      <Printer size={16} aria-hidden="true" />
      Imprimir / guardar PDF
    </button>
  );
}
