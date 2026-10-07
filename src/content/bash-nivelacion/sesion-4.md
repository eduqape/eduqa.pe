---
numero: 4
titulo: "Crear, copiar, mover y borrar archivos"
---

# Crear un archivo vacío: touch

`touch` actualiza la fecha de modificación de los archivos que recibe. Si un
archivo no existe, lo crea vacío. Ese segundo efecto es el uso más habitual:
preparar un archivo antes de escribir en él.

```bash
touch servidores.txt despliegue.log
ls
```

```salida
despliegue.log	servidores.txt
```

> Doc: [touch invocation](https://www.gnu.org/software/coreutils/manual/html_node/touch-invocation.html)

```verdadero-falso
# Enunciado
touch borra el contenido de un archivo que ya existe.

# Respuesta
falso

# Explicación
Sobre un archivo que existe, touch solo actualiza su fecha de modificación; el
contenido queda intacto.

# Pista
touch solo crea el archivo cuando no existe.
```

# Escribir en un archivo: >

El signo mayor que (`>`) **redirige** la salida estándar de una orden a un
archivo: lo que la orden habría mostrado en pantalla se escribe en el archivo.
Si el archivo no existe, se crea; si existe, su contenido anterior se **borra**
antes de escribir.

```bash
echo "web-01" > servidores.txt
echo "web-02" > servidores.txt
cat servidores.txt
```

```salida
web-02
```

> Doc: [Redirecting Output](https://www.gnu.org/software/bash/manual/html_node/Redirecting-Output.html)

> Nota: La primera línea, `web-01`, desaparece porque el segundo `>` vacía el
> archivo antes de escribir `web-02`. Para añadir sin borrar se usa `>>`, que se
> estudia en la sesión 6.

```ejercicio bash
# Enunciado
Completa el operador que escribe la salida de echo en el archivo estado.txt.

# Plantilla
echo activo ___ estado.txt
cat estado.txt

# Esperado
activo

# Pista
Un solo carácter con forma de flecha hacia la derecha.
```

# Mostrar un archivo: cat

`cat` (de *concatenate*, «concatenar») lee los archivos que recibe, en orden, y
escribe su contenido seguido en la salida estándar. Con un solo archivo,
muestra ese archivo; con varios, los une.

```bash
echo "web-01" > web.txt
echo "db-01" > datos.txt
cat web.txt datos.txt
```

```salida
web-01
db-01
```

> Doc: [cat invocation](https://www.gnu.org/software/coreutils/manual/html_node/cat-invocation.html)

```ejercicio bash
# Enunciado
Completa la orden que muestra el contenido de version.txt.

# Plantilla
echo 2.4.1 > version.txt
___ version.txt

# Esperado
2.4.1

# Pista
Tres letras, abreviatura de «concatenate».
```

# Copiar un archivo: cp

`cp` (de *copy*) recibe un origen y un destino y copia el contenido del origen
en el destino. El archivo original no cambia. Si el destino ya existe, `cp` lo
sobrescribe sin preguntar.

```bash
echo "puerto=8080" > app.conf
cp app.conf app.conf.copia
ls
cat app.conf.copia
```

```salida
app.conf  app.conf.copia
puerto=8080
```

> Doc: [cp invocation](https://www.gnu.org/software/coreutils/manual/html_node/cp-invocation.html)

```ejercicio bash
# Enunciado
Completa la orden que copia nginx.conf en nginx.conf.bak.

# Plantilla
echo "worker_processes 2;" > nginx.conf
___ nginx.conf nginx.conf.bak
cat nginx.conf.bak

# Esperado
worker_processes 2;

# Pista
Dos letras, de «copy».
```

# Copiar dentro de un directorio

Si el último argumento de `cp` es un directorio que ya existe, `cp` copia allí
los archivos con el mismo nombre. Así se pueden copiar varios archivos de una
vez: todos los argumentos menos el último son orígenes.

```bash
mkdir copias
echo a > uno.txt
echo b > dos.txt
cp uno.txt dos.txt copias
ls copias
```

```salida
dos.txt	 uno.txt
```

> Doc: [cp invocation](https://www.gnu.org/software/coreutils/manual/html_node/cp-invocation.html)

```opcion-multiple
# Enunciado
En «cp a.txt b.txt c.txt destino», ¿qué papel tiene destino?

# Opciones
- Es otro archivo que se copia
- Es el directorio donde se copian a.txt, b.txt y c.txt
- Es el nombre que reciben las tres copias unidas
- Es una opción de cp

# Correcta
2

# Explicación
Con varios orígenes, el último argumento debe ser un directorio existente y los
archivos se copian dentro con su nombre.

# Pista
Cuenta cuántos orígenes hay.
```

# Copiar un directorio: cp -r

Sin opciones, `cp` no copia directorios. La opción `-r` (de *recursive*,
«recursivo») copia el directorio con todo lo que contiene, nivel por nivel.

```bash !sin-consola
mkdir -p sitio/css
echo "body {}" > sitio/css/estilo.css
cp sitio respaldo
cp -r sitio respaldo
ls respaldo/css
```

```salida
cp: -r not specified; omitting directory 'sitio'
estilo.css
```

> Doc: [cp invocation](https://www.gnu.org/software/coreutils/manual/html_node/cp-invocation.html)

> Nota: Esta salida se obtuvo con GNU coreutils en Linux. En el navegador,
> `cp -r` copia el directorio, pero el sistema de archivos virtual no admite
> copiar sus atributos y `cp` añade un aviso por cada directorio; por eso el
> bloque no tiene consola.

```opcion-multiple
# Enunciado
¿Qué orden copia el directorio conf, con todo su contenido, en conf-copia?

# Opciones
- cp conf conf-copia
- cp -r conf conf-copia
- mv conf conf-copia
- mkdir -p conf conf-copia

# Correcta
2

# Explicación
Sin -r, cp se niega a copiar directorios. mv no copia: traslada, y el original
deja de existir.

# Pista
Busca la opción de recursive.
```

# Mover y renombrar: mv

`mv` (de *move*) mueve un archivo o directorio. Si el destino es un nombre nuevo
en el mismo directorio, el efecto es un **cambio de nombre**; si es un directorio
existente, el archivo pasa a estar dentro de él. A diferencia de `cp`, el
original deja de existir en su sitio.

```bash
echo "release 3" > notas.txt
mv notas.txt cambios.txt
ls
mkdir historial
mv cambios.txt historial
ls historial
```

```salida
cambios.txt
cambios.txt
```

> Doc: [mv invocation](https://www.gnu.org/software/coreutils/manual/html_node/mv-invocation.html)

```ejercicio bash
# Enunciado
Completa la orden que cambia el nombre de borrador.txt a final.txt.

# Plantilla
echo texto > borrador.txt
___ borrador.txt final.txt
ls

# Esperado
final.txt

# Pista
Dos letras, de «move».
```

# Borrar archivos: rm

`rm` (de *remove*) borra los archivos que recibe. El borrado es **definitivo**:
no hay papelera de reciclaje en la terminal y un archivo borrado con `rm` no se
recupera desde Bash.

```bash
touch temporal.tmp informe.txt
rm temporal.tmp
ls
```

```salida
informe.txt
```

> Doc: [rm invocation](https://www.gnu.org/software/coreutils/manual/html_node/rm-invocation.html)

```verdadero-falso
# Enunciado
Un archivo borrado con rm pasa a la papelera y se puede restaurar desde Bash.

# Respuesta
falso

# Explicación
rm elimina el archivo del sistema de archivos; no existe una papelera
intermedia en la terminal.

# Pista
Relee qué dice el texto sobre el borrado.
```

# Preguntar antes de borrar: rm -i

La opción `-i` (de *interactive*, «interactivo») hace que `rm` pregunte por cada
archivo antes de borrarlo. Solo borra si la respuesta empieza por `y` (de
*yes*). En este bloque la respuesta llega por la entrada estándar: el texto que
aparece en «Datos de entrada».

```bash
touch importante.db
rm -i importante.db
echo
ls
```

```entrada
n
```

```salida
rm: remove regular empty file 'importante.db'? 
importante.db
```

> Doc: [rm invocation](https://www.gnu.org/software/coreutils/manual/html_node/rm-invocation.html)

> Nota: La respuesta `n` (de *no*) deja el archivo en su sitio. Cambia la entrada
> a `y` y vuelve a ejecutar el bloque para ver el archivo borrado. El `echo` sin
> argumentos solo añade el salto de línea que, en una terminal, escribirías al
> pulsar Intro.

```opcion-multiple
# Enunciado
¿Qué opción hace que rm pida confirmación antes de cada borrado?

# Opciones
- -r
- -f
- -i
- -p

# Correcta
3

# Explicación
-i es de interactive: rm pregunta antes de borrar cada archivo.

# Pista
Es la inicial de «interactive».
```

# Borrar directorios: rmdir y rm -r

`rmdir` (de *remove directory*) borra directorios **vacíos**; si el directorio
tiene contenido, se niega. `rm -r` borra el directorio y todo lo que contiene,
de forma recursiva y sin preguntar. Por eso `rmdir` es la opción prudente cuando
se espera que el directorio esté vacío.

```bash
mkdir -p viejo/datos
touch viejo/datos/a.txt
rmdir viejo
rm -r viejo
ls
echo "fin"
```

```salida
rmdir: failed to remove 'viejo': Directory not empty
fin
```

> Doc: [rmdir invocation](https://www.gnu.org/software/coreutils/manual/html_node/rmdir-invocation.html)

> Doc: [rm invocation](https://www.gnu.org/software/coreutils/manual/html_node/rm-invocation.html)

```relacionar
# Enunciado
Relaciona cada orden con lo que hace sobre un directorio con archivos dentro.

# Pares
- rmdir => se niega a borrarlo
- rm -r => lo borra con todo su contenido
- rm sin opciones => no borra directorios

# Explicación
rmdir solo borra directorios vacíos, rm -r borra recursivamente y rm sin -r se
limita a archivos.

# Pista
Solo una de las tres borra el contenido.
```

# Cierre de la sesión

Quedaron cubiertos `touch`, la redirección `>`, `cat`, `cp` con uno o varios
orígenes y con `-r`, `mv` para mover y renombrar, `rm` y `rm -i`, `rmdir` y
`rm -r`. La sesión 5 lee y mide el contenido de los archivos con `head`, `tail`,
`wc`, `sort`, `uniq` y `grep`.
