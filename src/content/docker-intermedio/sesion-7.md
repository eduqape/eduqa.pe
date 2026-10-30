---
numero: 7
titulo: "Publicar la imagen"
---

# Sacarla de tu máquina

Una imagen construida en tu portátil no le sirve a nadie más. Para que un
servidor la ejecute hay que subirla a un **registro**, que es el almacén desde
el que se descargan.

El recorrido completo tiene cuatro pasos: `docker build` arma la imagen en tu
máquina, `docker push` la sube al registro capa por capa, el servidor la baja con
`docker pull` y `docker run` arranca el contenedor allí.

```escena
escena: docker-publicar
pie: La imagen se arma capa a capa en la PC, viaja al registro y de allí al servidor, donde arranca
```

Docker Hub es el público; en una empresa suele haber uno propio. Para probar,
el propio registro se ejecuta como contenedor.

```bash
docker run -d --name registro -p 5001:5000 registry:2
```

```salida
Unable to find image 'registry:2' locally
2: Pulling from library/registry
Status: Downloaded newer image for registry:2
```

> Doc: [Imagen oficial del registro](https://hub.docker.com/_/registry)

> Nota: El 5001 de fuera es para no chocar con el 5000, que en macOS suele estar
> ocupado por un servicio del sistema. Es el mismo motivo por el que en la
> sesión de volúmenes postgres se publicó en 55432.

```ejercicio
# Enunciado
Completa el puerto interno en el que escucha el registro.

# Plantilla
print(f"-p 5001:{___}")

# Esperado
-p 5001:5000

# Pista
Cinco mil.
```

# El nombre lleva la dirección

Para subir a un registro, el nombre de la imagen tiene que empezar por su
dirección. No es una opción del comando: es parte del nombre.

```bash
docker tag multi localhost:5001/api:1.0.0
docker push localhost:5001/api:1.0.0
```

```salida
f5c1a84d54e6: Pushed
1b7200988f19: Pushed
1.0.0: digest: sha256:765df74ad1434c4076938f648062497057609afb8f73c50ac77d056cb815e369 size: 856
```

> Doc: [docker push](https://docs.docker.com/reference/cli/docker/image/push/)

> Nota: Sube capa por capa, y solo las que el registro no tiene. Al publicar la
> siguiente versión de una imagen con la misma base, esas capas ya están allí y
> el envío es mucho más corto. Es la misma idea de compartir capas de la sesión
> 2 del curso de introducción, aplicada a la red.

```ejercicio
# Enunciado
Completa el subcomando que sube una imagen a un registro.

# Plantilla
print("docker " + "___" + " localhost:5001/api:1.0.0")

# Esperado
docker push localhost:5001/api:1.0.0

# Pista
Cuatro letras: «empujar» en inglés, lo contrario de pull.
```

# Qué hay dentro del registro

Un registro expone una API. Con dos peticiones se ve todo lo que guarda.

```bash
curl -s localhost:5001/v2/_catalog
curl -s localhost:5001/v2/api/tags/list
```

```salida
{"repositories":["api"]}
{"name":"api","tags":["1.0.0"]}
```

> Doc: [API del registro](https://distribution.github.io/distribution/spec/api/)

```ejercicio
# Enunciado
Completa la clave del JSON que lista los repositorios del registro.

# Plantilla
import json
r = json.loads('{"repositories": ["api"]}')
print(r["___"])

# Esperado
['api']

# Pista
El plural de «repositorio» en inglés.
```

# Cómo etiquetar

Una sola etiqueta no basta. Lo habitual es publicar la misma imagen con varias,
cada una con una promesa distinta.

```python
version = "1.4.2"
mayor, menor, parche = version.split(".")
etiquetas = [version, f"{mayor}.{menor}", mayor, "latest"]
for e in etiquetas:
    promesa = {
        version: "exactamente esta construcción",
        f"{mayor}.{menor}": "últimos parches de la 1.4",
        mayor: "última 1.x, puede traer funciones nuevas",
        "latest": "lo último, sin ninguna promesa",
    }[e]
    print(f"{e:8} {promesa}")
```

```salida
1.4.2    exactamente esta construcción
1.4      últimos parches de la 1.4
1        última 1.x, puede traer funciones nuevas
latest   lo último, sin ninguna promesa
```

> Nota: Un servidor de producción debería apuntar a la más específica que pueda
> permitirse, o directamente al digest. `latest` en producción significa que la
> versión que corre depende de cuándo se reinició el contenedor.

```ejercicio
# Enunciado
Completa el método que parte la versión por los puntos.

# Plantilla
print("1.4.2".___(".")[0])

# Esperado
1

# Pista
Cinco letras: «partir» en inglés.
```

# Descargar por digest

Un digest identifica el contenido y no se puede reasignar. Es lo que se usa
cuando se debe garantizar que corre exactamente lo que se probó.

```bash
docker pull localhost:5001/api@sha256:765df74ad1434c4076938f648062497057609afb8f73c50ac77d056cb815e369
```

```salida
Status: Downloaded newer image for localhost:5001/api@sha256:765df74a...
```

> Doc: [Descargar por digest](https://docs.docker.com/reference/cli/docker/image/pull/#pull-an-image-by-digest-immutable-identifier)

> Nota: La arroba sustituye a los dos puntos de la etiqueta. Es más incómodo de
> escribir y es la única forma de que dos despliegues del mismo texto den
> exactamente el mismo contenido.

```ejercicio
# Enunciado
Completa el carácter que separa el nombre del digest, en lugar de los dos puntos de una etiqueta.

# Plantilla
print("localhost:5001/api" + "___" + "sha256:765df74a")

# Esperado
localhost:5001/api@sha256:765df74a

# Pista
Una arroba.
```

# Cierre

El registro es el almacén y el nombre de la imagen lleva su dirección. Se sube
por capas, se etiqueta con varias precisiones a la vez, y para garantizar qué se
ejecuta se apunta al digest.

La sesión siguiente pone límites a lo que un contenedor puede consumir.
