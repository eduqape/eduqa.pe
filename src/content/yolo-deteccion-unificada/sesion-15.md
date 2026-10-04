---
numero: 15
titulo: "La pérdida I: suma de errores cuadrados y ponderaciones"
---

# Suma de errores cuadrados

YOLO optimiza la suma de errores cuadrados entre la salida del modelo y el objetivo. El artículo la elige porque es fácil de optimizar, y advierte que no se alinea perfectamente con el objetivo real, que es maximizar la precisión promedio (AP, *average precision*).

```python
prediccion = np.array([0.5, 0.2, 0.9])
objetivo = np.array([0.6, 0.0, 1.0])
print(round(np.sum((prediccion - objetivo) ** 2), 4))
```

```salida
0.06
```

> Doc: [YOLO, sección 2.2](https://arxiv.org/abs/1506.02640)

> Nota: La suma de errores cuadrados pondera igual el error de localización y el de clasificación, aunque ambos miden magnitudes distintas. Esa es la primera discrepancia con AP que señala el artículo.

# El desequilibrio de las celdas vacías

En cada imagen, muchas celdas no contienen ningún objeto. El objetivo de confianza de esas celdas es cero, y su gradiente puede dominar al de las pocas celdas con objeto. El artículo señala que esto puede volver inestable el modelo y hacer que el entrenamiento diverja al principio.

```python
S, B = 7, 2
objetos = 2
predictores = S * S * B
responsables = objetos
sin_objeto = predictores - responsables
print(predictores, responsables, sin_objeto)
```

```salida
98 2 96
```

> Nota: Aquí se cuentan como «sin objeto» todos los predictores que no son responsables de ningún objeto, incluidos los no responsables de una celda con objeto. Es la interpretación de `1noobj_ij` que se usa en el resto del curso.

Si cada predictor sin objeto conserva una confianza de 0.3, la suma de sus errores supera con amplitud el error de los dos predictores responsables.

```python
sin_objeto = 96
error_sin_objeto = sin_objeto * (0.3 - 0.0) ** 2
error_responsables = 2 * (0.7 - 0.9) ** 2
print(round(error_sin_objeto, 2), round(error_responsables, 2))
```

```salida
8.64 0.08
```

# Las ponderaciones λcoord y λnoobj

Para corregir el desequilibrio, el artículo aumenta la pérdida de las coordenadas y disminuye la de la confianza de las cajas sin objeto, con dos parámetros: `λcoord = 5` y `λnoobj = 0.5`.

```python
lambda_coord = 5.0
lambda_noobj = 0.5
error_sin_objeto = 96 * 0.3 ** 2
error_coordenadas = 0.1 ** 2 + 0.05 ** 2
print(round(lambda_noobj * error_sin_objeto, 2))
print(round(lambda_coord * error_coordenadas, 4))
```

```salida
4.32
0.0625
```

> Nota: `λ` es la letra griega lambda. Su subíndice indica el término al que se aplica: `coord` a las coordenadas y `noobj` (*no object*) a la confianza de los predictores sin objeto.

```opcion-multiple
# Enunciado
¿Por qué el artículo usa λnoobj = 0.5?

# Opciones
- Para que las cajas sin objeto no aparezcan en la salida
- Para reducir el peso de la confianza de los muchos predictores sin objeto frente a los pocos con objeto
- Para que la red prediga cajas más grandes
- Para normalizar las coordenadas entre 0 y 1

# Correcta
2

# Explicación
La mayoría de los predictores no corresponden a ningún objeto. Sin reducir su peso, su gradiente domina al de los predictores responsables y puede desestabilizar el entrenamiento.

# Pista
Compara cuántos predictores tienen objeto y cuántos no en una imagen típica.
```

# Cierre

La suma de errores cuadrados es simple, pero desequilibrada: las cajas sin objeto dominan y la localización pesa lo mismo que la clasificación. `λcoord` y `λnoobj` reequilibran esos términos. La sesión siguiente completa la pérdida con la raíz cuadrada del tamaño y el predictor responsable.
