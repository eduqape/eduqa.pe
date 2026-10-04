/**
 * Sistema de memoria compartida para EDUQA.PE
 * Serializa el estado completo del proyecto para persistirlo en Redis / Upstash
 * y permitir transiciones sin pérdida de contexto entre Claude, Gemini, OpenAI, DeepSeek y Antigravity.
 */

export type SnapshotMemoria = {
  timestamp: string;
  version: string;
  proyecto: {
    nombre: string;
    url_produccion: string;
    repo: string;
    descripcion: string;
  };
  arquitectura: {
    framework: string;
    lenguajes: string[];
    estilos: string[];
    baseDatos: string;
    autenticacion: string;
  };
  modulos_recientes: {
    nombre: string;
    descripcion: string;
    archivos_clave: string[];
  }[];
  formatos_cursos: {
    tipos: string[];
    microcurso_destacado: {
      slug: string;
      titulo: string;
      horas: number;
    };
  };
  blog: {
    origen: string;
    canal: string;
    estrategia_cache: string;
    rutas: string[];
  };
  comandos_utiles: Record<string, string>;
};

export const SNAPSHOT_ACTUAL: SnapshotMemoria = {
  timestamp: new Date().toISOString(),
  version: "2.1.0",
  proyecto: {
    nombre: "EDUQA.PE",
    url_produccion: "https://eduqape.vercel.app",
    repo: "seminarioA/eduqa.pe",
    descripcion:
      "Plataforma educativa de ingeniería, IA, Big Data, Bioinformática y Matemáticas para LATAM con ejercicios interactivos y certificaciones verificables.",
  },
  arquitectura: {
    framework: "Next.js 16 (App Router, Server Components & Actions)",
    lenguajes: ["TypeScript 5", "React 19"],
    estilos: ["Tailwind CSS 4", "Lucide Icons", "React Icons"],
    baseDatos: "Supabase PostgreSQL con RLS y políticas de acceso",
    autenticacion: "@supabase/ssr con sesiones seguras en cookies",
  },
  modulos_recientes: [
    {
      nombre: "Clasificación de Formatos & Microcursos",
      descripcion:
        "Soporte para cursos regulares, microcursos intensivos y píldoras técnicas. Reclasificación de transformers-atencionales.",
      archivos_clave: [
        "src/lib/curso-tipos.ts",
        "src/lib/curso-markdown.ts",
        "src/content/transformers-atencionales/curso.md",
        "src/app/cursos/TarjetaCursoMatricula.tsx",
      ],
    },
    {
      nombre: "Blog Sincronizado con Medium",
      descripcion:
        "Lector RSS sin artículos ficticios, revalidación bajo demanda, catálogo público (/blog), lector (/blog/[slug]) y panel admin (/panel/blog).",
      archivos_clave: [
        "src/lib/blog-medium.ts",
        "src/components/BlogCard.tsx",
        "src/app/blog/page.tsx",
        "src/app/blog/[slug]/page.tsx",
        "src/app/panel/blog/page.tsx",
      ],
    },
    {
      nombre: "Panel de Gestión Modular & Rutas de Aprendizaje",
      descripcion:
        "Separación del panel en hub administrativo y gestión individual de Cursos (/panel/cursos), Rutas (/panel/rutas) y Blog (/panel/blog).",
      archivos_clave: [
        "src/lib/rutas-bd.ts",
        "src/app/panel/page.tsx",
        "src/app/panel/TarjetaGestion.tsx",
        "src/app/panel/cursos/page.tsx",
        "src/app/panel/rutas/page.tsx",
        "src/app/panel/rutas/FormularioRuta.tsx",
      ],
    },
  ],
  formatos_cursos: {
    tipos: ["curso", "microcurso", "pildora"],
    microcurso_destacado: {
      slug: "transformers-atencionales",
      titulo: "Microcurso: Transformers y Mecanismos de Atención",
      horas: 40,
    },
  },
  blog: {
    origen: "Medium RSS Feed",
    canal: "https://medium.com/@seminarioA",
    estrategia_cache: "next: { revalidate: 3600, tags: ['medium-blog'] }",
    rutas: ["/blog", "/blog/[slug]", "/panel/blog"],
  },
  comandos_utiles: {
    desarrollo: "npm run dev",
    compilacion: "npm run build",
    chequeo_tipos: "npm run typecheck",
    guardar_memoria: "npm run memoria:guardar",
    recuperar_memoria: "npm run memoria:recuperar",
    prompt_ia: "npm run memoria:prompt",
  },
};

/**
 * Genera el prompt de arranque para transferir todo este contexto a cualquier otra IA.
 */
export function generarPromptArranque(snapshot: SnapshotMemoria = SNAPSHOT_ACTUAL): string {
  return `
# INSTRUCCIÓN DE ARRANQUE Y ADQUISICIÓN DE CONTEXTO EDUQA.PE

Eres el asistente de ingeniería senior de **EDUQA.PE** (${snapshot.proyecto.url_produccion}).
Tu repositorio oficial es **${snapshot.proyecto.repo}**.

## Stack Tecnológico:
- **Framework:** ${snapshot.arquitectura.framework}
- **Frontend:** ${snapshot.arquitectura.lenguajes.join(", ")}, ${snapshot.arquitectura.estilos.join(", ")}
- **Base de Datos & Auth:** ${snapshot.arquitectura.baseDatos}, ${snapshot.arquitectura.autenticacion}

## Estado Actual & Módulos Implementados:
1. **Formatos de Curso & Microcurso de Transformers:**
   - Tipo de contenido: \`"curso" | "microcurso" | "pildora"\`.
   - \`transformers-atencionales\` clasificado como Microcurso de 40 horas con badge visual.
2. **Blog Sincronizado con Medium:**
   - Feed RSS oficial: \`${snapshot.blog.canal}\`.
   - Vistas en \`/blog\` y \`/blog/[slug]\` con enlaces canónicos y llamadas a la acción.
   - Panel de administración y purga de caché en \`/panel/blog\`.
3. **Panel de Gestión Modular:**
   - Hub en \`/panel\` para Alumnos y Administradores.
   - Submódulos: \`/panel/cursos\` (Markdown & precios), \`/panel/rutas\` (itinerarios pedagógicos y prerrequisitos), \`/panel/blog\` (Medium), \`/panel/avisos\`, \`/panel/reportes\`, \`/panel/marca\`.

Continúa las tareas de desarrollo manteniendo este estándar de calidad.
`.trim();
}
