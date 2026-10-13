import { COLUMNA_INICIAL, PASO_PANTALLA, SVG, X_PANTALLA, leidosDe } from "./geometria";
import { COLUMNAS, lecturaDe, lecturaHablada } from "./modelo";
import { VivoTarjeta, type DatosTarjeta } from "./Vivo";
import "./tarjeta.css";

const columnas = Array.from({ length: COLUMNAS }, (_, i) => i + 1);

// Datos serializables para el cliente: no necesita el kit ni la geometría.
const DATOS: DatosTarjeta = {
  svg: SVG,
  paso: PASO_PANTALLA,
  xPantalla: X_PANTALLA,
  leidos: columnas.map(leidosDe),
  lecturas: columnas.map(lecturaDe),
  habladas: columnas.map(lecturaHablada),
  inicial: COLUMNA_INICIAL,
};

export const TARJETA_PERFORADA = {
  pista: "Mueve el lector ← →",
  lectura: lecturaDe(COLUMNA_INICIAL),
  claves: [
    { marca: "lit", texto: "La columna que lee el carro" },
    { marca: "raised", texto: "Topes en las columnas 7, 8, 12 y 73" },
  ],
  Cuerpo: () => <VivoTarjeta datos={DATOS} />,
} as const;
