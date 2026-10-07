---
numero: 6
titulo: "Combinar órdenes"
---

# Tuberías: |

Una **tubería** (*pipeline*) conecta órdenes con la barra vertical (`|`): la
salida estándar de la orden de la izquierda pasa a ser la **entrada estándar**
de la de la derecha, sin crear archivos intermedios. Casi todas las órdenes de la
sesión 5 leen la entrada estándar cuando no reciben un archivo.

```bash
grep GET acceso.log | wc -l
```

```archivo acceso.log
08:00 GET /inicio 200
08:01 POST /acceder 302
08:02 GET /cursos 200
08:03 GET /favicon.ico 404
```

```salida
3
```

> Doc: [Pipelines](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html)

```ejercicio bash
# Enunciado
Completa el operador que entrega la salida de printf a sort.

# Plantilla
printf 'zeta\nalfa\n' ___ sort

# Esperado
alfa
zeta

# Pista
Es la barra vertical.
```

# Una cadena de varias etapas

Una tubería puede tener tantas etapas como haga falta. Cada orden hace un solo
trabajo y entrega el resultado a la siguiente. Esta cadena responde a «¿qué
rutas se pidieron y cuántas veces, de la más pedida a la menos?».

```bash
cut -d " " -f 3 acceso.log | sort | uniq -c | sort -rn
```

```archivo acceso.log
08:00 GET /inicio 200
08:01 GET /cursos 200
08:02 GET /cursos 200
08:03 GET /favicon.ico 404
08:04 GET /cursos 200
08:05 GET /inicio 200
```

```salida
      3 /cursos
      2 /inicio
      1 /favicon.ico
```

> Doc: [Pipelines](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html)

