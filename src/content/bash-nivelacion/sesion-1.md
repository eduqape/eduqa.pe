---
numero: 1
titulo: "La terminal, la shell y Bash"
---

# Terminal y shell

Una **terminal** es el programa que muestra una ventana de texto: recibe lo que
se escribe con el teclado y presenta lo que los programas imprimen. La terminal
no interpreta lo que se escribe; entrega ese texto a otro programa, la
**shell**.

La shell es un **intérprete de órdenes**: lee una línea de texto, la divide en
palabras, decide qué programa corresponde a la primera palabra, lo ejecuta y
espera a que termine antes de leer la siguiente línea. El manual de Bash añade
que una shell es también un lenguaje de programación: las órdenes se pueden
guardar en un archivo y ese archivo pasa a ser una orden más.

> Doc: [What is a shell?](https://www.gnu.org/software/bash/manual/html_node/What-is-a-shell_003f.html)

> Nota: En este curso los bloques de código se ejecutan en el navegador con GNU
> Bash 5.1 compilado a WebAssembly. Cada bloque corre solo, en un directorio de
> trabajo vacío, `/workspace`: no ve los archivos ni las variables que dejó otro
> bloque. Por eso cada ejemplo crea lo que necesita. El botón **Editar código**
> permite cambiar el bloque y volver a ejecutarlo.

```relacionar
# Enunciado
Relaciona cada pieza con lo que hace.

# Pares
- Terminal => muestra el texto escrito y lo que imprimen los programas
- Shell => interpreta cada línea y ejecuta los programas que nombra
- Teclado => es el dispositivo con el que se escribe la orden

# Explicación
La terminal es la ventana; la shell es el programa que, dentro de ella, decide
qué ejecutar con cada línea.

# Pista
Piensa en cuál de las dos piezas entiende el significado de lo que se escribe.
```

# Qué es Bash

**Bash** es la shell del sistema operativo GNU y la más extendida en Linux. El
nombre es un acrónimo de *Bourne-Again SHell*, «la shell otra vez de Bourne»:
un juego de palabras con Stephen Bourne, autor de `sh`, la shell de Unix de la
que Bash desciende.

Bash busca ser compatible con POSIX (*Portable Operating System Interface*), la
familia de estándares que describe cómo debe comportarse una shell de tipo Unix.
Por eso lo aprendido aquí sirve, con pocas diferencias, en otras shells.

> Doc: [What is Bash?](https://www.gnu.org/software/bash/manual/html_node/What-is-Bash_003f.html)

> Nota: La versión del manual citado es la 5.3 (mayo de 2025). El motor del
> navegador es la 5.1. Todo lo que cubre esta nivelación existe en ambas.

```opcion-multiple
# Enunciado
¿Qué significa el nombre Bash?

# Opciones
- Basic Shell
- Bourne-Again SHell
- Binary Access Shell
- Bash Automation Script Host

# Correcta
2

# Explicación
Bash es un acrónimo de Bourne-Again SHell, en referencia a Stephen Bourne, autor
de la shell sh.

# Pista
Alude al autor de la shell sh.
```

# La primera orden: echo

`echo` escribe sus argumentos en la **salida estándar** —el canal por el que un
programa entrega su texto, que la terminal muestra— separados por un espacio y
seguidos de un salto de línea.

```bash
echo Hola, Bash
```

```salida
Hola, Bash
```

> Doc: [echo](https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-echo)

```ejercicio bash
# Enunciado
Completa la orden que escribe el texto «Servidor listo».

# Plantilla
___ Servidor listo

# Esperado
Servidor listo

# Pista
Es la orden que acabas de ver: cuatro letras.
```

# Palabras, orden y argumentos

Bash divide la línea en **palabras**. Las separa con **blancos**: el espacio y el
tabulador. La primera palabra es el nombre de la orden; las demás son sus
**argumentos**. Varios blancos seguidos cuentan como un único separador, de modo
que `echo` recibe aquí tres argumentos y los vuelve a unir con un solo espacio.

```bash
echo uno dos      tres
```

```salida
uno dos tres
```

> Doc: [Simple Commands](https://www.gnu.org/software/bash/manual/html_node/Simple-Commands.html)

> Nota: El manual llama **metacaracteres** a los caracteres que separan palabras
> cuando no van entre comillas: el espacio, el tabulador, el salto de línea y
> `|`, `&`, `;`, `(`, `)`, `<` y `>`. Las sesiones siguientes presentan cada uno.

```verdadero-falso
# Enunciado
En la línea «echo a    b», echo recibe un argumento que contiene cuatro espacios.

# Respuesta
falso

# Explicación
Los blancos separan palabras y varios seguidos cuentan como uno: echo recibe
dos argumentos, «a» y «b».

# Pista
Fíjate en qué hace Bash con los blancos antes de ejecutar la orden.
```

# Las comillas conservan los espacios

Las **comillas dobles** (`"`) agrupan su contenido en una sola palabra. Los
blancos que hay dentro ya no separan argumentos, así que `echo` recibe un único
argumento y lo escribe tal cual.

```bash
echo "uno dos      tres"
```

```salida
uno dos      tres
```

> Doc: [Double Quotes](https://www.gnu.org/software/bash/manual/html_node/Double-Quotes.html)

> Nota: Las comillas no forman parte del argumento: Bash las retira antes de
> ejecutar la orden. El curso de introducción explica la diferencia entre
> comillas dobles y simples (`'`).

```ejercicio bash
# Enunciado
Completa el carácter que hace que echo conserve los dos espacios entre las palabras.

# Plantilla
echo ___estado:  activo"

# Esperado
estado:  activo

# Pista
El cierre ya está escrito al final; falta la apertura.
```

# Comentarios

Una palabra que empieza con el carácter almohadilla (`#`) inicia un
**comentario**: Bash ignora esa palabra y el resto de la línea. Los comentarios
explican el código a quien lo lee y no producen salida.

```bash
# Avisa de que la copia terminó
echo Copia terminada   # este texto tampoco se imprime
```

```salida
Copia terminada
```

> Doc: [Comments](https://www.gnu.org/software/bash/manual/html_node/Comments.html)

```verdadero-falso
# Enunciado
En «echo precio#total», la almohadilla inicia un comentario.

# Respuesta
falso

# Explicación
Un comentario empieza solo con una palabra que comienza por #. Aquí la
almohadilla está en medio de la palabra «precio#total», que echo imprime entera.

# Pista
El comentario necesita que # esté al principio de una palabra.
```

# Varias órdenes seguidas

Cada salto de línea termina una orden, y Bash ejecuta las órdenes en el orden
en que aparecen. El **punto y coma** (`;`) cumple la misma función dentro de una
línea: separa dos órdenes que se ejecutan una después de la otra.

```bash
echo Paso 1; echo Paso 2
echo Paso 3
```

```salida
Paso 1
Paso 2
Paso 3
```

> Doc: [Lists of Commands](https://www.gnu.org/software/bash/manual/html_node/Lists.html)

```ejercicio bash
# Enunciado
Completa el operador que separa las dos órdenes en la misma línea.

# Plantilla
echo inicio___ echo fin

# Esperado
inicio
fin

# Pista
Es un signo de puntuación.
```

# Cierre de la sesión

Quedó cubierto qué es una terminal, qué hace la shell, qué es Bash y cómo
divide una línea en orden y argumentos; también `echo`, las comillas dobles, los
comentarios con `#` y el punto y coma (`;`). La sesión 2 distingue las órdenes
internas de Bash de los programas instalados y muestra cómo consultar la ayuda
de cada una.
