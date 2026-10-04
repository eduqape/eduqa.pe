import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parse } from 'yaml';
import { cargar } from './validar-iconos-cursos.mjs';
const { cargarCursosLocales } = cargar(path.resolve('src/lib/curso-markdown-local.ts'));
const { codigoBaseDeFicha, construirCurso } = cargar(path.resolve('src/lib/curso-markdown.ts'));
const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'eduqa-descubrimiento-'));
try {
  fs.mkdirSync(path.join(temporal, 'recursos'));
  fs.writeFileSync(path.join(temporal, 'FORMATO.md'), '# Documentación');
  assert.deepEqual(cargarCursosLocales(temporal), []);
  const carpeta = path.join(temporal, 'curso-nuevo');
  fs.mkdirSync(carpeta);
  fs.writeFileSync(path.join(carpeta, 'curso.md'), '---\nslug: curso-nuevo\ncodigo: CUNU\ntitulo: Curso nuevo\narea: Lenguajes\nicono: fortran\nhoras: 4\n---\n');
  fs.writeFileSync(path.join(carpeta, 'sesion-1.md'), '---\nnumero: 1\ntitulo: Primera sesión\n---\n\n# Contenido\n\nContenido nuevo.\n');
  const descubiertos = cargarCursosLocales(temporal);
  assert.equal(descubiertos.length, 1);
  assert.equal(descubiertos[0].slug, 'curso-nuevo');
  assert.equal(descubiertos[0].lecciones[0].titulo, 'Primera sesión');
} finally {
  fs.rmSync(temporal, { recursive: true, force: true });
}
const fichaMotores = `---
slug: motores
codigo: MOTO
titulo: Motores
area: Backend
icono: libro
horas: 1
---
`;
const sesionMotores = `---
numero: 1
titulo: Motores
---

# Código

\`\`\`ejercicio
# Enunciado
Completa.
# Plantilla
print(___)
# Esperado
1
# Pista
El entero uno.
\`\`\`

# Verdadero falso

\`\`\`verdadero-falso
# Enunciado
SOA es una tecnología concreta.
# Respuesta
falso
# Explicación
Es un paradigma arquitectónico.
# Pista
Distingue arquitectura de implementación.
\`\`\`

# Opción múltiple

\`\`\`opcion-multiple
# Enunciado
Elige la segunda.
# Opciones
- primera
- segunda
- tercera
# Correcta
2
# Explicación
La segunda es la declarada como correcta.
# Pista
Cuenta desde uno.
\`\`\`

# Ordenar

\`\`\`ordenar
# Enunciado
Ordena.
# Elementos
- segundo
- primero
- tercero
# Orden
2, 1, 3
# Explicación
Primero, segundo y tercero.
# Pista
El texto indica la posición.
\`\`\`

# Relacionar

\`\`\`relacionar
# Enunciado
Relaciona.
# Pares
- provider => ofrece
- consumer => utiliza
# Explicación
Cada participante tiene un papel distinto.
# Pista
Proveedor ofrece; consumidor utiliza.
\`\`\`
`;
const cursoMotores = construirCurso('motores', new Map([
  ['curso.md', fichaMotores],
  ['sesion-1.md', sesionMotores],
]));
const motores = cursoMotores.lecciones[0].ejercicios;
assert.equal(motores.codigo.tipo, 'codigo');
assert.equal(motores['verdadero-falso'].tipo, 'verdadero-falso');
assert.equal(motores['verdadero-falso'].respuesta, false);
assert.equal(motores['opcion-multiple'].correcta, 1);
assert.deepEqual(motores.ordenar.correcta, [1, 0, 2]);
assert.deepEqual(motores.relacionar.pares, [
  { izquierda: 'provider', derecha: 'ofrece' },
  { izquierda: 'consumer', derecha: 'utiliza' },
]);

