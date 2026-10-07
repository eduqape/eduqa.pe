// Ejecuta cada bloque `bash` de los cursos en el mismo motor que usa el
// navegador (los bytes fijados en public/vendor/bash) y compara su salida con
// la valla `salida` del temario. También comprueba los ejercicios `ejercicio
// bash` con la respuesta correcta y con una incorrecta.
//
//   node scripts/verificar-bash.mjs                 comprueba todos los cursos
//   node scripts/verificar-bash.mjs --curso=slug    solo uno
//   node scripts/verificar-bash.mjs --curso=slug --escribir
//        reescribe las vallas `salida` con lo que produce la ejecución
//
// Un bloque sin valla `salida` debe ejecutarse sin imprimir nada; si imprime,
// la verificación falla: la salida no se omite, se declara.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cargar } from './validar-iconos-cursos.mjs';

const comun = cargar(path.resolve('src/lib/bash-comun.ts'));
const { cargarCurso } = cargar(path.resolve('src/lib/curso-markdown-local.ts'));
const { Wasmer } = await import(path.resolve('public/vendor/bash/sdk/dist/node.js'));

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
const escribir = process.argv.includes('--escribir');
const seleccion = arg('curso');
const raiz = path.resolve('src/content');
const carpetas = fs.readdirSync(raiz, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name.includes('bash') && fs.existsSync(path.join(raiz, e.name, 'curso.md')))
  .map((e) => e.name)
  .filter((n) => !seleccion || n === seleccion)
  .sort();
if (escribir) assert.ok(seleccion, 'Con --escribir hay que elegir un curso con --curso=slug');
assert.ok(carpetas.length, 'No hay cursos de Bash que verificar');

const cliente = new Wasmer();
const paquetes = await Promise.all(comun.PAQUETES_BASH.map((n) =>
  cliente.packages.load(new Uint8Array(fs.readFileSync(path.resolve('public/vendor/bash/paquetes', n))))));

async function ejecutar(codigo, { entrada, archivos } = {}) {
  const sandbox = await cliente.sandboxes.create({
    packages: paquetes,
    files: { ...archivos, [comun.SCRIPT_BASH]: comun.prepararScriptBash(codigo) },
    env: comun.ENTORNO_BASH,
  });
  try {
    const r = await sandbox.command('bash', comun.ORDEN_BASH, { cwd: comun.DIRECTORIO_BASH })
      .run({ stdin: entrada, timeoutMs: comun.LIMITE_MS_BASH, outputBytes: comun.LIMITE_SALIDA_BASH, check: false });
    return { salida: comun.limpiarSalidaBash(new TextDecoder().decode(r.stdout.bytes)), motivo: r.reason, codigo: r.exitCode };
  } finally {
    await sandbox.close().catch(() => {});
  }
}

// La valla `salida` se guarda sin el salto de línea final.
const sinFinal = (s) => s.replace(/\n$/, '');

