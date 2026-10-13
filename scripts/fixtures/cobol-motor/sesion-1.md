---
numero: 1
titulo: "Casos del motor"
---

# Salida estándar y de error en orden

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. FLUJOS.
       PROCEDURE DIVISION.
           DISPLAY "a la salida"
           DISPLAY "al error" UPON SYSERR
           DISPLAY "otra vez a la salida"
           STOP RUN.
```

```salida
a la salida
al error
otra vez a la salida
```

# Entrada estándar

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. ENTRADA.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  NOMBRE          PIC X(15).
       PROCEDURE DIVISION.
           ACCEPT NOMBRE
           DISPLAY "[" NOMBRE "]"
           ACCEPT NOMBRE
           DISPLAY "[" NOMBRE "]"
           STOP RUN.
```

```entrada
Rosa Mamani
```

```salida
[Rosa Mamani    ]
[               ]
```

# Escribir un archivo de texto

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COPIA.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT CLIENTES ASSIGN TO "clientes.txt"
               ORGANIZATION IS LINE SEQUENTIAL.
           SELECT LISTADO ASSIGN TO "listado.txt"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  CLIENTES.
       01  CLIENTE         PIC X(20).
       FD  LISTADO.
       01  LINEA           PIC X(20).
       WORKING-STORAGE SECTION.
       01  FIN-ARCHIVO     PIC X VALUE "N".
       PROCEDURE DIVISION.
           OPEN INPUT CLIENTES OUTPUT LISTADO
           PERFORM UNTIL FIN-ARCHIVO = "S"
               READ CLIENTES
                   AT END MOVE "S" TO FIN-ARCHIVO
                   NOT AT END
                       MOVE CLIENTE TO LINEA
                       WRITE LINEA
               END-READ
           END-PERFORM
           CLOSE CLIENTES LISTADO
           DISPLAY "Copia terminada".
           STOP RUN.
```

```archivo clientes.txt
Ana Torres
Luis Quispe
```

```salida
Copia terminada
```

```escrito listado.txt
Ana Torres
Luis Quispe
```

# Anexar con OPEN EXTEND

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. ANEXA.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT BITACORA ASSIGN TO "bitacora.txt"
               ORGANIZATION IS LINE SEQUENTIAL
               FILE STATUS IS ESTADO.
       DATA DIVISION.
       FILE SECTION.
       FD  BITACORA.
       01  LINEA           PIC X(20).
       WORKING-STORAGE SECTION.
       01  ESTADO          PIC XX.
       PROCEDURE DIVISION.
           OPEN EXTEND BITACORA
           MOVE "cierre del dia" TO LINEA
           WRITE LINEA
           CLOSE BITACORA
           DISPLAY "estado " ESTADO.
           STOP RUN.
```

```archivo bitacora.txt
apertura
```

```salida
estado 00
```

```escrito bitacora.txt
apertura
cierre del dia
```

# Archivo relativo en binario

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. RELATIVO.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT CUENTAS ASSIGN TO "cuentas.rel"
               ORGANIZATION RELATIVE
               ACCESS MODE RANDOM
               RELATIVE KEY CLAVE
               FILE STATUS ESTADO.
       DATA DIVISION.
       FILE SECTION.
       FD  CUENTAS.
       01  CUENTA   PIC X(10).
       WORKING-STORAGE SECTION.
       01  CLAVE    PIC 9(4).
       01  ESTADO   PIC XX.
       PROCEDURE DIVISION.
           OPEN OUTPUT CUENTAS
           MOVE 3 TO CLAVE
           MOVE "tercera" TO CUENTA
           WRITE CUENTA
           MOVE 1 TO CLAVE
           MOVE "primera" TO CUENTA
           WRITE CUENTA
           CLOSE CUENTAS
           OPEN INPUT CUENTAS
           MOVE 2 TO CLAVE
           READ CUENTAS
           DISPLAY "clave 2: estado " ESTADO
           CLOSE CUENTAS
           STOP RUN.
