---
numero: 5
titulo: "Caracteres, dígitos y decimales en memoria"
---

# Un carácter es un número

La memoria solo guarda números. Un **juego de caracteres** es la tabla que
asigna un número a cada carácter: la `A`, el `1`, el espacio. GnuCOBOL en
Linux usa ASCII (*American Standard Code for Information Interchange*), donde
la `A` es el 65 y la `B`, el 66. La función `ORD` devuelve la **posición
ordinal** de un carácter en esa tabla, que empieza a contar en 1: por eso da
un número más que el código.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. ORDINAL.
       PROCEDURE DIVISION.
           DISPLAY FUNCTION ORD("A") " " FUNCTION ORD("B").
           DISPLAY FUNCTION ORD("1").
           STOP RUN.
```

```salida
000000066 000000067
000000050
```

> Doc: [ORD](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#ORD)

> Nota: `FUNCTION ORD` es una **función intrínseca**: una operación que
> COBOL trae incorporada y que devuelve un valor. `ORD` devuelve un entero, y
> `DISPLAY` lo muestra con nueve dígitos.

```verdadero-falso
# Enunciado
En ASCII, el carácter "1" y el número 1 se guardan igual.

# Respuesta
falso

# Explicación
El carácter "1" tiene su propio código (49 en ASCII, ordinal 50). El número 1
guardado como carácter es ese código, no el valor 1.

# Pista
Mira qué devuelve ORD("1").
```

# CHAR: del número al carácter

La función `CHAR` hace lo contrario que `ORD`: recibe una posición ordinal y
devuelve el carácter que ocupa ese lugar en el juego de caracteres.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CARACTER.
       PROCEDURE DIVISION.
           DISPLAY "[" FUNCTION CHAR(66) "]".
           STOP RUN.
```

```salida
[A]
```

