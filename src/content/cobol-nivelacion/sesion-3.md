---
numero: 3
titulo: "Las cuatro divisiones de un programa"
---

# Las cuatro divisiones

Un programa COBOL se organiza en cuatro **divisiones**, siempre en este orden:

1. **IDENTIFICATION DIVISION**: identifica el programa.
2. **ENVIRONMENT DIVISION** (división de entorno): describe lo que depende de
   la computadora y del sistema, como los archivos que el programa usa.
3. **DATA DIVISION** (división de datos): declara los datos.
4. **PROCEDURE DIVISION**: contiene las instrucciones.

Para GnuCOBOL lo único imprescindible es el párrafo `PROGRAM-ID`; las
divisiones se escriben cuando hacen falta. Este programa las declara todas,
aunque la de entorno y la de datos quedan vacías.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CUATRO.
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       PROCEDURE DIVISION.
           DISPLAY "CUATRO DIVISIONES, EN ORDEN".
           STOP RUN.
```

```salida
CUATRO DIVISIONES, EN ORDEN
```

> Doc: [IDENTIFICATION DIVISION](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#IDENTIFICATION-DIVISION)
> Doc: [ENVIRONMENT DIVISION](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#ENVIRONMENT-DIVISION)
> Doc: [DATA DIVISION](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#DATA-DIVISION)
> Doc: [PROCEDURE DIVISION](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#PROCEDURE-DIVISION)

```ordenar
# Enunciado
Ordena las divisiones como deben aparecer en un programa.

# Elementos
- DATA DIVISION
- PROCEDURE DIVISION
- IDENTIFICATION DIVISION
- ENVIRONMENT DIVISION

# Orden
3, 4, 1, 2

# Explicación
Primero se identifica el programa, después se describe su entorno, luego sus
datos y al final las instrucciones que trabajan con esos datos.

# Pista
Las instrucciones van al final, después de declarar los datos que usan.
```

# IDENTIFICATION DIVISION y PROGRAM-ID

La IDENTIFICATION DIVISION contiene el párrafo `PROGRAM-ID`, que da nombre al
programa. Ese nombre es el que otro programa usa para llamarlo y el que
aparece en los mensajes de error de la ejecución. Un **párrafo** es un nombre
seguido de un punto, escrito en el área A, con su contenido a continuación.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CIERRE-DIARIO.
       PROCEDURE DIVISION.
           DISPLAY "PROGRAMA CIERRE-DIARIO".
           STOP RUN.
```

```salida
PROGRAMA CIERRE-DIARIO
```

