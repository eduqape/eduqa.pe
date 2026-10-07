"use client";

// react-icons usa contexto interno, así que no puede renderizarse en Server Components.
// Todo lo que dibuje un logo de marca vive detrás de este archivo.

import type { ComponentType } from "react";
import { BookOpen, CloudUpload, Database, Globe, Sigma, Pill, Dna } from "lucide-react";
import { REDES_PERSONA, type RedNombre } from "@/lib/redes";
import type { IconoNombre } from "@/lib/iconos-curso";
export type { IconoNombre } from "@/lib/iconos-curso";
import { FaLinkedin } from "react-icons/fa6";
import {
  SiBehance,
  SiBluesky,
  SiDocker,
  SiDribbble,
  SiFacebook,
  SiFastapi,
  SiFortran,
  SiGithub,
  SiGithubactions,
  SiGitlab,
  SiGnubash,
  SiGooglescholar,
  SiGooglegemini,
  SiHuggingface,
  SiInstagram,
  SiKaggle,
  SiLinux,
  SiMedium,
  SiN8N,
  SiNumpy,
  SiNotebooklm,
  SiOpencv,
  SiOrcid,
  SiPandas,
  SiPolars,
  SiPostgresql,
  SiPython,
  SiPytorch,
  SiRedis,
  SiResearchgate,
  SiScikitlearn,
  SiSqlite,
  SiSubstack,
  SiSupabase,
  SiThreads,
  SiTiktok,
  SiX,
  SiYoutube,
} from "react-icons/si";
// Todos los cursos muestran un icono. Las tecnologías usan sus logotipos;
// las materias generales usan símbolos de la biblioteca Lucide.

function IconoSoa({ className }: { className?: string }) {
  // Glifos originales de siete segmentos: estética de display/calculadora sin
  // depender de una fuente externa ni redistribuir archivos tipográficos.
  return (
    <svg
      viewBox="0 0 78 28"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g>
        {/* S */}
        <rect x="2" y="2" width="20" height="3" rx="1" />
        <rect x="2" y="4" width="3" height="9" rx="1" />
        <rect x="2" y="12.5" width="20" height="3" rx="1" />
        <rect x="19" y="15" width="3" height="9" rx="1" />
        <rect x="2" y="23" width="20" height="3" rx="1" />

        {/* O */}
        <rect x="29" y="2" width="20" height="3" rx="1" />
        <rect x="29" y="4" width="3" height="20" rx="1" />
        <rect x="46" y="4" width="3" height="20" rx="1" />
        <rect x="29" y="23" width="20" height="3" rx="1" />

        {/* A */}
        <rect x="56" y="2" width="20" height="3" rx="1" />
        <rect x="56" y="4" width="3" height="20" rx="1" />
        <rect x="73" y="4" width="3" height="20" rx="1" />
        <rect x="56" y="12.5" width="20" height="3" rx="1" />
      </g>
    </svg>
  );
}

const MAPA: Record<IconoNombre, ComponentType<{ className?: string }>> = {
  libro: BookOpen,
  soa: IconoSoa,
  nube: CloudUpload,
  datos: Database,
  matematicas: Sigma,
  farmacologia: Pill,
  bioingenieria: Dna,
  docker: SiDocker,
  fastapi: SiFastapi,
  fortran: SiFortran,
  githubactions: SiGithubactions,
  gemini: SiGooglegemini,
  huggingface: SiHuggingface,
  pandas: SiPandas,
  postgresql: SiPostgresql,
  python: SiPython,
  pytorch: SiPytorch,
  scikitlearn: SiScikitlearn,
  opencv: SiOpencv,
  linux: SiLinux,
  bash: SiGnubash,
  n8n: SiN8N,
  notebooklm: SiNotebooklm,
  redis: SiRedis,
  sqlite: SiSqlite,
  supabase: SiSupabase,
  numpy: SiNumpy,
  polars: SiPolars,
};

export function Icono({
  nombre,
  className,
}: {
  nombre?: IconoNombre;
  className?: string;
}) {
  const C = MAPA[nombre ?? "libro"] ?? MAPA.libro;
  return <C className={className} aria-hidden="true" />;
}

export function IconoLinkedin({ className }: { className?: string }) {
  return <FaLinkedin className={className} aria-hidden="true" />;
}

export type { RedNombre } from "@/lib/redes";
export { ETIQUETA_RED } from "@/lib/redes";

/** El icono de cada red. La lista y sus nombres viven en `@/lib/redes`. */
const REDES: Record<RedNombre, ComponentType<{ className?: string }>> = {
  web: Globe,
  linkedin: FaLinkedin,
  github: SiGithub,
  gitlab: SiGitlab,
  x: SiX,
  bluesky: SiBluesky,
  threads: SiThreads,
  instagram: SiInstagram,
  facebook: SiFacebook,
  youtube: SiYoutube,
  tiktok: SiTiktok,
  substack: SiSubstack,
  medium: SiMedium,
  huggingface: SiHuggingface,
  kaggle: SiKaggle,
  scholar: SiGooglescholar,
  researchgate: SiResearchgate,
  orcid: SiOrcid,
  behance: SiBehance,
  dribbble: SiDribbble,
};

/** Los mismos nombres, en el orden del selector del panel. */
export const REDES_NOMBRE: readonly RedNombre[] = REDES_PERSONA;

export function IconoRed({
  nombre,
  className,
}: {
  nombre: RedNombre;
  className?: string;
}) {
  // Una red que la base conoce y este archivo no (p. ej. tras sumar una sin
  // desplegar el icono) cae en el globo en vez de romper la ficha.
  const C = REDES[nombre] ?? Globe;
  return <C className={className} aria-hidden="true" />;
}

/** Tecnologías que aparecen en las clases. Edita esta lista a gusto. */
export const stack: { nombre: string; icono: IconoNombre }[] = [
  { nombre: "Python", icono: "python" },
  { nombre: "PyTorch", icono: "pytorch" },
  { nombre: "Hugging Face", icono: "huggingface" },
  { nombre: "Gemini", icono: "gemini" },
  { nombre: "OpenCV", icono: "opencv" },
  { nombre: "scikit-learn", icono: "scikitlearn" },
  { nombre: "pandas", icono: "pandas" },
  { nombre: "NumPy", icono: "numpy" },
  { nombre: "Polars", icono: "polars" },
  { nombre: "FastAPI", icono: "fastapi" },
  { nombre: "PostgreSQL", icono: "postgresql" },
  { nombre: "SQLite", icono: "sqlite" },
  { nombre: "Redis", icono: "redis" },
  { nombre: "Supabase", icono: "supabase" },
  { nombre: "Docker", icono: "docker" },
  { nombre: "GitHub Actions", icono: "githubactions" },
  { nombre: "Linux", icono: "linux" },
  { nombre: "Bash", icono: "bash" },
  { nombre: "Fortran", icono: "fortran" },
  { nombre: "n8n", icono: "n8n" },
];

export function Stack() {
  return (
    <ul className="grid grid-cols-4 gap-x-4 gap-y-6 sm:grid-cols-5 lg:grid-cols-10">
      {stack.map((t) => (
        <li key={t.nombre} className="flex flex-col items-center gap-2 text-center">
          <Icono nombre={t.icono} className="size-8 text-texto-suave" />
          <span className="text-xs leading-tight text-texto-tenue">{t.nombre}</span>
        </li>
      ))}
    </ul>
  );
}
