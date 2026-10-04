---
numero: 16
titulo: "La pérdida II: raíz cuadrada y predictor responsable"
preludio: |
  def iou(a, b):
      ancho = min(a[2], b[2]) - max(a[0], b[0])
      alto = min(a[3], b[3]) - max(a[1], b[1])
      interseccion = max(0, ancho) * max(0, alto)
      area_a = (a[2] - a[0]) * (a[3] - a[1])
      area_b = (b[2] - b[0]) * (b[3] - b[1])
      return interseccion / (area_a + area_b - interseccion)

  def a_esquinas(fila, columna, x, y, w, h, S=7):
      cx = (columna + x) / S
      cy = (fila + y) / S
      return (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)
---

# La raíz cuadrada del ancho y del alto

La suma de errores cuadrados pondera igual un error en una caja grande y en una pequeña. Sin embargo, la misma desviación afecta más a la IoU de una caja pequeña. Para atenuar ese efecto, YOLO predice la raíz cuadrada del ancho y del alto, no el ancho y el alto directamente.

```python
desviacion = 0.05
for w in [0.1, 0.8]:
    error_directo = desviacion ** 2
    error_raiz = (np.sqrt(w + desviacion) - np.sqrt(w)) ** 2
    print(w, round(error_directo, 6), round(error_raiz, 6))
```

```salida
0.1 0.0025 0.005051
0.8 0.0025 0.000758
```

> Doc: [YOLO, sección 2.2](https://arxiv.org/abs/1506.02640)

> Nota: Con la raíz, la misma desviación de 0.05 cuesta más en la caja de ancho 0.1 que en la de 0.8. El artículo dice que la raíz resuelve el problema «parcialmente»: la sección 2.4 vuelve a señalarlo como limitación.

```ejercicio
# Enunciado
Completa la función que transforma el ancho antes de compararlo en la pérdida.

# Plantilla
w = np.array([0.04, 0.64])
print(np.___(w))

# Esperado
[0.2 0.8]

# Pista
La operación inversa de elevar al cuadrado.
```

# El predictor responsable

Cada celda predice dos cajas, pero solo una debe ser responsable de cada objeto durante el entrenamiento. El artículo asigna la responsabilidad al predictor cuya caja tiene la mayor IoU actual con la caja real. Esta asignación especializa los predictores: cada uno mejora en ciertos tamaños, proporciones o clases de objeto.

La sesión trae en su preludio `iou` y `a_esquinas`, que decodifica una caja de la celda a esquinas normalizadas.

```python
real = a_esquinas(2, 3, 0.12, 0.34, 0.45, 0.45)
predicciones = [
    a_esquinas(2, 3, 0.20, 0.30, 0.20, 0.60),
    a_esquinas(2, 3, 0.10, 0.40, 0.40, 0.50),
]
valores = [iou(p, real) for p in predicciones]
print([round(v, 4) for v in valores])
print(int(np.argmax(valores)))
```

```salida
[0.3871, 0.809]
1
```

# La pérdida completa

La ecuación 3 suma cinco términos: centro y tamaño del predictor responsable, ponderados por `λcoord` (`l_coord` en el código); confianza del predictor responsable; confianza de los predictores sin objeto, ponderada por `λnoobj` (`l_noobj`); y probabilidades de clase de las celdas con objeto. La función siguiente la implementa para una imagen con la disposición de la sesión 8 y el objetivo de la sesión 14. Las posiciones de `w` y `h` de la predicción contienen sus raíces cuadradas.

```python
def perdida_yolo(prediccion, objetivo, S=7, B=2, l_coord=5.0, l_noobj=0.5):
    cajas = prediccion[..., : B * 5].reshape(S, S, B, 5)
    clases = prediccion[..., B * 5 :]
    terminos = dict.fromkeys(["centro", "tamaño", "obj", "noobj", "clase"], 0.0)
    for fila in range(S):
        for columna in range(S):
            responsable = -1
            if objetivo[fila, columna, 0] == 1:
                x, y, w, h = objetivo[fila, columna, 1:5]
                real = a_esquinas(fila, columna, x, y, w, h, S)
                ious = []
                for c in cajas[fila, columna]:
                    w_c, h_c = c[2] ** 2, c[3] ** 2
                    caja_c = a_esquinas(fila, columna, c[0], c[1], w_c, h_c, S)
                    ious.append(iou(caja_c, real))
                responsable = int(np.argmax(ious))
                px, py, pw, ph, pc = cajas[fila, columna, responsable]
                terminos["centro"] += l_coord * ((px - x) ** 2 + (py - y) ** 2)
                terminos["tamaño"] += l_coord * ((pw - np.sqrt(w)) ** 2
                                                 + (ph - np.sqrt(h)) ** 2)
                terminos["obj"] += (pc - ious[responsable]) ** 2
                clases_reales = objetivo[fila, columna, 5:]
                error_clases = clases[fila, columna] - clases_reales
                terminos["clase"] += np.sum(error_clases ** 2)
            for j in range(B):
                if j != responsable:
                    confianza = cajas[fila, columna, j, 4]
                    terminos["noobj"] += l_noobj * confianza ** 2
    return terminos

objetivo = np.zeros((7, 7, 25))
objetivo[2, 3, :5] = [1.0, 0.12, 0.34, 0.45, 0.45]
objetivo[2, 3, 5 + 11] = 1.0
prediccion = np.zeros((7, 7, 30))
prediccion[..., 4] = 0.1
prediccion[..., 9] = 0.1
prediccion[2, 3, 0:5] = [0.10, 0.40, np.sqrt(0.40), np.sqrt(0.50), 0.80]
prediccion[2, 3, 10 + 11] = 0.9
terminos = perdida_yolo(prediccion, objetivo)
print({nombre: round(float(v), 4) for nombre, v in terminos.items()})
print(round(float(sum(terminos.values())), 4))
```

```salida
{'centro': 0.02, 'tamaño': 0.0139, 'obj': 0.0001, 'noobj': 0.485, 'clase': 0.01}
0.529
```

> Nota: La confianza objetivo del predictor responsable es la IoU entre su caja y la real, como define la sección 2. Por eso una caja bien clasificada pero mal ajustada aprende a declarar una confianza baja.

> Nota: La pérdida solo penaliza la clasificación en celdas con objeto, de ahí que las probabilidades sean condicionales, y solo penaliza las coordenadas del predictor responsable.

# Cierre

La raíz cuadrada atenúa la desigualdad entre cajas grandes y pequeñas, el predictor responsable se elige por IoU y la ecuación 3 reúne los cinco términos. La sesión siguiente describe cómo se entrenó la red: épocas, tasa de aprendizaje, regularización y aumento de datos.
