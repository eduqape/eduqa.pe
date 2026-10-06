# Formato de un curso en Markdown

Markdown es el **formato editorial de importación** de un curso. Un paquete de
publicación contiene un `curso.md` con la ficha y un archivo por sesión.

```
curso.md
sesion-1.md
sesion-2.md
sesion-3.md
sesion-4.md
```

Para publicarlo, sube la ficha y las sesiones desde `/panel/cursos` y elige
el estado correspondiente. El contenido se guarda en Supabase y aparece sin
modificar TypeScript ni volver a desplegar la aplicación. El icono es obligatorio.

**Supabase es la única fuente de verdad en runtime.** La aplicación no descubre
cursos en `src/content`, no utiliza un catálogo local y no hace fallback a
archivos empaquetados si la base no responde. Los Markdown pueden existir
durante la autoría o revisión, pero publicar significa persistirlos en
`cursos`, `curso_contenido` y `curso_sesiones`.

Las reglas de redacción están en `LINEAMIENTOS.md`, en la raíz.

---

## `curso.md` — la ficha

```markdown
---
slug: ia-generativa
codigo: INIA
titulo: "Introducción a la IA generativa con Python"
resumen: "El SDK oficial de Google para Gemini: cliente, configuración…"
area: "Inteligencia Artificial"
nivel: INTRODUCCIÓN
horas: 16
icono: gemini
paquetes: ["google-genai"]
precio: 20
estado: borrador
acceso_libre: false
orden: 99
ruta:
  slug: inteligencia-artificial
  nombre: "Inteligencia artificial"
  descripcion: "De los fundamentos a aplicaciones que se pueden evaluar."
  orden: 4
  posicion: 1
  requisitos: []
---

```preludio
from google import genai

client = genai.Client(api_key="clave-de-practica")
```
```

| Campo | Obligatorio | Qué es |
|---|---|---|
| `slug` | sí | La parte de la URL: `/cursos/<slug>/…` |
| `codigo` | sí | Prefijo editorial único de cuatro letras mayúsculas, por ejemplo `INPY`. Supabase añade la revisión y muestra `INPY-0001` |
| `titulo` | sí | Se muestra en el catálogo y en la barra lateral |
| `resumen` | sí | Una o dos frases para la tarjeta |
| `area` | sí | Una de las de `AREAS` en `src/lib/cursos.ts` |
| `nivel` | sí | `INTRODUCCIÓN`, `INTERMEDIO`, `AVANZADO` o `HARDMODE` |
| `horas` | sí | Duración total |
| `icono` | sí | Logotipo del producto o símbolo de la materia. Se valida contra `src/lib/iconos-curso.ts`; Fortran usa `fortran` |
| `paquetes` | no | Paquetes de PyPI que hacen falta para ejecutar el código |
| `precio` | no | Precio en soles. Al actualizar, si se omite conserva el precio existente; en un curso nuevo usa 20 |
| `estado` | no | `borrador`, `publico` o `archivado`. Al actualizar, si se omite conserva el estado existente |
| `acceso_libre` | no | `true` permite matricularse sin pago; `false` exige compra o acceso administrativo |
| `orden` | no | Posición del curso en el catálogo; usa 99 por omisión en cursos nuevos |
| `ruta` | no | Objeto que crea o actualiza una ruta y coloca el curso dentro de ella |

Dentro de `ruta`, `slug`, `nombre`, `orden` y `posicion` son obligatorios para
una ruta nueva. `descripcion` puede omitirse. `requisitos` es una lista de slugs
de cursos que deben existir antes de publicar esta ficha. Cuando `curso.md`
declara estos datos, el formulario de `/panel/cursos` actualiza la ficha, la
ruta, la posición y los prerrequisitos junto con el contenido. No hace falta
editar TypeScript, escribir SQL ni volver a desplegar.

El prefijo `codigo` identifica al curso y no cambia al republicarlo. La base
administra la revisión de cuatro dígitos: comienza en `0001` y aumenta cuando
cambia el título, el resumen o cualquiera de los archivos Markdown. Cambiar
precio, acceso o visibilidad conserva la revisión porque no altera el material
académico.

