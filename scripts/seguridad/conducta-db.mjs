/**
 * Ejecuta conducta-db.sql contra la base enlazada y lee sus resultados.
 *
 * El SQL intenta los ataques como un alumno real y termina siempre con una
 * excepción «RESULTADOS …» que deshace la transacción. Por eso aquí el error
 * es lo esperado: lo que decide si pasa es que ninguna línea diga «FALLA».
 *
 * Escribe dentro de una transacción en producción (que se revierte), así que
 * no corre en CI: se lanza a mano con `npm run test:seguridad:conducta`
 * después de aplicar una migración de permisos.
 */
import { spawnSync } from "node:child_process";

const r = spawnSync(
  "supabase",
  ["db", "query", "--linked", "--file", "scripts/seguridad/conducta-db.sql"],
  { encoding: "utf8" },
);
const salida = `${r.stdout}\n${r.stderr}`;
const encontrado = salida.match(/RESULTADOS (.*?)(?:\\n|"|\n|$)/);
if (!encontrado) {
  console.error("La prueba no devolvió resultados. Salida del CLI:\n", salida.slice(-2000));
  process.exit(2);
}

const lineas = encontrado[1].split(" || ").map((l) => l.replace(/\\+$/, ""));
for (const linea of lineas) console.log(`${linea.includes("FALLA") ? "✖" : "✔"} ${linea}`);
const fallas = lineas.filter((l) => l.includes("FALLA") || (l.startsWith("preparación") && l.includes("=false")));
if (fallas.length > 0) {
  console.error(`\n${fallas.length} ataque(s) funcionaron.`);
  process.exit(1);
}
console.log("\nNingún ataque funcionó; la transacción se revirtió.");
