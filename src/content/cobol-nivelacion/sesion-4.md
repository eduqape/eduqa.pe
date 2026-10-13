---
numero: 4
titulo: "Campos, registros y la cláusula PICTURE"
---

# Un dato ocupa un tamaño fijo

En COBOL cada dato es un área de memoria de tamaño fijo, que se decide al
escribir el programa y no cambia mientras se ejecuta. La cláusula `PICTURE`
—casi siempre abreviada `PIC`— describe esa área: qué clase de caracteres
guarda y cuántos. Un dato de 8 caracteres ocupa 8 bytes aunque su contenido
sea más corto: lo que el valor no llena queda con espacios.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. TAMANO.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  CIUDAD          PIC X(8)     VALUE "LIMA".
       PROCEDURE DIVISION.
           DISPLAY "[" CIUDAD "]".
           STOP RUN.
```

```salida
[LIMA    ]
```

> Doc: [PICTURE](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#PICTURE)

> Nota: Los corchetes (`[` y `]`) son literales que solo marcan dónde empieza
> y termina el campo: así se ven los cuatro espacios que siguen a «LIMA». El
> curso los usa con ese fin en muchos ejemplos.

```verdadero-falso
# Enunciado
Un dato PIC X(8) con VALUE "LIMA" ocupa 4 bytes, porque LIMA tiene cuatro
letras.

# Respuesta
falso

# Explicación
El tamaño lo fija PIC X(8): son 8 bytes. Las cuatro posiciones que el valor no
llena quedan con espacios.

# Pista
¿Quién decide el tamaño, el valor o la cláusula PIC?
```

# PIC X: cualquier carácter

El símbolo `X` representa una posición que admite cualquier carácter: letras,
dígitos, espacios o signos. Un dato con `X` es **alfanumérico**. El número
entre paréntesis indica cuántas veces se repite el símbolo, así que `X(4)` y
`XXXX` describen lo mismo: cuatro caracteres.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. EQUIS.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  CODIGO-A        PIC X(4)     VALUE "C001".
       01  CODIGO-B        PIC XXXX     VALUE "C002".
       PROCEDURE DIVISION.
           DISPLAY "[" CODIGO-A "][" CODIGO-B "]".
           STOP RUN.
```

```salida
[C001][C002]
```

