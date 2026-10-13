import assert from 'node:assert/strict';
import test from 'node:test';
import { requierePruebasCobol, requierePruebasFortran } from './alcance-ci.mjs';

test('un cambio visual de las barras no ejecuta la batería Fortran', () => {
  assert.equal(requierePruebasFortran([
    'src/components/Isla.tsx',
    'src/components/MarcaTextoLateral.tsx',
    'src/components/curso/BarraLateral.tsx',
    'src/components/sqlite/VistaDiapositivas.tsx',
    'src/app/cursos/[curso]/[leccion]/page.tsx',
    'scripts/verificar-marca-sidebar.mjs',
  ]), false);
});

test('los cursos, el runtime, los ejercicios y las dependencias sí la ejecutan', () => {
  for (const ruta of [
    'src/content/fortran-fundamentos/sesion-1.md',
    'src/lib/fortran-web.ts',
    'src/components/curso/EjercicioPunto.tsx',
    'src/app/rutas/[ruta]/sandbox/page.tsx',
    'public/vendor/xlfortran/xlfortran.wasm',
    'scripts/verificar-fortran-web.mjs',
  ]) {
    assert.equal(requierePruebasFortran([ruta]), true, ruta);
  }
  assert.equal(requierePruebasFortran(['package-lock.json'], ['playwright']), true);
  assert.equal(requierePruebasFortran(['package.json'], ['react']), true);
  assert.equal(requierePruebasFortran(['package-lock.json']), true);
});

test('un visor PDF nuevo no afecta al runtime ni a los ejercicios Fortran', () => {
  assert.equal(requierePruebasFortran(['package.json', 'package-lock.json'], []), false);
  assert.equal(requierePruebasFortran(['package-lock.json'], ['pdfjs-dist']), false);
});

test('los catálogos generales se validan sin ejecutar la batería Fortran', () => {
  assert.equal(requierePruebasFortran(['src/lib/catalogo.ts']), false);
  assert.equal(requierePruebasFortran(['src/lib/catalogo-cursos.ts']), false);
});

test('la ficha y el parser general se cubren con catálogo sin ejecutar Fortran', () => {
  assert.equal(requierePruebasFortran([
    'src/content/fortran-fundamentos/curso.md',
    'src/content/fortran-avanzado/curso.md',
    'src/lib/curso-markdown.ts',
    'src/lib/curso-tipos.ts',
    'src/lib/iconos-curso.ts',
    'src/components/Iconos.tsx',
  ]), false);
});

test('las sesiones y el parser específico conservan la batería Fortran', () => {
  assert.equal(requierePruebasFortran(['src/content/fortran-fundamentos/sesion-1.md']), true);
  assert.equal(requierePruebasFortran(['src/lib/fortran-parser.ts']), true);
});

test('los cursos de COBOL, su motor y sus vallas ejecutan la batería COBOL', () => {
  for (const ruta of [
    'src/content/cobol-nivelacion/sesion-1.md',
    'src/lib/cobol-web.ts',
    'src/lib/curso-markdown.ts',
    'src/components/curso/ConsolaCobol.tsx',
    'src/components/curso/EjercicioPunto.tsx',
    'public/vendor/cobol/motor.mjs',
    'scripts/verificar-cobol.mjs',
    'scripts/cobol-respuestas.json',
    'src/components/guiones-cobol.ts',
    'src/components/MemoriaCobol3D.tsx',
  ]) {
    assert.equal(requierePruebasCobol([ruta]), true, ruta);
  }
});

test('la ficha de un curso COBOL y el resto del sitio no ejecutan la batería COBOL', () => {
  assert.equal(requierePruebasCobol([
    'src/content/cobol-nivelacion/curso.md',
    'src/content/fortran-fundamentos/sesion-1.md',
    'src/lib/fortran-web.ts',
    'src/components/Iconos.tsx',
    'package-lock.json',
  ]), false);
});