> Doc: [IDENTIFICATION DIVISION](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#IDENTIFICATION-DIVISION)

> Nota: La norma de 1974 admitía en esta división los párrafos `AUTHOR`,
> `INSTALLATION`, `DATE-WRITTEN`, `DATE-COMPILED`, `SECURITY` y `REMARKS`, con
> texto libre. Desde la norma de 1985 son obsoletos: GnuCOBOL los acepta para
> compilar programas antiguos, pero no se usan en programas nuevos; esa
> información va en comentarios.

```verdadero-falso
# Enunciado
PROGRAM-ID es una instrucción que se ejecuta al principio del programa.

# Respuesta
falso

# Explicación
PROGRAM-ID es un párrafo de la IDENTIFICATION DIVISION que da nombre al
programa. Las instrucciones que se ejecutan están en la PROCEDURE DIVISION.

# Pista
Fíjate en qué división está.
```

# La CONFIGURATION SECTION

Una división se puede dividir en **secciones**: un nombre seguido de la palabra
`SECTION` y un punto, también en el área A. La ENVIRONMENT DIVISION tiene dos.
La **CONFIGURATION SECTION** (sección de configuración) describe la computadora
y las convenciones del programa; la INPUT-OUTPUT SECTION (sección de entrada y
salida) declara los archivos, y la sesión 6 la presenta.

El párrafo `SOURCE-COMPUTER` de la CONFIGURATION SECTION nombra la computadora
en que se compila. El nombre es informativo, pero la cláusula `WITH DEBUGGING
MODE` activa las líneas de depuración: las que llevan una `D` en la columna 7
se compilan como código.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. DEPURA.
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. LINUX WITH DEBUGGING MODE.
       PROCEDURE DIVISION.
           DISPLAY "INICIO DEL PROCESO".
      D    DISPLAY "CONTROL: SE LLEGO A ESTE PUNTO".
           DISPLAY "FIN DEL PROCESO".
           STOP RUN.
```

```salida
INICIO DEL PROCESO
CONTROL: SE LLEGO A ESTE PUNTO
FIN DEL PROCESO
```

> Doc: [ENVIRONMENT DIVISION](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#ENVIRONMENT-DIVISION)
> Doc: [SOURCE-COMPUTER](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#SOURCE_002dCOMPUTER)

```opcion-multiple
# Enunciado
¿Qué cambia en la salida al quitar WITH DEBUGGING MODE del programa de arriba?

# Opciones
- Nada: la línea con D se ejecuta siempre
- Desaparece la línea CONTROL: SE LLEGO A ESTE PUNTO
- El programa deja de compilar
- Desaparecen las tres líneas

# Correcta
2

# Explicación
Sin el modo de depuración, la línea con D en la columna 7 vuelve a ser un
comentario; las otras dos instrucciones DISPLAY se ejecutan igual.

# Pista
Recuerda qué era una línea con D en la sesión 2.
```

# La coma como separador decimal

En COBOL el separador decimal es el punto, como en inglés. El párrafo
`SPECIAL-NAMES` de la CONFIGURATION SECTION admite la cláusula `DECIMAL-POINT
IS COMMA`, que intercambia los papeles: la coma pasa a separar los decimales y
el punto, los miles. Afecta a los literales numéricos del programa —aquí
`1250,50`— y a cómo se muestran los números.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COMA.
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SPECIAL-NAMES.
           DECIMAL-POINT IS COMMA.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  SALDO       PIC 9(5)V99 VALUE 1250,50.
       PROCEDURE DIVISION.
           DISPLAY SALDO.
           STOP RUN.
```

```salida
01250,50
```

> Doc: [SPECIAL-NAMES](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#SPECIAL_002dNAMES)

> Nota: `SALDO` es un dato con cinco dígitos enteros y dos decimales; la
> sesión 4 explica cómo se declara. Con `DECIMAL-POINT IS COMMA`, una coma
> seguida de un espacio sigue separando operandos: `DISPLAY "A", "B" 1,5`
> escribe `AB1,5`. Solo la coma entre dos dígitos se lee como decimal.

```verdadero-falso
# Enunciado
Con DECIMAL-POINT IS COMMA, el literal 1250,50 representa mil doscientos
cincuenta con cincuenta centésimos.

# Respuesta
verdadero

# Explicación
La cláusula intercambia el papel de la coma y el punto: la coma pasa a ser el
separador decimal de los literales numéricos.

# Pista
La cláusula dice qué carácter pasa a separar los decimales.
```

# La DATA DIVISION y la WORKING-STORAGE SECTION

La DATA DIVISION declara todos los datos del programa. Su **WORKING-STORAGE
SECTION** (sección de almacenamiento de trabajo) contiene los datos que el
programa usa mientras se ejecuta: cada uno con un nombre, una cláusula
`PICTURE` (abreviada `PIC`) que dice qué guarda y cuánto ocupa, y, si se
quiere, un valor inicial con `VALUE`. `DISPLAY` muestra el contenido de un
dato si se le da su nombre en lugar de un literal.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. DATOS.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  CIUDAD          PIC X(10) VALUE "AREQUIPA".
       PROCEDURE DIVISION.
           DISPLAY "SUCURSAL: " CIUDAD.
           STOP RUN.
```

```salida
SUCURSAL: AREQUIPA
```

> Doc: [WORKING-STORAGE SECTION](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#WORKING_002dSTORAGE-SECTION)

> Nota: `PIC X(10)` reserva diez caracteres. «AREQUIPA» ocupa ocho; los dos
> que sobran quedan con espacios, que la salida muestra aunque no se vean. La
> sesión 4 está dedicada a `PICTURE`.

```ejercicio cobol
# Enunciado
Completa la sección que contiene los datos del programa.

# Plantilla
       IDENTIFICATION DIVISION.
       PROGRAM-ID. MONEDA.
       DATA DIVISION.
       ___ SECTION.
       01  MONEDA          PIC X(3) VALUE "PEN".
       PROCEDURE DIVISION.
           DISPLAY "MONEDA: " MONEDA.
           STOP RUN.

# Esperado
MONEDA: PEN

# Pista
Son dos palabras unidas por un guion: almacenamiento de trabajo.
```

# Párrafos en la PROCEDURE DIVISION

La PROCEDURE DIVISION se organiza en **párrafos**: un nombre elegido por el
programador, seguido de un punto, en el área A. Los párrafos se ejecutan en el
orden en que están escritos: al terminar uno, el programa sigue con el
siguiente. Los nombres de párrafo permiten además ejecutar un párrafo desde
otro punto del programa, algo que el curso de introducción enseña con
`PERFORM`.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PARRAFOS.
       PROCEDURE DIVISION.
       ABRIR-CAJA.
           DISPLAY "CAJA ABIERTA".
       ATENDER.
           DISPLAY "ATENDIENDO CLIENTES".
       CERRAR-CAJA.
           DISPLAY "CAJA CERRADA".
           STOP RUN.
```

```salida
CAJA ABIERTA
ATENDIENDO CLIENTES
CAJA CERRADA
```

> Doc: [PROCEDURE DIVISION Sections and Paragraphs](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#PROCEDURE-DIVISION-Sections-and-Paragraphs)

```verdadero-falso
# Enunciado
Si un programa tiene los párrafos ABRIR y CERRAR, en ese orden, al terminar
ABRIR el programa continúa con CERRAR.

# Respuesta
verdadero

# Explicación
Los párrafos se ejecutan en el orden en que están escritos, salvo que una
instrucción indique otra cosa.

# Pista
Mira la salida del programa de arriba.
```

# Oraciones y sentencias

Dentro de un párrafo, cada instrucción es una **sentencia** (*statement*):
`DISPLAY "CAJA ABIERTA"` es una sentencia. Una **oración** (*sentence*) es una
o más sentencias terminadas por un punto. El punto cierra la oración, no cada
sentencia: estas dos sentencias forman una sola oración, porque solo la
segunda lleva punto.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. ORACION.
       PROCEDURE DIVISION.
           DISPLAY "PRIMERA SENTENCIA"
           DISPLAY "SEGUNDA SENTENCIA, MISMA ORACION".
           STOP RUN.
```

```salida
PRIMERA SENTENCIA
SEGUNDA SENTENCIA, MISMA ORACION
```

> Doc: [PROCEDURE DIVISION Sections and Paragraphs](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#PROCEDURE-DIVISION-Sections-and-Paragraphs)

> Nota: En esta sesión el punto no cambia lo que ocurre. Sí lo hará en el
> curso de introducción, con sentencias condicionales como `IF`: allí un punto
> de más termina la condición antes de tiempo. Por eso conviene poner un solo
> punto, al final de cada párrafo.

```relacionar
# Enunciado
Relaciona cada término con lo que es.

# Pares
- División => la parte mayor del programa, una de cuatro
- Sección => una parte de una división, con la palabra SECTION
- Párrafo => un nombre en el área A seguido de su contenido
- Oración => una o más sentencias terminadas por un punto
- Sentencia => una instrucción, como DISPLAY "HOLA"

# Explicación
El programa se divide en divisiones, que pueden tener secciones; estas,
párrafos; los párrafos, oraciones; y las oraciones, sentencias.

# Pista
Van de la parte más grande a la más pequeña.
```

# Palabras reservadas y nombres

Las **palabras reservadas** (`DISPLAY`, `DIVISION`, `PIC`, `VALUE`…) tienen un
significado fijo en COBOL y no pueden usarse como nombres. Los **nombres
definidos por el usuario** —de datos, de párrafos, del programa— se forman con
letras, dígitos, guiones (`-`) y guiones bajos (`_`); no pueden empezar ni
terminar con guion ni guion bajo, y deben tener al menos una letra. A
diferencia de otros lenguajes, pueden empezar por un dígito.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. NOMBRES.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  TOTAL-VENTAS-2026   PIC 9(5) VALUE 120.
       01  2026-CIERRE         PIC X(4) VALUE "OK".
       PROCEDURE DIVISION.
           DISPLAY TOTAL-VENTAS-2026 " " 2026-CIERRE.
           STOP RUN.
```

```salida
00120 OK
```

> Doc: [User-Defined Words](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#User_002dDefined-Words)
> Doc: [Language Reserved Words](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#Language-Reserved-Words)

> Nota: `00120` lleva ceros a la izquierda porque `PIC 9(5)` guarda siempre
> cinco dígitos. La lista completa de palabras reservadas de GnuCOBOL se
> obtiene con `cobc --list-reserved`.

```opcion-multiple
# Enunciado
¿Cuál de estos nombres de dato es válido en COBOL?

# Opciones
- -SALDO
- SALDO-
- 2026-SALDO
- 2026

# Correcta
3

# Explicación
Un nombre no puede empezar ni terminar con guion y debe tener al menos una
letra. 2026-SALDO cumple las dos reglas, aunque empiece por un dígito.

# Pista
Busca el que tiene letras y no tiene un guion en los extremos.
```

# Una palabra reservada no puede ser un nombre

`COUNT` es una palabra reservada. Usarla como nombre de dato es un error de
sintaxis: el compilador la encuentra donde espera un nombre y rechaza el
programa.

```cobol !error
       IDENTIFICATION DIVISION.
       PROGRAM-ID. RESERVA.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  COUNT           PIC 9(5) VALUE 120.
       PROCEDURE DIVISION.
           DISPLAY COUNT.
           STOP RUN.
```

```salida
programa.cob:5: error: syntax error, unexpected COUNT
    3 |        DATA DIVISION.
    4 |        WORKING-STORAGE SECTION.
    5 >        01  COUNT           PIC 9(5) VALUE 120.
    6 |        PROCEDURE DIVISION.
    7 |            DISPLAY COUNT.
programa.cob:7: error: syntax error, unexpected COUNT, expecting (
    5 |        01  COUNT           PIC 9(5) VALUE 120.
    6 |        PROCEDURE DIVISION.
    7 >            DISPLAY COUNT.
    8 |            STOP RUN.
    9 | <EOF>
```

> Doc: [Language Reserved Words](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#Language-Reserved-Words)

> Nota: Cada dialecto reserva palabras distintas. `TOTAL`, por ejemplo, es un
> nombre válido en GnuCOBOL con su configuración por omisión. Un nombre
> compuesto, como `CANTIDAD-VENDIDA`, evita casi siempre el choque.

```verdadero-falso
# Enunciado
Un nombre de dato puede ser igual a una palabra reservada si se escribe en
minúsculas.

# Respuesta
falso

# Explicación
GnuCOBOL no distingue mayúsculas de minúsculas en las palabras: count y COUNT
son la misma palabra reservada.

# Pista
Lee el punto siguiente.
```

# Mayúsculas y minúsculas

GnuCOBOL no distingue mayúsculas de minúsculas en las palabras reservadas ni en
los nombres: `NOMBRE-CLIENTE` y `nombre-cliente` son el mismo dato. Solo dentro
de un literal la diferencia importa, porque el texto se guarda tal como se
escribe.

```cobol
       identification division.
       program-id. casos.
       data division.
       working-storage section.
       01  Nombre-Cliente  pic x(8) value "Rosa".
       procedure division.
           display NOMBRE-CLIENTE "|" nombre-cliente "|".
           Stop Run.
```

```salida
Rosa    |Rosa    |
```

> Doc: [User-Defined Words](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#User_002dDefined-Words)

> Nota: La barra vertical (`|`) solo marca dónde termina el campo: `PIC x(8)`
> guarda «Rosa» y cuatro espacios. El curso escribe las palabras de COBOL en
> mayúsculas, como la mayoría de los programas existentes.

```verdadero-falso
# Enunciado
El literal "Rosa" y el literal "ROSA" guardan el mismo texto.

# Respuesta
falso

# Explicación
La insensibilidad a mayúsculas vale para las palabras del programa. Dentro de
un literal cada carácter se guarda tal como se escribe.

# Pista
Distingue las palabras del código del texto entre comillas.
```

# Cierre de la sesión

Quedó cubierta la estructura de un programa: las cuatro divisiones en orden;
`PROGRAM-ID`; la CONFIGURATION SECTION con `SOURCE-COMPUTER` y `DECIMAL-POINT
IS COMMA`; la WORKING-STORAGE SECTION; los párrafos de la PROCEDURE DIVISION,
que se ejecutan en orden; la diferencia entre oración y sentencia; y las
reglas de los nombres y las palabras reservadas. La sesión 4 entra en la DATA
DIVISION: cómo `PICTURE` describe cada dato y cómo los datos se agrupan en
registros.
