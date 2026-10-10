import { MarcaCalculadora } from "@/components/MarcaCalculadora";

/**
 * La misma marca en la navegación general y en las lecciones: EDUQA.PE en la
 * letra de calculadora del acceso, con sus dígitos que ruedan. Va sin la llama
 * al lado; el texto es la marca.
 */
export function MarcaTextoLateral({
  ocultarAlColapsar = false,
}: {
  ocultarAlColapsar?: boolean;
}) {
  return (
    <MarcaCalculadora
      className={`text-lg tracking-[0.12em] text-rojo-acento${ocultarAlColapsar ? " sidebar-etiqueta" : ""}`}
    />
  );
}
