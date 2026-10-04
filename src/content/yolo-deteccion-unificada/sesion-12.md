---
numero: 12
titulo: "Leaky ReLU y capas totalmente conectadas"
---

# La activación leaky ReLU

Todas las capas de YOLO, salvo la última, usan una unidad lineal rectificada con fuga (*leaky ReLU*, *leaky rectified linear unit*). La ecuación 2 del artículo la define así: `φ(x) = x` si `x > 0`, y `φ(x) = 0.1x` en otro caso.

```python
def leaky_relu(x):
    return np.where(x > 0, x, 0.1 * x)

print(leaky_relu(np.array([-2.0, 0.0, 3.0])))
```

```salida
[-0.2  0.   3. ]
```

> Doc: [YOLO, sección 2.2, ecuación 2](https://arxiv.org/abs/1506.02640)

> Doc: [numpy.where](https://numpy.org/doc/stable/reference/generated/numpy.where.html)

> Nota: A diferencia de ReLU, que anula los valores negativos, la pendiente 0.1 conserva un gradiente distinto de cero para entradas negativas. Una unidad que recibe solo entradas negativas sigue recibiendo actualizaciones.

```ejercicio
# Enunciado
Completa la pendiente que la ecuación 2 aplica a los valores negativos.

# Plantilla
x = np.array([-5.0, 2.0])
print(np.where(x > 0, x, ___ * x))

# Esperado
[-0.5  2. ]

# Pista
Un décimo.
```

# La última capa es lineal

La capa final usa una activación lineal: su salida es directamente la combinación de pesos y entradas. Las coordenadas, confianzas y probabilidades se leen de esos valores sin transformarlos.

```python
def lineal(x):
    return x

valores = np.array([-0.2, 0.4, 1.1])
print(lineal(valores))
```

```salida
[-0.2  0.4  1.1]
```

> Nota: Una activación lineal no acota la salida. Nada impide que la red prediga una confianza negativa o una probabilidad mayor que 1; la pérdida de errores cuadrados (sesión 15) penaliza esas desviaciones respecto del objetivo.

# Dos capas conectadas

El mapa final de 7 × 7 × 1024 se aplana a un vector de 50 176 valores. La primera capa conectada produce 4096 valores y la segunda, 1470, que se reorganizan como 7 × 7 × 30.

```python
entrada = 7 * 7 * 1024
oculta = 4096
salida = 7 * 7 * 30
parametros_1 = entrada * oculta + oculta
parametros_2 = oculta * salida + salida
print(entrada, salida)
print(parametros_1, parametros_2)
```

```salida
50176 1470
205524992 6022590
```

> Nota: La primera capa conectada concentra más de 200 millones de parámetros. Su conexión con todas las posiciones del mapa permite que cada predicción use información de la imagen completa, que es el razonamiento global que el artículo atribuye a YOLO.

# Del vector al tensor

Una multiplicación por matriz implementa una capa conectada. Las dimensiones se reducen en el ejemplo para ejecutarlo con rapidez; la estructura es la misma.

```python
rng = np.random.default_rng(2)
mapa = rng.normal(size=(7, 7, 8))
w1 = rng.normal(size=(7 * 7 * 8, 16)) * 0.05
w2 = rng.normal(size=(16, 7 * 7 * 30)) * 0.05
preactivacion = mapa.reshape(-1) @ w1
oculta = np.where(preactivacion > 0, preactivacion, 0.1 * preactivacion)
salida = (oculta @ w2).reshape(7, 7, 30)
print(oculta.shape, salida.shape)
```

```salida
(16,) (7, 7, 30)
```

# Cierre

Las capas ocultas usan *leaky ReLU*, la final es lineal y dos capas conectadas transforman el mapa de 7 × 7 × 1024 en 1470 predicciones. La sesión siguiente explica cómo se preentrena la red y en qué se diferencia Fast YOLO.