function construirMotor(cuerpo) {
  return construirCurso('motor-invalido', new Map([
    ['curso.md', fichaMotores],
    ['sesion-1.md', `---
numero: 1
titulo: Inválido
---

# Punto

${cuerpo}
`],
  ]));
}
assert.throws(
  () => construirMotor([
    '~~~verdadero-falso',
    '# Enunciado',
    'Afirmación.',
    '# Respuesta',
    'quizas',
    '# Explicación',
    'Explica.',
    '# Pista',
    'Pista.',
    '~~~',
  ].join('\n').replaceAll('~~~', '```')),
  /verdadero o falso/,
);
assert.throws(
  () => construirMotor([
    '~~~opcion-multiple',
    '# Enunciado',
    'Elige.',
    '# Opciones',
    '- a',
    '- b',
    '# Correcta',
    '3',
    '# Explicación',
    'Explica.',
    '# Pista',
    'Pista.',
    '~~~',
  ].join('\n').replaceAll('~~~', '```')),
  /entre 1 y 2/,
);
assert.throws(
  () => construirMotor([
    '~~~ordenar',
    '# Enunciado',
    'Ordena.',
    '# Elementos',
    '- a',
    '- b',
    '- c',
    '# Orden',
    '1, 1, 3',
    '# Explicación',
    'Explica.',
    '# Pista',
    'Pista.',
    '~~~',
  ].join('\n').replaceAll('~~~', '```')),
  /permutación/,
);
assert.throws(
  () => construirMotor([
    '~~~relacionar',
    '# Enunciado',
    'Relaciona.',
    '# Pares',
    '- a => mismo',
    '- b => mismo',
    '# Explicación',
    'Explica.',
    '# Pista',
    'Pista.',
    '~~~',
  ].join('\n').replaceAll('~~~', '```')),
  /lados únicos/,
);

const ruta = [
  ['fortran-fundamentos', 'Introducción a Fortran', null],
  ['fortran-calculo-cientifico', 'Fortran intermedio', 49],
  ['fortran-avanzado', 'Fortran avanzado', 8],
  ['fortran-ingenieria-software', 'Fortran aplicado a la ingeniería de software', 5],
];
const cursos = cargarCursosLocales();
assert.equal(new Set(cursos.map(c => c.slug)).size, cursos.length, 'Slugs duplicados');
const codigos = fs.readdirSync('src/content', { withFileTypes: true })
  .filter(entrada => entrada.isDirectory() && fs.existsSync(path.join('src/content', entrada.name, 'curso.md')))
  .map(entrada => {
    const archivo = path.join('src/content', entrada.name, 'curso.md');
    const codigo = codigoBaseDeFicha(fs.readFileSync(archivo, 'utf8'));
    assert.ok(codigo, `${archivo} no declara código`);
    return codigo;
  });
