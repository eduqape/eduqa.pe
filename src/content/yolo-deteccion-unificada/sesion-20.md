---
numero: 20
titulo: "Generalización y proyecto final: un detector YOLO en NumPy"
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

  def decodificar(salida, S=7, B=2):
      cajas = salida[..., : B * 5].reshape(S, S, B, 5)
      filas, columnas = np.indices((S, S))
      cx = (columnas[..., None] + cajas[..., 0]) / S
      cy = (filas[..., None] + cajas[..., 1]) / S
      w = cajas[..., 2] ** 2
      h = cajas[..., 3] ** 2
      esquinas = np.stack([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], axis=-1)
      return esquinas.reshape(-1, 4), cajas[..., 4].reshape(-1)

  def puntuar(salida, S=7, B=2):
      confianzas = salida[..., : B * 5].reshape(S, S, B, 5)[..., 4]
      clases = salida[..., B * 5 :]
      puntuaciones = confianzas[..., :, None] * clases[..., None, :]
      return puntuaciones.reshape(S * S * B, -1)

  CLASES_VOC = ["aeroplane", "bicycle", "bird", "boat", "bottle", "bus", "car",
                "cat", "chair", "cow", "diningtable", "dog", "horse", "motorbike",
                "person", "pottedplant", "sheep", "sofa", "train", "tvmonitor"]

  SALIDA_PROYECTO = np.zeros((7, 7, 30))
  SALIDA_PROYECTO[..., 4] = 0.05
  SALIDA_PROYECTO[..., 9] = 0.05
  SALIDA_PROYECTO[..., 10:] = 0.05
  SALIDA_PROYECTO[3, 1, 0:5] = [0.95, 0.60, np.sqrt(0.18), np.sqrt(0.55), 0.85]
  SALIDA_PROYECTO[3, 1, 10 + 14] = 0.90
  SALIDA_PROYECTO[3, 2, 0:5] = [0.05, 0.55, np.sqrt(0.20), np.sqrt(0.52), 0.60]
  SALIDA_PROYECTO[3, 2, 10 + 14] = 0.80
  SALIDA_PROYECTO[5, 4, 0:5] = [0.50, 0.30, np.sqrt(0.22), np.sqrt(0.16), 0.70]
  SALIDA_PROYECTO[5, 4, 10 + 11] = 0.75
---

# Generalizar a obras de arte

Los conjuntos de datos académicos toman los datos de entrenamiento y de prueba de la misma distribución, pero en aplicaciones reales los datos de prueba pueden diferir de los vistos en el entrenamiento. El artículo compara detectores de personas entrenados con fotografías y evaluados con pinturas, en los conjuntos Picasso y People-Art.

