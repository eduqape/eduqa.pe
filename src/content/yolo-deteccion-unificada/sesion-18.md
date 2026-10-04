---
numero: 18
titulo: "Inferencia y supresión de no máximos"
preludio: |
  def iou(a, b):
      ancho = min(a[2], b[2]) - max(a[0], b[0])
      alto = min(a[3], b[3]) - max(a[1], b[1])
      interseccion = max(0, ancho) * max(0, alto)
      area_a = (a[2] - a[0]) * (a[3] - a[1])
      area_b = (b[2] - b[0]) * (b[3] - b[1])
      return interseccion / (area_a + area_b - interseccion)

  def supresion_no_maximos(cajas, puntuaciones, umbral_iou=0.5):
      orden = list(np.argsort(puntuaciones)[::-1])
      conservadas = []
      while orden:
          mejor = orden.pop(0)
          conservadas.append(int(mejor))
          orden = [i for i in orden if iou(cajas[mejor], cajas[i]) <= umbral_iou]
      return conservadas
---

# Una sola evaluación

Igual que en el entrenamiento, predecir las detecciones de una imagen de prueba requiere una sola evaluación de la red. En PASCAL VOC, la red predice 98 cajas por imagen y probabilidades de clase para cada caja. La inferencia consiste en decodificar esas cajas, calcular sus puntuaciones y eliminar duplicados.

> Doc: [YOLO, sección 2.3](https://arxiv.org/abs/1506.02640)

# Decodificar las 98 cajas

La decodificación aplica a cada caja lo visto en la sesión 6: el centro se reconstruye a partir de la fila, la columna y los desplazamientos. Como la red predice la raíz cuadrada del ancho y del alto (sesión 16), esos valores se elevan al cuadrado. `np.indices` genera las filas y columnas de todas las celdas sin bucles.

```python
def decodificar(salida, S=7, B=2):
    cajas = salida[..., : B * 5].reshape(S, S, B, 5)
    filas, columnas = np.indices((S, S))
    cx = (columnas[..., None] + cajas[..., 0]) / S
    cy = (filas[..., None] + cajas[..., 1]) / S
    w = cajas[..., 2] ** 2
    h = cajas[..., 3] ** 2
    esquinas = np.stack([cx - w / 2, cy - h / 2,
                         cx + w / 2, cy + h / 2], axis=-1)
    return esquinas.reshape(-1, 4), cajas[..., 4].reshape(-1)

salida = np.zeros((7, 7, 30))
salida[2, 3, 0:5] = [0.12, 0.34, np.sqrt(0.45), np.sqrt(0.45), 0.8]
esquinas, confianzas = decodificar(salida)
print(esquinas.shape, confianzas.shape)
print(np.round(esquinas[2 * 7 * 2 + 3 * 2], 4))
```

```salida
(98, 4) (98,)
[0.2207 0.1093 0.6707 0.5593]
```

> Doc: [numpy.indices](https://numpy.org/doc/stable/reference/generated/numpy.indices.html)

> Nota: La caja de la celda `(2, 3)` y predictor 0 ocupa la posición `fila · S · B + columna · B + predictor` = 2 · 14 + 3 · 2 + 0 = 34 en la matriz aplanada.

# Por qué hay duplicados

La cuadrícula impone diversidad espacial, y casi siempre una sola celda predice cada objeto. Sin embargo, algunos objetos grandes o situados en el borde entre celdas quedan bien localizados por varias celdas. El artículo indica que la supresión de no máximos (NMS, *non-maximum suppression*) corrige esas detecciones múltiples y añade entre 2 y 3 puntos de mAP (*mean average precision*, precisión promedio media).

```python
caja_celda_a = (0.30, 0.20, 0.70, 0.80)
caja_celda_b = (0.32, 0.22, 0.72, 0.78)
print(round(iou(caja_celda_a, caja_celda_b), 4))
```

```salida
0.8471
```

# El algoritmo de supresión de no máximos

La supresión de no máximos ordena las cajas de una clase por puntuación descendente, conserva la primera y descarta las restantes cuya IoU con ella supera un umbral; repite con las cajas que quedan. El artículo no publica el umbral de IoU; este curso usa 0.5 como valor de práctica.

```python
def supresion_no_maximos(cajas, puntuaciones, umbral_iou=0.5):
    orden = list(np.argsort(puntuaciones)[::-1])
    conservadas = []
    while orden:
        mejor = orden.pop(0)
        conservadas.append(int(mejor))
        orden = [i for i in orden if iou(cajas[mejor], cajas[i]) <= umbral_iou]
    return conservadas

cajas = [
    (0.30, 0.20, 0.70, 0.80),
    (0.32, 0.22, 0.72, 0.78),
    (0.05, 0.05, 0.25, 0.30),
]
puntuaciones = np.array([0.62, 0.71, 0.40])
print(supresion_no_maximos(cajas, puntuaciones))
```

```salida
[1, 2]
```

> Doc: [numpy.argsort](https://numpy.org/doc/stable/reference/generated/numpy.argsort.html)

> Nota: `np.argsort` ordena de menor a mayor; `[::-1]` invierte el orden para empezar por la puntuación más alta.

```ordenar
# Enunciado
Ordena los pasos de la supresión de no máximos para una clase.

# Elementos
- Descartar las cajas cuya IoU con la elegida supera el umbral
- Ordenar las cajas por puntuación descendente
- Repetir con las cajas que quedan
- Conservar la caja de mayor puntuación

# Orden
2, 4, 1, 3

# Explicación
Primero se ordenan las cajas; después se conserva la mejor, se eliminan sus duplicados y se repite el proceso hasta agotar la lista.

# Pista
La caja que se conserva en cada vuelta es la que encabeza la lista ordenada.
```

# Suprimir por clase

La supresión se aplica por separado a cada clase: dos cajas muy superpuestas de clases distintas, como una persona sobre un caballo, no son duplicados. El preludio de la sesión incluye `supresion_no_maximos`, de modo que el bloque se ejecuta sin depender del anterior.

```python
cajas = [
    (0.30, 0.10, 0.60, 0.70),
    (0.28, 0.30, 0.75, 0.90),
    (0.31, 0.12, 0.61, 0.69),
]
puntuaciones = np.array([0.64, 0.55, 0.50])
clases = np.array([14, 12, 14])
for clase in np.unique(clases):
    indices = np.flatnonzero(clases == clase)
    candidatas = [cajas[i] for i in indices]
    conservadas = supresion_no_maximos(candidatas, puntuaciones[indices])
    print(int(clase), [int(indices[k]) for k in conservadas])
```

```salida
12 [1]
14 [0]
```

> Doc: [numpy.flatnonzero](https://numpy.org/doc/stable/reference/generated/numpy.flatnonzero.html)

# Cierre

La inferencia decodifica 98 cajas en una sola evaluación, calcula sus puntuaciones y elimina duplicados por clase con la supresión de no máximos. La sesión siguiente estudia dónde falla YOLO: sus limitaciones y su perfil de errores frente a Fast R-CNN.