/** Reescribe las vallas `salida` de un archivo con las salidas reales, en orden. */
function reescribir(texto, salidas) {
  const lineas = texto.split('\n');
  const fuera = [];
  let i = 0;
  let k = 0;
  while (i < lineas.length) {
    const linea = lineas[i];
    fuera.push(linea);
    i++;
    if (!/^```bash\s*$/.test(linea)) continue; // ni !sin-consola ni !variable
    while (i < lineas.length && !/^```\s*$/.test(lineas[i])) fuera.push(lineas[i++]);
    fuera.push(lineas[i++]);
    const salida = salidas[k++];
    // Saltar líneas en blanco y vallas de datos asociadas al bloque.
    let j = i;
    const intermedias = [];
    for (;;) {
      while (j < lineas.length && lineas[j].trim() === '') intermedias.push(lineas[j++]);
      if (j < lineas.length && /^```(entrada|archivo)\b/.test(lineas[j])) {
        intermedias.push(lineas[j++]);
        while (j < lineas.length && !/^```\s*$/.test(lineas[j])) intermedias.push(lineas[j++]);
        intermedias.push(lineas[j++]);
        continue;
      }
      break;
    }
    if (j < lineas.length && /^```salida\s*$/.test(lineas[j])) {
      fuera.push(...intermedias, '```salida', ...sinFinal(salida).split('\n'));
      j++;
      while (j < lineas.length && !/^```\s*$/.test(lineas[j])) j++;
      i = j; // la valla de cierre se copia en la siguiente vuelta
    }
  }
  return fuera.join('\n');
}

const respuestas = JSON.parse(fs.readFileSync('scripts/bash-respuestas.json', 'utf8'));
let bloques = 0;
let ejercicios = 0;
const fallos = [];

for (const carpeta of carpetas) {
  const curso = cargarCurso(carpeta);
  for (const leccion of curso.lecciones) {
    const archivo = fs.readdirSync(path.join(raiz, carpeta)).find((f) => {
      if (f === 'curso.md' || !f.endsWith('.md')) return false;
      return new RegExp(`^numero:\\s*${leccion.numero}\\s*$`, 'm').test(fs.readFileSync(path.join(raiz, carpeta, f), 'utf8'));
    });
    const donde = `${carpeta}/${archivo}`;
    const salidas = [];
    for (const b of leccion.bloques) {
      if (b.tipo !== 'codigo' || b.lenguaje !== 'bash') continue;
      // `bash !sin-consola` no se ejecuta aquí (necesita algo que el motor no
      // tiene); su salida se obtiene en una terminal real y se revisa a mano.
      // El reescritor tampoco lo cuenta: solo reconoce vallas «```bash».
      if (b.sinConsola) continue;
      const r = await ejecutar(b.contenido, { entrada: b.entrada, archivos: b.archivos });
      if (!b.salidaVariable) salidas.push(r.salida);
      bloques++;
      if (b.salidaVariable) {
        if (b.salida !== null) fallos.push(`${donde}: un bloque !variable no lleva valla salida:\n${b.contenido}`);
        continue;
      }
      if (r.motivo !== 'exited') fallos.push(`${donde}: el bloque terminó por ${r.motivo}:\n${b.contenido}`);
      else if (b.salida === null && r.salida !== '') fallos.push(`${donde}: bloque sin valla salida que imprime:\n${b.contenido}\n--- imprime ---\n${r.salida}`);
      else if (b.salida !== null && !escribir && sinFinal(r.salida) !== b.salida) {
        fallos.push(`${donde}: la salida no coincide.\n${b.contenido}\n--- esperado ---\n${b.salida}\n--- obtenido ---\n${sinFinal(r.salida)}`);
      }
    }
    if (escribir) {
      const ruta = path.join(raiz, carpeta, archivo);
      const antes = fs.readFileSync(ruta, 'utf8');
      const despues = reescribir(antes, salidas);
      if (despues !== antes) { fs.writeFileSync(ruta, despues); console.log(`Salidas escritas en ${donde}`); }
    }

    for (const [seccion, e] of Object.entries(leccion.ejercicios ?? {})) {
      if ((e.tipo ?? 'codigo') !== 'codigo' || e.lenguaje !== 'bash') continue;
      const r = respuestas.find((x) => x.curso === carpeta && x.archivo === archivo && x.seccion === seccion);
      if (!r) { fallos.push(`${donde}#${seccion}: falta su respuesta en scripts/bash-respuestas.json`); continue; }
      const bien = await ejecutar(e.plantilla.replace('___', () => r.respuesta));
      const mal = await ejecutar(e.plantilla.replace('___', () => r.incorrecta));
      ejercicios++;
      if (bien.salida.trim() !== e.esperado.trim()) fallos.push(`${donde}#${seccion}: la respuesta correcta produce\n${bien.salida}\nen lugar de\n${e.esperado}`);
      if (mal.salida.trim() === e.esperado.trim()) fallos.push(`${donde}#${seccion}: la respuesta incorrecta también se da por buena`);
    }
  }
}

if (fallos.length) {
  console.error(fallos.join('\n\n'));
  console.error(`\n${fallos.length} fallos.`);
  process.exit(1);
}
console.log(`${carpetas.length} cursos de Bash: ${bloques} bloques y ${ejercicios} ejercicios verificados en el motor del navegador.`);
process.exit(0);
