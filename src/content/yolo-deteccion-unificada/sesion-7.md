---
numero: 7
titulo: "Confianza y probabilidades condicionales de clase"
preludio: |
  def iou(a, b):
      ancho = min(a[2], b[2]) - max(a[0], b[0])
      alto = min(a[3], b[3]) - max(a[1], b[1])
      interseccion = max(0, ancho) * max(0, alto)
      area_a = (a[2] - a[0]) * (a[3] - a[1])
      area_b = (b[2] - b[0]) * (b[3] - b[1])
      return interseccion / (area_a + area_b - interseccion)
---

# La confianza de una caja

El artículo define la confianza de una caja como `Pr(Object) · IoU(pred, truth)`: la probabilidad de que la caja contenga un objeto multiplicada por la IoU entre la caja predicha y la caja real. Si en la celda no hay objeto, la confianza debe valer cero; si lo hay, debe igualar la IoU.

> Doc: [YOLO, sección 2](https://arxiv.org/abs/1506.02640)

La sesión trae en su preludio la función `iou` de la sesión 3.

```python
def confianza_objetivo(hay_objeto, caja_predicha, caja_real):
    if not hay_objeto:
        return 0.0
    return iou(caja_predicha, caja_real)

caja_real = (100, 100, 200, 200)
print(confianza_objetivo(False, (100, 100, 200, 200), caja_real))
print(round(confianza_objetivo(True, (120, 110, 220, 210), caja_real), 4))
```

```salida
0.0
0.5625
```

> Nota: La confianza combina dos preguntas en un número: si hay objeto y qué tan bien ajusta la caja. Una caja bien centrada sobre un objeto real, pero de tamaño incorrecto, recibe una confianza objetivo baja.

# Probabilidades condicionales de clase

Cada celda predice además `C` probabilidades condicionales `Pr(Class_i | Object)`: la probabilidad de cada clase suponiendo que la celda contiene un objeto. PASCAL VOC tiene 20 clases, de modo que `C = 20`.

```python
clases_voc = [
    "aeroplane", "bicycle", "bird", "boat", "bottle",
    "bus", "car", "cat", "chair", "cow",
    "diningtable", "dog", "horse", "motorbike", "person",
    "pottedplant", "sheep", "sofa", "train", "tvmonitor",
]
print(len(clases_voc))
print(clases_voc.index("dog"))
```

```salida
20
11
```

> Doc: [PASCAL VOC 2012, clases](http://host.robots.ox.ac.uk/pascal/VOC/voc2012/)

# Leer la clase más probable

`np.argmax` devuelve el índice del valor máximo. Aplicado al vector de probabilidades condicionales de una celda, identifica la clase más probable si hubiera un objeto.

```python
clases_voc = ["aeroplane", "bicycle", "bird", "boat", "bottle", "bus", "car",
              "cat", "chair", "cow", "diningtable", "dog", "horse", "motorbike",
              "person", "pottedplant", "sheep", "sofa", "train", "tvmonitor"]
probabilidades = np.full(20, 0.01)
probabilidades[11] = 0.81
print(round(probabilidades.sum(), 2))
print(clases_voc[np.argmax(probabilidades)])
```

```salida
1.0
dog
```

> Doc: [numpy.argmax](https://numpy.org/doc/stable/reference/generated/numpy.argmax.html)

```ejercicio
# Enunciado
Completa la función que devuelve el índice de la clase con mayor probabilidad.

# Plantilla
probabilidades = np.array([0.1, 0.7, 0.2])
print(np.___(probabilidades))

# Esperado
1

# Pista
«Argumento del máximo», en inglés y abreviado.
```

# Una sola distribución de clases por celda

YOLO predice un único conjunto de probabilidades de clase por celda, independientemente del número de cajas `B`. Las dos cajas de una celda comparten la misma distribución de clases: pueden diferir en posición, tamaño y confianza, pero no en clase.

```python
B, C = 2, 20
valores_cajas = B * 5
valores_clases = C
print(valores_cajas + valores_clases)
```

```salida
30
```

```verdadero-falso
# Enunciado
En YOLO, cada una de las B cajas de una celda tiene su propio vector de probabilidades de clase.

# Respuesta
falso

# Explicación
La sección 2 indica que solo se predice un conjunto de probabilidades de clase por celda, sin importar el número de cajas B. Por eso cada celda produce B · 5 + C valores y no B · (5 + C).

# Pista
Cuenta cuántos valores produce una celda: 30 con B = 2 y C = 20.
```

# Cierre

La confianza estima si hay objeto y qué tan bien ajusta la caja; las probabilidades condicionales estiman la clase suponiendo que hay objeto. La sesión siguiente organiza las 30 predicciones de cada celda en el tensor de salida 7 × 7 × 30.
