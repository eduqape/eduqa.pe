---
numero: 11
titulo: "Convoluciones 3 × 3 y reducciones 1 × 1"
---

# Una convolución sobre un mapa de características

Una capa convolucional aplica el mismo filtro en cada posición de un mapa de características. Con un filtro de `k × k` sobre un mapa de `c_entrada` canales, cada posición de salida es la suma de los productos entre el filtro y la ventana de entrada, más un sesgo. La implementación siguiente, sin relleno y con paso 1, calcula un canal de salida.

```python
def convolucion(mapa, filtro, sesgo):
    alto, ancho, _ = mapa.shape
    k = filtro.shape[0]
    salida = np.zeros((alto - k + 1, ancho - k + 1))
    for i in range(alto - k + 1):
        for j in range(ancho - k + 1):
            ventana = mapa[i : i + k, j : j + k, :]
            salida[i, j] = np.sum(ventana * filtro) + sesgo
    return salida

mapa = np.ones((4, 4, 2))
filtro = np.ones((3, 3, 2))
print(convolucion(mapa, filtro, 0.0))
```

```salida
[[18. 18.]
 [18. 18.]]
```

> Nota: Con todo a uno, cada salida suma 3 · 3 · 2 = 18 productos. Ese valor sirve como comprobación de que la ventana recorre los dos canales.

# Contar los parámetros de una capa

Una capa convolucional con `c_salida` filtros de `k × k × c_entrada` tiene `k · k · c_entrada · c_salida` pesos y `c_salida` sesgos. El número de parámetros no depende del tamaño espacial del mapa.

```python
def parametros_conv(k, c_entrada, c_salida):
    return k * k * c_entrada * c_salida + c_salida

print(parametros_conv(7, 3, 64))
print(parametros_conv(3, 512, 1024))
```

```salida
9472
4719616
```

# La reducción 1 × 1

Una convolución 1 × 1 combina los canales de cada posición sin mirar a sus vecinas. Equivale a multiplicar el vector de canales de cada posición por la misma matriz. `np.einsum` expresa esa operación con índices: `hwc,cd->hwd`.

```python
rng = np.random.default_rng(1)
mapa = rng.normal(size=(4, 4, 3))
pesos = rng.normal(size=(3, 2))
reducido = np.einsum("hwc,cd->hwd", mapa, pesos)
print(reducido.shape)
print(np.allclose(reducido[1, 2], mapa[1, 2] @ pesos))
```

```salida
(4, 4, 2)
True
```

> Doc: [numpy.einsum](https://numpy.org/doc/stable/reference/generated/numpy.einsum.html)

# Por qué reducir antes de convolucionar

En el cuarto bloque de la figura 3, una reducción `1x1x256` precede a cada convolución `3x3x512` sobre un mapa de 512 canales. La reducción disminuye los canales que recibe la convolución 3 × 3 y, con ellos, los parámetros. La comparación se hace con una convolución 3 × 3 que recibe directamente los 512 canales.

```python
def parametros_conv(k, c_entrada, c_salida):
    return k * k * c_entrada * c_salida + c_salida

con_reduccion = parametros_conv(1, 512, 256) + parametros_conv(3, 256, 512)
sin_reduccion = parametros_conv(3, 512, 512)
print(con_reduccion, sin_reduccion)
print(round(con_reduccion / sin_reduccion, 3))
```

```salida
1311488 2359808
0.556
```

> Nota: El artículo atribuye el uso de reducciones 1 × 1 seguidas de convoluciones 3 × 3 a Lin et al. (*Network in Network*). La comparación anterior no forma parte del artículo: ilustra el efecto sobre el número de parámetros.

```ejercicio
# Enunciado
Completa el número de pesos de un filtro 1 × 1 que reduce 512 canales a uno solo, sin contar el sesgo.

# Plantilla
k, c_entrada = 1, 512
print(k * k * ___)

# Esperado
512

# Pista
Un filtro 1 × 1 tiene un peso por canal de entrada.
```

# Cierre

Una convolución aplica el mismo filtro en cada posición y una reducción 1 × 1 combina canales por posición con menos parámetros. La sesión siguiente añade la activación *leaky ReLU* y las dos capas totalmente conectadas.