> Doc: [CHAR](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#CHAR)

```ejercicio cobol
# Enunciado
Completa la posición ordinal para que se muestre la letra B.

# Plantilla
       IDENTIFICATION DIVISION.
       PROGRAM-ID. LETRA.
       PROCEDURE DIVISION.
           DISPLAY FUNCTION CHAR(___).
           STOP RUN.

# Esperado
B

# Pista
ORD("B") devolvió ese número en el punto anterior.
```

# ASCII y EBCDIC

Los *mainframes* IBM usan otro juego de caracteres, EBCDIC (*Extended Binary
Coded Decimal Interchange Code*). En EBCDIC la `A` es el código hexadecimal
`C1`, el `0` es `F0` y el `1`, `F1`; en ASCII son `41`, `30` y `31`. El orden
también cambia: en ASCII los dígitos van antes que las letras mayúsculas, y
estas antes que las minúsculas; en EBCDIC el orden es el inverso: primero las
minúsculas, luego las mayúsculas y al final los dígitos.

| Carácter | ASCII (hex) | EBCDIC (hex) |
|---|---|---|
| espacio | 20 | 40 |
| a | 61 | 81 |
| A | 41 | C1 |
| 0 | 30 | F0 |
| 1 | 31 | F1 |

> Doc: [EBCDIC collating sequence (Enterprise COBOL 6.4)](https://www.ibm.com/docs/en/cobol-zos/6.4.0?topic=sequences-ebcdic-collating-sequence)

> Nota: El orden importa al ordenar o comparar textos. Un archivo ordenado por
> código de cliente en un mainframe no queda en el mismo orden que en Linux si
> los códigos mezclan letras y dígitos: `A1` va antes que `11` en EBCDIC y
> después en ASCII.

```opcion-multiple
# Enunciado
En EBCDIC, ¿qué va primero al ordenar: los dígitos o las letras mayúsculas?

# Opciones
- Los dígitos, como en ASCII
- Las letras mayúsculas
- Depende del compilador
- Van mezclados

# Correcta
2

# Explicación
En EBCDIC las mayúsculas (desde C1) van antes que los dígitos (desde F0); en
ASCII es al revés: los dígitos (desde 30) van antes que las mayúsculas (desde
41).

# Pista
Compara C1 con F0 en la tabla.
```

# Los dígitos de un campo numérico

Un campo `PIC 9` con el uso por omisión, `DISPLAY`, guarda cada dígito como un
carácter: un byte por dígito, con el mismo código que el carácter `0`, `1`…
`9`. Por eso, al mostrar como texto el grupo que lo contiene, se ven los
mismos dígitos.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. DIGITOS.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  VISTA-NUMERO.
           05  NUMERO      PIC 9(4)     VALUE 1234.
       PROCEDURE DIVISION.
           DISPLAY "[" VISTA-NUMERO "]".
           STOP RUN.
```

```salida
[1234]
```

> Doc: [USAGE](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#USAGE)

> Nota: Esta forma de guardar números se llama **decimal zonado**. COBOL tiene
> otras más compactas, como el binario o el decimal empaquetado (`COMP-3`),
> que el curso avanzado explica byte a byte.

```verdadero-falso
# Enunciado
Un campo PIC 9(4) con el valor 1234 ocupa 4 bytes, uno por dígito.

# Respuesta
verdadero

# Explicación
Con el uso DISPLAY cada dígito se guarda como un carácter, en un byte.

# Pista
Cuenta los caracteres que se ven entre los corchetes.
```

# El signo va dentro del último dígito

Un campo `PIC S9` no gasta un byte en el signo: lo combina con el último
dígito. En un número positivo el último byte sigue siendo el carácter del
dígito; en uno negativo cambia. Mostrar el grupo como texto deja ver ese
byte: GnuCOBOL guarda el `5` negativo como la letra `u`.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. SIGNOS.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  VISTA-NEGATIVO.
           05  AJUSTE      PIC S9(4)    VALUE -25.
       01  VISTA-POSITIVO.
           05  ABONO       PIC S9(4)    VALUE 25.
       PROCEDURE DIVISION.
           DISPLAY "[" VISTA-NEGATIVO "][" VISTA-POSITIVO "]".
           DISPLAY AJUSTE " " ABONO.
           STOP RUN.
```

```salida
[002u][0025]
-0025 +0025
```

> Doc: [PICTURE](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#PICTURE)

> Nota: Al mostrar el campo numérico, `DISPLAY` interpreta ese byte y escribe
> `-0025`; al mostrar el grupo, que es alfanumérico, escribe el byte tal cual.
> En un *mainframe* el signo se codifica en EBCDIC y el byte es otro; lo que
> se mantiene es la idea: el signo vive en el último dígito.

```opcion-multiple
# Enunciado
Un campo PIC S9(3) vale -7. ¿Cuántos bytes ocupa?

# Opciones
- 3
- 4: tres dígitos y el signo
- 2
- 5

# Correcta
1

# Explicación
La S no añade un byte: el signo se combina con el último de los tres dígitos.

# Pista
Recuerda lo que mostró FUNCTION LENGTH en la sesión 4.
```

# Por qué COBOL calcula en decimal

Muchos lenguajes guardan los números con decimales en **coma flotante
binaria**, que no puede representar exactamente valores como 0,1. El error es
mínimo, pero aparece: en Python, sumar 0,1 y 0,2 no da exactamente 0,3.

```python
print(0.1 + 0.2)
```

```salida
0.30000000000000004
```

COBOL, con campos como `PIC 9V9`, calcula en **decimal**: el número se guarda
dígito a dígito y 0,1 + 0,2 da exactamente 0,3. La instrucción `COMPUTE`
calcula una expresión y guarda el resultado en un campo; el curso de
introducción la explica.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. EXACTO.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  SUMA            PIC 9V9.
       PROCEDURE DIVISION.
           COMPUTE SUMA = 0.1 + 0.2.
           DISPLAY SUMA.
           STOP RUN.
```

```salida
0.3
```

> Doc: [Floating Point Arithmetic: Issues and Limitations (Python)](https://docs.python.org/3/tutorial/floatingpoint.html)
> Doc: [COMPUTE](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#COMPUTE)

> Nota: La salida de Python se obtuvo con Python 3.13. En dinero, un céntimo
> de diferencia descuadra una conciliación: por eso los importes de un
> programa de gestión se guardan en campos decimales con la cantidad exacta
> de decimales que exige la moneda.

```verdadero-falso
# Enunciado
En un campo PIC 9V9, la suma 0.1 + 0.2 da exactamente 0.3.

# Respuesta
verdadero

# Explicación
El campo guarda dígitos decimales, no una aproximación binaria, así que la
suma es exacta.

# Pista
Mira la salida del programa COBOL.
```

# Fechas como números

En los programas de gestión una fecha se guarda casi siempre como un número de
ocho dígitos con el formato año, mes y día: el 13 de octubre de 2026 es
`20261013`. Así ordenar fechas es ordenar números. Para contar días entre dos
fechas, la función `INTEGER-OF-DATE` convierte cada fecha en el número de días
transcurridos desde una fecha base, y basta restar.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PLAZO.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  HOY             PIC 9(8)     VALUE 20261013.
       01  VENCE           PIC 9(8)     VALUE 20261231.
       01  DIAS            PIC 9(4).
       PROCEDURE DIVISION.
           COMPUTE DIAS = FUNCTION INTEGER-OF-DATE(VENCE)
                        - FUNCTION INTEGER-OF-DATE(HOY).
           DISPLAY "DIAS HASTA EL VENCIMIENTO: " DIAS.
           STOP RUN.
```

```salida
DIAS HASTA EL VENCIMIENTO: 0079
```

> Doc: [INTEGER-OF-DATE](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#INTEGER_002dOF_002dDATE)

> Nota: La fecha base de `INTEGER-OF-DATE` es el 1 de enero de 1601, que es
> el día 1. Para restar fechas no importa cuál sea, porque se cancela.

```ejercicio cobol
# Enunciado
Completa la función que convierte una fecha AAAAMMDD en número de días.

# Plantilla
       IDENTIFICATION DIVISION.
       PROGRAM-ID. GRACIA.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  EMISION         PIC 9(8)     VALUE 20261001.
       01  PAGO            PIC 9(8)     VALUE 20261031.
       01  DIAS            PIC 9(4).
       PROCEDURE DIVISION.
           COMPUTE DIAS = FUNCTION ___(PAGO)
                        - FUNCTION INTEGER-OF-DATE(EMISION).
           DISPLAY DIAS.
           STOP RUN.

# Esperado
0030

# Pista
Es la misma función de la segunda línea del cálculo.
```

# Un carácter puede ocupar más de un byte

Los programas de este curso se guardan en UTF-8 (*Unicode Transformation
Format*, 8 bits), una codificación que extiende ASCII: las letras de ASCII ocupan un byte, pero una letra como la `Ñ`
ocupa dos. `FUNCTION LENGTH` cuenta bytes: «ANO» mide 3 y
«AÑO», 4.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. BYTES.
       PROCEDURE DIVISION.
           DISPLAY FUNCTION LENGTH("ANO") " " FUNCTION LENGTH("AÑO").
           STOP RUN.
```

```salida
3 4
```

> Doc: [LENGTH](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#LENGTH)

> Nota: En un campo de tamaño fijo eso cambia cuánto cabe: un `PIC X(10)`
> guarda diez letras sin tilde, pero no diez con tilde. Por eso los literales
> de los programas del curso se escriben sin tildes ni eñes: así un carácter
> es siempre un byte y las cuentas de columnas y campos son exactas.

```verdadero-falso
# Enunciado
En UTF-8, FUNCTION LENGTH("AÑO") devuelve 3.

# Respuesta
falso

# Explicación
LENGTH cuenta bytes, y en UTF-8 la Ñ ocupa dos: «AÑO» mide 4.

# Pista
Mira la salida del programa de arriba.
```

# Cierre de la sesión

Quedó cubierto cómo se guardan los datos: el juego de caracteres con `ORD` y
`CHAR`, las diferencias entre ASCII y EBCDIC, el decimal zonado de los campos
`PIC 9`, el signo combinado con el último dígito, la aritmética decimal
exacta, las fechas como números con `INTEGER-OF-DATE` y los caracteres que en
UTF-8 ocupan más de un byte. La sesión 6, la última de la nivelación, presenta
el procesamiento por lotes: archivos de registros, lectura de la entrada y el
código de retorno.
