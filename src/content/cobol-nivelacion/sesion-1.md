---
numero: 1
titulo: "COBOL, GnuCOBOL y el primer programa"
---

# Qué es COBOL

COBOL es el acrónimo de *COmmon Business-Oriented Language*, «lenguaje común
orientado a los negocios». Su origen está en 1959: un comité patrocinado por el
Departamento de Defensa de Estados Unidos, la Conferencia sobre Lenguajes de
Sistemas de Datos (CODASYL, *Conference on Data Systems Languages*), definió un
lenguaje común para la informática de gestión. El nombre se anunció el 18 de
septiembre de 1959, y a finales de 1960 prácticamente el mismo programa COBOL
ya se ejecutaba en dos computadoras distintas: «común» quería decir eso, que el
programa no dependía de la máquina.

En su diseño influyó el trabajo previo de Grace Hopper con FLOW-MATIC, un
lenguaje de gestión anterior. De esa influencia viene la preferencia de COBOL
por las palabras frente a los símbolos: el lenguaje tiene los verbos `ADD`
(sumar), `SUBTRACT` (restar), `MULTIPLY` (multiplicar) y `DIVIDE` (dividir),
además de los operadores aritméticos.

> Doc: [What is the history of COBOL?](https://gnucobol.sourceforge.io/faq/index.html#what-is-the-history-of-cobol)

> Nota: COBOL es una norma internacional. La edición vigente es ISO/IEC
> 1989:2023, publicada en enero de 2023, que reemplaza a la de 2014. ISO es la
> Organización Internacional de Normalización e IEC, la Comisión
> Electrotécnica Internacional; las dos publican juntas las normas de
> lenguajes de programación.

> Doc: [ISO/IEC 1989:2023, Programming language COBOL](https://www.iso.org/standard/74527.html)

```opcion-multiple
# Enunciado
¿Qué significa el nombre COBOL?

# Opciones
- Computer Business Object Language
- Common Business-Oriented Language
- Compiled Batch-Oriented Language
- Commercial Binary Operations Language

# Correcta
2

# Explicación
COBOL es el acrónimo de COmmon Business-Oriented Language: un lenguaje común,
independiente de la máquina, orientado a los datos de gestión.

# Pista
El nombre dice para qué tipo de programas se creó.
```

# Dónde se ejecuta COBOL

COBOL se diseñó para el procesamiento de datos de gestión: programas que leen
registros —un cliente, una cuenta, un movimiento—, los procesan y producen
archivos y reportes. Hay compiladores para muchas plataformas; en los
*mainframes* IBM Z, con el sistema operativo z/OS, el compilador es IBM
Enterprise COBOL.

GnuCOBOL es un compilador de COBOL libre que funciona en Linux, Windows y
macOS. Pertenece al proyecto GNU (siglas recursivas de *GNU's Not Unix*, «GNU
no es Unix»): el compilador se distribuye con la licencia
pública general de GNU (GPL, *General Public License*) y su biblioteca de
ejecución, `libcob`, con la GPL reducida (LGPL, *Lesser General Public
License*), que permite usarla en programas de cualquier licencia.

> Doc: [What is GnuCOBOL?](https://gnucobol.sourceforge.io/faq/index.html#what-is-gnucobol)
> Doc: [How is GnuCOBOL licensed?](https://gnucobol.sourceforge.io/faq/index.html#how-is-gnucobol-licensed)

> Nota: En este curso los bloques de código se compilan y ejecutan en el
> navegador con GnuCOBOL 3.2 compilado a WebAssembly. Cada bloque es un
> programa completo y corre solo, en un directorio vacío: no ve los archivos
> ni los datos de otro bloque. El botón **Editar código** permite cambiarlo y
> volver a ejecutarlo. La primera vez el navegador descarga el compilador
> (unos 25 MB); después cada programa compila en décimas de segundo.

```verdadero-falso
# Enunciado
Un programa COBOL solo puede compilarse y ejecutarse en un mainframe IBM.

# Respuesta
falso

# Explicación
COBOL es una norma, no un producto de un fabricante. GnuCOBOL compila COBOL en
Linux, Windows y macOS, y en este curso se ejecuta en el navegador.

# Pista
Recuerda qué significa la C de COBOL.
```

# El compilador cobc

El compilador de GnuCOBOL se llama `cobc`. Traduce el programa COBOL a C y
llama al compilador de C del sistema para obtener el programa ejecutable. La
opción `-x` (de *executable*) le indica que genere un programa ejecutable, con
su punto de entrada principal; sin ella, `cobc` genera por omisión un módulo
que otro programa carga y llama.

En una terminal con GnuCOBOL instalado, estas dos órdenes compilan el archivo
`saludo.cob` y ejecutan el resultado, `saludo`:

```bash !sin-consola
cobc -x saludo.cob
./saludo
```

```salida
HOLA, COBOL
```

> Doc: [cobc - The GnuCOBOL Compiler](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#cobc-_002d-The-GnuCOBOL-Compiler)

> Nota: `cobc` no escribe nada cuando la compilación termina bien: la salida
> de arriba es la de `./saludo`. El punto y la barra (`./`) delante del nombre
> le indican a la shell que el programa está en el directorio actual. La salida
> se obtuvo con GnuCOBOL 3.2.0 en Linux.

```relacionar
# Enunciado
Relaciona cada parte de la orden con lo que hace.

# Pares
- cobc => traduce el programa COBOL a C y lo compila
- -x => pide un programa ejecutable en lugar de un módulo
- saludo.cob => es el archivo con el código fuente COBOL
- ./saludo => ejecuta el programa que se acaba de generar

# Explicación
cobc es el compilador; -x elige el tipo de resultado; el archivo .cob es la
entrada; y el ejecutable se lanza por su nombre desde el directorio actual.

# Pista
Separa lo que compila de lo que ejecuta.
```

# El primer programa

Un programa COBOL mínimo tiene dos divisiones. La **IDENTIFICATION DIVISION**
(división de identificación) lo identifica: su párrafo `PROGRAM-ID` le da un
nombre, aquí `SALUDO`. La **PROCEDURE DIVISION** (división de procedimientos)
contiene las instrucciones que se ejecutan, en orden. `DISPLAY` escribe un
texto en la salida estándar —el canal por el que un programa entrega su
texto, que la terminal muestra— y `STOP RUN` termina el programa.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. SALUDO.
       PROCEDURE DIVISION.
           DISPLAY "HOLA, COBOL".
           STOP RUN.
```

```salida
HOLA, COBOL
```

> Doc: [IDENTIFICATION DIVISION](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#IDENTIFICATION-DIVISION)
> Doc: [PROCEDURE DIVISION](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#PROCEDURE-DIVISION)

> Nota: Las líneas empiezan con siete espacios y las instrucciones con once
> porque el programa está en **formato fijo**, el que `cobc` usa por omisión:
> cada columna de la línea tiene una función. La sesión 2 lo explica columna a
> columna. El punto (`.`) al final de cada línea cierra una oración; la sesión
> 3 explica qué es.

```ejercicio cobol
# Enunciado
Completa el verbo que escribe el texto en la salida estándar.

# Plantilla
       IDENTIFICATION DIVISION.
       PROGRAM-ID. AVISO.
       PROCEDURE DIVISION.
           ___ "CIERRE DE CAJA".
           STOP RUN.

# Esperado
CIERRE DE CAJA

# Pista
Es el verbo del programa de arriba.
```

# DISPLAY con varios datos

`DISPLAY` acepta varios **operandos** —los datos sobre los que actúa una
instrucción— y los escribe de izquierda a derecha, uno a continuación del
otro, sin separarlos, seguidos de un salto de línea. Un texto entre comillas
dobles (`"`) es un **literal alfanumérico**: un valor constante escrito
directamente en el programa. Los espacios que separan los literales en el
código no llegan a la salida; los que están dentro de las comillas, sí.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PLANILLA.
       PROCEDURE DIVISION.
           DISPLAY "Planilla" " de " "octubre".
           STOP RUN.
```

```salida
Planilla de octubre
```

> Doc: [DISPLAY](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#DISPLAY)
> Doc: [DISPLAY statement (Enterprise COBOL 6.4)](https://www.ibm.com/docs/en/cobol-zos/6.4.0?topic=statements-display-statement)

> Nota: Las comillas no forman parte del literal: delimitan dónde empieza y
> termina. Por eso `"Planilla"` aporta ocho caracteres a la salida, no diez.

```ejercicio cobol
# Enunciado
Completa el segundo literal para que la salida sea «Total: 15 boletas».

# Plantilla
       IDENTIFICATION DIVISION.
       PROGRAM-ID. TOTAL.
       PROCEDURE DIVISION.
           DISPLAY "Total: " ___ " boletas".
           STOP RUN.

# Esperado
Total: 15 boletas

# Pista
Es un literal alfanumérico con dos dígitos, entre comillas dobles.
```

# STOP RUN termina el programa

`STOP RUN` termina la ejecución del programa y devuelve el control al sistema
operativo. Lo que esté escrito después no se ejecuta: aquí la segunda
instrucción `DISPLAY` nunca llega a escribir nada.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. FIN.
       PROCEDURE DIVISION.
           DISPLAY "Antes de STOP RUN".
           STOP RUN.
           DISPLAY "Despues de STOP RUN".
```

```salida
Antes de STOP RUN
```

> Doc: [STOP](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#STOP)

> Nota: Los literales de los programas del curso se escriben sin tildes ni
> eñes. La razón tiene que ver con cuántos bytes ocupa cada carácter, y la
> sesión 5 la explica con un ejemplo.

```verdadero-falso
# Enunciado
Si un programa escribe DISPLAY "A" después de STOP RUN, la salida muestra la A
al final.

# Respuesta
falso

# Explicación
STOP RUN termina la ejecución en ese punto: las instrucciones que siguen no se
ejecutan.

# Pista
Piensa en qué momento devuelve el control al sistema operativo.
```

# Cierre de la sesión

Quedó cubierto qué es COBOL y de dónde viene, dónde se ejecuta, qué es
GnuCOBOL, cómo `cobc -x` produce un programa ejecutable y la forma del
programa mínimo: la IDENTIFICATION DIVISION con su `PROGRAM-ID`, la PROCEDURE
DIVISION, `DISPLAY` con uno o varios literales y `STOP RUN`. La sesión 2
explica el formato fijo: por qué las líneas empiezan en la columna 8 y qué
hace cada una de las 80 columnas.
