/**
 * Cierra los tickets que los commits declaran con Closes/Fixes/Resolves cuando
 * esos commits llegan a `main`.
 *
 * GitHub ya lo hace solo con los pushes de personas, pero aquí a `main` lo
 * avanza el workflow con GITHUB_TOKEN, y GitHub no procesa las palabras clave
 * de esos pushes: los tickets quedaban abiertos (#135). Este script hace ese
 * trabajo en el job de promoción.
 *
 * Uso: node scripts/cerrar-tickets.mjs <main-anterior> <main-nuevo> [--simular]
 * Necesita GITHUB_REPOSITORY y GITHUB_TOKEN (con permiso issues: write), salvo
 * con --simular, que solo lista lo que cerraría.
 */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/**
 * Tickets que cierra un mensaje: líneas como «Closes: #2, #3», «Fixes #4» o
 * «Resolves: #5 y #6». «Refs:» solo vincula, no cierra.
 */
export function ticketsQueCierra(mensaje) {
  const tickets = [];
  const linea = /^(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\b\s*:?\s*((?:#\d+(?:\s*(?:,|y|and)?\s*))+)$/gim;
  for (const [, lista] of mensaje.matchAll(linea)) {
    for (const [, numero] of lista.matchAll(/#(\d+)/g)) tickets.push(Number(numero));
  }
  return [...new Set(tickets)];
}

/** Commits del rango con los tickets que cierra cada uno, del más antiguo al más nuevo. */
export function commitsDelRango(desde, hasta) {
  const salida = execFileSync("git", ["log", "--reverse", "--format=%H%x1f%B%x00", `${desde}..${hasta}`], {
    encoding: "utf8",
  });
  return salida
    .split("\0")
    .map((bloque) => bloque.trim())
    .filter(Boolean)
    .map((bloque) => {
      const [sha, mensaje] = bloque.split("\x1f");
      return { sha, cabecera: mensaje.split("\n", 1)[0], tickets: ticketsQueCierra(mensaje) };
    });
}

async function github(ruta, opciones = {}) {
  const respuesta = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${ruta}`, {
    ...opciones,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "User-Agent": "eduqa-cerrar-tickets",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opciones.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!respuesta.ok) throw new Error(`GitHub ${respuesta.status} en ${ruta}: ${await respuesta.text()}`);
  return respuesta.json();
}

async function main() {
  const argumentos = process.argv.slice(2);
  const simular = argumentos.includes("--simular");
  const [desde, hasta] = argumentos.filter((a) => !a.startsWith("--"));
  if (!desde || !hasta) {
    console.error("Uso: node scripts/cerrar-tickets.mjs <main-anterior> <main-nuevo> [--simular]");
    process.exit(2);
  }
  if (!simular && (!process.env.GITHUB_REPOSITORY || !process.env.GITHUB_TOKEN)) {
    console.error("Faltan GITHUB_REPOSITORY o GITHUB_TOKEN.");
    process.exit(2);
  }

  // Cada ticket se atribuye al primer commit que lo cierra.
  const cierres = new Map();
  for (const commit of commitsDelRango(desde, hasta)) {
    for (const ticket of commit.tickets) if (!cierres.has(ticket)) cierres.set(ticket, commit);
  }
  if (cierres.size === 0) {
    console.log("Ningún commit nuevo en main cierra tickets.");
    return;
  }

  for (const [ticket, commit] of cierres) {
    const corto = commit.sha.slice(0, 7);
    if (simular) {
      console.log(`#${ticket} ← ${corto} ${commit.cabecera}`);
      continue;
    }
    const ticketGithub = await github(`/issues/${ticket}`);
    if (ticketGithub.pull_request) {
      console.log(`#${ticket} es un pull request; se omite.`);
      continue;
    }
    if (ticketGithub.state === "closed") {
      console.log(`#${ticket} ya estaba cerrado.`);
      continue;
    }
    await github(`/issues/${ticket}/comments`, {
      method: "POST",
      body: JSON.stringify({
        body: `Cerrado por ${commit.sha} al llegar a \`main\`: «${commit.cabecera}».`,
      }),
    });
    await github(`/issues/${ticket}`, {
      method: "PATCH",
      body: JSON.stringify({ state: "closed", state_reason: "completed" }),
    });
    console.log(`#${ticket} cerrado por ${corto}.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
