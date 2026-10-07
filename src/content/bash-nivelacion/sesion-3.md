---
numero: 3
titulo: "El sistema de archivos"
---

# Directorios y rutas

Los archivos se organizan en **directorios** (carpetas), que a su vez pueden
contener otros directorios. El conjunto forma un árbol con un único punto de
partida, el **directorio raíz**, que se escribe con una barra (`/`).

Una **ruta** es el nombre de un archivo o directorio dentro de ese árbol: los
nombres de los directorios que hay que atravesar, separados por barras. Una
**ruta absoluta** empieza con `/` y se lee desde la raíz: `/usr/bin/ls` es el
archivo `ls`, dentro de `bin`, dentro de `usr`, dentro de la raíz. Una **ruta
relativa** no empieza con `/` y se lee desde el directorio en el que se está
trabajando.

> Doc: [Definitions](https://www.gnu.org/software/bash/manual/html_node/Definitions.html)

```opcion-multiple
# Enunciado
¿Cuál de estas rutas es absoluta?

# Opciones
- informes/enero.txt
- ../copias
- /var/log/syslog
- ./despliegue.sh

# Correcta
3

# Explicación
Una ruta absoluta empieza con la barra de la raíz (/). Las demás se interpretan
desde el directorio de trabajo.

# Pista
Busca la que empieza en la raíz.
```

# El directorio de trabajo: pwd

Bash siempre está situado en un directorio, el **directorio de trabajo**. Las
rutas relativas se resuelven a partir de él. `pwd` (de *print working
directory*, «imprimir el directorio de trabajo») escribe su ruta absoluta.

```bash
pwd
```

```salida
/workspace
```

> Doc: [pwd](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-pwd)

> Nota: En una terminal Linux el directorio de trabajo inicial suele ser la
> carpeta personal, por ejemplo `/home/ana`. En el navegador cada bloque empieza
> en `/workspace`, que hace de carpeta personal.

```ejercicio bash
# Enunciado
Completa la orden que imprime el directorio de trabajo.

# Plantilla
___

# Esperado
/workspace

# Pista
Son las iniciales de «print working directory».
```

# Crear un directorio: mkdir

`mkdir` (de *make directory*) crea los directorios que recibe como argumentos.
La ruta puede ser relativa: `mkdir informes` crea `informes` dentro del
directorio de trabajo.

```bash
mkdir informes copias
ls
```

```salida
copias	informes
```

> Doc: [mkdir invocation](https://www.gnu.org/software/coreutils/manual/html_node/mkdir-invocation.html)

```ejercicio bash
# Enunciado
Completa la orden que crea el directorio registros.

# Plantilla
___ registros
ls -F

# Esperado
registros/

# Pista
Las iniciales de «make directory», sin espacio.
```

# Crear varios niveles: mkdir -p

Sin opciones, `mkdir` no crea los directorios intermedios: si se pide
`despliegue/web/estaticos` y `despliegue` no existe, termina con un error. La
opción `-p` (de *parents*, «padres») crea todos los directorios que falten en la
ruta y no protesta si alguno ya existía.

```bash
mkdir despliegue/web
mkdir -p despliegue/web/estaticos
ls despliegue/web
```

```salida
mkdir: cannot create directory 'despliegue/web': No such file or directory
estaticos
```

> Doc: [mkdir invocation](https://www.gnu.org/software/coreutils/manual/html_node/mkdir-invocation.html)

```verdadero-falso
# Enunciado
mkdir -p proyecto termina con un error si el directorio proyecto ya existe.

# Respuesta
falso

# Explicación
Con -p, mkdir no considera un error que el directorio ya exista; sin -p, sí.

# Pista
Relee qué más hace -p además de crear los niveles intermedios.
```

# Listar el contenido: ls

`ls` (de *list*) escribe los nombres que contiene un directorio, ordenados
alfabéticamente. Sin argumentos lista el directorio de trabajo; con argumentos,
los directorios indicados.

```bash
mkdir -p servidor/config servidor/logs
ls servidor
```

```salida
config	logs
```

> Doc: [ls invocation](https://www.gnu.org/software/coreutils/manual/html_node/ls-invocation.html)

> Nota: `ls` presenta los nombres en columnas, separados por espacios o
> tabuladores, como en una terminal. Cuando su salida va a otro programa a
> través de una tubería, GNU `ls` escribe un nombre por línea.

```ejercicio bash
# Enunciado
Completa la orden que lista el contenido del directorio datos.

# Plantilla
mkdir -p datos/2025 datos/2026
___ datos

# Esperado
2025  2026

# Pista
Dos letras, de «list».
```

# Archivos ocultos: ls -a

Un nombre que empieza con punto (`.`) es un **archivo oculto**: `ls` no lo
muestra si no se pide. La opción `-a` (de *all*, «todos») lista también los
ocultos. Aparecen además dos entradas que existen en todo directorio: `.`, el
propio directorio, y `..`, el directorio que lo contiene.

```bash
mkdir proyecto .config
ls
echo ---
ls -a
```

```salida
proyecto
---
.  ..  .config	proyecto
```

> Doc: [ls invocation](https://www.gnu.org/software/coreutils/manual/html_node/ls-invocation.html)

```verdadero-falso
# Enunciado
.. es un archivo oculto que alguien creó en el directorio.

# Respuesta
falso

# Explicación
.. existe en todo directorio y nombra al directorio que lo contiene. Nadie lo
crea; ls -a lo muestra junto con . (el propio directorio).

# Pista
Revisa qué dos entradas aparecen siempre con ls -a.
```

# Distinguir directorios: ls -F

La opción `-F` (de *classify*, «clasificar») añade un indicador al final de cada
nombre según su tipo: una barra (`/`) para los directorios. Los archivos
normales no llevan indicador.

```bash
mkdir copias
echo hola > notas.txt
ls -F
```

```salida
copias/	 notas.txt
```

> Doc: [ls invocation](https://www.gnu.org/software/coreutils/manual/html_node/ls-invocation.html)

> Nota: `echo hola > notas.txt` crea el archivo `notas.txt` con el texto
> `hola`. El signo mayor que (`>`) es una redirección: envía la salida de `echo`
> a un archivo en lugar de a la pantalla. Se estudia en la sesión 4.

```opcion-multiple
# Enunciado
Con ls -F, ¿cómo aparece un directorio llamado web?

# Opciones
- web
- web/
- web*
- [web]

# Correcta
2

# Explicación
-F añade una barra al final de los nombres de directorio.

# Pista
Es el mismo carácter que separa los nombres en una ruta.
```

# Listado detallado: ls -l

La opción `-l` (de *long*, «largo») escribe una línea por entrada con siete
datos: el tipo y los permisos, el número de enlaces, el propietario, el grupo,
el tamaño en bytes, la fecha de la última modificación y el nombre. Una `d` al
principio de la línea indica un directorio; un guion (`-`), un archivo normal.

```bash !variable
mkdir informes
echo "carga del 85 %" > estado.txt
ls -l
```

> Doc: [ls invocation](https://www.gnu.org/software/coreutils/manual/html_node/ls-invocation.html)

> Nota: La fecha cambia en cada ejecución, por eso este bloque no muestra una
> salida fija. En el navegador el propietario aparece como `somebody`, el grupo
> como `somegroup` y los permisos siempre como `rwxrwxrwx`, porque el sistema de
> archivos virtual no gestiona usuarios. En Linux aparecen el usuario y los
> permisos reales.

```relacionar
# Enunciado
Relaciona cada carácter inicial de una línea de ls -l con lo que indica.

# Pares
- la letra d => la entrada es un directorio
- un guion (-) => la entrada es un archivo normal

# Explicación
El primer carácter de cada línea de ls -l indica el tipo de la entrada.

# Pista
Uno de los dos es la inicial de «directory».
```

# Cambiar de directorio: cd

`cd` (de *change directory*) cambia el directorio de trabajo. Es un builtin
porque tiene que modificar el estado de la propia shell. Después de `cd`, las
rutas relativas se resuelven desde el directorio nuevo.

```bash
mkdir -p proyecto/src
cd proyecto
pwd
ls
```

```salida
/workspace/proyecto
src
```

> Doc: [cd](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-cd)

```ejercicio bash
# Enunciado
Completa la orden que entra en el directorio app antes de imprimir el directorio de trabajo.

# Plantilla
mkdir app
___ app
pwd

# Esperado
/workspace/app

# Pista
Las iniciales de «change directory».
```

# Subir un nivel: cd ..

`..` es el directorio que contiene al actual, así que `cd ..` sube un nivel en
el árbol. Las rutas relativas pueden combinar `..` con nombres: `../logs` es el
directorio `logs` que está junto al actual.

```bash
mkdir -p servidor/config servidor/logs
cd servidor/config
pwd
cd ../logs
pwd
cd ..
pwd
```

```salida
/workspace/servidor/config
/workspace/servidor/logs
/workspace/servidor
```

> Doc: [cd](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-cd)

```ejercicio bash
# Enunciado
Desde a/b, completa la ruta relativa que entra en el directorio c, que está junto a b.

# Plantilla
mkdir -p a/b a/c
cd a/b
cd ___
pwd

# Esperado
/workspace/a/c

# Pista
Primero hay que subir a a y después entrar en c.
```

# La carpeta personal: ~ y cd sin argumentos

La variable `HOME` guarda la ruta de la carpeta personal. `cd` sin argumentos
vuelve a ella. La tilde (`~`) al principio de una palabra se sustituye por esa
misma ruta, de modo que `~/informes` es el directorio `informes` de la carpeta
personal, se esté donde se esté.

```bash
cd /tmp
pwd
cd
pwd
echo ~
```

```salida
/tmp
/workspace
/workspace
```

> Doc: [Tilde Expansion](https://www.gnu.org/software/bash/manual/html_node/Tilde-Expansion.html)

```verdadero-falso
# Enunciado
cd sin argumentos deja el directorio de trabajo como estaba.

# Respuesta
falso

# Explicación
Sin argumentos, cd cambia a la carpeta personal, la que guarda la variable HOME.

# Pista
Mira la segunda línea de la salida del ejemplo.
```

# Volver al anterior: cd -

`cd -` (un guion) vuelve al directorio en el que se estaba antes del último
`cd` e imprime su ruta. Bash guarda ese directorio anterior en la variable
`OLDPWD`.

```bash
mkdir -p web/estaticos
cd web/estaticos
cd /tmp
cd -
```

```salida
/workspace/web/estaticos
```

> Doc: [cd](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-cd)

```opcion-multiple
# Enunciado
Tras «cd /etc» y luego «cd /tmp», ¿a qué directorio lleva cd -?

# Opciones
- A la carpeta personal
- A /tmp
- A /etc
- A la raíz /

# Correcta
3

# Explicación
cd - vuelve al directorio anterior al último cambio, el que guarda OLDPWD: /etc.

# Pista
Es el directorio desde el que se hizo el último cd.
```

# Cierre de la sesión

Quedaron cubiertos el árbol de directorios, las rutas absolutas y relativas,
`pwd`, `mkdir` y `mkdir -p`, `ls` con `-a`, `-F` y `-l`, y `cd` con una ruta,
con `..`, sin argumentos, con `~` y con `-`. La sesión 4 crea, copia, mueve y
borra archivos.