> Doc: [PICTURE](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#PICTURE)

```ejercicio cobol
# Enunciado
Completa la cláusula PIC para que el campo tenga 8 caracteres.

# Plantilla
       IDENTIFICATION DIVISION.
       PROGRAM-ID. SEDE.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  SEDE            PIC ___ VALUE "CUSCO".
       PROCEDURE DIVISION.
           DISPLAY "[" SEDE "]".
           STOP RUN.

# Esperado
[CUSCO   ]

# Pista
El símbolo alfanumérico, con la cantidad entre paréntesis.
```

# PIC 9: dígitos

El símbolo `9` representa una posición que solo admite un dígito. Un dato con
`9` es **numérico**: se puede usar en operaciones aritméticas. Siempre muestra
todas sus posiciones, de modo que un número con menos dígitos que el campo
aparece con ceros a la izquierda.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. NUEVE.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  CANTIDAD        PIC 9(5)     VALUE 42.
       PROCEDURE DIVISION.
           DISPLAY CANTIDAD.
           STOP RUN.
```

```salida
00042
```

> Doc: [PICTURE](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#PICTURE)

> Nota: El valor de `VALUE` en un dato numérico es un literal numérico, sin
> comillas. `VALUE "42"` es un literal alfanumérico: en un campo `PIC 9`,
> `cobc` lo compila pero avisa con «numeric value is expected».

```opcion-multiple
# Enunciado
¿Qué muestra DISPLAY de un dato PIC 9(4) con VALUE 7?

# Opciones
- 7
- 7 seguido de tres espacios
- 0007
- 7.000

# Correcta
3

# Explicación
PIC 9(4) guarda siempre cuatro dígitos: el 7 ocupa la posición de la derecha y
las demás quedan en cero.

# Pista
Un campo numérico se rellena con ceros, no con espacios.
```

# La V: la coma decimal implícita

La `V` marca dónde va la coma decimal dentro de un campo numérico. Es
**implícita**: no ocupa ningún byte. `PIC 9(5)V99` describe cinco dígitos
enteros y dos decimales, siete en total, y la función `LENGTH` lo confirma: el
campo mide 7.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. DECIMAL.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  SALDO           PIC 9(5)V99  VALUE 1250.5.
       PROCEDURE DIVISION.
           DISPLAY SALDO.
           DISPLAY FUNCTION LENGTH(SALDO).
           STOP RUN.
```

```salida
01250.50
7
```

> Doc: [PICTURE](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#PICTURE)

> Nota: En memoria el campo guarda los siete dígitos `0125050`. El punto que
> se ve en la salida lo añade `DISPLAY`: GnuCOBOL, con su configuración por
> omisión, muestra así los números con decimales (la opción `pretty-display`
> de su archivo `default.conf`). Con `-std=ibm-strict`, el dialecto estricto
> de IBM, esa opción está desactivada y `DISPLAY` muestra `0125050`. `FUNCTION LENGTH` es una función intrínseca: el curso de
> introducción las presenta.

```verdadero-falso
# Enunciado
PIC 9(3)V9 ocupa 5 bytes: tres dígitos, la coma decimal y un decimal.

# Respuesta
falso

# Explicación
La V es implícita y no ocupa espacio: PIC 9(3)V9 ocupa 4 bytes, tres enteros y
un decimal.

# Pista
Cuenta solo los 9.
```

# La S: el signo

Un campo `PIC 9` no guarda signo: solo valores positivos o cero. La `S` al
principio de la cláusula lo hace con signo, de modo que admite negativos.
`DISPLAY` muestra el signo delante de los dígitos.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. SIGNO.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  AJUSTE          PIC S9(4)    VALUE -25.
       01  ABONO           PIC S9(4)    VALUE 25.
       PROCEDURE DIVISION.
           DISPLAY AJUSTE " " ABONO.
           DISPLAY FUNCTION LENGTH(AJUSTE).
           STOP RUN.
```

```salida
-0025 +0025
4
```

> Doc: [PICTURE](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#PICTURE)

> Nota: Como la `V`, la `S` no ocupa un byte propio: el campo mide 4. El signo
> se guarda combinado con el último dígito; la sesión 5 muestra cómo.

```opcion-multiple
# Enunciado
¿Qué cláusula describe un importe de hasta 9999,99 que puede ser negativo?

# Opciones
- PIC 9(4)V99
- PIC S9(4)V99
- PIC X(7)
- PIC S9(6)

# Correcta
2

# Explicación
S9(4)V99 tiene signo, cuatro enteros y dos decimales. Sin la S no admite
negativos; S9(6) no tiene decimales; y X(7) no es numérico.

# Pista
Necesitas signo, cuatro enteros y dos decimales.
```

# Los niveles 01 y 77

Cada dato se declara con un **número de nivel** delante del nombre. El nivel
`01` empieza un dato nuevo en el área A. El nivel `77` declara un dato
**elemental** independiente. Un dato elemental es el que no se divide en
partes; los de este curso llevan cláusula `PIC`.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. NIVELES.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       77  CONTADOR        PIC 9(3)     VALUE 7.
       01  ESTADO          PIC X(6)     VALUE "ACTIVO".
       PROCEDURE DIVISION.
           DISPLAY CONTADOR " " ESTADO.
           STOP RUN.
```

```salida
007 ACTIVO
```

> Doc: [77-Level Data Items](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#g_t77_002dLevel-Data-Items)

> Nota: Un `01` elemental y un `77` se comportan igual. El curso usa `01`,
> que además sirve para los grupos del punto siguiente; el `77` aparece en
> muchos programas escritos hace décadas.

```verdadero-falso
# Enunciado
Un dato de nivel 77 puede tener partes declaradas con niveles 05.

# Respuesta
falso

# Explicación
El nivel 77 declara un dato elemental independiente, que no se divide. Para
dividir un dato en partes se usa un 01 de grupo.

# Pista
Fíjate en lo que dice el texto de «elemental».
```

# Grupos y registros

Un dato de nivel `01` puede dividirse en partes con niveles mayores, por
ejemplo `05`. El `01` es entonces un **dato de grupo**: no lleva `PIC`, y su
contenido es la sucesión de los bytes de sus partes, uno tras otro. Un grupo
que reúne los datos de una misma entidad —un cliente con su código, su nombre
y su saldo— es un **registro**. Sus partes se llaman **campos**.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. REGISTRO.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  CLIENTE.
           05  CODIGO      PIC X(4)     VALUE "C001".
           05  NOMBRE      PIC X(10)    VALUE "ROSA".
           05  SALDO       PIC 9(5)V99  VALUE 1250.50.
       PROCEDURE DIVISION.
           DISPLAY "[" CLIENTE "]".
           DISPLAY FUNCTION LENGTH(CLIENTE).
           STOP RUN.
```

```salida
[C001ROSA      0125050]
21
```

> Doc: [DATA DIVISION](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#DATA-DIVISION)
> Doc: [What are the GnuCOBOL DATA DIVISION level numbers?](https://gnucobol.sourceforge.io/faq/index.html#what-are-the-gnucobol-data-division-level-numbers)

> Nota: Al mostrar el grupo, `SALDO` aparece como `0125050`, sin punto: un
> grupo es alfanumérico y `DISPLAY` escribe sus bytes tal como están. Los
> niveles de las partes van de `02` a `49`. Numerarlas `05`, `10`, `15`… deja
> huecos para insertar después niveles intermedios sin renumerar.

```escena
escena: cobol-registro
pie: El registro CLIENTE son 21 bytes seguidos; DISPLAY del grupo los muestra tal como están
```

```opcion-multiple
# Enunciado
Un registro tiene los campos PIC X(3), PIC 9(4)V99 y PIC X(10). ¿Cuántos bytes
mide?

# Opciones
- 17
- 19
- 20
- 16

# Correcta
2

# Explicación
3 + 6 + 10 = 19. La V no ocupa espacio: 9(4)V99 son seis dígitos.

# Pista
Suma los tamaños; recuerda qué ocupa la V.
```

# FILLER: una parte sin nombre

`FILLER` declara una parte de un grupo que el programa no necesita nombrar:
un texto fijo, una separación. Ocupa sus bytes como cualquier otro campo, pero
no se puede usar por su nombre. Es la forma habitual de componer una línea de
reporte con textos fijos y datos.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. RELLENO.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  LINEA.
           05  FILLER      PIC X(9)     VALUE "CLIENTE: ".
           05  LIN-NOMBRE  PIC X(10)    VALUE "ROSA".
       PROCEDURE DIVISION.
           DISPLAY "[" LINEA "]".
           STOP RUN.
```

```salida
[CLIENTE: ROSA      ]
```

> Doc: [DATA DIVISION](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#DATA-DIVISION)

> Nota: La palabra `FILLER` puede omitirse: una entrada de nivel 05 sin
> nombre también es de relleno. El curso la escribe para que se lea qué es.

```relacionar
# Enunciado
Relaciona cada parte de una declaración con lo que indica.

# Pares
- 01 => empieza un dato nuevo, elemental o de grupo
- 05 => declara una parte de un grupo
- PIC X(9) => nueve caracteres cualesquiera
- VALUE => el contenido con que empieza el dato
- FILLER => una parte sin nombre propio

# Explicación
El nivel ubica el dato en la jerarquía, PIC describe su forma, VALUE su valor
inicial y FILLER marca una parte que no se nombra.

# Pista
Distingue la jerarquía (niveles) de la forma (PIC) y del contenido (VALUE).
```

# Cierre de la sesión

Quedó cubierto cómo se declara un dato: su tamaño fijo, `PIC X` para
caracteres, `PIC 9` para dígitos, la `V` decimal implícita, la `S` del signo,
los niveles `01` y `77`, los grupos y registros con sus campos de nivel `05`,
y `FILLER`. La sesión 5 baja al nivel de los bytes: cómo se codifica cada
carácter, cómo se guardan los dígitos y el signo, y por qué COBOL usa
aritmética decimal.
