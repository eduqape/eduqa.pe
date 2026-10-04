---
numero: 1
titulo: "El problema de la detección de objetos"
---

# Clasificar, localizar y detectar

La clasificación de imágenes asigna una etiqueta a la imagen completa. La localización añade una caja delimitadora (*bounding box*) para un objeto. La detección de objetos, que es el problema del curso, devuelve un número variable de cajas por imagen, cada una con una clase y una puntuación.

El artículo de YOLO (*You Only Look Once*, «solo se mira una vez») plantea la detección como un único problema de regresión: una sola red neuronal convolucional recibe la imagen completa y produce en una evaluación todas las cajas y las probabilidades de clase.[1]

> Doc: [You Only Look Once: Unified, Real-Time Object Detection, resumen y sección 1](https://arxiv.org/abs/1506.02640)

![El sistema de detección YOLO](/cursos/yolo-deteccion-unificada/imagenes/figura-1-sistema-yolo.png)

La figura 1 del artículo resume el sistema en tres pasos: redimensionar la imagen a 448 × 448 píxeles, evaluar una sola red convolucional y aplicar un umbral sobre la confianza de las detecciones resultantes.

# Representar una detección

Una detección reúne tres datos: la clase, la caja y la puntuación. Una lista de diccionarios basta para inspeccionarlas antes de convertirlas en arreglos. Las clases y puntuaciones del ejemplo son las que muestra la figura 1; las coordenadas en píxeles son ilustrativas y no se midieron sobre la figura.

```python
detecciones = [
    {"clase": "person", "caja": (40, 60, 120, 300), "puntuacion": 0.64},
    {"clase": "dog", "caja": (210, 220, 300, 300), "puntuacion": 0.30},
    {"clase": "horse", "caja": (300, 150, 420, 280), "puntuacion": 0.28},
]
print(len(detecciones))
print([d["clase"] for d in detecciones])
```

```salida
3
['person', 'dog', 'horse']
```

> Nota: El número de detecciones depende de la imagen. Esa longitud variable distingue la detección de la clasificación, cuya salida tiene siempre el mismo tamaño.

# Una imagen como arreglo

Una imagen en color se almacena como un arreglo de forma `(alto, ancho, canales)`. Los tres canales corresponden a rojo, verde y azul (RGB, *red, green, blue*). YOLO evalúa imágenes de 448 × 448 píxeles, de modo que la entrada de la red de detección tiene forma `(448, 448, 3)`.

```python
imagen = np.zeros((448, 448, 3), dtype=np.uint8)
print(imagen.shape)
print(imagen.size)
```

```salida
(448, 448, 3)
602112
```

> Doc: [numpy.zeros](https://numpy.org/doc/stable/reference/generated/numpy.zeros.html)

> Nota: `uint8` es el tipo entero sin signo de 8 bits: cada componente de color toma valores entre 0 y 255. Antes de entrar a la red, los valores suelen convertirse a punto flotante.

# Medir la velocidad: fotogramas por segundo y latencia

El artículo informa la velocidad en fotogramas por segundo (FPS, *frames per second*). El tiempo por imagen es el inverso: 1000 milisegundos divididos entre los FPS. El modelo base procesa 45 FPS y la versión reducida, Fast YOLO, 155 FPS, en una GPU (*graphics processing unit*) Titan X y sin procesamiento por lotes.

```python
for nombre, fps in [("YOLO", 45), ("Fast YOLO", 155)]:
    milisegundos = 1000 / fps
    print(nombre, round(milisegundos, 2))
```

```salida
YOLO 22.22
Fast YOLO 6.45
```

> Nota: El artículo usa como criterio de tiempo real 30 FPS o más. Con 45 FPS, cada imagen dispone de unos 22 ms, por debajo de los 25 ms de latencia que menciona la introducción.

```opcion-multiple
# Enunciado
¿Qué devuelve un detector de objetos para una imagen?

# Opciones
- Una única etiqueta para toda la imagen
- Una caja para el objeto más grande
- Un número variable de cajas, cada una con clase y puntuación
- Un mapa de color con el mismo tamaño que la imagen

# Correcta
3

# Explicación
La detección localiza y clasifica cada objeto. Como el número de objetos cambia entre imágenes, la salida tiene longitud variable.

# Pista
Piensa en la figura 1: una persona, un perro y un caballo en la misma imagen.
```

# Cierre

La detección produce un conjunto variable de cajas con clase y puntuación, y YOLO lo obtiene con una sola evaluación de la red sobre una imagen de 448 × 448. La sesión siguiente formaliza la caja: sus dos sistemas de coordenadas y la normalización por el tamaño de la imagen.

[1] Los autores son Joseph Redmon, Santosh Divvala, Ross Girshick y Ali Farhadi. Este curso cita la versión 5 del artículo en arXiv (arXiv:1506.02640v5), fechada el 9 de mayo de 2016.
