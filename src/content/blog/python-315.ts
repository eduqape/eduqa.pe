import { minutosDeLectura, type ArticuloBlog } from "@/lib/blog-types";

/*
 * Todas las salidas de este artículo se obtuvieron ejecutando cada bloque en
 * Python 3.15.0rc3, compilado desde el código fuente oficial de python.org el
 * 3 de octubre de 2026. Las del contraste con versiones anteriores, en Python
 * 3.14.8 y 3.13.5. Ninguna se escribió a mano (LINEAMIENTOS.md, sección 5).
 */
const contenido = `
<p class="lead"><strong>Python 3.15 tenía fecha: el 1 de octubre. No salió.</strong> El 2 de octubre el equipo publicó una tercera versión candidata que no estaba en el calendario, porque a última hora aparecieron fallos bloqueantes en la novedad más esperada de la versión: los imports diferidos con la palabra <code>lazy</code>. La versión final quedó para el <strong>viernes 9 de octubre</strong>.</p>

<p>Esa semana de margen es la mejor oportunidad para probar tu código antes de que la 3.15 llegue a los servidores y a las imágenes de Docker. Este artículo recorre lo que trae, con ejemplos ejecutados en la versión candidata, y señala el cambio que más código puede romper. No es el más vistoso: está en la sección 3.</p>

<aside>
  <p><strong>En 30 segundos.</strong> <code>lazy import</code> retrasa la carga de un módulo hasta su primer uso y acelera el arranque, pero también retrasa sus errores. UTF-8 pasa a ser la codificación por defecto al leer y escribir archivos, en todos los sistemas. Llegan dos tipos nuevos, <code>frozendict</code> y <code>sentinel</code>, se puede desempaquetar dentro de una comprensión, y un perfilador nuevo, Tachyon, señala la línea exacta donde se va el tiempo.</p>
</aside>

<nav aria-label="Índice del artículo">
  <ol>
    <li><a href="#retraso">Por qué no salió el 1 de octubre</a></li>
    <li><a href="#lazy">lazy import</a></li>
    <li><a href="#utf8">UTF-8 por defecto</a></li>
    <li><a href="#frozendict">frozendict</a></li>
    <li><a href="#sentinel">sentinel</a></li>
    <li><a href="#comprensiones">Desempaquetar en comprensiones</a></li>
    <li><a href="#tachyon">Tachyon</a></li>
    <li><a href="#jit">El JIT</a></li>
    <li><a href="#probar">Cómo probarlo esta semana</a></li>
    <li><a href="#repaso">Ponte a prueba</a></li>
  </ol>
</nav>

<h2 id="retraso">1. Por qué Python 3.15 no salió el 1 de octubre</h2>

<p>CPython, la implementación de referencia de Python, publica una versión mayor cada año en octubre. Antes de la final hay versiones alfa, beta y candidatas (<em>release candidates</em>, abreviadas <code>rc</code>). Una candidata es, en principio, la versión final salvo que aparezca un fallo grave.</p>

<p>Eso ocurrió con la 3.15. El <a href="https://blog.python.org/2026/10/python-3150-rc3/" target="_blank" rel="noopener noreferrer">anuncio de la 3.15.0rc3</a>, firmado por el responsable de la versión, Hugo van Kemenade, explica que aparecieron fallos bloqueantes de última hora en los imports diferidos y que se pospuso la final para poder probar las correcciones. Desde la rc2, la rc3 reúne unas 156 correcciones de errores, mejoras de compilación y cambios de documentación, aportados por 82 personas.</p>

<p>No es una anomalía. El anuncio en el foro de desarrollo lo presenta como una tradición reciente: la 3.12, la 3.13 y la 3.14 también tuvieron una candidata adicional o un retraso de última hora.</p>

<p>Para quien mantiene un paquete hay un dato práctico en el mismo anuncio: desde la rc3 no habrá más cambios en la ABI (<em>application binary interface</em>, la interfaz binaria que usan las extensiones compiladas). Una <em>wheel</em> compilada contra la rc3 funcionará con la 3.15.0 final.</p>

<h2 id="lazy">2. <code>lazy import</code>: cargar un módulo solo cuando se usa</h2>

<p>Un <code>import</code> normal ejecuta el módulo completo en el momento en que Python lee esa línea, se use o no después. En un programa de línea de comandos que importa veinte módulos para atender diez subcomandos, cada ejecución paga la carga de los veinte aunque el subcomando elegido use dos.</p>

<p>El <a href="https://peps.python.org/pep-0810/" target="_blank" rel="noopener noreferrer">PEP 810</a> (un PEP, <em>Python Enhancement Proposal</em>, es el documento con el que se propone y aprueba un cambio al lenguaje) añade la palabra <code>lazy</code> delante de <code>import</code>. El nombre queda definido de inmediato, pero el módulo se carga en el primer acceso a uno de sus atributos.</p>

<pre><code>import sys

lazy import json

print("¿json cargado?", "json" in sys.modules)
print(type(globals()["json"]).__name__)

texto = json.dumps({"curso": "python", "sesiones": 12})

print("¿json cargado?", "json" in sys.modules)
print(texto)</code></pre>

<pre class="salida"><code>¿json cargado? False
lazy_import
¿json cargado? True
{"curso": "python", "sesiones": 12}</code></pre>

<p><code>sys.modules</code> es el diccionario donde Python registra cada módulo ya cargado. Antes del primer uso, <code>json</code> no está ahí y el nombre <code>json</code> apunta a un objeto intermedio de tipo <code>lazy_import</code>. La llamada a <code>json.dumps()</code> dispara la carga y, desde ese momento, el nombre apunta al módulo real.</p>

<p>El caso que justifica la novedad es un programa que solo usa una parte de lo que importa:</p>

<pre><code>import sys

lazy import asyncio
lazy import decimal
lazy import sqlite3


def total_con_igv(monto: str) -&gt; str:
    precio = decimal.Decimal(monto)
    return str(precio * decimal.Decimal("1.18"))


print(total_con_igv("100.00"))
for modulo in ("asyncio", "decimal", "sqlite3"):
    print(modulo, modulo in sys.modules)</code></pre>

<pre class="salida"><code>118.0000
asyncio False
decimal True
sqlite3 False</code></pre>

<p>Esta ejecución solo calculó un precio con el IGV (impuesto general a las ventas) del 18 %, así que solo se cargó <code>decimal</code>. <code>asyncio</code> y <code>sqlite3</code> no llegaron a ejecutarse.</p>

<h3>La trampa: los errores también se retrasan</h3>

<p>Si el import diferido falla, el fallo no aparece en la línea del <code>import</code>. Aparece en el primer uso, que puede estar en otro archivo y ocurrir minutos después del arranque:</p>

<pre><code>lazy import pandsa  # error de tecleo: el paquete es pandas

print("El programa arrancó sin errores")


def cargar_notas():
    return pandsa.read_csv("notas.csv")


cargar_notas()</code></pre>

<pre class="salida"><code>El programa arrancó sin errores
Traceback (most recent call last):
  File "/w/trampa.py", line 1, in &lt;module&gt;
    lazy import pandsa  # error de tecleo: el paquete es pandas
ImportError: lazy import of 'pandsa' raised an exception during resolution

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/w/trampa.py", line 10, in &lt;module&gt;
    cargar_notas()
    ~~~~~~~~~~~~^^
  File "/w/trampa.py", line 7, in cargar_notas
    return pandsa.read_csv("notas.csv")
           ^^^^^^
ModuleNotFoundError: No module named 'pandsa'</code></pre>

<p>La traza sí señala las dos líneas, la del import y la del uso. El problema es de tiempo: un servicio web con <code>lazy</code> puede arrancar, pasar la comprobación de salud y fallar con la primera petición que toque ese módulo. Lo mismo ocurre con un módulo que tiene efectos al cargarse: su código se ejecuta en el primer uso, no al arrancar.</p>

<pre><code># configuracion.py
print("   (se ejecuta configuracion.py)")
ZONA_HORARIA = "America/Lima"</code></pre>

<pre><code>lazy import configuracion

print("1. Arranca el programa")
print("2. Lee el valor:", configuracion.ZONA_HORARIA)</code></pre>

<pre class="salida"><code>1. Arranca el programa
   (se ejecuta configuracion.py)
2. Lee el valor: America/Lima</code></pre>

<details>
  <summary>Nota técnica: dónde se permite <code>lazy</code> y cómo activarlo para todo</summary>
  <p><code>lazy</code> es una palabra clave suave (<em>soft keyword</em>): solo tiene ese significado delante de <code>import</code> o <code>from</code>. Una variable llamada <code>lazy</code> sigue funcionando; <code>lazy = 3; print(lazy * 2)</code> imprime <code>6</code>.</p>
  <p>Solo se admite en el nivel superior del módulo. Dentro de una función, la 3.15.0rc3 responde <code>SyntaxError: lazy import not allowed inside functions</code>, y con un import de todos los nombres, <code>SyntaxError: lazy from ... import * is not allowed</code>.</p>
  <p>La opción <code>-X lazy_imports=all</code> (o la variable de entorno <code>PYTHON_LAZY_IMPORTS</code>) vuelve diferidos todos los imports de nivel superior sin tocar el código. En la rc3 los valores aceptados son <code>all</code> y <code>normal</code>; <code>normal</code> es el comportamiento por defecto, en el que solo se difieren los marcados con <code>lazy</code>. Ver <a href="https://docs.python.org/3.15/whatsnew/3.15.html" target="_blank" rel="noopener noreferrer">What's New in Python 3.15</a>.</p>
</details>

<p><strong>Qué hacer con esto:</strong> usa <code>lazy</code> en los módulos pesados de un programa de línea de comandos, donde el arranque se nota, y deja los imports normales en servicios de larga duración, donde prefieres que un error de instalación aparezca al desplegar y no con el primer usuario.</p>

<h2 id="utf8">3. UTF-8 por defecto: el cambio que sí puede romper código</h2>

<p>Hasta la 3.14, <code>open()</code> sin el argumento <code>encoding</code> usaba la codificación regional del sistema operativo. En Linux y macOS casi siempre es UTF-8; en Windows, con frecuencia, una página de códigos como <code>cp1252</code>. Por eso un script que escribe «Ñandú» funcionaba en una laptop con Linux y producía caracteres ilegibles, o un <code>UnicodeDecodeError</code>, en la de un compañero con Windows.</p>

<p>El <a href="https://peps.python.org/pep-0686/" target="_blank" rel="noopener noreferrer">PEP 686</a> activa el modo UTF-8 por defecto: la codificación por omisión pasa a ser UTF-8 en todos los sistemas. Se comprueba con dos valores:</p>

<pre><code>import io
import sys

print(sys.flags.utf8_mode)
print(io.text_encoding(None))</code></pre>

<pre class="salida"><code>1
utf-8</code></pre>

<p><code>sys.flags.utf8_mode</code> vale <code>1</code> cuando el modo está activo, y <code>io.text_encoding(None)</code> devuelve la codificación que usará <code>open()</code> si no se le indica otra. Con la variable de entorno <code>PYTHONUTF8=0</code>, o con la opción <code>-X utf8=0</code>, el mismo script imprime <code>0</code> y <code>locale</code>: se vuelve al comportamiento anterior.</p>

<p>El código que se rompe es el que dependía, sin decirlo, de la codificación regional. El caso típico es un sistema en Windows que lee archivos CSV exportados por Excel en <code>cp1252</code>: en la 3.15, el mismo <code>open("ventas.csv")</code> intentará leerlos como UTF-8.</p>

<p>Para encontrar esas llamadas antes de que fallen existe la opción <code>-X warn_default_encoding</code>, que emite un aviso por cada <code>open()</code> sin <code>encoding</code>:</p>

<pre><code>with open("notas.txt", "w") as archivo:
    archivo.write("Ñandú: 17\\n")</code></pre>

<pre class="salida"><code>/w/enc.py:1: EncodingWarning: 'encoding' argument not specified
  with open("notas.txt", "w") as archivo:</code></pre>

<p><strong>Qué hacer con esto:</strong> ejecuta tus pruebas con <code>-X warn_default_encoding</code> y escribe la codificación de forma explícita en cada <code>open()</code> que lea datos de fuera de tu programa: <code>encoding="utf-8"</code> si los generas tú, y la codificación real del archivo, por ejemplo <code>encoding="cp1252"</code>, si vienen de otro sistema.</p>

<h2 id="frozendict">4. <code>frozendict</code>: un diccionario que se puede usar como clave</h2>

<p>Python tenía una versión inmutable de la lista (la tupla) y del conjunto (<code>frozenset</code>), pero no del diccionario. El <a href="https://peps.python.org/pep-0814/" target="_blank" rel="noopener noreferrer">PEP 814</a> añade <code>frozendict</code> como tipo incorporado: no admite cambios después de creado y, si sus claves y valores son <em>hashables</em>, también lo es él.</p>

<pre><code>config = frozendict(motor="sqlite", tiempo_espera=30)

try:
    config["motor"] = "postgres"
except TypeError as error:
    print(error)

print(config == frozendict(tiempo_espera=30, motor="sqlite"))
print(config == {"motor": "sqlite", "tiempo_espera": 30})

conexiones = {config: "pool-1"}
print(conexiones[frozendict(tiempo_espera=30, motor="sqlite")])</code></pre>

<pre class="salida"><code>'frozendict' object does not support item assignment
True
True
pool-1</code></pre>

<p>La comparación ignora el orden de inserción, igual que en <code>dict</code>, y un <code>frozendict</code> es igual a un <code>dict</code> con el mismo contenido. Lo nuevo es la última línea: un diccionario de configuración funciona como clave de otro diccionario.</p>

<p>Donde más se nota es con <code>functools.cache</code>, que guarda resultados indexados por los argumentos y por eso exige que sean <em>hashables</em>:</p>

<pre><code>from functools import cache


@cache
def plan_de_estudio(preferencias):
    print("  calculando…")
    return sorted(preferencias)


plan_de_estudio(frozendict(nivel="intro", ritmo="lento"))
plan_de_estudio(frozendict(ritmo="lento", nivel="intro"))
print(plan_de_estudio.cache_info())

try:
    plan_de_estudio({"nivel": "intro"})
except TypeError as error:
    print(error)</code></pre>

<pre class="salida"><code>  calculando…
CacheInfo(hits=1, misses=1, maxsize=None, currsize=1)
unhashable type: 'dict'</code></pre>

<p>«calculando…» se imprime una sola vez: la segunda llamada, con las mismas claves en otro orden, se resuelve desde la caché (<code>hits=1</code>). Con un <code>dict</code> normal, la misma función falla.</p>

<h2 id="sentinel">5. <code>sentinel</code>: un «no se pasó nada» con nombre propio</h2>

<p>Cuando <code>None</code> es un valor válido, hace falta otra forma de saber si quien llama omitió un argumento. La solución habitual era <code>_FALTA = object()</code>, que funciona pero se imprime como <code>&lt;object object at 0x7f…&gt;</code> en los errores y en la documentación. El <a href="https://peps.python.org/pep-0661/" target="_blank" rel="noopener noreferrer">PEP 661</a> añade el tipo incorporado <code>sentinel</code>:</p>

<pre><code>SIN_VALOR = sentinel("SIN_VALOR")


def nota_final(notas: dict, alumno: str, por_defecto=SIN_VALOR):
    if alumno in notas:
        return notas[alumno]
    if por_defecto is SIN_VALOR:
        raise KeyError(alumno)
    return por_defecto


notas = {"ana": 17, "luis": None}
print(nota_final(notas, "luis"))
print(nota_final(notas, "eva", por_defecto=None))
print(SIN_VALOR)</code></pre>

<pre class="salida"><code>None
None
SIN_VALOR</code></pre>

<p>Las dos primeras líneas imprimen <code>None</code> por motivos distintos: Luis tiene registrada la nota <code>None</code>, y Eva no tiene nota pero quien llama pidió <code>None</code> como valor por defecto. Si el parámetro usara <code>None</code> como valor por omisión, la función no sabría si quien llama pasó <code>None</code> a propósito o no pasó nada, y para Eva devolvería <code>None</code> en vez de lanzar <code>KeyError</code>. La última línea muestra la ventaja frente a <code>object()</code>: el centinela se imprime con su nombre. Además, <code>copy.copy()</code> y <code>copy.deepcopy()</code> devuelven el mismo objeto, de modo que la comparación con <code>is</code> sigue funcionando tras copiar.</p>

<h2 id="comprensiones">6. Desempaquetar dentro de una comprensión</h2>

<p>El operador de desempaquetado (<code>*</code>) ya se podía usar al construir una lista literal, como en <code>[*a, *b]</code>. El <a href="https://peps.python.org/pep-0798/" target="_blank" rel="noopener noreferrer">PEP 798</a> lo permite dentro de una comprensión, que es la forma más directa de aplanar una lista de listas:</p>

<pre><code>import itertools

semanas = [["variables", "tipos"], ["listas"], ["dict", "set", "tuplas"]]

antes = list(itertools.chain.from_iterable(semanas))
ahora = [*temas for temas in semanas]

print(ahora)
print(antes == ahora)

modulos = [{"python": 12}, {"sqlite": 8}, {"python": 14}]
print({**m for m in modulos})</code></pre>

<pre class="salida"><code>['variables', 'tipos', 'listas', 'dict', 'set', 'tuplas']
True
{'python': 14, 'sqlite': 8}</code></pre>

<p>En la versión con diccionarios, el operador <code>**</code> fusiona cada diccionario en el resultado y, cuando una clave se repite, se queda el último valor: por eso <code>python</code> vale <code>14</code>. En Python 3.14.8 y 3.13.5 la misma comprensión es un error de sintaxis: <code>SyntaxError: iterable unpacking cannot be used in comprehension</code>. Si tu código tiene que funcionar también en versiones anteriores, todavía no la uses.</p>

<h2 id="tachyon">7. Tachyon: un perfilador que señala la línea exacta</h2>

<p>Un perfilador mide dónde gasta tiempo un programa. <code>cProfile</code>, el de siempre, registra cada llamada a función. Eso tiene dos costes: ralentiza el programa mientras mide y solo informa por función, no por línea.</p>

<p>El <a href="https://peps.python.org/pep-0799/" target="_blank" rel="noopener noreferrer">PEP 799</a> reúne los perfiladores en un paquete nuevo, <code>profiling</code>, y añade uno de muestreo llamado Tachyon. En lugar de registrar cada llamada, consulta a intervalos regulares qué línea se está ejecutando. Se usa desde la terminal, sin modificar el programa:</p>

<pre><code>python -m profiling.sampling run lento.py</code></pre>

<p>Aplicado a un script que cuenta los números primos menores que 300 000 y ordena dos millones de valores, la tabla de resultados señala como punto caliente <code>lento.py:6(es_primo)</code>: la línea 6, <code>if n % divisor == 0:</code>, dentro de la función <code>es_primo</code>. <code>cProfile</code> solo habría señalado la función entera. No reproducimos aquí los tiempos de la tabla porque cambian en cada ejecución.</p>

<p>Además del modo <code>run</code>, la documentación de la 3.15 describe el modo <code>attach</code>, que se conecta a un proceso que ya está en marcha a partir de su identificador (PID, <em>process identifier</em>). Sirve para medir un servidor en producción sin reiniciarlo. Con <code>--flamegraph -o perfil.html</code>, el resultado se guarda como un gráfico de llamas interactivo que se abre en el navegador.</p>

<details>
  <summary>Nota técnica: qué pasa con <code>cProfile</code> y con <code>profile</code></summary>
  <p><code>cProfile</code> sigue existiendo como alias de <code>profiling.tracing</code>: en la rc3, <code>cProfile.Profile is profiling.tracing.Profile</code> devuelve <code>True</code>. En cambio, el módulo <code>profile</code>, la versión escrita en Python puro, queda obsoleto. Importarlo con los avisos activados emite <code>DeprecationWarning: The profile module is deprecated and will be removed in Python 3.17</code>.</p>
</details>

<h2 id="jit">8. El JIT: más rápido, todavía experimental</h2>

<p>Un compilador JIT (<em>just-in-time</em>, «justo a tiempo») traduce a código máquina, mientras el programa se ejecuta, las partes que más se repiten. CPython incluye uno experimental desde la 3.13. Según el anuncio de la rc3, en la 3.15 mejora el rendimiento entre un 7 % y un 8 % en media geométrica en Linux sobre x86-64, y entre un 11 % y un 12 % en macOS sobre AArch64 (los procesadores de Apple).</p>

<p>Que siga siendo experimental tiene una consecuencia práctica: no está activo en cualquier instalación. En la rc3 compilada desde el código fuente con la configuración por defecto, <code>sys._jit.is_available()</code> devuelve <code>False</code>. Antes de atribuir una mejora de velocidad al JIT, comprueba que tu intérprete lo incluye.</p>

<h2 id="probar">9. Cómo probarlo esta semana</h2>

<p>La rc3 se descarga desde <a href="https://www.python.org/downloads/release/python-3150rc3/" target="_blank" rel="noopener noreferrer">python.org</a>. Si usas Docker, ten en cuenta que, al 3 de octubre, la etiqueta <code>python:3.15-rc-slim</code> de la imagen oficial todavía contenía la 3.15.0rc2, sin las correcciones de los imports diferidos. Comprueba la versión con <code>python -VV</code> antes de sacar conclusiones.</p>

<p>Una lista corta para la semana:</p>

<ol>
  <li>Ejecuta tus pruebas con la rc3 y con la opción <code>-X warn_default_encoding</code>. Cada aviso es un <code>open()</code> que podría cambiar de comportamiento (sección 3).</li>
  <li>Busca archivos que lean datos de otros sistemas, sobre todo CSV de Excel en Windows, y declara su codificación.</li>
  <li>Si mantienes un paquete con extensiones compiladas, publica <em>wheels</em> para la 3.15: desde la rc3 la ABI ya no cambia.</li>
  <li>Si un paquete instala archivos <code>.pth</code> con líneas <code>import</code>, revisa el <a href="https://peps.python.org/pep-0829/" target="_blank" rel="noopener noreferrer">PEP 829</a>: esas líneas pasan a estar obsoletas en favor de los nuevos archivos <code>.start</code>.</li>
  <li>Reemplaza los usos de <code>import profile</code> por <code>cProfile</code> o <code>profiling.tracing</code>.</li>
</ol>

<h2 id="repaso">10. Ponte a prueba</h2>

<p>Tres preguntas para comprobar lo que quedó. Piensa la respuesta antes de abrir cada una.</p>

<details>
  <summary>Un servicio usa <code>lazy import reportes</code> y el paquete <code>reportes</code> no está instalado en el servidor. ¿Cuándo falla?</summary>
  <p>Al primer acceso a un atributo de <code>reportes</code>, no al arrancar. El servicio arranca con normalidad y falla con la primera petición que use el módulo (sección 2).</p>
</details>

<details>
  <summary>En Windows, <code>open("ventas.csv")</code> leía bien un archivo exportado por Excel. En la 3.15 aparecen caracteres extraños. ¿Qué cambió y cómo se corrige?</summary>
  <p>La codificación por defecto pasó de la regional, por ejemplo <code>cp1252</code>, a UTF-8. Se corrige declarando la codificación real del archivo: <code>open("ventas.csv", encoding="cp1252")</code> (sección 3).</p>
</details>

<details>
  <summary>¿Por qué <code>functools.cache</code> acepta un <code>frozendict</code> como argumento y rechaza un <code>dict</code>?</summary>
  <p>Porque la caché indexa los resultados por los argumentos, y para eso necesita que sean <em>hashables</em>. Un <code>dict</code> puede cambiar después de creado y no lo es; un <code>frozendict</code> con claves y valores <em>hashables</em> sí (sección 4).</p>
</details>

<h2 id="cierre">Lo que quedó cubierto</h2>

<p>Python 3.15 llega el 9 de octubre con <code>lazy import</code> para arranques más rápidos, UTF-8 como codificación por defecto en todos los sistemas, <code>frozendict</code> y <code>sentinel</code> como tipos incorporados, desempaquetado dentro de comprensiones y Tachyon para medir dónde se va el tiempo. De todo eso, lo que más conviene revisar antes de actualizar es la codificación: es el único cambio que modifica, sin aviso, lo que hace código que hoy funciona.</p>

<p>Si quieres repasar las bases que este artículo da por sabidas, como la diferencia entre un tipo mutable y uno inmutable o qué hace realmente <code>import</code>, el curso de introducción a Python las desarrolla paso a paso, con ejercicios que se ejecutan en el navegador.</p>

<h3>Fuentes</h3>
<ul>
  <li><a href="https://blog.python.org/2026/10/python-3150-rc3/" target="_blank" rel="noopener noreferrer">Python Insider — Python 3.15.0 candidate 3 is here!, 2 de octubre de 2026</a></li>
  <li><a href="https://discuss.python.org/t/python-3-15-following-tradition-lets-have-a-surprise-rc3/109313" target="_blank" rel="noopener noreferrer">Discussions on Python.org — Python 3.15: following tradition, let's have a surprise rc3!</a></li>
  <li><a href="https://peps.python.org/pep-0790/" target="_blank" rel="noopener noreferrer">PEP 790 — Python 3.15 Release Schedule</a></li>
  <li><a href="https://docs.python.org/3.15/whatsnew/3.15.html" target="_blank" rel="noopener noreferrer">What's New in Python 3.15</a></li>
  <li><a href="https://peps.python.org/pep-0810/" target="_blank" rel="noopener noreferrer">PEP 810 — Explicit lazy imports</a> · <a href="https://peps.python.org/pep-0686/" target="_blank" rel="noopener noreferrer">PEP 686 — Make UTF-8 mode default</a> · <a href="https://peps.python.org/pep-0814/" target="_blank" rel="noopener noreferrer">PEP 814 — frozendict</a> · <a href="https://peps.python.org/pep-0661/" target="_blank" rel="noopener noreferrer">PEP 661 — Sentinel values</a> · <a href="https://peps.python.org/pep-0798/" target="_blank" rel="noopener noreferrer">PEP 798 — Unpacking in comprehensions</a> · <a href="https://peps.python.org/pep-0799/" target="_blank" rel="noopener noreferrer">PEP 799 — profiling package</a></li>
</ul>

<p><em>Artículo escrito el 3 de octubre de 2026 con Python 3.15.0rc3. La versión final está programada para el 9 de octubre; si algún detalle cambia entre la candidata y la final, la referencia es la documentación oficial.</em></p>
`;

export const articuloPython315: ArticuloBlog = {
  guid: "eduqa-local-python-315-2026-10-03",
  slug: "python-3-15-que-cambia",
  titulo: "Python 3.15 llega el 9 de octubre: lo que cambia en tu código y lo que puede romperse",
  resumen:
    "La versión final se retrasó una semana por los imports diferidos. Repasamos lazy import, UTF-8 por defecto, frozendict, sentinel y el perfilador Tachyon con ejemplos ejecutados en la 3.15.0rc3, y qué revisar antes de actualizar.",
  contenido,
  caratula: null,
  portada: null,
  fecha: "3 de octubre de 2026",
  fechaIso: "2026-10-03T22:00:00.000Z",
  autor: "EDUQA.PE",
  enlaceMedium: null,
  categorias: ["Python", "Ingeniería de software"],
  minutosLectura: minutosDeLectura(contenido),
  cursos: [{ slug: "python", titulo: "Introducción a Python" }],
};
