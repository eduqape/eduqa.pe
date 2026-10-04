---
numero: 4
titulo: "Detectores anteriores: ventanas deslizantes y propuestas de regiones"
---

# Reutilizar un clasificador para detectar

Antes de YOLO, los sistemas de detección reutilizaban clasificadores. Para detectar un objeto, evaluaban un clasificador de ese objeto en distintas posiciones y escalas de la imagen de prueba. El artículo describe dos familias: las ventanas deslizantes y las propuestas de regiones.

> Doc: [YOLO, secciones 1 y 3](https://arxiv.org/abs/1506.02640)

# Ventanas deslizantes

Los modelos de partes deformables (DPM, *deformable parts models*) recorren la imagen con una ventana a intervalos regulares y evalúan el clasificador en cada posición. El número de posiciones de una ventana de lado `k` que avanza `s` píxeles sobre una imagen de lado `n` es `(n - k) // s + 1` por eje.

```python
def posiciones(n, k, s):
    por_eje = (n - k) // s + 1
    return por_eje * por_eje

print(posiciones(448, 64, 8))
```

```salida
2401
```

> Nota: El operador `//` es la división entera: descarta la parte fraccionaria. Una ventana que no cabe completa al final del eje no se evalúa.

Una sola escala no basta, porque los objetos aparecen con tamaños distintos. Repetir el recorrido con varios tamaños de ventana multiplica las evaluaciones del clasificador.

```python
def posiciones(n, k, s):
    por_eje = (n - k) // s + 1
    return por_eje * por_eje

total = 0
for lado in [64, 128, 256]:
    total += posiciones(448, lado, 8)
print(total)
```

```salida
4707
```

# Propuestas de regiones: R-CNN

R-CNN (*regions with CNN features*, regiones con características de una red neuronal convolucional) reemplaza la ventana deslizante por propuestas de regiones. Selective Search genera cajas candidatas, una red convolucional extrae características, una máquina de vectores de soporte (SVM, *support vector machine*) puntúa cada caja, un modelo lineal ajusta sus coordenadas y la supresión de no máximos elimina duplicados.

Cada etapa se ajusta por separado y el sistema completo tarda más de 40 segundos por imagen en prueba, según el artículo.

```python
etapas = [
    "Selective Search propone regiones",
    "la CNN extrae características",
    "la SVM puntúa cada región",
    "un modelo lineal ajusta las cajas",
    "la supresión de no máximos elimina duplicados",
]
for numero, etapa in enumerate(etapas, start=1):
    print(numero, etapa)
```

```salida
1 Selective Search propone regiones
2 la CNN extrae características
3 la SVM puntúa cada región
4 un modelo lineal ajusta las cajas
5 la supresión de no máximos elimina duplicados
```

> Doc: [enumerate()](https://docs.python.org/3/library/functions.html#enumerate)

```ordenar
# Enunciado
Ordena las etapas del pipeline de R-CNN tal como las describe el artículo de YOLO.

# Elementos
- Una SVM puntúa cada región
- La supresión de no máximos elimina duplicados
- Selective Search propone regiones
- Un modelo lineal ajusta las cajas
- Una red convolucional extrae características

# Orden
3, 5, 1, 4, 2

# Explicación
Primero se generan las regiones candidatas; después se extraen sus características, se puntúan, se ajustan sus coordenadas y, al final, se eliminan las detecciones duplicadas.

# Pista
No se puede puntuar una región que todavía no existe.
```

# Un solo pase y menos cajas

YOLO conserva una idea de R-CNN: cada celda de una cuadrícula propone cajas y las puntúa con características convolucionales. La diferencia es que las cajas se restringen espacialmente a su celda y todo se calcula en una red optimizada en conjunto. YOLO propone 98 cajas por imagen frente a unas 2000 de Selective Search.

```python
cajas_yolo = 98
cajas_selective_search = 2000
print(round(cajas_selective_search / cajas_yolo, 1))
```

```salida
20.4
```

> Nota: Las 98 cajas proceden de una cuadrícula de 7 × 7 celdas con 2 cajas por celda. La sesión siguiente construye esa cuadrícula.

# Cierre

Las ventanas deslizantes y las propuestas de regiones evalúan un clasificador muchas veces y encadenan etapas entrenadas por separado. YOLO sustituye ese pipeline por una sola red. La sesión siguiente introduce la cuadrícula S × S, la base del modelo.
