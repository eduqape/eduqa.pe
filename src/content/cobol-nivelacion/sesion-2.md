---
numero: 2
titulo: "El formato de referencia: 80 columnas"
---

# De la tarjeta perforada a la línea de código

Los primeros programas COBOL se escribían en tarjetas perforadas: una línea de
código por tarjeta, y cada tarjeta con 80 columnas, una por carácter. El
**formato fijo** de COBOL conserva esa disposición. Cada línea del programa se
divide en cinco zonas, y lo que significa un carácter depende de la columna en
que está.

| Columnas | Zona | Uso |
|---|---|---|
| 1–6 | área de secuencia | número de línea; el compilador la ignora |
| 7 | área de indicador | marca líneas especiales: comentario, continuación, depuración |
| 8–11 | área A | encabezados de división, sección y párrafo; niveles 01 y 77 |
| 12–72 | área B | sentencias y el resto del programa |
| 73–80 | área de identificación | nombre del programa; el compilador la ignora |

> Doc: [Format of Program Source Lines](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#Format-of-Program-Source-Lines)

> Nota: Desde la norma COBOL 2002 existe además un **formato libre**, sin
> columnas con significado. `cobc` usa el formato fijo si no se le indica
> otro. El último punto de esta sesión muestra cómo cambiar de formato.

```figura
figura: tarjeta-perforada
```

```relacionar
# Enunciado
Relaciona cada zona de la línea con sus columnas.

# Pares
- Área de secuencia => columnas 1 a 6
- Área de indicador => columna 7
- Área A => columnas 8 a 11
- Área B => columnas 12 a 72
- Área de identificación => columnas 73 a 80

# Explicación
La línea de formato fijo reparte las 80 columnas de la tarjeta en cinco zonas
contiguas.

# Pista
La columna 7 es una sola; el área A tiene cuatro columnas.
```

# El área de secuencia y el área de identificación

Las columnas 1 a 6 guardaban un número de secuencia de seis dígitos, y las
columnas 73 a 80, el nombre del programa. Si un mazo de tarjetas se caía al
suelo, una máquina clasificadora podía separar las tarjetas por programa y
devolverlas a su orden. El compilador no lee ninguna de las dos zonas: este
programa lleva números de secuencia y el nombre `SALUDO` en todas sus líneas,
y se ejecuta igual.

```cobol
000100 IDENTIFICATION DIVISION.                                         SALUDO
000200 PROGRAM-ID. SALUDO.                                              SALUDO
000300 PROCEDURE DIVISION.                                              SALUDO
000400     DISPLAY "HOLA, COBOL".                                       SALUDO
000500     STOP RUN.                                                    SALUDO
```

```salida
HOLA, COBOL
```

> Doc: [Format of Program Source Lines](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#Format-of-Program-Source-Lines)

> Nota: Hoy esas dos zonas suelen dejarse en blanco. Algunos equipos usan el
> área de secuencia para marcar qué líneas cambiaron en una modificación,
> porque el compilador no la tiene en cuenta.

```verdadero-falso
# Enunciado
Si la columna 3 de una línea contiene la letra A, el compilador la lee como
parte del programa.

# Respuesta
falso

# Explicación
La columna 3 pertenece al área de secuencia (columnas 1 a 6), que el compilador
ignora por completo.

# Pista
Fíjate en qué zona cae la columna 3.
```

# Comentarios con asterisco en la columna 7

La columna 7 es el **área de indicador**. Cuando está en blanco, la línea es
código normal. Un asterisco (`*`) en esa columna convierte la línea entera en
un **comentario**: texto para quien lee el programa, que el compilador ignora.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COMENTA.
      * Programa de ejemplo: escribe una sola linea.
       PROCEDURE DIVISION.
      * La siguiente instruccion es la unica que produce salida.
           DISPLAY "LINEA DE CODIGO".
           STOP RUN.
```

```salida
LINEA DE CODIGO
```

> Doc: [Comments](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#Comments)

> Nota: Una barra (`/`) en la columna 7 también marca un comentario. En otros
> compiladores provoca además un salto de página en el listado de
> compilación; GnuCOBOL la trata solo como comentario.

```ejercicio cobol
# Enunciado
Completa el indicador que convierte la tercera línea en un comentario.

# Plantilla
       IDENTIFICATION DIVISION.
       PROGRAM-ID. NOTA.
      ___ Esta linea no se compila.
       PROCEDURE DIVISION.
           DISPLAY "SOLO ESTA LINEA".
           STOP RUN.

# Esperado
SOLO ESTA LINEA

# Pista
Es un solo carácter y va en la columna 7.
```

# Comentarios al final de una línea

La secuencia `*>` inicia un comentario que llega hasta el final de la línea,
en cualquier columna a partir de la 7. Sirve para
explicar una instrucción en la misma línea en que está.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. EXPLICA.
       PROCEDURE DIVISION.
           DISPLAY "CUADRE DIARIO"   *> encabezado del reporte
           STOP RUN.
```

```salida
CUADRE DIARIO
```

> Doc: [Comments](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#Comments)

```verdadero-falso
# Enunciado
En formato fijo, un comentario con *> puede empezar a la derecha de una
instrucción, en la misma línea.

# Respuesta
verdadero

# Explicación
*> comenta desde donde aparece hasta el final de la línea, en cualquier
columna a partir de la 7. El asterisco en la columna 7, en cambio, comenta la
línea entera.

# Pista
Compara con el comentario de la columna 7.
```

# Líneas de depuración con D

Una `D` en la columna 7 marca una **línea de depuración**: una instrucción que
el compilador trata como comentario, salvo que se compile en modo de
depuración. Sirve para dejar en el programa mensajes de control que no se
ejecutan en producción.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. DEPURA.
       PROCEDURE DIVISION.
           DISPLAY "INICIO DEL PROCESO".
      D    DISPLAY "CONTROL: SE LLEGO A ESTE PUNTO".
           DISPLAY "FIN DEL PROCESO".
           STOP RUN.
```

```salida
INICIO DEL PROCESO
FIN DEL PROCESO
```

> Doc: [Comments](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#Comments)

> Nota: Las líneas con `D` se compilan como código con la opción
> `-fdebugging-line` de `cobc` o con la cláusula `WITH DEBUGGING MODE` en el
> párrafo `SOURCE-COMPUTER`, que la sesión 3 presenta.

```opcion-multiple
# Enunciado
¿Qué escribe el programa de arriba si se compila sin modo de depuración?

# Opciones
- Solo INICIO DEL PROCESO
- INICIO DEL PROCESO y FIN DEL PROCESO
- Las tres líneas
- Nada: la línea con D es un error de sintaxis

# Correcta
2

# Explicación
Sin modo de depuración, la línea con D en la columna 7 es un comentario: se
ejecutan las otras dos instrucciones DISPLAY.

# Pista
La D funciona como el asterisco mientras no se pida depurar.
```

# El área A y el área B

El **área A** (columnas 8 a 11) es donde empiezan los encabezados de división,
de sección y de párrafo, y los niveles `01` y `77` de los datos. El **área B**
(columnas 12 a 72) es donde van las sentencias. Por eso en los programas del
curso `IDENTIFICATION DIVISION` empieza en la columna 8 y `DISPLAY`, en la 12.

GnuCOBOL, con su configuración por omisión, acepta una sentencia que empiece
en el área A. Otros dialectos no: este programa compila con `cobc -x` y se
rechaza con `-std=cobol85`, la opción que pide aplicar las reglas de la norma
COBOL 85.

```bash !sin-consola
cobc -x zonas.cob
cobc -x -std=cobol85 zonas.cob
```

```salida
zonas.cob:4: error: start of statement in Area A
    2 |        PROGRAM-ID. ZONAS.
    3 |        PROCEDURE DIVISION.
    4 >        DISPLAY "EMPIEZA EN EL AREA A".
    5 |            STOP RUN.
    6 | <EOF>
```

> Doc: [Format of Program Source Lines](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#Format-of-Program-Source-Lines)
> Doc: [cobc - The GnuCOBOL Compiler](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#cobc-_002d-The-GnuCOBOL-Compiler)

> Nota: La línea 4 de `zonas.cob` es `DISPLAY "EMPIEZA EN EL AREA A".` escrita
> desde la columna 8. La primera orden no escribe nada porque compila sin
> errores. Con `-std=ibm` y `-std=mvs`, los dialectos de IBM, `cobc` compila
> pero avisa (*warning*); con `-std=ibm-strict`, la rechaza como la norma 85.
> Escribir siempre las sentencias en el área B evita depender del dialecto.
> Salida obtenida con GnuCOBOL 3.2.0 en Linux.

```ordenar
# Enunciado
Ordena las partes de esta línea de formato fijo de izquierda a derecha:
«000400     DISPLAY "HOLA".»

# Elementos
- DISPLAY "HOLA".
- 000400
- la columna 7, en blanco
- las columnas 8 a 11, en blanco

# Orden
2, 3, 4, 1

# Explicación
El número de secuencia ocupa las columnas 1 a 6; la columna 7 es el indicador;
el área A va de la 8 a la 11 y la sentencia empieza en el área B, en la 12.

# Pista
Recorre la línea columna por columna desde la primera.
```

# La columna 72 es el límite

El área B termina en la columna 72. Todo lo que va de la 73 en adelante
pertenece al área de identificación y el compilador no lo lee, aunque sea la
mitad de una instrucción. En este programa la línea 4 mide 75 columnas: el
literal pierde su comilla de cierre y el programa no compila.

```cobol !error
       IDENTIFICATION DIVISION.
       PROGRAM-ID. LARGO.
       PROCEDURE DIVISION.
           DISPLAY "ESTE TEXTO SIGUE MAS ALLA DE LA COLUMNA SETENTA Y DOS".
           STOP RUN.
```

```salida
programa.cob:5: error: continuation character expected
    3 |        PROCEDURE DIVISION.
    4 |            DISPLAY "ESTE TEXTO SIGUE MAS ALLA DE LA COLUMNA SETENTA Y DOS..
    5 >            STOP RUN.
    6 | <EOF>
programa.cob:4: error: invalid literal: 'ESTE TEXTO SIGUE MAS ALLA DE LA CO ...'
    2 |        PROGRAM-ID. LARGO.
    3 |        PROCEDURE DIVISION.
    4 >            DISPLAY "ESTE TEXTO SIGUE MAS ALLA DE LA COLUMNA SETENTA Y DOS..
    5 |            STOP RUN.
    6 | <EOF>
programa.cob:4: note: missing terminating " character
programa.cob:4: warning: optional period used [-Wdialect]
```

> Doc: [Format of Program Source Lines](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#Format-of-Program-Source-Lines)

> Nota: El corte en la columna 72 no siempre produce un error. Si lo que queda
> fuera es el final de un nombre de dato o una cifra, el programa puede
> compilar y hacer otra cosa. La opción `-Wcolumn-overflow` de `cobc` avisa de
> todo texto escrito más allá de la columna 72.

```verdadero-falso
# Enunciado
En formato fijo, un carácter escrito en la columna 75 forma parte de la
instrucción de esa línea.

# Respuesta
falso

# Explicación
La columna 75 está en el área de identificación (73 a 80), que el compilador
ignora: la instrucción termina en la columna 72.

# Pista
¿Dónde termina el área B?
```

# Continuar un literal en la línea siguiente

Un literal que no cabe antes de la columna 72 se puede **continuar** en la
línea siguiente. La primera línea deja el literal abierto, sin comilla de
cierre, y la siguiente lleva un guion (`-`) en la columna 7 y reabre el literal
con una comilla en el área B; el texto sigue desde el carácter que va después
de esa comilla.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CONTINUA.
       PROCEDURE DIVISION.
           DISPLAY "COBOL SE CREO EN 1959 PARA EL PROCESAMIENTO DE DATOS
      -    " COMERCIALES".
           STOP RUN.
```

```salida
COBOL SE CREO EN 1959 PARA EL PROCESAMIENTO DE DATOS COMERCIALES
```

> Doc: [Format of Program Source Lines](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#Format-of-Program-Source-Lines)
> Doc: [Continuation lines (IBM COBOL)](https://www.ibm.com/docs/en/cobol-linux-x86/1.1.0?topic=b-continuation-lines)

> Nota: La primera línea llena el área B justo hasta la columna 72: el texto
> «DATOS» termina en ella. Según la norma, y en IBM Enterprise COBOL, si
> quedaran espacios entre el final del texto y la columna 72 también formarían
> parte del literal; GnuCOBOL 3.2 los descarta, con cualquier dialecto. Llenar
> la línea hasta la 72 hace que los dos compiladores den el mismo texto, y el
> espacio que separa las palabras va después de la comilla de la continuación.

```ejercicio cobol
# Enunciado
Completa el indicador de la línea de continuación.

# Plantilla
       IDENTIFICATION DIVISION.
       PROGRAM-ID. SIGUE.
       PROCEDURE DIVISION.
           DISPLAY "CUENTAS POR COBRAR AL CIERRE DEL MES DE NOVIEMBRE DE
      ___    " 2026".
           STOP RUN.

# Esperado
CUENTAS POR COBRAR AL CIERRE DEL MES DE NOVIEMBRE DE 2026

# Pista
Es el carácter que indica continuación, en la columna 7.
```

# El formato libre

En **formato libre** las columnas no tienen significado: el código puede
empezar en cualquier columna y una línea admite hasta 255 caracteres. Se pide
de dos maneras: con la opción `-free` de `cobc`, o con la directiva
`>>SOURCE FORMAT IS FREE` dentro del propio programa. Una directiva es una
indicación para el compilador, no una instrucción que se ejecute; la de abajo
empieza en la columna 8, porque el programa arranca en formato fijo.

```cobol
       >>SOURCE FORMAT IS FREE
IDENTIFICATION DIVISION.
PROGRAM-ID. LIBRE.
PROCEDURE DIVISION.
DISPLAY "FORMATO LIBRE: SIN COLUMNAS".
STOP RUN.
```

```salida
FORMATO LIBRE: SIN COLUMNAS
```

> Doc: [>>SOURCE](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#g_t_003e_003eSOURCE)

> Nota: El resto del curso usa el formato fijo, porque es el que se encuentra
> en la mayoría de los programas existentes y el que `cobc` aplica por omisión.

```opcion-multiple
# Enunciado
¿Cuál de estas formas pide a cobc compilar en formato libre?

# Opciones
- Escribir el código a partir de la columna 1
- La directiva >>SOURCE FORMAT IS FREE o la opción -free
- Un asterisco en la columna 7 de la primera línea
- La opción -x

# Correcta
2

# Explicación
El formato libre se pide de forma explícita, con la directiva dentro del
programa o con la opción -free al compilar. -x solo elige que el resultado sea
un ejecutable.

# Pista
El compilador no adivina el formato: hay que decírselo.
```

# Cierre de la sesión

Quedó cubierto el formato fijo columna por columna: el área de secuencia y el
de identificación, que el compilador ignora; el indicador de la columna 7 con
el asterisco, la `D` y el guion de continuación; los comentarios con `*>`; el
área A para encabezados y niveles 01 y 77; el área B para las sentencias; el
límite de la columna 72; y cómo pasar al formato libre. La sesión 3 presenta
las cuatro divisiones de un programa y cómo se organiza cada una en
secciones, párrafos y oraciones.
