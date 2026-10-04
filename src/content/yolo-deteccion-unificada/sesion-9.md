---
numero: 9
titulo: "Puntuaciones específicas de clase"
---

# La ecuación 1

En prueba, YOLO multiplica las probabilidades condicionales de clase por la confianza de cada caja:

`Pr(Class_i | Object) · Pr(Object) · IoU = Pr(Class_i) · IoU`

El resultado es una puntuación específica de clase para cada caja. Esa puntuación codifica a la vez la probabilidad de que la clase aparezca en la caja y qué tan bien ajusta la caja al objeto.

> Doc: [YOLO, sección 2, ecuación 1](https://arxiv.org/abs/1506.02640)

```python
probabilidad_clase = 0.8
confianza = 0.6
print(round(probabilidad_clase * confianza, 2))
```

```salida
0.48
```

# Multiplicar con difusión

Las confianzas tienen forma `(7, 7, 2)` y las clases, `(7, 7, 20)`. Añadir un eje a cada una permite que la difusión (*broadcasting*) de NumPy produzca una puntuación por celda, caja y clase: forma `(7, 7, 2, 20)`.

```python
rng = np.random.default_rng(0)
confianzas = rng.random((7, 7, 2))
clases = rng.random((7, 7, 20))
puntuaciones = confianzas[..., :, None] * clases[..., None, :]
print(puntuaciones.shape)
```

```salida
(7, 7, 2, 20)
```

> Doc: [Broadcasting en NumPy](https://numpy.org/doc/stable/user/basics.broadcasting.html)

> Nota: `None` en un índice inserta un eje de longitud 1. `confianzas[..., :, None]` tiene forma `(7, 7, 2, 1)` y `clases[..., None, :]`, `(7, 7, 1, 20)`; la difusión expande ambos ejes de longitud 1.

# Aplanar a 98 cajas

Para filtrar y ordenar resulta más cómodo trabajar con una fila por caja. Las 7 · 7 · 2 = 98 cajas pasan a una matriz de forma `(98, 20)`.

```python
puntuaciones = np.zeros((7, 7, 2, 20))
por_caja = puntuaciones.reshape(-1, 20)
print(por_caja.shape)
```

```salida
(98, 20)
```

> Nota: `-1` en `reshape` indica a NumPy que calcule esa dimensión a partir del total de elementos.

```ejercicio
# Enunciado
Completa el número de cajas que predice YOLO por imagen en PASCAL VOC.

# Plantilla
S, B = 7, 2
cajas = ___
print(cajas == S * S * B)

# Esperado
True

# Pista
La sección 2.3 lo indica: siete por siete celdas, dos cajas por celda.
```

# Aplicar un umbral

La figura 1 del artículo describe el último paso como un umbral sobre la confianza de las detecciones. El artículo no publica el valor del umbral; este curso usa 0.2 como valor de práctica.

```python
puntuaciones = np.array([
    [0.05, 0.64, 0.01],
    [0.30, 0.02, 0.10],
    [0.01, 0.03, 0.15],
])
umbral = 0.2
cajas, clases = np.nonzero(puntuaciones > umbral)
print(list(zip(cajas.tolist(), clases.tolist())))
```

```salida
[(0, 1), (1, 0)]
```

> Doc: [numpy.nonzero](https://numpy.org/doc/stable/reference/generated/numpy.nonzero.html)

```opcion-multiple
# Enunciado
¿Qué mide la puntuación específica de clase de la ecuación 1?

# Opciones
- Solo la probabilidad de que la celda contenga un objeto
- Solo la calidad geométrica de la caja
- La probabilidad de la clase en la caja y el ajuste de la caja al objeto
- La fracción de la imagen que ocupa la caja

# Correcta
3

# Explicación
El producto Pr(Class_i) · IoU reúne la probabilidad de la clase y la calidad de la caja. Una caja con clase probable pero mal ajustada recibe una puntuación baja.

# Pista
Fíjate en los dos factores del lado derecho de la ecuación.
```

# Cierre

La ecuación 1 convierte 98 cajas y 49 distribuciones de clase en 98 × 20 puntuaciones, que se filtran con un umbral. La sesión siguiente examina la red convolucional que produce esas predicciones.
