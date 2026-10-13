/**
 * Cierra los tickets que los commits declaran con Closes/Fixes/Resolves cuando
 * esos commits llegan a `main`.
 *
 * GitHub ya lo hace solo con los pushes de personas, pero aquí a `main` lo
 * avanza el workflow con GITHUB_TOKEN, y GitHub no procesa las palabras clave
 * de esos pushes: los tickets quedaban abiertos (#135). Este script hace ese
 * trabajo en el job de promoción.
 *
 * Un commit con contenido de curso (`src/content/<slug>/curso.md` o
 * `sesion-N.md`) no cierra su ticket: llegar a `main` no publica el curso,
 * que en runtime vive en Supabase. El ticket queda abierto con un comentario
 * y se cierra a mano después de publicarlo y verlo en producción (#153).
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

/** Ficha o sesión de un curso en Markdown; no el formato ni las fixtures. */
export const esContenidoDeCurso = (ruta) => /^src\/content\/[^/]+\/(?:curso|sesion-\d+)\.md$/.test(ruta);

const archivosDe = (sha) =>
  execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", "--root", sha], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);

/**
 * Commits del rango con los tickets que cierra cada uno y si traen contenido
 * de curso, del más antiguo al más nuevo.
 */
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
      const tickets = ticketsQueCierra(mensaje);
      const curso = tickets.length > 0 && archivosDe(sha).some(esContenidoDeCurso);
      return { sha, cabecera: mensaje.split("\n", 1)[0], tickets, curso };
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

  // Cada ticket se atribuye al primer commit que lo cierra; basta uno con
  // contenido de curso para que quede abierto.
  const cierres = new Map();
  const deCurso = new Map();
  for (const commit of commitsDelRango(desde, hasta)) {
    for (const ticket of commit.tickets) {
      if (!cierres.has(ticket)) cierres.set(ticket, commit);
      if (commit.curso && !deCurso.has(ticket)) deCurso.set(ticket, commit);
    }
  }
  if (cierres.size === 0) {
    console.log("Ningún commit nuevo en main cierra tickets.");
    return;
  }

  for (const [ticket, primero] of cierres) {
    const commit = deCurso.get(ticket) ?? primero;
    const corto = commit.sha.slice(0, 7);
    if (simular) {
      const nota = deCurso.has(ticket) ? " (contenido de curso: queda abierto)" : "";
      console.log(`#${ticket} ← ${corto} ${commit.cabecera}${nota}`);
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
    if (deCurso.has(ticket)) {
      await github(`/issues/${ticket}/comments`, {
        method: "POST",
        body: JSON.stringify({
          body:
            `${commit.sha} llegó a \`main\` con contenido de curso: «${commit.cabecera}». ` +
            "No se cierra solo porque el repositorio no publica cursos: viven en Supabase. Se cierra a mano " +
            "después de publicarlo (`/api/v1/cursos` o `/panel/cursos/importar`) y comprobar en producción " +
            "que aparece en `/panel/cursos` y que sus sesiones abren.",
        }),
      });
      console.log(`#${ticket} queda abierto: ${corto} trae contenido de curso.`);
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
