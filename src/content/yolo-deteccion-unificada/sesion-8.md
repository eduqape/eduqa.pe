---
numero: 8
titulo: "El tensor de salida 7 × 7 × 30"
---

# Contar las predicciones

Las predicciones de YOLO se codifican en un tensor de forma `S × S × (B · 5 + C)`. Con `S = 7`, `B = 2` y `C = 20`, la salida final es un tensor de 7 × 7 × 30.

> Doc: [YOLO, sección 2 y figura 2](https://arxiv.org/abs/1506.02640)

```python
S, B, C = 7, 2, 20
profundidad = B * 5 + C
print((S, S, profundidad))
print(S * S * profundidad)
```

```salida
(7, 7, 30)
1470
```

> Nota: La última capa de la red es totalmente conectada y produce 1470 números. Darles forma `(7, 7, 30)` no cambia los valores: solo fija cómo se interpretan.

# Elegir una disposición interna

El artículo fija la forma del tensor, no el orden de los 30 valores dentro de cada celda; las implementaciones pueden ordenarlos de maneras distintas. En este curso se usa esta disposición: las dos cajas primero, cada una como `[x, y, w, h, confianza]`, y después las 20 probabilidades de clase.

```python
disposicion = []
for caja in range(2):
    for nombre in ["x", "y", "w", "h", "conf"]:
        disposicion.append(f"{nombre}{caja}")
disposicion += [f"clase{i}" for i in range(20)]
print(disposicion[:10])
print(len(disposicion))
```

```salida
['x0', 'y0', 'w0', 'h0', 'conf0', 'x1', 'y1', 'w1', 'h1', 'conf1']
30
```

# Separar cajas y clases con cortes

Con esa disposición, los primeros diez valores de cada celda contienen las cajas y los veinte restantes, las clases. Un corte sobre el último eje separa ambos bloques y `reshape` agrupa las cajas de cinco en cinco.

```python
S, B, C = 7, 2, 20
salida = np.arange(S * S * (B * 5 + C), dtype=float).reshape(S, S, B * 5 + C)
cajas = salida[..., : B * 5].reshape(S, S, B, 5)
clases = salida[..., B * 5 :]
print(cajas.shape)
print(clases.shape)
```

```salida
(7, 7, 2, 5)
(7, 7, 20)
```

> Doc: [numpy.reshape](https://numpy.org/doc/stable/reference/generated/numpy.reshape.html)

> Nota: Los puntos suspensivos (`...`, *Ellipsis*) representan todos los ejes anteriores. `salida[..., :10]` equivale a `salida[:, :, :10]` en un tensor de tres ejes.

```ejercicio
# Enunciado
Completa la forma que agrupa las cajas de cada celda en dos filas de cinco valores.

# Plantilla
salida = np.zeros((7, 7, 30))
cajas = salida[..., :10].reshape(7, 7, 2, ___)
print(cajas.shape)

# Esperado
(7, 7, 2, 5)

# Pista
Cada caja consta de x, y, w, h y confianza.
```

# Leer una celda concreta

Indexar `cajas[fila, columna]` devuelve las dos cajas de esa celda; `cajas[fila, columna, :, 4]` devuelve sus dos confianzas.

```python
salida = np.zeros((7, 7, 30))
salida[2, 3, 0:5] = [0.12, 0.34, 0.45, 0.45, 0.80]
salida[2, 3, 5:10] = [0.50, 0.50, 0.10, 0.20, 0.05]
cajas = salida[..., :10].reshape(7, 7, 2, 5)
print(cajas[2, 3])
print(cajas[2, 3, :, 4])
```

```salida
[[0.12 0.34 0.45 0.45 0.8 ]
 [0.5  0.5  0.1  0.2  0.05]]
[0.8  0.05]
```

# Cierre

La red produce 1470 números que, con forma 7 × 7 × 30, contienen 98 cajas y 49 distribuciones de clase. La sesión siguiente combina confianzas y clases en las puntuaciones específicas de clase de la ecuación 1.
