/** Registro compartido por servidor, editor y componentes. */
export const ICONOS_CURSO = [
  "docker", "fastapi", "fortran", "githubactions", "gemini", "huggingface",
  "pandas", "postgresql", "python", "pytorch", "scikitlearn", "opencv",
  "linux", "bash", "n8n", "notebooklm", "redis", "sqlite", "supabase", "numpy", "polars",
  "libro", "soa", "nube", "datos", "matematicas", "farmacologia", "bioingenieria",
] as const;

export type IconoNombre = (typeof ICONOS_CURSO)[number];

export function esIconoCurso(valor: unknown): valor is IconoNombre {
  return typeof valor === "string" && (ICONOS_CURSO as readonly string[]).includes(valor);
}

/** Compatibilidad con fichas antiguas sin icono o con un nombre desconocido. */
export function resolverIconoCurso(slug: string, area: string, icono?: unknown): IconoNombre {
  if (esIconoCurso(icono)) return icono;
  if (slug.startsWith("fortran")) return "fortran";
  if (slug.includes("soa")) return "soa";
  const porArea: Record<string, IconoNombre> = {
    "Matemáticas": "matematicas", "Farmacología": "farmacologia",
    "Bioingeniería": "bioingenieria", "Bases de Datos": "datos",
    "Ingeniería de Datos": "datos", "DevOps": "nube",
    "Machine Learning": "pytorch",
  };
  return porArea[area] ?? "libro";
}
