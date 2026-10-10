import type { Metadata } from "next";
import { VistaVariables } from "./VistaVariables";

export const metadata: Metadata = {
  title: "Variables en 3D (vista previa)",
  robots: { index: false },
};

export default function Page() {
  return (
    <main className="bg-fondo">
      <VistaVariables cual="definicion" />
    </main>
  );
}
