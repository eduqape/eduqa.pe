---
numero: 13
titulo: "Preentrenamiento, resolución y Fast YOLO"
---

# Preentrenar en clasificación

Las capas convolucionales se preentrenan en el conjunto de 1000 clases de la competición ImageNet. Para el preentrenamiento se usan las primeras 20 capas convolucionales de la figura 3, seguidas de una capa de agrupamiento promedio (*average pooling*) y una capa totalmente conectada. Según el artículo, esa red se entrenó durante aproximadamente una semana y alcanzó una exactitud top-5 de 88 % con un solo recorte en la validación de ImageNet 2012. Todo el entrenamiento y la inferencia se realizaron con el framework Darknet.

> Doc: [YOLO, sección 2.2](https://arxiv.org/abs/1506.02640)

Las 24 capas de detección se obtienen añadiendo cuatro convoluciones a las 20 preentrenadas.

```python
preentrenadas = 20
añadidas = 4
print(preentrenadas + añadidas)
```

```salida
24
```

> Nota: La exactitud top-5 cuenta como acierto que la clase correcta esté entre las cinco de mayor probabilidad. No es comparable con la exactitud top-1.

# El agrupamiento promedio

El agrupamiento promedio global reduce cada canal de un mapa a su media. Convierte un mapa de forma `(alto, ancho, canales)` en un vector de longitud `canales`, que la capa conectada de clasificación recibe sin importar el tamaño espacial.

```python
mapa = np.arange(2 * 2 * 3, dtype=float).reshape(2, 2, 3)
promedio = mapa.mean(axis=(0, 1))
print(promedio)
```

```salida
[4.5 5.5 6.5]
```

> Doc: [numpy.mean](https://numpy.org/doc/stable/reference/generated/numpy.mean.html)

# Doblar la resolución para detectar

El preentrenamiento usa imágenes de 224 × 224. Para detectar, el artículo añade cuatro capas convolucionales y dos conectadas con pesos aleatorios, y dobla la entrada a 448 × 448, porque la detección requiere información visual de grano fino.

Hasta la capa 20, la red reduce la resolución cinco veces a la mitad (un factor 32); la convolución con paso 2 entre las capas añadidas aporta la sexta reducción.

```python
for entrada in [224, 448]:
    tras_capa_20 = entrada // 32
    print(entrada, tras_capa_20)
print(448 // 64)
```

```salida
224 7
448 14
7
```

> Nota: Las capas convolucionales aceptan cualquier tamaño de entrada porque sus parámetros no dependen de él (sesión 11). Por eso los pesos preentrenados a 224 se reutilizan a 448. Las capas conectadas, en cambio, dependen del tamaño del vector de entrada y se inicializan de nuevo.

# Fast YOLO

Fast YOLO usa una red con menos capas convolucionales, 9 en lugar de 24, y menos filtros en esas capas. Salvo el tamaño de la red, todos los parámetros de entrenamiento y prueba coinciden con los de YOLO.

```python
fps = {"YOLO": 45, "Fast YOLO": 155}
print(round(fps["Fast YOLO"] / fps["YOLO"], 2))
```

```salida
3.44
```

```verdadero-falso
# Enunciado
Fast YOLO usa una cuadrícula más gruesa que YOLO para ganar velocidad.

# Respuesta
falso

# Explicación
El artículo indica que la única diferencia es el tamaño de la red: 9 capas convolucionales en lugar de 24 y menos filtros. Los parámetros de entrenamiento y prueba son los mismos.

# Pista
Revisa qué cambia entre ambas versiones según la sección 2.1.
```

# Cierre

La red se preentrena como clasificador a 224 × 224 con 20 capas convolucionales y después se convierte en detector a 448 × 448 con cuatro convoluciones y dos capas conectadas nuevas. La sesión siguiente construye el tensor objetivo que la red aprende a predecir.