El bloque **`preludio`** es código que se ejecuta una vez antes que cualquier
otro, para dejar preparado lo que las sesiones dan por hecho: una conexión, un
cliente, unos datos de ejemplo. Sin él, quien entre directo a la sesión 3 se
encuentra un `NameError`.

---

## `sesion-N.md` — una sesión

```markdown
---
numero: 1
titulo: "El cliente y la primera respuesta"
---

# Título del punto

Párrafo de teoría. Todo el texto corrido hasta el siguiente elemento forma un
solo bloque.

> Nota: la precisión técnica que no cabe arriba. Se muestra plegada.

> Doc: [Título del enlace](https://url.oficial/apartado)

```python
print("hola")
```

```salida
hola
```
```

| Campo | Obligatorio | Qué es |
|---|---|---|
| `numero` | sí | Ordena las sesiones. El nombre del archivo no importa |
| `titulo` | sí | Título de la sesión |
| `slug` | no | Por defecto `sesion-<numero>` |
| `paquetes` | no | Manda sobre los del curso, para no descargar en la sesión 1 algo que solo hace falta en la 4 |
| `preludio` | no | Igual, pero por sesión |

---

## Los elementos

### Encabezados

`#`, `##` y `###` abren sección. Salen en el índice lateral, con sangría según
el nivel, y su identificador se deriva del título: «Crear el cliente» pasa a
ser `#crear-el-cliente`, que es lo que aparece en la URL al leer.

**Todo bloque de teoría empieza con un encabezado.** Es lo que separa un bloque
del siguiente.

### Código

La valla lleva el lenguaje. El bloque se muestra resaltado y, si la sesión es
ejecutable, con su consola.

````markdown
```python
print(2 + 2)
```
````

Un bloque que **no se puede ejecutar aquí** —porque necesita una clave de API,
una red o un archivo— lleva el modificador `!sin-consola`:

````markdown
```python !sin-consola
respuesta = client.models.generate_content(model="gemini-3.5-flash", contents="Hola")
print(respuesta.text)
```
````

### Salida

Va inmediatamente después del bloque de código al que pertenece.

````markdown
```salida
4
```
````

**La salida se obtiene ejecutando el código, no se escribe a mano.** Si no es
determinista —la respuesta de un modelo, una marca de tiempo— el bloque va con
`!sin-consola` y la salida se presenta como ejemplo en el texto.

### Notas

`> Nota:` va después del bloque al que pertenece, sea de teoría o de código, y
se muestra plegada. Puede ocupar varias líneas mientras sigan citadas:

```markdown
> Nota: primera línea de la nota.
> Segunda línea de la misma nota.
```

Una nota explica **por qué** o precisa un límite. No repite lo de arriba con
otras palabras.

### Citas de documentación

`> Doc:` con un enlace en formato Markdown. Se pueden encadenar varias, y
también van después del bloque al que acompañan.

```markdown
> Doc: [round()](https://docs.python.org/3/library/functions.html#round)
> Doc: [Aritmética de punto flotante](https://docs.python.org/3/tutorial/floatingpoint.html)
```

Enlazan al apartado concreto, no a la portada de la documentación.

### Ejercicios

Cada sección admite **como máximo un ejercicio**. El motor se elige según lo que
se quiere comprobar: no se usa Python para evaluar una distinción conceptual ni
una pregunta de arquitectura. Todos los ejercicios aparecen plegados al final
del punto al que pertenecen.

#### Completar código

La valla `ejercicio` conserva el motor ejecutable existente:

