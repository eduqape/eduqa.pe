---
numero: 2
titulo: "Coordenadas de una caja delimitadora"
---

# Esquinas: (x1, y1, x2, y2)

Una caja delimitadora alineada con los ejes se describe con su esquina superior izquierda `(x1, y1)` y su esquina inferior derecha `(x2, y2)`. En imágenes, el origen está en la esquina superior izquierda: `x` crece hacia la derecha e `y` crece hacia abajo. El ancho es `x2 - x1` y el alto, `y2 - y1`.

```python
caja = (100, 50, 300, 250)
x1, y1, x2, y2 = caja
ancho = x2 - x1
alto = y2 - y1
print(ancho, alto, ancho * alto)
```

```salida
200 200 40000
```

> Nota: Que `y` crezca hacia abajo invierte la convención habitual del plano cartesiano. Una caja con `y2 < y1` no es una caja «hacia arriba»: es una caja mal formada.

# Centro, ancho y alto: (cx, cy, w, h)

YOLO no predice esquinas. Cada caja se expresa con su centro `(cx, cy)`, su ancho `w` y su alto `h`.[1] El centro es el punto medio de las esquinas en cada eje.

```python
def esquinas_a_centro(caja):
    x1, y1, x2, y2 = caja
    return ((x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1)

print(esquinas_a_centro((100, 50, 300, 250)))
```

```salida
(200.0, 150.0, 200, 200)
```

> Doc: [YOLO, sección 2](https://arxiv.org/abs/1506.02640)

# De centro a esquinas

La conversión inversa resta y suma la mitad del ancho y del alto. Convertir y volver a convertir debe devolver la caja original; esa comprobación detecta errores de signo antes de que lleguen a la pérdida o a la evaluación.

```python
def centro_a_esquinas(caja):
    cx, cy, w, h = caja
    return (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)

print(centro_a_esquinas((200.0, 150.0, 200, 200)))
```

```salida
(100.0, 50.0, 300.0, 250.0)
```

```ejercicio
# Enunciado
Completa la coordenada `x1` de la conversión desde centro, ancho y alto.

# Plantilla
cx, cy, w, h = 200.0, 150.0, 80.0, 40.0
x1 = cx - ___ / 2
print(x1)

# Esperado
160.0

# Pista
La esquina izquierda está a medio ancho del centro.
```

# Normalizar por el tamaño de la imagen

Las coordenadas en píxeles dependen de la resolución. Dividir `cx` y `w` entre el ancho de la imagen, y `cy` y `h` entre su alto, produce valores entre 0 y 1 que no cambian al redimensionar la imagen. El artículo normaliza el ancho y el alto de cada caja por el ancho y el alto de la imagen.[2]

```python
ancho_imagen, alto_imagen = 448, 448
cx, cy, w, h = 200.0, 150.0, 200.0, 200.0
normalizada = (cx / ancho_imagen, cy / alto_imagen,
               w / ancho_imagen, h / alto_imagen)
print([round(v, 4) for v in normalizada])
```

```salida
[0.4464, 0.3348, 0.4464, 0.4464]
```

> Nota: Al redimensionar una imagen rectangular a 448 × 448, cada eje se escala con un factor distinto. Las coordenadas normalizadas absorben esa deformación: una caja que ocupa la mitad del ancho sigue ocupando la mitad del ancho.

# Cierre

Una caja se describe con esquinas o con centro, ancho y alto, y ambas formas se convierten entre sí sin pérdida. La normalización la independiza de la resolución. La sesión siguiente mide cuánto se parecen dos cajas: la intersección sobre unión.

[1] En la sección 2, cada caja consta de cinco predicciones: `x`, `y`, `w`, `h` y la confianza.

[2] La sección 2.2 indica que el ancho y el alto se normalizan para quedar entre 0 y 1. Las coordenadas `x` e `y` se expresan respecto de una celda; ese detalle se estudia en la sesión 6.
