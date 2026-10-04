---
numero: 6
titulo: "Qué predice cada celda: B cajas"
---

# Cinco números por caja

Cada celda predice `B` cajas. Cada caja consta de cinco predicciones: `x`, `y`, `w`, `h` y la confianza. En PASCAL VOC, el artículo usa `B = 2`.

- `(x, y)` es el centro de la caja expresado respecto de los límites de la celda.
- `w` y `h` son el ancho y el alto expresados respecto de la imagen completa.

> Doc: [YOLO, secciones 2 y 2.2](https://arxiv.org/abs/1506.02640)

```python
B = 2
valores_por_caja = 5
print(B * valores_por_caja)
```

```salida
10
```

# Codificar el centro respecto de la celda

Con el centro normalizado entre 0 y 1, `cx * S` indica la posición en unidades de celda. La parte entera es la columna y la parte fraccionaria es el desplazamiento `x` dentro de la celda; en el eje vertical se procede igual. Por construcción, `x` e `y` quedan entre 0 y 1.

```python
S = 7
cx, cy = 0.4464, 0.3348
columna = int(cx * S)
fila = int(cy * S)
x = cx * S - columna
y = cy * S - fila
print(fila, columna)
print(round(x, 4), round(y, 4))
```

```salida
2 3
0.1248 0.3436
```

> Nota: El artículo describe `x` e `y` como desplazamientos (*offsets*) de la posición de una celda concreta. Así, la misma caja produce valores distintos según la celda desde la que se exprese, y solo la celda responsable la codifica.

# Ancho y alto respecto de la imagen

El ancho y el alto no se expresan respecto de la celda: se normalizan por el ancho y el alto de la imagen. Una caja puede ser mucho mayor que la celda que la predice.

```python
ancho_imagen = 448
w_pixeles = 200
w = w_pixeles / ancho_imagen
print(round(w, 4))
print(w > 1 / 7)
```

```salida
0.4464
True
```

# Decodificar una predicción

La decodificación invierte la codificación: el centro normalizado es `(columna + x) / S` y `(fila + y) / S`. Codificar y decodificar debe devolver el centro original.

```python
S = 7
fila, columna = 2, 3
x, y = 0.1248, 0.3436
cx = (columna + x) / S
cy = (fila + y) / S
print(round(cx, 4), round(cy, 4))
```

```salida
0.4464 0.3348
```

```ejercicio
# Enunciado
Completa la decodificación de la coordenada `cx` a partir de la columna y el desplazamiento.

# Plantilla
S = 7
columna, x = 3, 0.5
cx = (___ + x) / S
print(cx)

# Esperado
0.5

# Pista
El desplazamiento se suma a la posición entera de la celda en el eje horizontal.
```

# Cierre

Cada celda predice B cajas de cinco números: un centro relativo a la celda, un tamaño relativo a la imagen y una confianza. La sesión siguiente define qué significa esa confianza y añade las probabilidades de clase.
