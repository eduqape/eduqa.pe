<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Cómo se escriben los cursos

Un curso se autoriza en Markdown, pero en runtime vive únicamente en Supabase. Se publica desde `/panel/cursos` sin modificar TypeScript ni volver a desplegar. `src/content` no es catálogo ni respaldo de producción: la aplicación no descubre cursos allí ni hace fallback local.

- `src/content/FORMATO-CURSO.md` — el formato: qué va en la ficha, cómo se
  marcan código, salidas, notas, citas y ejercicios.
- `LINEAMIENTOS.md` — cómo se redacta: registro, estructura y verificación.
  Ninguna salida de código se escribe a mano, se obtiene ejecutándola.

Los cursos antiguos (`python.ts`, `sqlite.ts`, `redis.ts`, `bioingenieria.ts`)
todavía están en TypeScript. Al tocarlos, conviene pasarlos a Markdown.

# Interfaz y cards

- Las cards no usan bordes perimetrales completos para separarse del fondo.
- La jerarquía entre cards se resuelve con fondo, espacio, elevación/sombra, tipografía o divisores parciales.
- Los bordes completos quedan reservados para controles donde expresan estado o affordance (por ejemplo inputs, tablas o botones cuando corresponda), no como marco decorativo de una card.
- Esta regla aplica también a bloques editoriales del blog: notas, índices, CTA y paneles informativos no deben verse como cajas delineadas.

# Calidad y verificación obligatoria

- Entregar un archivo o completar una implementación no equivale a terminar la tarea.
- Toda modificación debe pasar por un bucle de comprobación: ejecutar o renderizar,
  inspeccionar el resultado real, detectar fallos, corregirlos y volver a comprobar.
- La verificación debe cubrir todos los criterios solicitados y el comportamiento visible,
  no solo sintaxis, compilación o una respuesta exitosa de una herramienta.
- No se permiten atajos, resultados plausibles sin ejecutar, datos inventados ni afirmar
  que algo funciona sin evidencia obtenida de la salida real.
- En interfaces y artefactos visuales, comprobar el render final en el tamaño de uso,
  incluyendo desbordamientos, legibilidad, alineación, jerarquía y recursos gráficos.
- No crear SVG artesanales escritos o dibujados directamente por el asistente. Usar
  recursos auténticos o herramientas especializadas de diseño y generación.
- Si la primera comprobación revela un defecto, la tarea continúa hasta corregirlo y
  verificar nuevamente el resultado completo.

# Seguridad

- Lo que el alumno escribe con su sesión también lo puede escribir por la API
  REST de Supabase con cualquier payload. Validar en la server action no basta:
  las columnas que no decide el alumno se protegen en la base (privilegios por
  columna y triggers `*_campos_protegidos`). Ver SSD §10.5.
- Una política nueva con `using (true)` o una tabla sin RLS rompe
  `npm run test:seguridad:db`. Las excepciones se declaran en la prueba con su
  motivo.
- Todo destino de redirección que llegue del navegador (`volverA`, `next`) pasa
  por `rutaInterna()` de `src/lib/ruta-interna.ts`.
- Una ruta de API nueva se declara en `scripts/seguridad/estatico.test.mjs`
  con la comprobación que la protege.
- Después de cambiar permisos en producción, correr
  `npm run test:seguridad:conducta`: ataca como un alumno dentro de una
  transacción que se revierte.

# Publicación

- Trabajar en `dev`. Los pull requests se dirigen a `dev`, no a `main`.
- Cada commit debe vincular uno o más tickets de GitHub en el cuerpo mediante
  `Refs: #<número>`, `Closes: #<número>` o equivalente. El hook local y CI
  rechazan entregas sin ticket o con una referencia que no sea un issue real.
- El workflow valida mensajes, lint, tipos y pruebas rápidas en `dev`.
  Solo cuando pasa ejecuta en QA el build y las pruebas completas. Si todo pasa,
  promueve exactamente ese commit a `qa` y después de `qa` a `main`. GitHub
  Actions no vuelve a compilar en `main`; el despliegue de Vercel es independiente.
  No hacer pushes manuales a `qa` ni a `main`.
- La batería Fortran se ejecuta en QA solo si cambian cursos Fortran, su runtime,
  ejercicios, parser, dependencias o herramientas relacionadas. El alcance se
  verifica con `node --test scripts/alcance-ci.test.mjs`.
- La prohibición técnica de pushes directos exige protección de ramas en GitHub.
  Mientras el plan del repositorio privado no permita activarla, el workflow
  expresa el proceso de publicación pero no impide que un administrador lo eluda.
- La tipografía de EDUQA.PE en ambas barras usa `MarcaTextoLateral`. Ejecutar
  `npm run test:marca` al cambiarla; la misma prueba corre en CI y en el build.

# Iconos de cursos

- Todos los cursos deben mostrar un icono, por instrucción del usuario.
- Fortran usa su logotipo oficial mediante `SiFortran` de `react-icons`.
- Las materias sin logotipo usan un símbolo de Lucide. Nunca se deja el espacio vacío.
- Una publicación nueva requiere `icono` válido; las fichas antiguas se normalizan
  con `resolverIconoCurso` para conservar su visibilidad.
