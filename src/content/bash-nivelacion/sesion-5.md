---
numero: 5
titulo: "Leer y medir archivos"
---

# Los datos de esta sesión

Los ejemplos trabajan sobre registros de un servidor web. Cada bloque trae su
archivo en la sección **Datos de entrada**: se crea en `/workspace` antes de
ejecutar el código y se puede modificar para probar otros casos.

Un registro (*log*) es un archivo de texto en el que un programa anota, línea
por línea, lo que va ocurriendo. Leerlo y medirlo desde la terminal es una de
las tareas más frecuentes al operar un servidor.

```verdadero-falso
# Enunciado
Un archivo de registro guarda una línea por cada suceso que anota el programa.

# Respuesta
verdadero

# Explicación
Los registros de texto anotan un suceso por línea, lo que permite contarlos y
filtrarlos con las órdenes de esta sesión.

# Pista
Relee la definición de registro.
```

# Las primeras líneas: head

`head` («cabeza») escribe las primeras líneas de un archivo. Por omisión son
10. La opción `-n` (de *number*) indica cuántas.

```bash
head -n 3 acceso.log
```

```archivo acceso.log
08:00 GET /inicio 200
08:01 GET /cursos 200
08:01 POST /acceder 302
08:02 GET /cursos/bash 200
08:03 GET /favicon.ico 404
08:05 GET /cursos 200
```

```salida
08:00 GET /inicio 200
08:01 GET /cursos 200
08:01 POST /acceder 302
```

