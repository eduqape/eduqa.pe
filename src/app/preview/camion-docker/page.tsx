import type { Metadata } from "next";
import { VistaCamion } from "./VistaCamion";

export const metadata: Metadata = {
  title: "Camión Docker (vista previa)",
  robots: { index: false },
};

export default function Page() {
  return (
    <main className="bg-[#e2eee3]">
      <VistaCamion />
    </main>
  );
}