assert.equal(new Set(codigos).size, codigos.length, 'Códigos editoriales duplicados');
assert.equal(codigoBaseDeFicha('---\ncodigo: INPY\n---\n'), 'INPY');
assert.throws(() => codigoBaseDeFicha('---\ncodigo: inpy\n---\n'), /cuatro letras mayúsculas/);
for (const [i, [slug, titulo, programas]] of ruta.entries()) {
  const curso = cursos.find(c => c.slug === slug);
  assert.ok(curso, slug);
  assert.equal(curso.titulo, titulo);
  assert.equal(curso.icono, 'fortran');
  assert.deepEqual(curso.lecciones.map(l => l.numero), [1,2,3,4]);
  const bloques = curso.lecciones.flatMap(l => l.bloques);
  if (programas !== null) {
    assert.equal(bloques.filter(b => b.tipo === 'codigo' && b.lenguaje === 'fortran').length, programas);
    assert.equal(curso.lecciones.flatMap(l => Object.values(l.ejercicios ?? {})).filter(e => e.lenguaje === 'fortran').length, 4);
  } else {
    // Cada punto de introducción debe poder practicarse por separado.
    for (const leccion of curso.lecciones) {
      const puntos = leccion.secciones.filter(s => !['Antes de empezar', 'Cierre'].includes(s.titulo));
      assert.ok(puntos.length > 0);
      assert.deepEqual(Object.keys(leccion.ejercicios), puntos.map(s => s.id));
      for (const ejercicio of Object.values(leccion.ejercicios)) {
        assert.equal(ejercicio.lenguaje, 'fortran');
        assert.equal(ejercicio.plantilla.match(/___/g)?.length, 1);
        assert.ok(ejercicio.plantilla.split('\n').length <= 12, 'Ejercicio introductorio demasiado largo');
      }
      for (const bloque of leccion.bloques.filter(b => b.tipo === 'codigo')) {
        assert.equal(bloque.lenguaje, 'fortran');
        assert.ok(!bloque.sinConsola, 'Los ejemplos introductorios deben ejecutarse en el navegador');
        assert.ok(bloque.docs?.length, 'Ejemplo sin documentación');
      }
    }
    const inicio = curso.lecciones[0].bloques.find(b => b.tipo === 'codigo');
    assert.match(inicio.contenido, /^program saludo\nend program saludo$/);
  }
  const ficha = parse(fs.readFileSync(path.join('src/content',slug,'curso.md'),'utf8').split('---')[1]);
  assert.equal(ficha.ruta.posicion, i + 1);
  assert.deepEqual(ficha.ruta.requisitos, i ? [ruta[i-1][0]] : []);
  for (const sesion of curso.lecciones) {
    assert.ok(sesion.bloques.some(b => b.tipo === 'teoria' && b.contenido.includes('# Cierre')) || sesion.secciones.some(s => s.titulo === 'Cierre'), slug+' sin cierre');
  }
}
// Imágenes de cursos: rutas relativas resueltas contra el bucket, sin /public.
{
  const img = cargar(path.resolve('src/lib/imagenes-curso.ts'));
  const md = '![a](imagenes/figura-1.png) ![b](./imagenes/b.jpg "t") ![c](https://x.org/c.png) ![d](/cursos/d.png)';
  assert.deepEqual(img.imagenesReferenciadas(md), ['imagenes/figura-1.png', 'imagenes/b.jpg']);
  assert.equal(img.rutaEnBucket('yolo', 'imagenes/figura-1.png'), 'yolo/imagenes/figura-1.png');
  assert.equal(img.rutaEnBucket('yolo', 'imagenes/../secreto.png'), null);
  assert.equal(img.rutaEnBucket('yolo', 'otra/figura.png'), null);
  assert.equal(img.rutaEnBucket('yolo', 'imagenes/figura.svg'), null);
  const base = 'https://p.supabase.co/storage/v1/object/public/cursos-imagenes/yolo/';
  assert.equal(img.resolverImagenCurso('imagenes/f.png', base), base + 'imagenes/f.png');
  assert.equal(img.resolverImagenCurso('/cursos/f.png', base), '/cursos/f.png');
  assert.equal(img.resolverImagenCurso('https://x.org/f.png', base), 'https://x.org/f.png');
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
  assert.ok(img.firmaImagenValida(png, 'image/png'));
  assert.ok(!img.firmaImagenValida(png, 'image/jpeg'));
  assert.ok(!img.firmaImagenValida(new TextEncoder().encode('<svg>'), 'image/png'));
  // Cada imagen relativa de un curso local existe en su carpeta imagenes/.
  for (const curso of fs.readdirSync('src/content', { withFileTypes: true }).filter(d => d.isDirectory())) {
    const dir = path.join('src/content', curso.name);
    for (const archivo of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
      for (const ruta of img.imagenesReferenciadas(fs.readFileSync(path.join(dir, archivo), 'utf8'))) {
        assert.ok(img.rutaEnBucket(curso.name, ruta), `${curso.name}/${archivo}: ruta de imagen no admitida ${ruta}`);
        const local = path.join(dir, ruta);
        assert.ok(fs.existsSync(local), `${curso.name}/${archivo}: falta ${ruta}`);
        assert.ok(fs.statSync(local).size <= img.MAX_BYTES_IMAGEN, `${local} supera 2 MB`);
      }
    }
  }
}
// Tiempo mínimo de lectura: palabras de teoría y código a 238 palabras por minuto.
{
  const lectura = cargar(path.resolve('src/lib/lectura.ts'));
  const bloques = [
    { tipo: 'teoria', contenido: Array(238).fill('palabra').join(' '), nota: 'una nota' },
    { tipo: 'codigo', contenido: 'print(1)', lenguaje: 'python', salida: '1' },
    { tipo: 'venn', izquierda: 'a', derecha: 'b', resalta: 'union' },
  ];
  assert.equal(lectura.palabrasDeLeccion(bloques), 238 + 2 + 1 + 1);
  assert.equal(lectura.segundosMinimosDeLectura(bloques), 61);
  assert.equal(lectura.segundosMinimosDeLectura([]), lectura.SEGUNDOS_MINIMOS_ABSOLUTOS);
}
console.log(`Detección automática verificada con una carpeta nueva; ${cursos.length} cursos locales y 16 sesiones Fortran válidos.`);
