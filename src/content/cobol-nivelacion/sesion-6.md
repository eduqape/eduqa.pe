---
numero: 6
titulo: "Procesamiento por lotes: entrada, archivos y código de retorno"
---

# Un programa por lotes

Un **programa por lotes** (*batch*) se ejecuta sin que nadie interactúe con
él: lee sus datos de entrada, procesa registro tras registro y deja sus
resultados en archivos o en un reporte. Muchos programas COBOL de gestión
trabajan así: el cierre diario de las cuentas de un banco o la facturación del
mes se procesan en lote.

En un *mainframe* con z/OS, un trabajo por lotes se describe con JCL (*Job
Control Language*, lenguaje de control de trabajos): una serie de **pasos**,
cada uno de los cuales ejecuta un programa. El JCL puede decidir si ejecuta un
paso según el código de retorno de los anteriores, el número que cada programa
deja al terminar. Al final de esta sesión, un programa COBOL fija ese número.

> Doc: [Summary of COND parameters (z/OS MVS JCL)](https://www.ibm.com/docs/en/zos/2.4.0?topic=cp-summary-cond-parameters)

```ordenar
# Enunciado
Ordena las etapas de un programa por lotes típico.

# Elementos
- Escribir los resultados
- Abrir los archivos de entrada y salida
- Procesar cada registro leído
- Cerrar los archivos

# Orden
2, 3, 1, 4

# Explicación
Primero se abren los archivos; después se lee y procesa registro a registro,
escribiendo resultados; y al final se cierran.

# Pista
No se puede leer un archivo que no se ha abierto.
```

# Leer la entrada estándar con ACCEPT

`ACCEPT` lee una línea de la **entrada estándar** —el canal por el que un
programa recibe texto— y la guarda en un campo. Si la línea es más corta que
el campo, el resto se rellena con espacios. Un `ACCEPT` en un campo numérico
convierte los dígitos leídos en un número.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. LEE.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  NOMBRE          PIC X(15).
       01  ANIO            PIC 9(4).
       PROCEDURE DIVISION.
           ACCEPT NOMBRE.
           ACCEPT ANIO.
           DISPLAY "CLIENTE: " NOMBRE "|".
           DISPLAY "PERIODO: " ANIO.
           STOP RUN.
```

```entrada
ROSA MAMANI
2026
```

```salida
CLIENTE: ROSA MAMANI    |
PERIODO: 2026
```

> Doc: [ACCEPT FROM CONSOLE](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#ACCEPT-FROM-CONSOLE)

> Nota: En este curso la entrada estándar se escribe en **Datos de entrada**,
> debajo del programa, y se entrega entera al empezar: `ACCEPT` no espera a
> que alguien teclee. En z/OS, un `ACCEPT` sin la cláusula `FROM` lee del
> dispositivo de entrada del sistema que el trabajo tiene asignado. El campo
> del año se llama `ANIO` porque el curso no usa eñes en los nombres.

> Doc: [ACCEPT statement (Enterprise COBOL 6.4)](https://www.ibm.com/docs/en/cobol-zos/6.4.0?topic=statements-accept-statement)

```opcion-multiple
# Enunciado
La entrada estándar tiene una sola línea, «ROSA», y el programa hace dos ACCEPT
sobre un campo PIC X(6). ¿Qué guarda el campo después del segundo?

# Opciones
- ROSA otra vez
- Seis espacios
- El programa se detiene con un error
- El campo conserva ROSA sin cambios

# Correcta
2

# Explicación
Después de la última línea llega el fin de la entrada. GnuCOBOL deja entonces
el campo en espacios: el segundo ACCEPT no recibe ningún dato.

# Pista
La entrada se entrega una sola vez y después se acaba.
```

# Un archivo es una sucesión de registros

En COBOL un archivo de datos es una sucesión de **registros**, y en el caso más
común cada registro tiene la misma disposición: los mismos campos, en las
mismas columnas. Este archivo de clientes tiene un registro por línea, con el
código en las columnas 1 a 4, el nombre en las 5 a 14 y el saldo, con dos
decimales implícitos, en las 15 a 21. Es el registro `CLIENTE` de la sesión 4,
grabado tres veces.

```text
C001ROSA      0125050
C002LUIS      0030000
C003ANA       0002575
```

> Doc: [FILE SECTION](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#FILE-SECTION)

> Nota: Un archivo así no necesita separadores: el programa sabe dónde empieza
> cada campo porque conoce su disposición. Por eso un error en una columna
> desplaza todos los campos que siguen. El tercer registro guarda 25,75 como
> `0002575`.

```relacionar
# Enunciado
Relaciona cada tramo de columnas del registro con su campo.

# Pares
- Columnas 1 a 4 => el código del cliente
- Columnas 5 a 14 => el nombre
- Columnas 15 a 21 => el saldo, con dos decimales implícitos

# Explicación
La disposición del registro es la del grupo CLIENTE: 4 + 10 + 7 bytes, 21 en
total.

# Pista
Usa los tamaños de PIC X(4), PIC X(10) y PIC 9(5)V99.
```

# Leer un archivo registro a registro

Leer un archivo exige tres piezas. En la ENVIRONMENT DIVISION, la sección
INPUT-OUTPUT y su párrafo `FILE-CONTROL` asocian un nombre interno, `CLIENTES`,
al archivo `clientes.txt` con `SELECT … ASSIGN`; `ORGANIZATION IS LINE
SEQUENTIAL` indica que es un archivo de texto con un registro por línea. En la
DATA DIVISION, la **FILE SECTION** describe el registro con una entrada `FD`
(*file description*). Y en la PROCEDURE DIVISION, `OPEN INPUT` abre el archivo
para leer, `READ` trae el registro siguiente y `CLOSE` lo cierra.

`READ … AT END` indica qué hacer cuando ya no quedan registros; `NOT AT END`,
qué hacer con cada uno. `PERFORM UNTIL … END-PERFORM` repite las sentencias de
dentro hasta que se cumple la condición: aquí, hasta que `FIN-ARCHIVO` vale
`"S"`. `MOVE` copia un valor en un campo.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. LISTA.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT CLIENTES ASSIGN TO "clientes.txt"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  CLIENTES.
       01  CLIENTE.
           05  CODIGO      PIC X(4).
           05  NOMBRE      PIC X(10).
           05  SALDO       PIC 9(5)V99.
       WORKING-STORAGE SECTION.
       01  FIN-ARCHIVO     PIC X VALUE "N".
       PROCEDURE DIVISION.
           OPEN INPUT CLIENTES
           PERFORM UNTIL FIN-ARCHIVO = "S"
               READ CLIENTES
                   AT END MOVE "S" TO FIN-ARCHIVO
                   NOT AT END DISPLAY CODIGO " " NOMBRE " " SALDO
               END-READ
           END-PERFORM
           CLOSE CLIENTES
           STOP RUN.
```

```archivo clientes.txt
C001ROSA      0125050
C002LUIS      0030000
C003ANA       0002575
```

```salida
C001 ROSA       01250.50
C002 LUIS       00300.00
C003 ANA        00025.75
```

> Doc: [SELECT](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#SELECT)
> Doc: [OPEN](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#OPEN)
> Doc: [Sequential READ](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#Sequential-READ)
> Doc: [CLOSE](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#CLOSE)

> Nota: Este programa reúne lo que el curso intermedio explica pieza por
> pieza: las organizaciones de archivo, los modos de `OPEN`, el estado de cada
> operación y el patrón de lectura. Aquí basta con ver la forma: abrir, leer
> hasta el final, cerrar. En **Datos de entrada** se puede cambiar el archivo
> y volver a ejecutar.

```opcion-multiple
# Enunciado
¿Qué hace el programa cuando READ ya no encuentra registros?

# Opciones
- Termina con un error de ejecución
- Ejecuta lo que sigue a AT END: MOVE "S" TO FIN-ARCHIVO
- Vuelve a leer el primer registro
- Ejecuta lo que sigue a NOT AT END

# Correcta
2

# Explicación
AT END es la rama que READ ejecuta al llegar al final del archivo. Al poner
FIN-ARCHIVO en "S", la condición del PERFORM se cumple y la repetición termina.

# Pista
Sigue el valor de FIN-ARCHIVO.
```

# Escribir un archivo de resultados

Para escribir, el archivo se abre con `OPEN OUTPUT`, que lo crea vacío, y cada
`WRITE` añade el contenido del registro como una línea nueva. Este programa
lee los clientes y escribe en `saldos.txt` solo el código y el saldo de cada
uno: el resultado de un lote es, casi siempre, otro archivo.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. EXTRAE.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT CLIENTES ASSIGN TO "clientes.txt"
               ORGANIZATION IS LINE SEQUENTIAL.
           SELECT SALDOS ASSIGN TO "saldos.txt"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  CLIENTES.
       01  CLIENTE.
           05  CODIGO      PIC X(4).
           05  NOMBRE      PIC X(10).
           05  SALDO       PIC 9(5)V99.
       FD  SALDOS.
       01  LINEA-SALDO.
           05  SAL-CODIGO  PIC X(4).
           05  FILLER      PIC X.
           05  SAL-SALDO   PIC 9(5)V99.
       WORKING-STORAGE SECTION.
       01  FIN-ARCHIVO     PIC X VALUE "N".
       PROCEDURE DIVISION.
           OPEN INPUT CLIENTES OUTPUT SALDOS
           PERFORM UNTIL FIN-ARCHIVO = "S"
               READ CLIENTES
                   AT END MOVE "S" TO FIN-ARCHIVO
                   NOT AT END
                       MOVE SPACES TO LINEA-SALDO
                       MOVE CODIGO TO SAL-CODIGO
                       MOVE SALDO TO SAL-SALDO
                       WRITE LINEA-SALDO
               END-READ
           END-PERFORM
           CLOSE CLIENTES SALDOS
           DISPLAY "SALDOS EXTRAIDOS".
           STOP RUN.
```

```archivo clientes.txt
C001ROSA      0125050
C002LUIS      0030000
C003ANA       0002575
```

```salida
SALDOS EXTRAIDOS
```

```escrito saldos.txt
C001 0125050
C002 0030000
C003 0002575
```

> Doc: [WRITE](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#WRITE)

> Nota: En el archivo el saldo aparece sin punto (`0125050`), porque `WRITE`
> graba los bytes del registro; el punto que se ve con `DISPLAY` lo añade
> `DISPLAY`. `MOVE SPACES TO LINEA-SALDO` llena de espacios todo el registro
> antes de copiar los campos, para que el `FILLER` que los separa sea un
> espacio: `SPACES` es una **constante figurativa**, tantos espacios como mida
> el campo que los recibe.

```verdadero-falso
# Enunciado
OPEN OUTPUT sobre un archivo que ya existe añade los registros nuevos al final.

# Respuesta
falso

# Explicación
OPEN OUTPUT crea el archivo vacío: si ya existía, su contenido anterior se
pierde. Para añadir al final existe OPEN EXTEND, que el curso intermedio
presenta.

# Pista
Piensa en qué significa «crear vacío».
```

# El código de retorno

Al terminar, un programa deja un **código de retorno**: un número que el
sistema operativo entrega a quien lo lanzó. Por convención, 0 significa que
todo fue bien y un valor mayor, que hubo observaciones o errores. En COBOL ese
número es el **registro especial** `RETURN-CODE`, un dato que el compilador
declara por su cuenta: el programa le asigna un valor con `MOVE` antes de
`STOP RUN`.

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. AVISA.
       PROCEDURE DIVISION.
           DISPLAY "CIERRE CON OBSERVACIONES".
           MOVE 4 TO RETURN-CODE.
           STOP RUN.
```

```salida
CIERRE CON OBSERVACIONES
```

> Doc: [Special Registers](https://gnucobol.sourceforge.io/HTML/gnucobpg.html#Special-Registers)

> Nota: La consola del curso muestra «código de salida 4» junto a la salida.
> En una terminal de Linux, la variable `$?` de la shell guarda el código del
> último programa:

```bash !sin-consola
cobc -x avisa.cob
./avisa
echo "estado: $?"
```

```salida
CIERRE CON OBSERVACIONES
estado: 4
```

```verdadero-falso
# Enunciado
Un programa que termina con RETURN-CODE en 0 indica, por convención, que todo
fue bien.

# Respuesta
verdadero

# Explicación
El 0 se reserva por convención para el éxito; los valores mayores señalan
observaciones o errores, y quien lanzó el programa puede decidir según ellos.

# Pista
Es la convención de casi todos los sistemas operativos.
```

# Cierre de la nivelación

Quedó cubierto en esta sesión el modelo de procesamiento por lotes: `ACCEPT`
para leer la entrada estándar, el archivo como sucesión de registros, la
lectura con `OPEN`, `READ … AT END` y `CLOSE`, la escritura con `OPEN OUTPUT`
y `WRITE`, y el código de retorno con `RETURN-CODE`.

Con eso termina la nivelación: qué es COBOL y GnuCOBOL, el formato fijo de 80
columnas, las cuatro divisiones, la declaración de datos con `PICTURE`, cómo se
guardan caracteres y números, y el procesamiento por lotes. El curso
**Introducción a COBOL** parte de aquí: `MOVE` y sus reglas, la aritmética con
`ADD`, `SUBTRACT`, `MULTIPLY`, `DIVIDE` y `COMPUTE`, los campos editados para
reportes, las decisiones con `IF` y `EVALUATE`, y las repeticiones con
`PERFORM`.
