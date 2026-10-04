---
numero: 3
titulo: "Intersección sobre unión (IoU)"
---

# La intersección de dos cajas

La intersección de dos cajas alineadas con los ejes es otra caja. Su borde izquierdo es el mayor de los dos bordes izquierdos y su borde derecho, el menor de los dos bordes derechos; en el eje vertical se procede igual. Si el ancho o el alto resultantes son negativos, las cajas no se superponen y el área de la intersección es cero.

```python
def area_interseccion(a, b):
    ancho = min(a[2], b[2]) - max(a[0], b[0])
    alto = min(a[3], b[3]) - max(a[1], b[1])
    return max(0, ancho) * max(0, alto)

print(area_interseccion((0, 0, 4, 4), (2, 2, 6, 6)))
print(area_interseccion((0, 0, 2, 2), (3, 3, 5, 5)))
```

```salida
4
0
```

> Nota: `max(0, ancho)` evita que dos dimensiones negativas se multipliquen y produzcan un área positiva para cajas separadas.

# La unión de dos cajas

El área de la unión es la suma de las dos áreas menos la intersección. La intersección se resta porque, al sumar las dos áreas, la zona común se contó dos veces.

```python
def area(caja):
    return (caja[2] - caja[0]) * (caja[3] - caja[1])

a = (0, 0, 4, 4)
b = (2, 2, 6, 6)
print(area(a) + area(b) - 4)
```

```salida
28
```

# El cociente IoU

La intersección sobre unión (IoU, *intersection over union*) divide el área de la intersección entre el área de la unión. Vale 1 si las cajas coinciden y 0 si no se superponen.

```python
def iou(a, b):
    ancho = min(a[2], b[2]) - max(a[0], b[0])
    alto = min(a[3], b[3]) - max(a[1], b[1])
    interseccion = max(0, ancho) * max(0, alto)
    area_a = (a[2] - a[0]) * (a[3] - a[1])
    area_b = (b[2] - b[0]) * (b[3] - b[1])
    return interseccion / (area_a + area_b - interseccion)

print(iou((0, 0, 4, 4), (0, 0, 4, 4)))
print(round(iou((0, 0, 4, 4), (2, 2, 6, 6)), 4))
print(iou((0, 0, 2, 2), (3, 3, 5, 5)))
```

```salida
1.0
0.1429
0.0
```

```ejercicio
# Enunciado
Completa el denominador de IoU: la unión de las dos áreas.

# Plantilla
interseccion = 4
area_a = 16
area_b = 16
print(interseccion / (area_a + area_b - ___))

# Esperado
0.14285714285714285

# Pista
Es la zona que se contó dos veces al sumar las áreas.
```

# IoU dentro del artículo

IoU aparece en tres lugares del artículo. Define el objetivo de la confianza de cada caja (sesión 7), decide qué predictor es «responsable» de un objeto durante el entrenamiento (sesión 16) y clasifica las detecciones en el análisis de errores: una detección es correcta si su clase es correcta e IoU > 0.5 (sesión 19).

> Doc: [YOLO, secciones 2, 2.2 y 4.2](https://arxiv.org/abs/1506.02640)

```verdadero-falso
# Enunciado
Si IoU = 0.5, la caja predicha cubre exactamente la mitad de la caja real.

# Respuesta
falso

# Explicación
IoU divide la intersección entre la unión, no entre el área de la caja real. Dos cajas pueden tener IoU 0.5 con coberturas muy distintas de la caja real; por ejemplo, una caja predicha que contiene a la real y tiene el doble de su área cubre el 100 % de la real.

# Pista
Revisa qué área va en el denominador.
```

# Cierre

IoU resume en un número entre 0 y 1 cuánto coinciden dos cajas, y el artículo lo usa como objetivo, como criterio de asignación y como criterio de acierto. La sesión siguiente revisa cómo detectaban objetos los sistemas anteriores a YOLO.
