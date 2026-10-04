---
numero: 14
titulo: "Construir el objetivo de entrenamiento"
---

# De anotaciones a celdas

Un conjunto de datos de detección anota cada imagen con una lista de objetos: clase y caja en píxeles. Para entrenar, esa lista se convierte en un objetivo con la misma cuadrícula que la salida. El objetivo de este curso tiene forma `(7, 7, 25)`: un indicador de objeto, las cuatro coordenadas codificadas y 20 posiciones para la clase en codificación *one-hot* (un 1 en la clase correcta y 0 en las demás).

> Doc: [YOLO, secciones 2 y 2.2](https://arxiv.org/abs/1506.02640)

```python
S, C = 7, 20
objetivo = np.zeros((S, S, 1 + 4 + C))
print(objetivo.shape)
```

```salida
(7, 7, 25)
```

> Nota: El objetivo guarda una sola caja por celda aunque la red prediga dos. La sesión 16 explica cómo se decide cuál de las dos predicciones se compara con esa caja.

# Codificar un objeto

La codificación reúne las sesiones 2, 5 y 6: convertir esquinas a centro, normalizar por el tamaño de la imagen, localizar la celda y expresar el centro respecto de ella.

```python
def codificar(caja, ancho_imagen, alto_imagen, S=7):
    x1, y1, x2, y2 = caja
    cx = (x1 + x2) / 2 / ancho_imagen
    cy = (y1 + y2) / 2 / alto_imagen
    w = (x2 - x1) / ancho_imagen
    h = (y2 - y1) / alto_imagen
    columna = min(int(cx * S), S - 1)
    fila = min(int(cy * S), S - 1)
    return fila, columna, (cx * S - columna, cy * S - fila, w, h)

fila, columna, coordenadas = codificar((100, 50, 300, 250), 448, 448)
print(fila, columna)
print([round(v, 4) for v in coordenadas])
```

```salida
2 3
[0.125, 0.3438, 0.4464, 0.4464]
```

# Llenar el tensor objetivo

Cada objeto escribe en la celda que contiene su centro: el indicador a 1, las coordenadas y la clase. Las celdas sin objeto quedan a cero.

```python
def construir_objetivo(objetos, ancho_imagen, alto_imagen, S=7, C=20):
    objetivo = np.zeros((S, S, 1 + 4 + C))
    for clase, (x1, y1, x2, y2) in objetos:
        cx = (x1 + x2) / 2 / ancho_imagen
        cy = (y1 + y2) / 2 / alto_imagen
        columna = min(int(cx * S), S - 1)
        fila = min(int(cy * S), S - 1)
        objetivo[fila, columna, 0] = 1.0
        w = (x2 - x1) / ancho_imagen
        h = (y2 - y1) / alto_imagen
        objetivo[fila, columna, 1:5] = [cx * S - columna, cy * S - fila, w, h]
        objetivo[fila, columna, 5:] = 0.0
        objetivo[fila, columna, 5 + clase] = 1.0
    return objetivo

objetos = [(11, (100, 50, 300, 250)), (14, (20, 200, 120, 440))]
objetivo = construir_objetivo(objetos, 448, 448)
print(int(objetivo[..., 0].sum()))
print(np.argwhere(objetivo[..., 0] == 1).tolist())
print(int(np.argmax(objetivo[2, 3, 5:])))
```

```salida
2
[[2, 3], [5, 1]]
11
```

> Doc: [numpy.argwhere](https://numpy.org/doc/stable/reference/generated/numpy.argwhere.html)

> Nota: La clase 11 es `dog` y la 14, `person`, en el orden de clases de PASCAL VOC de la sesión 7.

```ejercicio
# Enunciado
Completa el valor del indicador de objeto en la celda responsable.

# Plantilla
objetivo = np.zeros((7, 7, 25))
objetivo[2, 3, 0] = ___
print(objetivo[..., 0].sum())

# Esperado
1.0

# Pista
El indicador vale cero en las celdas vacías.
```

# Dos objetos en la misma celda

Si dos centros caen en la misma celda, el segundo objeto sobrescribe al primero en este objetivo. La red tampoco podría representar ambos con clases distintas, porque cada celda tiene una sola distribución de clases (sesión 7).

```python
def celda(caja, lado=448, S=7):
    cx = (caja[0] + caja[2]) / 2 / lado
    cy = (caja[1] + caja[3]) / 2 / lado
    return min(int(cy * S), S - 1), min(int(cx * S), S - 1)

pajaro_1 = (200, 140, 230, 160)
pajaro_2 = (215, 150, 245, 170)
print(celda(pajaro_1), celda(pajaro_2))
```

```salida
(2, 3) (2, 3)
```

> Nota: Los objetos pequeños que aparecen en grupo, como una bandada de aves, son el ejemplo que el artículo usa para esta limitación (sección 2.4).

# Cierre

Las anotaciones se convierten en un tensor objetivo con un indicador, coordenadas codificadas y clase por celda. La sesión siguiente compara ese objetivo con la predicción mediante la suma de errores cuadrados y sus dos factores de ponderación.
