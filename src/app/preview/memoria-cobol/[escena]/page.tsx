import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VistaMemoria } from "../VistaMemoria";

// Los nombres van aquí: lo que exporta un módulo "use client" llega al servidor como referencia.
const ESCENAS = ["registro", "alfanumerico", "numerico"] as const;

export const metadata: Metadata = {
  title: "Memoria de COBOL en 3D (vista previa)",
  robots: { index: false },
};

/** Vista local a pantalla completa: /preview/memoria-cobol/registro, /alfanumerico o /numerico. */
export default async function Page({ params }: { params: Promise<{ escena: string }> }) {
  const { escena } = await params;
  const cual = ESCENAS.find((nombre) => nombre === escena);
  if (!cual) notFound();
  return (
    <main className="bg-fondo">
      <VistaMemoria cual={cual} />
    </main>
  );
}
