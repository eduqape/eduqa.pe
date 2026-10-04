---
numero: 19
titulo: "Limitaciones, análisis de errores y comparación"
---

# Las limitaciones que declara el artículo

La sección 2.4 enumera cuatro limitaciones de YOLO:

- Cada celda predice solo dos cajas y una clase, lo que limita el número de objetos cercanos que el modelo puede detectar; los objetos pequeños en grupo, como las bandadas de aves, son el caso más difícil.
- Como aprende las cajas a partir de los datos, generaliza mal a objetos con proporciones o configuraciones nuevas o inusuales.
- Predice las cajas con características relativamente gruesas, porque la arquitectura reduce varias veces la resolución de la entrada.
- La pérdida trata igual los errores en cajas pequeñas y grandes, aunque un error pequeño afecta mucho más a la IoU de una caja pequeña.

El artículo concluye que su principal fuente de error son las localizaciones incorrectas.

> Doc: [YOLO, sección 2.4](https://arxiv.org/abs/1506.02640)

La primera limitación se cuantifica: una imagen produce como máximo 98 cajas, y las dos cajas de cada celda comparten la misma distribución de clases, de modo que solo hay 49 distribuciones de clase por imagen.

```python
S, B = 7, 2
print(S * S, S * S * B)
```

```salida
49 98
```

# Clasificar los errores

Para comparar YOLO con Fast R-CNN, el artículo usa la metodología de Hoiem et al.: para cada categoría se toman las `N` predicciones principales y cada una se clasifica como correcta o como un tipo de error.

- Correcta: clase correcta e IoU > 0.5.
- Localización: clase correcta y 0.1 < IoU < 0.5.
- Similar: clase similar e IoU > 0.1.
- Otro: clase incorrecta e IoU > 0.1.
- Fondo: IoU < 0.1 con cualquier objeto.

```python
def tipo_de_error(clase_correcta, clase_similar, iou):
    if iou < 0.1:
        return "fondo"
    if clase_correcta:
        return "correcta" if iou > 0.5 else "localización"
    return "similar" if clase_similar else "otro"

print(tipo_de_error(True, False, 0.72))
print(tipo_de_error(True, False, 0.30))
print(tipo_de_error(False, True, 0.40))
print(tipo_de_error(False, False, 0.20))
print(tipo_de_error(True, False, 0.05))
```

```salida
correcta
localización
similar
otro
fondo
```

> Doc: [YOLO, sección 4.2](https://arxiv.org/abs/1506.02640)

> Nota: Los criterios del artículo dejan sin asignar el caso límite IoU = 0.5 con clase correcta. La función lo trata como error de localización; es una decisión del ejemplo.

```relacionar
# Enunciado
Relaciona cada tipo de detección con su criterio en el análisis de errores.

# Pares
- Correcta => clase correcta e IoU > 0.5
- Localización => clase correcta y 0.1 < IoU < 0.5
- Similar => clase similar e IoU > 0.1
- Otro => clase incorrecta e IoU > 0.1
- Fondo => IoU < 0.1 con cualquier objeto

# Explicación
Los criterios combinan dos preguntas: si la clase es correcta, similar o incorrecta, y cuánto se superpone la caja con un objeto real.

# Pista
Fondo es el único criterio que no depende de la clase.
```

# Comparar los perfiles de error

![Análisis de errores: Fast R-CNN frente a YOLO](/cursos/yolo-deteccion-unificada/imagenes/figura-4-analisis-errores.png)

La figura 4 promedia los tipos de error en las 20 clases de VOC 2007. YOLO comete más errores de localización; Fast R-CNN, muchos más errores de fondo.

```python
fast_rcnn = {"correcta": 71.6, "localización": 8.6, "similar": 4.3,
             "otro": 1.9, "fondo": 13.6}
yolo = {"correcta": 65.5, "localización": 19.0, "similar": 6.75,
        "otro": 4.0, "fondo": 4.75}
print(round(fast_rcnn["fondo"] / yolo["fondo"], 2))
otros_errores_yolo = yolo["similar"] + yolo["otro"] + yolo["fondo"]
print(yolo["localización"], round(otros_errores_yolo, 2))
```

```salida
2.86
19.0 15.5
```

> Nota: El primer valor respalda la afirmación del artículo de que Fast R-CNN tiene casi 3 veces más probabilidad de predecir detecciones de fondo. El segundo, que en YOLO los errores de localización superan a todas las demás fuentes de error juntas.

# Velocidad frente a precisión

La tabla 1 compara detectores en PASCAL VOC 2007. Fast YOLO alcanza 52.7 % de mAP a 155 FPS y YOLO, 63.4 % a 45 FPS. Fast R-CNN llega a 70.0 % a 0.5 FPS.

```python
detectores = [
    ("100Hz DPM", 16.0, 100),
    ("30Hz DPM", 26.1, 30),
    ("Fast YOLO", 52.7, 155),
    ("YOLO", 63.4, 45),
    ("Fast R-CNN", 70.0, 0.5),
    ("Faster R-CNN VGG-16", 73.2, 7),
]
tiempo_real = [nombre for nombre, _, fps in detectores if fps >= 30]
print(tiempo_real)
mejor_tiempo_real = max((m, n) for n, m, fps in detectores if fps >= 30)
print(mejor_tiempo_real)
```

```salida
['100Hz DPM', '30Hz DPM', 'Fast YOLO', 'YOLO']
(63.4, 'YOLO')
```

> Doc: [YOLO, sección 4.1 y tabla 1](https://arxiv.org/abs/1506.02640)

# Combinar Fast R-CNN y YOLO

Como YOLO y Fast R-CNN cometen errores distintos, YOLO sirve para corregir las detecciones de fondo de Fast R-CNN: cada caja de Fast R-CNN que coincide con una caja similar de YOLO recibe un aumento según la probabilidad de YOLO y la superposición. El mejor Fast R-CNN pasa de 71.8 % a 75.0 % de mAP en VOC 2007; combinarlo con otras versiones de Fast R-CNN solo aporta entre 0.3 y 0.6 puntos.

```python
base = 71.8
combinaciones = {"Fast R-CNN (2007 data)": 72.4, "Fast R-CNN (VGG-M)": 72.4,
                 "Fast R-CNN (CaffeNet)": 72.1, "YOLO": 75.0}
for nombre, map_combinado in combinaciones.items():
    print(nombre, round(map_combinado - base, 1))
```

```salida
Fast R-CNN (2007 data) 0.6
Fast R-CNN (VGG-M) 0.6
Fast R-CNN (CaffeNet) 0.3
YOLO 3.2
```

> Nota: La ganancia no procede solo de combinar modelos: otras versiones de Fast R-CNN apenas mejoran el resultado. Procede de que YOLO comete otros tipos de error. La combinación no hereda la velocidad de YOLO, porque ambos modelos se ejecutan por separado.

# Cierre

YOLO localiza peor que Fast R-CNN, pero confunde mucho menos el fondo con objetos, y esa diferencia es útil al combinarlos. La sesión final estudia cómo generaliza YOLO a obras de arte y reúne el pipeline completo en un proyecto.
