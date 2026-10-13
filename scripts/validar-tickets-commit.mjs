import fs from "node:fs";

const verificarGithub = process.argv.includes("--github");
const archivo = process.argv.slice(2).find((argumento) => !argumento.startsWith("--"));
const entrada = fs.readFileSync(archivo ?? 0, "utf8");
const mensajes = entrada
  .split("\0")
  .map((mensaje) => mensaje.trim())
  .filter(Boolean);

const referencias = new Set();
const errores = [];

// La firma publicitaria de Claude Code no va en el historial, con o sin el
// emoji, el enlace o el corchete del Markdown.
const firmaGenerada = /generated\s+(with|by)\s+\[?\s*claude\s+code/i;

for (const mensaje of mensajes) {
  const cabecera = mensaje.split("\n", 1)[0];
  if (firmaGenerada.test(mensaje)) {
    errores.push(`«${cabecera}» lleva la línea «Generated with Claude Code». Quítala del mensaje.`);
  }
  const lineas = [...mensaje.matchAll(/^(Refs?|Closes?|Fixes?|Resolves?):\s*(.+)$/gim)];
  const tickets = lineas.flatMap((linea) =>
    [...linea[2].matchAll(/#(\d+)/g)].map((coincidencia) => Number(coincidencia[1])),
  );
  if (tickets.length === 0) {
    errores.push(`«${cabecera}» no vincula un ticket. Añade, por ejemplo, Refs: #6.`);
    continue;
  }
  tickets.forEach((ticket) => referencias.add(ticket));
}

if (errores.length > 0) {
  console.error(errores.join("\n"));
  process.exit(1);
}

if (verificarGithub && referencias.size > 0) {
  const repositorio = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repositorio || !token) {
    console.error("Faltan GITHUB_REPOSITORY o GITHUB_TOKEN para comprobar los tickets.");
    process.exit(1);
  }

  for (const ticket of referencias) {
    const respuesta = await fetch(`https://api.github.com/repos/${repositorio}/issues/${ticket}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "eduqa-ticket-validator",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!respuesta.ok) {
      console.error(`#${ticket} no es un ticket accesible de ${repositorio}.`);
      process.exit(1);
    }
    const dato = await respuesta.json();
    if (dato.pull_request) {
      console.error(`#${ticket} es un pull request; la entrega debe vincular un ticket.`);
      process.exit(1);
    }
  }
}

if (mensajes.length > 0) {
  console.log(
    `${mensajes.length} ${mensajes.length === 1 ? "commit vinculado" : "commits vinculados"} a ${
      [...referencias].sort((a, b) => a - b).map((ticket) => `#${ticket}`).join(", ")
    }.`,
  );
}
