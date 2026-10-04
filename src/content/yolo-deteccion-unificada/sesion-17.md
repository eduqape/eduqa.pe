---
numero: 17
titulo: "El régimen de entrenamiento"
---

# Datos, épocas y lote

La red se entrena durante unas 135 épocas con los conjuntos de entrenamiento y validación de PASCAL VOC 2007 y 2012. Para las pruebas sobre VOC 2012 se añaden también los datos de prueba de VOC 2007. El tamaño de lote es 64, el momento 0.9 y el decaimiento de pesos 0.0005.

> Doc: [YOLO, sección 2.2](https://arxiv.org/abs/1506.02640)

```python
configuracion = {
    "epocas": 135,
    "lote": 64,
    "momento": 0.9,
    "decaimiento": 0.0005,
    "lambda_coord": 5.0,
    "lambda_noobj": 0.5,
    "dropout": 0.5,
}
print(configuracion["lote"], configuracion["momento"])
```

```salida
64 0.9
```

> Nota: Una época es un recorrido completo por el conjunto de entrenamiento. Con lotes de 64 imágenes, cada época contiene tantas actualizaciones como lotes caben en el conjunto.

# El programa de la tasa de aprendizaje

Durante las primeras épocas, la tasa de aprendizaje sube lentamente de 10⁻³ a 10⁻². El artículo explica que empezar con una tasa alta suele hacer divergir el modelo por gradientes inestables. Después, la tasa se mantiene en 10⁻² durante 75 épocas, en 10⁻³ durante 30 y en 10⁻⁴ durante 30.

```python
def tasa(epoca, calentamiento):
    if epoca < calentamiento:
        return 1e-3 + (1e-2 - 1e-3) * epoca / calentamiento
    epoca -= calentamiento
    if epoca < 75:
        return 1e-2
    if epoca < 105:
        return 1e-3
    return 1e-4

for epoca in [0, 2, 5, 80, 110]:
    print(epoca, tasa(epoca, calentamiento=5))
```

```salida
0 0.001
2 0.0046
5 0.01
80 0.001
110 0.0001
```

> Nota: El artículo no publica cuántas épocas dura el calentamiento ni la forma exacta de la subida. El calentamiento lineal de 5 épocas es un supuesto del ejemplo, no un dato del artículo. Con ese supuesto, el total asciende a 140 épocas; el artículo habla de «unas 135» y no aclara si el calentamiento se cuenta dentro de las 75 épocas a 10⁻².

```ordenar
# Enunciado
Ordena las fases de la tasa de aprendizaje de YOLO.

# Elementos
- 10⁻³ durante 30 épocas
- Subida lenta de 10⁻³ a 10⁻²
- 10⁻⁴ durante 30 épocas
- 10⁻² durante 75 épocas

# Orden
2, 4, 1, 3

# Explicación
Primero se calienta la tasa para evitar la divergencia; después se mantiene alta durante la mayor parte del entrenamiento y se reduce en dos escalones.

# Pista
La tasa más alta no se usa desde la primera época.
```

# Momento y decaimiento de pesos

El descenso por gradiente con momento acumula una velocidad que suaviza las actualizaciones. El decaimiento de pesos añade al gradiente una fracción del propio peso, lo que favorece pesos pequeños. Un paso con los valores del artículo:

```python
peso = 0.8
gradiente = 0.2
velocidad = 0.05
tasa_aprendizaje = 1e-2
momento = 0.9
decaimiento = 0.0005
gradiente_total = gradiente + decaimiento * peso
velocidad = momento * velocidad - tasa_aprendizaje * gradiente_total
peso = peso + velocidad
print(round(velocidad, 6), round(peso, 6))
```

```salida
0.042996 0.842996
```

> Nota: Esta es una formulación habitual de la actualización con momento. El artículo publica los valores de momento y decaimiento, pero no la fórmula de actualización.

# Dropout

Para evitar el sobreajuste, el artículo coloca una capa de *dropout* con tasa 0.5 después de la primera capa conectada. Durante el entrenamiento, cada unidad se anula con probabilidad 0.5, lo que impide la coadaptación entre capas.

```python
rng = np.random.default_rng(4)
activaciones = np.ones(10)
mascara = rng.random(10) >= 0.5
print(mascara.astype(int))
print(activaciones * mascara)
```

```salida
[1 1 1 0 1 0 1 0 1 1]
[1. 1. 1. 0. 1. 0. 1. 0. 1. 1.]
```

> Nota: En inferencia no se anula ninguna unidad. Las implementaciones reescalan las activaciones en entrenamiento o en inferencia para que su valor esperado coincida en ambas fases.

# Aumento de datos

El artículo usa escalado y traslación aleatorios de hasta el 20 % del tamaño original de la imagen, y ajusta aleatoriamente la exposición y la saturación hasta un factor 1.5 en el espacio de color HSV (*hue, saturation, value*: tono, saturación y valor). Una transformación geométrica obliga a transformar también las cajas.

```python
def trasladar_caja(caja, dx, dy):
    x1, y1, x2, y2 = caja
    return (x1 + dx, y1 + dy, x2 + dx, y2 + dy)

lado = 448
dx = round(0.2 * lado)
print(dx)
print(trasladar_caja((100, 50, 300, 250), dx, -dx))
```

```salida
90
(190, -40, 390, 160)
```

> Nota: Tras trasladar o escalar, una caja puede salir parcialmente de la imagen. Antes de construir el objetivo, sus coordenadas deben recortarse a los límites de la imagen.

# Cierre

El entrenamiento combina 135 épocas, una tasa con calentamiento y tres escalones, momento, decaimiento de pesos, *dropout* y aumento de datos. La sesión siguiente usa la red entrenada: decodifica sus 98 cajas y elimina duplicados con la supresión de no máximos.
