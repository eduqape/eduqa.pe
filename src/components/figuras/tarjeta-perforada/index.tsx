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
  titulo: "Formato de referencia",
  pista: "Mueve el lector ← →",
  lectura: lecturaDe(COLUMNA_INICIAL),
  claves: [
    { marca: "lit", texto: "La columna que lee el carro" },
    { marca: "raised", texto: "Topes en las columnas 7, 8, 12 y 73" },
  ],
  pie:
    "Tarjeta IBM de 80 columnas y 7⅜ × 3¼ pulgadas, con la línea de la sentencia DISPLAY perforada en el código de la IBM 029: cada carácter ocupa una columna y lleva hasta tres perforaciones entre las doce filas. Los topes de la guía separan las cinco zonas del formato fijo: secuencia (1–6), indicador (7), área A (8–11), área B (12–72) e identificación (73–80).",
  Cuerpo: () => <VivoTarjeta datos={DATOS} />,
} as const;
