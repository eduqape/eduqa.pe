import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const rutasFortran = [
  /^src\/content\/fortran-[^/]+\/(?!curso\.md$)/,
  /^src\/lib\/(?:fortran-|borrador-fortran)/,
  /^src\/components\/curso\/(?:ConsolaFortran|PreparacionFortran|SandboxFortran|Consola|EjercicioPunto|BloqueCodigo)\.tsx$/,
  /^src\/app\/rutas\/\[ruta\]\/sandbox\//,
  /^public\/(?:fortran|vendor\/xlfortran)\//,
  /^examples\/fortran\//,
  /^scripts\/(?:verificar-fortran(?:-web)?\.mjs|verificar-proyecto-fortran\.py|fortran-respuestas\.json|generar-publicacion-fortran\.mjs)$/,
  /^next\.config\./,
];

// COBOL no depende de paquetes de npm: su motor está fijado en public/vendor.
// El parser general sí entra, porque lee las vallas propias de COBOL (escrito,
// la sangría de las plantillas de formato fijo).
const rutasCobol = [
  /^src\/content\/[^/]*cobol[^/]*\/(?!curso\.md$)/,
  /^src\/lib\/(?:cobol-|curso-markdown\.ts$)/,
  /^src\/components\/curso\/(?:ConsolaCobol|PreparacionCobol|EjercicioPunto|BloqueCodigo)\.tsx$/,
  /^public\/vendor\/cobol\//,
  /^scripts\/(?:verificar-cobol\.mjs|cobol-respuestas\.json|vendorizar-cobol\.mjs)$/,
];

export function requierePruebasCobol(rutas) {
  return rutas.some((ruta) => rutasCobol.some((patron) => patron.test(ruta)));
}

const dependenciasFortran = [
  'next', 'react', 'react-dom', 'react-icons', 'playwright', 'typescript',
  'react-markdown', 'remark-gfm', 'yaml', 'shiki',
];

export function requierePruebasFortran(rutas, dependenciasCambiadas) {
  if (rutas.some((ruta) => rutasFortran.some((patron) => patron.test(ruta)))) return true;
  if (!rutas.some((ruta) => /^package(?:-lock)?\.json$/.test(ruta))) return false;
  // Sin una base comparable, la decisión conservadora es ejecutar la batería.
  if (!dependenciasCambiadas) return true;
  return dependenciasCambiadas.some((nombre) => dependenciasFortran.includes(nombre));
}

function dependenciasDesde(base) {
  const anterior = JSON.parse(execFileSync('git', ['show', `${base}:package-lock.json`], { encoding: 'utf8' }));
  const actual = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  const cambios = dependenciasFortran.filter((nombre) => {
    const paquete = `node_modules/${nombre}`;
    return JSON.stringify(anterior.packages?.[paquete]) !== JSON.stringify(actual.packages?.[paquete]) ||
      JSON.stringify(anterior.packages?.['']?.dependencies?.[nombre]) !== JSON.stringify(actual.packages?.['']?.dependencies?.[nombre]) ||
      JSON.stringify(anterior.packages?.['']?.devDependencies?.[nombre]) !== JSON.stringify(actual.packages?.['']?.devDependencies?.[nombre]);
  });
  const scriptsAntes = JSON.parse(execFileSync('git', ['show', `${base}:package.json`], { encoding: 'utf8' })).scripts;
  const scriptsAhora = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
  if (scriptsAntes?.['test:fortran'] !== scriptsAhora?.['test:fortran'] ||
      scriptsAntes?.['test:fortran:web'] !== scriptsAhora?.['test:fortran:web']) cambios.push('playwright');
  return cambios;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const rutas = readFileSync(0, 'utf8').split(/\r?\n/).filter(Boolean);
  const dependencias = rutas.some((ruta) => /^package(?:-lock)?\.json$/.test(ruta)) && process.argv[2]
    ? dependenciasDesde(process.argv[2])
    : undefined;
  process.stdout.write(`fortran=${requierePruebasFortran(rutas, dependencias)}\n`);
  process.stdout.write(`cobol=${requierePruebasCobol(rutas)}\n`);
}