\`\`\`\`markdown
\`\`\`ejercicio
# Enunciado
Completa la clase que construye el cliente del SDK.

# Plantilla
cliente = genai.___(api_key="clave")
print(type(cliente).__name__)

# Esperado
Client

# Pista
Seis letras, en inglés y con mayúscula inicial.
\`\`\`
\`\`\`\`

La plantilla lleva **exactamente un hueco** `___`. `Esperado` es la salida
del programa correcto. El ejercicio se ejecuta aislado; solo comparte el
`preludio` del curso o de la sesión.

#### Verdadero o falso

\`\`\`\`markdown
\`\`\`verdadero-falso
# Enunciado
Una arquitectura SOA exige implementar los servicios con SOAP.

# Respuesta
falso

# Explicación
SOA es un paradigma arquitectónico independiente de una tecnología concreta.

# Pista
Distingue el paradigma de una de sus posibles implementaciones.
\`\`\`
\`\`\`\`

`Respuesta` acepta `verdadero` o `falso` (también `true` y `false`).
La explicación aparece después de responder.

#### Opción múltiple

\`\`\`\`markdown
\`\`\`opcion-multiple
# Enunciado
¿Qué describe mejor un servicio?

# Opciones
- La implementación interna de una capacidad
- El mecanismo para acceder a una capacidad
- Una base de datos compartida
- Un protocolo de transporte

# Correcta
2

# Explicación
El servicio proporciona acceso a una capacidad mediante una interfaz prescrita.

# Pista
No confundas el servicio con su implementación.
\`\`\`
\`\`\`\`

Debe haber al menos dos alternativas. `Correcta` usa numeración humana:
`1` es la primera opción.

#### Ordenar

\`\`\`\`markdown
\`\`\`ordenar
# Enunciado
Ordena las etapas de una interacción.

# Elementos
- Invocar el servicio
- Descubrir el servicio
- Observar el efecto

# Orden
2, 1, 3

# Explicación
Primero se obtiene visibilidad del servicio, después se interactúa y finalmente
se observa el efecto producido.

# Pista
La interacción no puede ocurrir antes de que el consumidor conozca el servicio.
\`\`\`
\`\`\`\`

`Elementos` es el orden inicial que ve el alumno. `Orden` indica el orden
correcto mediante posiciones **1-based** y debe ser una permutación completa:
no puede repetir ni omitir números. El alumno mueve cada elemento hacia arriba
o abajo y después comprueba la secuencia.

#### Relacionar

\`\`\`\`markdown
\`\`\`relacionar
# Enunciado
Relaciona cada participante con su papel.

# Pares
- Service provider => ofrece la capacidad mediante un servicio
- Service consumer => utiliza el servicio para satisfacer una necesidad

# Explicación
Proveedor y consumidor participan en la misma interacción desde papeles
distintos.

# Pista
Piensa quién ofrece la capacidad y quién necesita utilizarla.
\`\`\`
\`\`\`\`

Cada línea de `Pares` usa `izquierda => derecha`. Debe haber al menos dos
pares y ambos lados tienen que ser únicos; repetir una respuesta haría ambigua
la corrección.

Los cinco motores se asocian directamente a la sección donde están escritos.
No existe un índice de ejercicios separado que pueda quedar desincronizado.

---

## Lo que el formato comprueba solo

Al cargar el curso falla, con el archivo y el motivo, si:

- una sesión no tiene `numero` o `titulo`;
- un curso no tiene ninguna sesión;
- una salida aparece sin bloque de código delante;
- una nota o una cita aparecen sin bloque delante;
- un ejercicio está fuera de toda sección;
- hay dos ejercicios para la misma sección;
- un ejercicio ejecutable no tiene enunciado, plantilla o pista;
- la plantilla ejecutable no tiene exactamente un hueco;
- verdadero/falso no declara una respuesta válida;
- opción múltiple tiene menos de dos alternativas o una respuesta fuera de rango;
- ordenar no declara una permutación completa de sus elementos;
- relacionar tiene menos de dos pares, un par mal formado o lados repetidos;
- un ejercicio conceptual no tiene explicación o pista.

Son errores de compilación, no páginas rotas en producción.

## Imágenes

Una figura se cita con una ruta relativa a la carpeta `imagenes/` del paquete:

```markdown
![Arquitectura de la red](imagenes/figura-3-arquitectura.png)
```

Al publicar desde `/panel/cursos` se arrastran las imágenes junto con
`curso.md` y las sesiones. Se suben al bucket público `cursos-imagenes`, bajo
`<slug>/imagenes/`, y la sesión resuelve la ruta relativa contra ese prefijo.
No se copian a `/public` ni hace falta volver a desplegar.

- Formatos: PNG, JPG, WebP o GIF, hasta 2 MB por imagen. Un envío completo
  no puede superar 6 MB; si las figuras pesan más, se publican en dos envíos:
  primero todo el curso con una parte de las imágenes y luego se republica
  con el resto.
- El nombre del archivo solo admite letras, números, punto, guion y guion
  bajo, y es el mismo que cita el Markdown.
- Antes de guardar, la publicación comprueba que cada imagen citada llegue en
  el envío o ya esté en el bucket. Si falta alguna, no se escribe nada.
- Republicar con una imagen del mismo nombre la reemplaza.
- Las URL absolutas (`https://…`) se respetan tal cual.

