/**
 * Redes de los perfiles del equipo.
 *
 * Vive fuera de `Iconos.tsx` porque el servidor también la necesita para
 * validar, y aquel archivo es de cliente. El orden de la lista es el del
 * selector del panel. Al sumar una red hay que tocar también el `check` de
 * `personas_redes.red` y el icono en `Iconos.tsx`.
 */
export const REDES_PERSONA = [
  "web",
  "linkedin",
  "github",
  "gitlab",
  "x",
  "bluesky",
  "threads",
  "instagram",
  "facebook",
  "youtube",
  "tiktok",
  "substack",
  "medium",
  "huggingface",
  "kaggle",
  "scholar",
  "researchgate",
  "orcid",
  "behance",
  "dribbble",
] as const;

export type RedNombre = (typeof REDES_PERSONA)[number];

/** Capitalizar el nombre sale mal en media lista: "Linkedin" no es un nombre. */
export const ETIQUETA_RED: Record<RedNombre, string> = {
  web: "Sitio web",
  linkedin: "LinkedIn",
  github: "GitHub",
  gitlab: "GitLab",
  x: "X",
  bluesky: "Bluesky",
  threads: "Threads",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  substack: "Substack",
  medium: "Medium",
  huggingface: "Hugging Face",
  kaggle: "Kaggle",
  scholar: "Google Scholar",
  researchgate: "ResearchGate",
  orcid: "ORCID",
  behance: "Behance",
  dribbble: "Dribbble",
};

/**
 * Dominio de cada red. `web` no tiene: es lo que queda cuando ningún dominio
 * coincide, porque un enlace https cualquiera es, como mínimo, un sitio web.
 */
const DOMINIOS: [RedNombre, RegExp][] = [
  ["linkedin", /(^|\.)linkedin\.com$/],
  ["github", /(^|\.)github\.com$/],
  ["gitlab", /(^|\.)gitlab\.com$/],
  ["x", /(^|\.)(x|twitter)\.com$/],
  ["bluesky", /(^|\.)bsky\.app$/],
  ["threads", /(^|\.)threads\.(net|com)$/],
  ["instagram", /(^|\.)instagram\.com$/],
  ["facebook", /(^|\.)(facebook|fb)\.com$/],
  ["youtube", /(^|\.)(youtube\.com|youtu\.be)$/],
  ["tiktok", /(^|\.)tiktok\.com$/],
  ["substack", /(^|\.)substack\.com$/],
  ["medium", /(^|\.)medium\.com$/],
  ["huggingface", /(^|\.)(huggingface\.co|hf\.co)$/],
  ["kaggle", /(^|\.)kaggle\.com$/],
  ["scholar", /^scholar\.google\./],
  ["researchgate", /(^|\.)researchgate\.net$/],
  ["orcid", /(^|\.)orcid\.org$/],
  ["behance", /(^|\.)behance\.net$/],
  ["dribbble", /(^|\.)dribbble\.com$/],
];

export function esRedNombre(valor: unknown): valor is RedNombre {
  return typeof valor === "string" && (REDES_PERSONA as readonly string[]).includes(valor);
}

/**
 * Lo que se pega casi nunca trae el esquema: "linkedin.com/in/ana" es tan
 * enlace como "https://linkedin.com/in/ana". Se completa en vez de rechazarlo,
 * y un `http://` se sube a `https://`, que es lo único que acepta la base.
 */
export function normalizarUrl(cruda: string): string {
  const limpia = cruda.trim();
  if (limpia === "") return "";
  if (/^https:\/\//i.test(limpia)) return limpia;
  if (/^http:\/\//i.test(limpia)) return `https://${limpia.slice(7)}`;
  if (/^\/\//.test(limpia)) return `https:${limpia}`;
  return `https://${limpia}`;
}

/** El host de un enlace, o `null` si no se puede leer como enlace con dominio. */
export function hostDe(url: string): string | null {
  try {
    const { hostname } = new URL(normalizarUrl(url));
    const host = hostname.toLowerCase().replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

/** Qué red es un enlace. Sin dominio legible devuelve `null`; si no, como poco `web`. */
export function detectarRed(url: string): RedNombre | null {
  const host = hostDe(url);
  if (!host) return null;
  return DOMINIOS.find(([, patron]) => patron.test(host))?.[0] ?? "web";
}
