---
numero: 2
titulo: "Órdenes internas, programas y ayuda"
---

# Órdenes internas y programas

Una orden puede ser de dos clases. Un **builtin** (orden interna) está
implementado dentro de la propia Bash: ejecutarlo no arranca ningún programa
nuevo. Un **programa externo** es un archivo ejecutable guardado en algún
directorio del sistema, por ejemplo `/usr/bin/ls`; para ejecutarlo, Bash crea un
proceso nuevo y espera a que termine.

La diferencia importa por dos motivos: un builtin puede modificar el estado de
la propia shell —`cd` cambia el directorio en el que trabaja Bash, algo que un
programa aparte no podría hacer— y la ayuda de cada clase se consulta de forma
distinta.

> Doc: [Shell Builtin Commands](https://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html)

```verdadero-falso
# Enunciado
Para ejecutar un builtin, Bash crea un proceso nuevo y espera a que termine.

# Respuesta
falso

# Explicación
Un builtin está implementado dentro de Bash y se ejecuta en la propia shell. El
proceso nuevo se crea para los programas externos.

# Pista
Recuerda dónde está el código de un builtin.
```

# Saber qué es cada orden: type

`type` indica cómo interpretaría Bash un nombre si se usara como orden: si es
un builtin, una palabra reservada, una función o un programa, y en este último
caso la ruta del archivo.

```bash
type echo
type cd
type ls
```

```salida
echo is a shell builtin
cd is a shell builtin
ls is /usr/bin/ls
```

> Doc: [type](https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-type)

> Nota: Los mensajes de Bash salen en inglés porque el entorno del navegador
> usa la configuración regional `C.UTF-8`. En un sistema configurado en español,
> `type echo` puede responder «echo es una orden interna del shell».

```ejercicio bash
# Enunciado
Completa la orden que indica si cd es un builtin o un programa.

# Plantilla
___ cd

# Esperado
cd is a shell builtin

# Pista
Cuatro letras: «tipo» en inglés.
```

# Una sola palabra: type -t

La opción `-t` (de *type*, «tipo») hace que `type` responda con una sola
palabra: `builtin`, `file` si es un programa, `keyword` si es una palabra
reservada, `function` o `alias`. Esa forma breve sirve cuando la respuesta la va
a leer otro programa en lugar de una persona.

```bash
type -t echo
type -t ls
type -t if
```

```salida
builtin
file
keyword
```

> Doc: [type](https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-type)

```relacionar
# Enunciado
Relaciona cada nombre con la palabra que devuelve type -t.

# Pares
- echo => builtin
- ls => file
- if => keyword

# Explicación
echo está dentro de Bash, ls es el archivo /usr/bin/ls e if es una palabra
reservada del lenguaje.

# Pista
Solo uno de los tres es un archivo del sistema.
```

# La ayuda de los builtins: help

`help` muestra la ayuda de un builtin. Sin opciones imprime la sintaxis y la
descripción completa; con `-d` (de *description*) imprime solo la descripción
breve, en una línea.

```bash
help -d echo
help -d cd
```

```salida
echo - Write arguments to the standard output.
cd - Change the shell working directory.
```

> Doc: [help](https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-help)

```ejercicio bash
# Enunciado
Completa la opción que limita la ayuda de pwd a su descripción breve.

# Plantilla
help ___ pwd

# Esperado
pwd - Print the name of the current working directory.

# Pista
Un guion y la inicial de «description».
```

# La primera línea de una ayuda

La primera línea de `help` muestra la **sintaxis** de la orden. Las partes entre
corchetes (`[` y `]`) son opcionales y la barra vertical (`|`) separa
alternativas. En la sintaxis de `cd`, `[dir]` indica que el directorio se puede
omitir.

```bash
help cd | head -n 1
```

```salida
cd: cd [-L|[-P [-e]] [-@]] [dir]
```

> Doc: [cd](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-cd)

> Nota: La barra vertical que une `help cd` con `head -n 1` es una tubería:
> entrega la salida de la primera orden a la segunda. `head -n 1` se queda con la
> primera línea. Las dos se estudian en la sesión 6.

```opcion-multiple
# Enunciado
En la sintaxis «cd [-L|[-P [-e]] [-@]] [dir]», ¿qué indican los corchetes que rodean a dir?

# Opciones
- Que dir debe escribirse entre corchetes
- Que dir es opcional
- Que dir es una lista de directorios
- Que dir solo se admite con -P

# Correcta
2

# Explicación
En la notación de las ayudas, lo que va entre corchetes se puede omitir.

# Pista
Piensa en qué pasa si se escribe cd solo.
```

# La ayuda de los programas: --help

Los programas externos no tienen entrada en `help`. Por convención, casi todos
aceptan la opción `--help` e imprimen su propia ayuda. Las opciones largas
empiezan con dos guiones (`--`) y una palabra completa; las cortas, con un guion
y una letra.

```bash
ls --help | head -n 2
```

```salida
List directory contents.
Ignore files and directories starting with a '.' by default
```

> Doc: [ls invocation](https://www.gnu.org/software/coreutils/manual/html_node/ls-invocation.html)

> Nota: En el navegador, `ls` y las demás utilidades básicas pertenecen a
> uutils coreutils, una reimplementación compatible de GNU coreutils. Las
> opciones son las mismas, pero el texto de `--help` difiere del que imprime una
> distribución Linux con GNU coreutils.

```verdadero-falso
# Enunciado
help ls muestra la ayuda de ls, igual que help cd muestra la de cd.

# Respuesta
falso

# Explicación
help solo conoce los builtins. ls es un programa externo y su ayuda se obtiene
con ls --help o con el manual del sistema.

# Pista
Recuerda qué devuelve type -t ls.
```

# El manual del sistema: man

En un sistema Linux, `man` (de *manual*) abre la página de manual de un
programa: una descripción completa de su sintaxis, sus opciones y su
comportamiento. La página se recorre con las flechas y se cierra con la tecla
`q`. `man bash` abre el manual completo de Bash.

```bash !sin-consola
man ls
```

> Nota: Este bloque no se ejecuta en el navegador porque el entorno no incluye
> `man` ni las páginas de manual. En una terminal Linux funciona tal cual.

```ordenar
# Enunciado
Ordena los pasos para consultar la ayuda de una orden desconocida.

# Elementos
- Si es un programa, ejecutar la orden con --help o abrir man
- Averiguar qué es la orden con type
- Si es un builtin, ejecutar help con su nombre

# Orden
2, 3, 1

# Explicación
type dice primero de qué clase es la orden; según la respuesta, la ayuda se
consulta con help o con --help y man.

# Pista
No se puede elegir la herramienta de ayuda sin saber antes qué es la orden.
```

# Cierre de la sesión

Quedó cubierta la diferencia entre builtins y programas externos, `type` y
`type -t` para distinguirlos, `help` y `help -d` para los builtins, la notación
de la sintaxis, `--help` y `man` para los programas. La sesión 3 recorre el
sistema de archivos: directorios, rutas y las órdenes `pwd`, `ls`, `mkdir` y `cd`.