```

```salida
clave 2: estado 23
```

```escrito cuentas.rel
00000000  0a 00 00 00 70 72 69 6d  65 72 61 20 20 20 00 00  |....primera   ..|
00000010  00 00 00 00 00 00 00 00  00 00 00 00 0a 00 00 00  |................|
00000020  74 65 72 63 65 72 61 20  20 20                    |tercera   |
0000002a
```

# Copybook y programa anidado

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PRINCIPAL.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       COPY "montos.cpy".
       PROCEDURE DIVISION.
           CALL "CALCULA-IGV" USING MONTO IGV
           DISPLAY "IGV: " IGV
           STOP RUN.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CALCULA-IGV.
       DATA DIVISION.
       LINKAGE SECTION.
       01  L-MONTO  PIC 9(5)V99.
       01  L-IGV    PIC 9(5)V99.
       PROCEDURE DIVISION USING L-MONTO L-IGV.
           COMPUTE L-IGV = L-MONTO * 0.18
           GOBACK.
       END PROGRAM CALCULA-IGV.
       END PROGRAM PRINCIPAL.
```

```archivo montos.cpy
       01  MONTO    PIC 9(5)V99 VALUE 250.
       01  IGV      PIC 9(5)V99.
```

```salida
IGV: 00045.00
```

# Ordenar con SORT

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. ORDENA.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT ENTRADA ASSIGN TO "ventas.txt"
               ORGANIZATION LINE SEQUENTIAL.
           SELECT SALIDA ASSIGN TO "orden.txt"
               ORGANIZATION LINE SEQUENTIAL.
           SELECT TRABAJO ASSIGN TO "trabajo.tmp".
       DATA DIVISION.
       FILE SECTION.
       FD  ENTRADA.
       01  REG-E        PIC X(12).
       FD  SALIDA.
       01  REG-S        PIC X(12).
       SD  TRABAJO.
       01  REG-T.
           05 T-CIUDAD  PIC X(8).
           05 T-MONTO   PIC 9(4).
       PROCEDURE DIVISION.
           SORT TRABAJO ON DESCENDING KEY T-MONTO
               USING ENTRADA GIVING SALIDA
           STOP RUN.
```

```archivo ventas.txt
Lima    0300
Cusco   1200
Piura   0050
```

```escrito orden.txt
Cusco   1200
Lima    0300
Piura   0050
```

# Texto UTF-8 en el fuente y en un copybook

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. ACENTOS.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       COPY "provincia.cpy".
       PROCEDURE DIVISION.
           DISPLAY "CAÑETE " FUNCTION LENGTH("CAÑETE")
           DISPLAY "[" PROVINCIA "] " FUNCTION LENGTH(PROVINCIA)
           STOP RUN.
```

```archivo provincia.cpy
       01  PROVINCIA    PIC X(8) VALUE "HUÁNUCO".
```

```salida
CAÑETE 7
[HUÁNUCO] 8
```

# Fecha del sistema

```cobol !variable
       IDENTIFICATION DIVISION.
       PROGRAM-ID. FECHA.
       PROCEDURE DIVISION.
           DISPLAY FUNCTION CURRENT-DATE(1:8)
           STOP RUN.
```

# Ejercicio de completado

```cobol
       IDENTIFICATION DIVISION.
       PROGRAM-ID. AVISO.
       PROCEDURE DIVISION.
           DISPLAY "Cierre de caja".
           STOP RUN.
```

```salida
Cierre de caja
```

```ejercicio cobol
# Enunciado
Completa el verbo que muestra el texto en la salida estándar.

# Plantilla
       IDENTIFICATION DIVISION.
       PROGRAM-ID. AVISO.
       PROCEDURE DIVISION.
           ___ "Cierre de caja".
           STOP RUN.

# Esperado
Cierre de caja

# Pista
Es el verbo del ejemplo anterior.
```