> Doc: [YOLO, sección 4.5 y figura 5](https://arxiv.org/abs/1506.02640)

```python
ap = {
    "YOLO": (59.2, 53.3),
    "R-CNN": (54.2, 10.4),
    "DPM": (43.2, 37.8),
}
for nombre, (voc_2007, picasso) in ap.items():
    print(nombre, round(voc_2007 - picasso, 1))
```

```salida
YOLO 5.9
R-CNN 43.8
DPM 5.4
```

> Nota: Los valores son la precisión promedio (AP) de la clase persona en VOC 2007 y en Picasso, tomados de la figura 5. R-CNN pierde más porque Selective Search está ajustado a imágenes naturales y su clasificador solo ve regiones pequeñas. El artículo atribuye la robustez de YOLO a que modela el tamaño y la forma de los objetos y sus relaciones, que se parecen en arte y en fotografía aunque los píxeles difieran.

![Resultados cualitativos de YOLO](/cursos/yolo-deteccion-unificada/imagenes/figura-6-resultados-cualitativos.jpg)

La figura 6 muestra YOLO sobre obras de arte e imágenes naturales de internet. El propio artículo señala que es mayormente correcto, aunque confunde a una persona con un avión.

# Definir el proyecto

El proyecto final reúne el pipeline de inferencia del curso: recibir un tensor de 7 × 7 × 30, calcular las puntuaciones de la ecuación 1, aplicar un umbral, suprimir duplicados por clase y devolver detecciones en píxeles. El objetivo no es reproducir los resultados del artículo, sino poder inspeccionar cada matriz y justificar cada operación.

El preludio de la sesión trae `iou`, `supresion_no_maximos`, `decodificar`, `puntuar`, `CLASES_VOC` y `SALIDA_PROYECTO`, un tensor preparado a mano con una persona predicha por dos celdas vecinas y un perro.

```python
esquinas, confianzas = decodificar(SALIDA_PROYECTO)
puntuaciones = puntuar(SALIDA_PROYECTO)
print(esquinas.shape, puntuaciones.shape)
```

```salida
(98, 4) (98, 20)
```

# Filtrar por umbral

Se conserva cada par caja-clase cuya puntuación supera el umbral de práctica de 0.2.

```python
puntuaciones = puntuar(SALIDA_PROYECTO)
cajas, clases = np.nonzero(puntuaciones > 0.2)
for caja, clase in zip(cajas, clases):
    puntuacion = round(float(puntuaciones[caja, clase]), 3)
    print(int(caja), CLASES_VOC[clase], puntuacion)
```

```salida
44 person 0.765
46 person 0.48
78 dog 0.525
```

# Suprimir duplicados por clase

La persona aparece dos veces porque dos celdas vecinas la predicen. La supresión por clase conserva la caja de mayor puntuación.

```python
esquinas, _ = decodificar(SALIDA_PROYECTO)
puntuaciones = puntuar(SALIDA_PROYECTO)
cajas, clases = np.nonzero(puntuaciones > 0.2)
detecciones = []
for clase in np.unique(clases):
    indices = cajas[clases == clase]
    candidatas = [esquinas[i] for i in indices]
    conservadas = supresion_no_maximos(candidatas, puntuaciones[indices, clase])
    for k in conservadas:
        caja = int(indices[k])
        puntuacion = round(float(puntuaciones[caja, clase]), 3)
        detecciones.append((CLASES_VOC[clase], caja, puntuacion))
print(detecciones)
```

```salida
[('dog', 78, 0.525), ('person', 44, 0.765)]
```

# Volver a píxeles

Las esquinas normalizadas se multiplican por el tamaño de la imagen original y se recortan a sus límites. Una imagen de 640 × 480 tiene escalas distintas en cada eje, como se vio en la sesión 2. Los índices 44 y 78 son la persona y el perro conservados en el paso anterior.

```python
esquinas, _ = decodificar(SALIDA_PROYECTO)
ancho, alto = 640, 480
for indice in [44, 78]:
    escala = [ancho, alto, ancho, alto]
    x1, y1, x2, y2 = np.clip(esquinas[indice], 0.0, 1.0) * escala
    print(indice, [int(round(v)) for v in (x1, y1, x2, y2)])
```

```salida
44 [121, 115, 236, 379]
78 [341, 325, 482, 402]
```

> Doc: [numpy.clip](https://numpy.org/doc/stable/reference/generated/numpy.clip.html)

```ejercicio
# Enunciado
Completa la función que acota las coordenadas normalizadas al intervalo de la imagen.

# Plantilla
esquinas = np.array([-0.05, 0.2, 0.7, 1.1])
print(np.___(esquinas, 0.0, 1.0))

# Esperado
[0.  0.2 0.7 1. ]

# Pista
Cuatro letras: «recortar» en inglés.
```

# Presentar resultados sin inventar métricas

El proyecto debe registrar la configuración y los resultados que realmente se midieron. No se copia una cifra del artículo, como 63.4 % de mAP o 45 FPS, como si perteneciera a una implementación propia: esos valores dependen de los datos, el preentrenamiento, el hardware y el régimen de entrenamiento descritos en el artículo.

```python
configuracion = {
    "S": 7,
    "B": 2,
    "C": 20,
    "umbral_puntuacion": 0.2,
    "umbral_iou_nms": 0.5,
}
print(configuracion["S"] * configuracion["S"] * configuracion["B"])
```

```salida
98
```

> Nota: Los umbrales 0.2 y 0.5 son valores de práctica de este curso. El artículo no publica ninguno de los dos.

# Cierre del curso

El recorrido partió de la caja delimitadora y la IoU, construyó la cuadrícula S × S, las predicciones por celda, el tensor de 7 × 7 × 30 y la ecuación 1, siguió con la arquitectura convolucional, el preentrenamiento, el objetivo de entrenamiento y la pérdida de la ecuación 3, y terminó con la inferencia, la supresión de no máximos, el análisis de errores y la generalización. El producto final es un pipeline de inferencia que puede inspeccionarse paso a paso.

Como siguiente trabajo, se puede entrenar una red pequeña con un framework de diferenciación automática usando la pérdida de la sesión 16, calcular la precisión promedio sobre datos reservados y comparar el resultado con las limitaciones que declara el artículo.