> Doc: [cut invocation](https://www.gnu.org/software/coreutils/manual/html_node/cut-invocation.html)

> Nota: `cut` extrae columnas. `-d " "` (de *delimiter*) indica que las columnas
> se separan con un espacio y `-f 3` (de *fields*, «campos») elige la tercera.
> `sort -rn` combina `-r` y `-n`: orden numérico de mayor a menor.

```ordenar
# Enunciado
Ordena las etapas de una tubería que cuenta cuántas veces aparece cada estado HTTP.

# Elementos
- uniq -c
- cut -d " " -f 4 acceso.log
- sort

# Orden
2, 3, 1

# Explicación
Primero se extrae la columna, después se ordena para juntar los iguales y por
último uniq -c cuenta cada grupo.

# Pista
uniq necesita las líneas iguales juntas.
```

# Añadir al final: >>

El signo `>>` también redirige la salida a un archivo, pero **añade** al final en
lugar de vaciarlo. Es la forma de ir acumulando líneas en un registro.

```bash
echo "08:00 arranque" >> eventos.log
echo "08:05 copia completada" >> eventos.log
cat eventos.log
```

```salida
08:00 arranque
08:05 copia completada
```

> Doc: [Appending Redirected Output](https://www.gnu.org/software/bash/manual/html_node/Appending-Redirected-Output.html)

```ejercicio bash
# Enunciado
Completa el operador que añade la segunda línea sin borrar la primera.

# Plantilla
echo uno > lista.txt
echo dos ___ lista.txt
cat lista.txt

# Esperado
uno
dos

# Pista
Dos signos mayor que seguidos.
```

# Leer de un archivo: <

El signo menor que (`<`) redirige la **entrada** estándar: la orden lee el
archivo como si alguien lo estuviera escribiendo en el teclado. Con `wc -l`, la
diferencia es visible: al recibir el texto por la entrada, `wc` no conoce el
nombre del archivo y no lo escribe.

```bash
wc -l servidores.txt
wc -l < servidores.txt
```

```archivo servidores.txt
web-01
web-02
db-01
```

```salida
3 servidores.txt
3
```

> Doc: [Redirecting Input](https://www.gnu.org/software/bash/manual/html_node/Redirecting-Input.html)

```opcion-multiple
# Enunciado
¿Por qué «wc -l < servidores.txt» no escribe el nombre del archivo?

# Opciones
- Porque < borra el nombre del archivo
- Porque Bash abre el archivo y wc solo recibe su contenido por la entrada estándar
- Porque wc -l nunca escribe nombres
- Porque el archivo está vacío

# Correcta
2

# Explicación
Con <, quien abre el archivo es Bash; wc lee la entrada estándar sin saber de
dónde procede.

# Pista
Piensa en quién abre el archivo en cada caso.
```

# La salida de error: 2>

Un programa tiene dos canales de salida: la **salida estándar**, para los
resultados, y la **salida de error estándar**, para los mensajes de error. Cada
canal tiene un número, su **descriptor de archivo**: 0 es la entrada, 1 la
salida y 2 la salida de error. `>` equivale a `1>`; `2>` redirige solo los
errores.

```bash
ls informe.txt noexiste.txt 2> errores.txt
echo "--- errores.txt:"
cat errores.txt
```

```archivo informe.txt
resumen semanal
```

```salida
informe.txt
--- errores.txt:
ls: cannot access 'noexiste.txt': No such file or directory
```

> Doc: [Redirections](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)

```relacionar
# Enunciado
Relaciona cada descriptor de archivo con su canal.

# Pares
- 0 => entrada estándar
- 1 => salida estándar
- 2 => salida de error estándar

# Explicación
Son los tres descriptores que todo programa recibe abiertos al arrancar.

# Pista
La entrada es el primero.
```

# El estado de salida: $?

Al terminar, toda orden devuelve un número entre 0 y 255, su **estado de
salida**. **0 significa éxito**; cualquier otro valor, fallo. Bash guarda el
estado de la última orden en el parámetro especial `$?`. Las órdenes `true` y
`false` no hacen nada más que terminar con 0 y con 1.

```bash
true
echo "true: $?"
false
echo "false: $?"
ls noexiste.txt
echo "ls: $?"
```

```salida
true: 0
false: 1
ls: cannot access 'noexiste.txt': No such file or directory
ls: 2
```

> Doc: [Exit Status](https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html)

> Doc: [Special Parameters](https://www.gnu.org/software/bash/manual/html_node/Special-Parameters.html)

> Nota: Que el éxito sea 0 permite un único valor para «todo bien» y muchos para
> distinguir fallos: `ls` usa 1 para problemas menores y 2 para problemas graves,
> como un archivo que no existe.

```ejercicio bash
# Enunciado
Completa el parámetro que contiene el estado de salida de false.

# Plantilla
false
echo ___

# Esperado
1

# Pista
Un signo de dólar seguido de un signo de interrogación.
```

# Orden no encontrada: 127

Cuando el nombre de la orden no corresponde a ningún builtin ni a ningún
programa, Bash escribe un error y el estado de salida es **127**. Si el archivo
existe pero no tiene permiso de ejecución, el estado es **126**.

```bash !sin-consola
noexiste
echo "estado: $?"
```

```salida
script.sh: line 1: noexiste: command not found
estado: 127
```

> Doc: [Exit Status](https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html)

> Nota: Esta salida se obtuvo con GNU Bash en Linux. En el motor del navegador,
> el estado de salida de un proceso hijo mayor que 79 llega como 79, una
> limitación del entorno WebAssembly; por eso este bloque no tiene consola.

```verdadero-falso
# Enunciado
Si se escribe mal el nombre de una orden, por ejemplo «lss», el estado de salida es 127.

# Respuesta
verdadero

# Explicación
127 es el estado que Bash asigna cuando no encuentra la orden.

# Pista
Relee el primer párrafo de este apartado.
```

# Ejecutar si tiene éxito: &&

El operador `&&` (Y lógico) ejecuta la orden de la derecha **solo si** la de la
izquierda terminó con estado 0. Encadena pasos que dependen del anterior: no
tiene sentido entrar en un directorio que no se pudo crear.

```bash
mkdir -p release && cd release && pwd
cd noexiste && echo "esto no se imprime"
```

```salida
/workspace/release
script.sh: line 2: cd: noexiste: No such file or directory
```

> Doc: [Lists of Commands](https://www.gnu.org/software/bash/manual/html_node/Lists.html)

```ejercicio bash
# Enunciado
Completa el operador para que «copia hecha» se imprima solo si cp tuvo éxito.

# Plantilla
echo datos > origen.txt
cp origen.txt destino.txt ___ echo "copia hecha"

# Esperado
copia hecha

# Pista
Dos signos et (&).
```

# Ejecutar si falla: ||

El operador `||` (O lógico) ejecuta la orden de la derecha **solo si** la de la
izquierda falló. Se usa para reaccionar a un error: avisar, crear lo que falta o
detener el proceso.

```bash
grep -q ERROR app.log || echo "sin errores"
cd /noexiste 2> /dev/null || echo "no se pudo entrar"
```

```archivo app.log
INFO arranque
INFO listo
```

```salida
sin errores
no se pudo entrar
```

> Doc: [Lists of Commands](https://www.gnu.org/software/bash/manual/html_node/Lists.html)

> Nota: `grep -q` (de *quiet*, «silencioso») no escribe nada: solo indica con
> su estado si encontró el patrón (0) o no (1). `/dev/null` es un archivo
> especial que descarta todo lo que recibe; `2> /dev/null` oculta el mensaje de
> error de `cd`.

```relacionar
# Enunciado
Relaciona cada operador con cuándo ejecuta la orden de su derecha.

# Pares
- ; => siempre
- && => solo si la izquierda terminó con estado 0
- || => solo si la izquierda terminó con un estado distinto de 0

# Explicación
El punto y coma solo separa; && y || miran el estado de salida de la orden
anterior.

# Pista
Uno de los tres no consulta el estado de salida.
```

# Cierre del curso

La nivelación cubrió qué es una shell y cómo Bash divide una orden en palabras;
builtins, programas y su ayuda; rutas y directorios con `pwd`, `ls`, `mkdir` y
`cd`; archivos con `touch`, `cat`, `cp`, `mv` y `rm`; lectura y medida con
`head`, `tail`, `wc`, `sort`, `uniq` y `grep`; y, en esta sesión, tuberías,
redirecciones de entrada, salida y error, el estado de salida y los operadores
`&&` y `||`.

El curso **Introducción a Bash** parte de aquí: guarda órdenes en scripts,
trabaja con variables y comillas, y toma decisiones con `if`, `case` y bucles.
