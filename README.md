# EDUQA — Cursos de programación, Python e inteligencia artificial

[![CI](https://github.com/seminarioA/eduqa.pe/actions/workflows/ci.yml/badge.svg)](https://github.com/seminarioA/eduqa.pe/actions/workflows/ci.yml)

**EDUQA** es una plataforma educativa peruana enfocada en **cursos de programación, Python, inteligencia artificial, ciencia de datos, ingeniería de datos y desarrollo de software**. La plataforma permite descubrir cursos técnicos, matricularse, acceder a contenido organizado por sesiones, resolver ejercicios prácticos, realizar pagos, obtener certificados digitales y gestionar la experiencia académica desde un mismo entorno.

🌐 **Plataforma:** [https://eduqa-pe.vercel.app](https://eduqa-pe.vercel.app)

## ¿Qué es EDUQA?

EDUQA busca facilitar el aprendizaje de tecnología con una experiencia orientada a la práctica. El catálogo está diseñado para estudiantes, desarrolladores y personas que quieren fortalecer competencias técnicas en áreas como:

- **Python**: introducción, nivelación, nivel intermedio y avanzado.
- **Programación**: fundamentos, programación funcional y patrones de diseño.
- **Programación orientada a objetos (POO)** con Python.
- **Inteligencia artificial (IA)** e IA generativa.
- **Machine Learning** y fundamentos de modelos de aprendizaje automático.
- **Ciencia de datos** y análisis de datos.
- **Ingeniería de datos**, SQL, ETL y pipelines.
- **Desarrollo de software** y buenas prácticas de ingeniería.

La plataforma incorpora un catálogo público de cursos, aulas digitales, contenido por sesión, ejercicios, recursos, evaluaciones, certificados y herramientas de administración académica.

## Funcionalidades principales

- Catálogo de cursos técnicos y tecnológicos.
- Matrícula y flujo de pagos.
- Cursos organizados por sesiones y lecciones.
- Contenido educativo en Markdown.
- Ejercicios prácticos de programación.
- Ejecución de Python directamente en el navegador mediante Pyodide.
- Sistema de autenticación y perfiles.
- Certificados digitales.
- Panel administrativo para cursos, avisos y reportes.
- Gestión de recursos académicos.
- API y webhooks para integraciones.
- Backend con Supabase y PostgreSQL.
- Despliegue continuo mediante Vercel y GitHub Actions.

## Tecnologías utilizadas

<a href="https://nextjs.org"><img src="https://raw.githubusercontent.com/marwin1991/profile-technology-icons/refs/heads/main/icons/next_js.png" width="24" alt="Next.js"/></a>
<a href="https://react.dev"><img src="https://raw.githubusercontent.com/marwin1991/profile-technology-icons/refs/heads/main/icons/react.png" width="24" alt="React"/></a>
<a href="https://www.typescriptlang.org"><img src="https://raw.githubusercontent.com/marwin1991/profile-technology-icons/refs/heads/main/icons/typescript.png" width="24" alt="TypeScript"/></a>
<a href="https://tailwindcss.com"><img src="https://raw.githubusercontent.com/marwin1991/profile-technology-icons/refs/heads/main/icons/tailwind_css.png" width="24" alt="Tailwind CSS"/></a>
<a href="https://supabase.com"><img src="https://raw.githubusercontent.com/marwin1991/profile-technology-icons/refs/heads/main/icons/supabase.png" width="24" alt="Supabase"/></a>
<a href="https://www.postgresql.org"><img src="https://raw.githubusercontent.com/marwin1991/profile-technology-icons/refs/heads/main/icons/postgresql.png" width="24" alt="PostgreSQL"/></a>
<a href="https://nodejs.org"><img src="https://raw.githubusercontent.com/marwin1991/profile-technology-icons/refs/heads/main/icons/node_js.png" width="24" alt="Node.js"/></a>
<a href="https://www.npmjs.com"><img src="https://raw.githubusercontent.com/marwin1991/profile-technology-icons/refs/heads/main/icons/npm.png" width="24" alt="npm"/></a>
<a href="https://lucide.dev"><img src="https://raw.githubusercontent.com/marwin1991/profile-technology-icons/refs/heads/main/icons/lucide.png" width="24" alt="Lucide"/></a>
<a href="https://www.python.org"><img src="https://raw.githubusercontent.com/marwin1991/profile-technology-icons/refs/heads/main/icons/python.png" width="24" alt="Python"/></a>
<a href="https://github.com/features/actions"><img src="https://raw.githubusercontent.com/marwin1991/profile-technology-icons/refs/heads/main/icons/githubactions.png" width="24" alt="GitHub Actions"/></a>

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) · React 19 |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 4 |
| Base de datos y autenticación | Supabase (PostgreSQL + Auth + Storage) |
| UI | Radix UI · Lucide Icons |
| Código en el navegador | Shiki · Pyodide |
| Pagos | Niubiz · Yape / Plin |
| CI/CD | GitHub Actions · Vercel |

## Arquitectura del proyecto

```text
src/
├── app/                  # Rutas de Next.js (App Router)
│   ├── cursos/           # Catálogo, detalle y aula por curso/lección
│   ├── panel/            # Gestión académica y administrativa
│   ├── pagar/            # Flujo de pago
│   ├── certificados/     # Emisión y vista previa de certificados
│   └── api/              # Route handlers, webhooks y API
├── components/           # Componentes compartidos
├── content/<curso>/      # Contenido educativo en Markdown
├── lib/                  # Datos, Supabase, precios y lógica de negocio
└── proxy.ts              # Middleware
supabase/migrations/      # Migraciones SQL numeradas
```

Los cursos se publican como Markdown desde `/panel/cursos` y se almacenan en Supabase, sin modificar TypeScript ni desplegar de nuevo. Supabase es la fuente de cursos en runtime. El formato de importación está documentado en [`src/content/FORMATO-CURSO.md`](src/content/FORMATO-CURSO.md) y las reglas de redacción en [`LINEAMIENTOS.md`](LINEAMIENTOS.md).

Para conocer la arquitectura y decisiones técnicas del sistema, consulta también [`SSD.md`](SSD.md) y [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md).

## Requisitos

- Node.js ≥ 20
- npm ≥ 10
- Proyecto de Supabase con URL y claves de API

## Puesta en marcha local

```bash
git clone https://github.com/seminarioA/eduqa.pe.git
cd eduqa.pe
npm install
cp .env.example .env.local
```

Variables de entorno principales:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública para el cliente |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role; solo debe usarse en servidor |

Aplicar migraciones:

```bash
npx supabase db push
```

### Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
```

## Convención de commits

Los mensajes siguen este formato, validado localmente con Husky + commitlint y también en CI:

```text
[tipo] (ámbito opcional): descripción breve y objetiva
```

Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Ejemplos:

```text
[feat] (cursos): agregar modal de matrícula
[fix] (catálogo): corregir validación de búsqueda

Refs: #6
```

Cada commit debe vincular uno o más tickets reales del repositorio.

## Integración continua

El workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) se ejecuta en cada push y pull request hacia `main`:

1. **commits** — valida los mensajes nuevos con commitlint.
2. **verify** — ejecuta instalación, lint y typecheck.

## Despliegue

Vercel despliega automáticamente cada push a `main`. Las variables de entorno se configuran en el proyecto de Vercel y las migraciones se aplican contra Supabase.

## EDUQA en búsquedas

Este repositorio corresponde al desarrollo de **EDUQA**, una plataforma de educación tecnológica en Perú orientada a formación práctica en **Python, programación, inteligencia artificial, machine learning, ciencia de datos, ingeniería de datos y desarrollo de software**.

Términos relacionados: cursos de Python, curso de Python Perú, cursos de programación, inteligencia artificial, IA generativa, machine learning, ciencia de datos, ingeniería de datos, SQL, ETL, programación funcional, POO con Python, desarrollo de software, educación tecnológica, cursos online de tecnología y certificación digital.

---

© EDUQA