> Doc: [head invocation](https://www.gnu.org/software/coreutils/manual/html_node/head-invocation.html)

```ejercicio bash
# Enunciado
Completa el número para mostrar solo la primera línea del registro.

# Plantilla
printf '08:00 inicio\n08:01 cursos\n' > corto.log
head -n ___ corto.log

# Esperado
08:00 inicio

# Pista
Una sola línea.
```

# Las últimas líneas: tail

`tail` («cola») escribe las últimas líneas. También muestra 10 por omisión y
acepta `-n`. Como los registros añaden las líneas nuevas al final, `tail` es la
forma de ver lo más reciente.

```bash
tail -n 2 acceso.log
```

```archivo acceso.log
08:00 GET /inicio 200
08:01 GET /cursos 200
08:01 POST /acceder 302
08:02 GET /cursos/bash 200
08:03 GET /favicon.ico 404
08:05 GET /cursos 200
```

```salida
08:03 GET /favicon.ico 404
08:05 GET /cursos 200
```

> Doc: [tail invocation](https://www.gnu.org/software/coreutils/manual/html_node/tail-invocation.html)

> Nota: En un servidor real se usa `tail -f` (de *follow*, «seguir»): después de
> mostrar el final, `tail` queda esperando y escribe cada línea nueva en cuanto
> se añade. Termina con Ctrl+C. No se muestra aquí porque el bloque nunca
> acabaría.

```ejercicio bash
# Enunciado
Completa la orden que muestra la última línea del registro.

# Plantilla
printf 'arranque\nlisto\n' > app.log
___ -n 1 app.log

# Esperado
listo

# Pista
Lo contrario de head.
```

# Contar líneas: wc -l

`wc` (de *word count*, «recuento de palabras») cuenta las líneas, las palabras y
los bytes de un archivo. La opción `-l` (de *lines*) limita el recuento a las
líneas, que en un registro equivale al número de sucesos.

```bash
wc -l acceso.log
```

```archivo acceso.log
08:00 GET /inicio 200
08:01 GET /cursos 200
08:01 POST /acceder 302
08:02 GET /cursos/bash 200
08:03 GET /favicon.ico 404
08:05 GET /cursos 200
```

```salida
6 acceso.log
```

> Doc: [wc invocation](https://www.gnu.org/software/coreutils/manual/html_node/wc-invocation.html)

```ejercicio bash
# Enunciado
Completa la opción que cuenta solo las líneas.

# Plantilla
printf 'web-01 activo\nweb-02 activo\ndb-01 caido\n' > estado.txt
wc ___ estado.txt

# Esperado
3 estado.txt

# Pista
Un guion y la inicial de «lines».
```

# Palabras y bytes: wc -w y wc -c

`-w` (de *words*) cuenta palabras: secuencias de caracteres separadas por
espacios, tabuladores o saltos de línea. `-c` (de *characters*, aunque cuenta
**bytes**) cuenta los bytes del archivo, saltos de línea incluidos. Sin
opciones, `wc` escribe los tres números en el orden líneas, palabras, bytes.

```bash
printf 'GET /inicio 200\n' > linea.txt
wc -w linea.txt
wc -c linea.txt
wc linea.txt
```

```salida
3 linea.txt
16 linea.txt
 1  3 16 linea.txt
```

> Doc: [wc invocation](https://www.gnu.org/software/coreutils/manual/html_node/wc-invocation.html)

> Nota: `printf` escribe su texto tal cual y traduce `\n` a un salto de línea.
> La línea tiene 15 caracteres visibles más el salto de línea: 16 bytes. Con
> letras acentuadas los bytes superan a los caracteres, porque en UTF-8 una «á»
> ocupa dos bytes.

```relacionar
# Enunciado
Relaciona cada opción de wc con lo que cuenta.

# Pares
- -l => líneas
- -w => palabras
- -c => bytes

# Explicación
Las tres opciones seleccionan uno de los tres recuentos que wc hace por
omisión.

# Pista
Cada letra es la inicial del nombre en inglés.
```

# Ordenar líneas: sort

`sort` escribe las líneas de un archivo ordenadas. Por omisión compara texto,
carácter por carácter. La opción `-r` (de *reverse*) invierte el orden.

```bash
sort servidores.txt
echo ---
sort -r servidores.txt
```

```archivo servidores.txt
web-02
db-01
web-01
cache-01
```

```salida
cache-01
db-01
web-01
web-02
---
web-02
web-01
db-01
cache-01
```

> Doc: [sort invocation](https://www.gnu.org/software/coreutils/manual/html_node/sort-invocation.html)

```ejercicio bash
# Enunciado
Completa la orden que ordena alfabéticamente los nombres.

# Plantilla
printf 'carlos\nana\nbeatriz\n' > equipo.txt
___ equipo.txt

# Esperado
ana
beatriz
carlos

# Pista
Cuatro letras: «ordenar» en inglés.
```

# Ordenar números: sort -n

Como texto, `"10"` va antes que `"9"`, porque se compara el primer carácter y
`1` es menor que `9`. La opción `-n` (de *numeric*) compara el valor numérico
del principio de cada línea.

```bash
sort tiempos.txt
echo ---
sort -n tiempos.txt
```

```archivo tiempos.txt
120
9
45
1000
```

```salida
1000
120
45
9
---
9
45
120
1000
```

> Doc: [sort invocation](https://www.gnu.org/software/coreutils/manual/html_node/sort-invocation.html)

```verdadero-falso
# Enunciado
Sin opciones, sort pone 1000 antes que 9.

# Respuesta
verdadero

# Explicación
Sin -n, sort compara texto: el primer carácter de 1000 es 1 y el de 9 es 9, y 1
va antes.

# Pista
Fíjate en la primera mitad de la salida del ejemplo.
```

# Quitar repetidas: uniq

`uniq` escribe una sola vez cada grupo de líneas **consecutivas** iguales. Si
las repeticiones no están juntas, no las detecta; por eso suele ir después de
`sort`, que coloca juntas las líneas iguales.

```bash
uniq rutas.txt
echo ---
sort rutas.txt > ordenadas.txt
uniq ordenadas.txt
```

```archivo rutas.txt
/cursos
/cursos
/inicio
/cursos
```

```salida
/cursos
/inicio
/cursos
---
/cursos
/inicio
```

> Doc: [uniq invocation](https://www.gnu.org/software/coreutils/manual/html_node/uniq-invocation.html)

```opcion-multiple
# Enunciado
¿Por qué uniq dejó dos veces «/cursos» en la primera salida?

# Opciones
- Porque uniq distingue mayúsculas de minúsculas
- Porque las dos apariciones restantes no estaban en líneas consecutivas
- Porque uniq solo elimina la última repetición
- Porque el archivo tiene espacios al final

# Correcta
2

# Explicación
uniq solo une repeticiones consecutivas. La tercera «/cursos» está separada de
las primeras por «/inicio».

# Pista
Mira qué hay entre la segunda y la cuarta línea del archivo.
```

# Contar repeticiones: uniq -c

La opción `-c` (de *count*) antepone a cada línea el número de veces que
apareció seguida. Junto con `sort` responde a la pregunta «¿cuántas veces se
pidió cada ruta?».

```bash
sort rutas.txt > ordenadas.txt
uniq -c ordenadas.txt
```

```archivo rutas.txt
/cursos
/cursos
/inicio
/cursos
```

```salida
      3 /cursos
      1 /inicio
```

> Doc: [uniq invocation](https://www.gnu.org/software/coreutils/manual/html_node/uniq-invocation.html)

```ejercicio bash
# Enunciado
Completa la opción de uniq que cuenta cuántas veces aparece cada estado.

# Plantilla
printf '200\n200\n404\n' > estados.txt
uniq ___ estados.txt

# Esperado
      2 200
      1 404

# Pista
Un guion y la inicial de «count».
```

# Buscar líneas: grep

`grep` escribe las líneas que contienen un **patrón**, un texto que se busca. El
nombre procede de una orden del antiguo editor `ed`: *global regular expression
print*, «imprimir globalmente las líneas que coinciden con una expresión
regular».

```bash
grep 404 acceso.log
```

```archivo acceso.log
08:00 GET /inicio 200
08:01 GET /cursos 200
08:03 GET /favicon.ico 404
08:04 GET /antiguo 404
08:05 GET /cursos 200
```

```salida
08:03 GET /favicon.ico 404
08:04 GET /antiguo 404
```

> Doc: [Invoking grep](https://www.gnu.org/software/grep/manual/grep.html#Invoking)

```ejercicio bash
# Enunciado
Completa la orden que muestra las líneas que contienen ERROR.

# Plantilla
printf 'INFO arranque\nERROR disco lleno\n' > app.log
___ ERROR app.log

# Esperado
ERROR disco lleno

# Pista
Cuatro letras; su nombre viene del editor ed.
```

# Ignorar mayúsculas: grep -i

`grep` distingue mayúsculas de minúsculas: `error` no encuentra `ERROR`. La
opción `-i` (de *ignore case*, «ignorar mayúsculas y minúsculas») las trata
como iguales.

```bash
grep error app.log
echo ---
grep -i error app.log
```

```archivo app.log
INFO arranque
ERROR disco lleno
Error de conexión
```

```salida
---
ERROR disco lleno
Error de conexión
```

> Doc: [Invoking grep](https://www.gnu.org/software/grep/manual/grep.html#Invoking)

```verdadero-falso
# Enunciado
Sin opciones, grep warn encuentra la línea «WARN memoria al 90 %».

# Respuesta
falso

# Explicación
grep distingue mayúsculas de minúsculas. Haría falta grep -i warn.

# Pista
Compara las letras del patrón con las de la línea.
```

# Excluir líneas: grep -v

La opción `-v` (de *invert*, «invertir») escribe las líneas que **no** contienen
el patrón. Sirve para descartar el ruido: por ejemplo, todo lo que terminó bien.

```bash
grep -v " 200" acceso.log
```

```archivo acceso.log
08:00 GET /inicio 200
08:01 POST /acceder 302
08:03 GET /favicon.ico 404
08:05 GET /cursos 200
```

```salida
08:01 POST /acceder 302
08:03 GET /favicon.ico 404
```

> Doc: [Invoking grep](https://www.gnu.org/software/grep/manual/grep.html#Invoking)

> Nota: El patrón va entre comillas porque lleva un espacio delante del `200`.
> Sin ese espacio, `-v 200` descartaría también una línea como `08:20 GET /x 404`,
> que contiene «200» dentro de la hora.

```ejercicio bash
# Enunciado
Completa la opción que muestra las líneas que no contienen DEBUG.

# Plantilla
printf 'DEBUG x=1\nINFO listo\nDEBUG y=2\n' > app.log
grep ___ DEBUG app.log

# Esperado
INFO listo

# Pista
Un guion y la inicial de «invert».
```

# Contar coincidencias: grep -c

La opción `-c` (de *count*) escribe cuántas líneas coinciden en lugar de
escribirlas. Responde directamente a preguntas como «¿cuántos errores 404 hubo?».

```bash
grep -c 404 acceso.log
```

```archivo acceso.log
08:00 GET /inicio 200
08:03 GET /favicon.ico 404
08:04 GET /antiguo 404
08:05 GET /cursos 200
```

```salida
2
```

> Doc: [Invoking grep](https://www.gnu.org/software/grep/manual/grep.html#Invoking)

```opcion-multiple
# Enunciado
¿Qué escribe grep -c GET en un registro de 50 líneas donde 30 contienen GET?

# Opciones
- Las 30 líneas
- Las 20 líneas restantes
- 30
- 50

# Correcta
3

# Explicación
-c sustituye las líneas por su número: 30.

# Pista
-c no escribe líneas.
```

# Cierre de la sesión

Quedaron cubiertos `head` y `tail` con `-n`, `wc` con `-l`, `-w` y `-c`, `sort`
con `-r` y `-n`, `uniq` y `uniq -c`, y `grep` con `-i`, `-v` y `-c`. La sesión
6 encadena estas órdenes con tuberías, guarda resultados con redirecciones y
usa el estado de salida para decidir qué ejecutar.