## Diagramas de conjuntos

Una valla ```venn dibuja un diagrama de dos conjuntos. Va declarado, no como
SVG: así todos salen iguales, heredan los colores del tema —incluido el
monocromático— y quien escribe no necesita dibujar.

```venn
izquierda: python
derecha: sql
resalta: interseccion
pie: INNER JOIN devuelve solo las filas que casan en ambas tablas
```

`resalta` acepta: `interseccion`, `izquierda`, `derecha`, `union`,
`solo-izquierda`, `solo-derecha`, `diferencia-simetrica`,
`complemento-interseccion`, `complemento-union` y `ninguna`. Las dos de
complemento dibujan además el marco del conjunto universal, porque «todo lo que
no está en a» no significa nada sin un borde respecto del cual esté fuera. Un valor
que no esté en esa lista rompe la carga del curso a propósito, para que no
salga un diagrama vacío que nadie note. `pie` es opcional.

## Fortran en el navegador

Una valla `fortran` activa el editor y la ejecución mediante LFortran compilado
a WebAssembly. No requiere registrar el curso ni la sesión en TypeScript.
`fortran !sin-consola` conserva la salida de referencia y señala ejecución local;
úsalo si la comparación real con GNU Fortran detecta una incompatibilidad.

Para un ejercicio de completado utiliza `ejercicio fortran`, con las mismas
secciones Enunciado, Plantilla, Esperado y Pista del formato de ejercicios.
La plantilla debe contener un solo hueco `___` y un programa completo. Comprueba
una respuesta correcta y otra incorrecta en el navegador antes de publicarlo.

Después de un bloque Fortran puedes añadir una valla `entrada` con los datos
para la entrada estándar, o una valla `archivo nombre.dat` con el contenido de
un archivo virtual. Estas vallas se asocian al programa anterior. El alumno puede
editar sus datos desde «Datos de entrada»; cada ejecución reconstruye el entorno
sin conservar los archivos escritos por un intento anterior.

El motor se descarga y prepara al abrir una lección de Fortran o el sandbox de
su ruta de aprendizaje. El índice del curso y la página de la ruta enlazan al
sandbox, que conserva un borrador local y permite descargar el fuente `.f90`.
«Detener» cancela el proceso; la ejecución
tiene un límite de tiempo y de salida. Las fuentes del alumno permanecen en su
navegador. Consulta `public/vendor/xlfortran/README.md` para las versiones,
licencias, comprobaciones y limitaciones conocidas del motor.

## Bash en el navegador

Una valla `bash` en un curso cuyo slug contiene `bash` se ejecuta en el
navegador con GNU Bash 5.1 compilado a WebAssembly (Wasmer/WASIX), junto con
coreutils, GNU grep, GNU sed y `find`. Cada bloque corre solo, en un sandbox
nuevo con directorio `/workspace`: no ve variables ni archivos de otro bloque.

- Después del bloque pueden ir `entrada` (entrada estándar) y
  `archivo nombre.txt` (archivo virtual en `/workspace`), igual que en Fortran.
- Si el código usa algo que el motor no tiene —red, `awk`, Bash 5.2/5.3—, la
  valla va como `bash !sin-consola` y su salida se obtiene en una terminal real.
- Ejercicio de completado: `ejercicio bash`, con las secciones de siempre. La
  salida debe coincidir exactamente, espacios incluidos.
- Un bloque sin valla `salida` no debe imprimir nada.

Las salidas no se escriben a mano: `node scripts/verificar-bash.mjs
--curso=<slug> --escribir` las rellena ejecutando cada bloque en el mismo motor
y `npm run test:bash` comprueba que siguen coincidiendo. Las respuestas
correcta e incorrecta de cada ejercicio van en `scripts/bash-respuestas.json`.
Detalles del motor y sus diferencias con Linux: `public/vendor/bash/README.md`.
