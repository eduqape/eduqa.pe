---
numero: 5
titulo: "La cuadrícula S × S y la celda responsable"
---

# Dividir la imagen en celdas

YOLO divide la imagen de entrada en una cuadrícula de `S × S` celdas. Si el centro de un objeto cae dentro de una celda, esa celda es responsable de detectarlo. En PASCAL VOC (*Visual Object Classes*), el artículo usa `S = 7`.

![El modelo YOLO](/cursos/yolo-deteccion-unificada/imagenes/figura-2-modelo.png)

> Doc: [YOLO, sección 2 y figura 2](https://arxiv.org/abs/1506.02640)

Con una entrada de 448 píxeles y 7 celdas por eje, cada celda cubre 64 píxeles.

```python
lado_imagen = 448
S = 7
lado_celda = lado_imagen // S
print(lado_celda)
print(S * S)
```

```salida
64
49
```

# Encontrar la celda del centro

La columna de la celda se obtiene dividiendo la coordenada `cx` del centro entre el lado de la celda y descartando la parte fraccionaria; la fila se obtiene igual con `cy`. La celda responsable depende solo del centro, no del tamaño de la caja.

```python
lado_celda = 64
cx, cy = 200.0, 150.0
columna = int(cx // lado_celda)
fila = int(cy // lado_celda)
print(fila, columna)
```

```salida
2 3
```

> Nota: Se escribe `(fila, columna)` porque los arreglos de NumPy indexan primero el eje vertical. La coordenada `y` determina la fila y la `x`, la columna.

# Usar coordenadas normalizadas

Con coordenadas normalizadas entre 0 y 1, la columna es `int(cx * S)`. El caso límite `cx = 1.0` produciría la columna `S`, que no existe; se acota al último índice válido con `min`.

```python
S = 7
def celda(cx, cy):
    columna = min(int(cx * S), S - 1)
    fila = min(int(cy * S), S - 1)
    return fila, columna

print(celda(0.4464, 0.3348))
print(celda(1.0, 0.0))
```

```salida
(2, 3)
(0, 6)
```

```ejercicio
# Enunciado
Completa el número de celdas por eje que usa YOLO en PASCAL VOC.

# Plantilla
S = ___
cx = 0.5
print(int(cx * S))

# Esperado
3

# Pista
La salida final del artículo es un tensor de 7 × 7 × 30.
```

# Una celda, un objeto

La responsabilidad por celda impone diversidad espacial: con frecuencia queda claro en qué celda cae un objeto y la red predice una sola caja para él. Como contrapartida, dos objetos cuyos centros caen en la misma celda compiten por ella.

```python
S = 7
centros = [(0.30, 0.42), (0.33, 0.40), (0.80, 0.70)]
celdas = [(min(int(cy * S), S - 1), min(int(cx * S), S - 1))
          for cx, cy in centros]
print(celdas)
print(len(set(celdas)))
```

```salida
[(2, 2), (2, 2), (4, 5)]
2
```

> Nota: Tres objetos ocupan solo dos celdas. La sesión 14 muestra qué ocurre con el objetivo de entrenamiento en ese caso y la sesión 19 lo relaciona con las limitaciones que declara el artículo.

# Cierre

La cuadrícula asigna cada objeto a la celda que contiene su centro. La sesión siguiente define qué predice cada celda: B cajas con coordenadas relativas a la celda y a la imagen.
