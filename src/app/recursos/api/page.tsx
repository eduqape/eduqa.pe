import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Plug } from "lucide-react";
import { usuarioActual } from "@/lib/supabase/servidor";
import { perfilActual } from "@/lib/matriculas";
import { esInterno, puedeIntegrar } from "@/lib/roles";
import { cerrarSesion } from "@/app/acceder/acciones";
import { CabeceraApp } from "@/components/CabeceraApp";
import { Migas } from "@/components/Migas";
import { Documento } from "@/components/Documento";
import { ClavesApi } from "./Claves";
import { ItemsRecurso } from "../ItemsRecurso";

export const metadata: Metadata = {
  title: "API para publicar cursos — EDUQA.PE",
  robots: { index: false, follow: false },
};

const DOCUMENTO = String.raw`
## Qué hace

Un único punto de entrada publica o actualiza un curso completo. Recibe los
archivos Markdown, valida el temario construyéndolo y lo guarda. Es la misma
operación del panel, expuesta para que un proceso externo o un agente publique
sin abrir el navegador.

El curso queda en **borrador**. Publicarlo es una decisión que se toma desde el
panel: la API entrega contenido, no lo pone a la venta.

## Autenticación

Cada petición lleva una clave en la cabecera \`Authorization\`:

\`\`\`http
Authorization: Bearer eduqa_sk_XXXXXXXXXXXXXXXXXXXXXXXX
\`\`\`

La clave se emite en esta misma página y **se muestra una sola vez**. Lo que se
guarda es su resumen SHA-256, no la clave, de modo que una filtración de la base
no permite autenticarse y nadie —tampoco quien administra— puede recuperarla. Si
se pierde, se revoca y se emite otra.

Las claves solo las emiten los roles \`desarrollador\`, \`agente\`, \`gestor\` y
\`admin\`.

## Punto de entrada

\`\`\`http
POST /api/v1/cursos
Content-Type: application/json
\`\`\`

## Estructura del envío

\`\`\`json
{
  "slug": "introduccion-a-rust",
  "archivos": {
    "curso.md": "---\nslug: introduccion-a-rust\n...",
    "sesion-1.md": "---\nnumero: 1\n...",
    "sesion-2.md": "---\nnumero: 2\n..."
  }
}
\`\`\`

- **\`slug\`** identifica el curso y determina su dirección. Solo admite
  minúsculas, números y guiones. Si ya existe, el envío lo reemplaza.
- **\`archivos\`** es un objeto donde cada clave es un nombre de archivo y cada
  valor su contenido íntegro. Debe incluir \`curso.md\` y al menos una sesión.
  Los nombres no pueden contener rutas.

## Formato de los archivos

Cada archivo empieza con un bloque de metadatos en YAML delimitado por tres
guiones. La ficha del curso:

\`\`\`yaml
---
slug: introduccion-a-rust
titulo: "Introducción a Rust"
resumen: "Propiedad, préstamos y tipos, con código ejecutable."
area: "Lenguajes"
nivel: "INTRODUCCIÓN"
horas: 16
icono: python
paquetes: ["numpy"]
---
\`\`\`

Cada sesión:

\`\`\`yaml
---
numero: 1
titulo: "Propiedad y préstamos"
paquetes: ["numpy"]
preludio: |
  import numpy as np
---
\`\`\`

El cuerpo se escribe en Markdown. Los encabezados de nivel uno a tres abren
secciones del temario y aparecen en el índice lateral.

## Bloques dentro de una sesión

Código ejecutable, con su salida:

\`\`\`markdown
​\`\`\`python
print(2 + 2)
​\`\`\`

​\`\`\`salida
4
​\`\`\`
\`\`\`

Código que no debe ejecutarse en el navegador —porque requiere una credencial o
una herramienta ausente— lleva el modificador \`!sin-consola\`.

Una nota que precisa un límite, y una cita a la documentación oficial:

\`\`\`markdown
> Nota: El resultado se redondea al par más cercano.

> Doc: [round()](https://docs.python.org/3/library/functions.html#round)
\`\`\`

Un ejercicio de completado, con un único hueco marcado con tres guiones bajos:

\`\`\`markdown
​\`\`\`ejercicio
# Enunciado
Completa el operador que suma dos números.

# Plantilla
print(2 ___ 2)

# Esperado
4

# Pista
Un signo más.
​\`\`\`
\`\`\`

Un diagrama de conjuntos:

\`\`\`markdown
​\`\`\`venn
izquierda: clientes
derecha: pedidos
resalta: interseccion
pie: "La intersección son los clientes con pedido"
​\`\`\`
\`\`\`

## Respuesta

\`\`\`json
{
  "ok": true,
  "slug": "introduccion-a-rust",
  "titulo": "Introducción a Rust",
  "sesiones": [{ "numero": 1, "slug": "sesion-1", "titulo": "Propiedad y préstamos" }],
  "bloques": 42,
  "estado": "borrador",
  "mensaje": "Guardado. Se publica desde el panel cuando esté revisado."
}
\`\`\`

## Errores

| Código | Significado |
|---|---|
| 400 | El cuerpo no es JSON válido, faltan archivos o un nombre lleva rutas |
| 401 | Falta la cabecera, la clave no existe o fue revocada |
| 422 | El Markdown no se pudo interpretar; el detalle indica el archivo y la causa |
| 500 | El curso era válido y el guardado falló |

El código 422 es el habitual al integrar. Su campo \`detalle\` nombra el archivo
y el problema concreto: una sesión sin número, un ejercicio sin hueco, una
salida sin bloque de código delante.

## Ejemplo completo

\`\`\`bash
curl -X POST https://eduqape.vercel.app/api/v1/cursos \
  -H "Authorization: Bearer $EDUQA_CLAVE" \
  -H "Content-Type: application/json" \
  -d @curso.json
\`\`\`

Construyendo el envío desde una carpeta de archivos:

\`\`\`python
import json, pathlib, urllib.request, os

carpeta = pathlib.Path("mi-curso")
cuerpo = {
    "slug": carpeta.name,
    "archivos": {f.name: f.read_text(encoding="utf-8") for f in carpeta.glob("*.md")},
}

peticion = urllib.request.Request(
    "https://eduqape.vercel.app/api/v1/cursos",
    data=json.dumps(cuerpo).encode(),
    headers={
        "Authorization": f"Bearer {os.environ['EDUQA_CLAVE']}",
        "Content-Type": "application/json",
    },
    method="POST",
)
with urllib.request.urlopen(peticion) as respuesta:
    print(json.load(respuesta))
\`\`\`

## Antes de enviar

Toda salida de un bloque se obtiene ejecutándola y todo ejercicio se resuelve
antes de publicarlo. La API valida la **forma** del curso, no la exactitud de
sus resultados: un bloque cuya salida esté escrita a mano se acepta igual. Esa
verificación corresponde a quien envía, y está descrita en el recurso de
redacción.
`;

export default async function Page() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/recursos/api");

  const perfil = await perfilActual();
  if (!esInterno(perfil)) redirect("/cursos");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14 lg:pl-64 xl:pl-32 2xl:pl-6">
      <CabeceraApp
        nombre={perfil?.nombre?.trim().split(" ")[0] ?? ""}
        correo={usuario.email}
        foto={perfil?.foto}
        onSalir={cerrarSesion}
      />

      <div className="mt-8">
        <Migas items={[{ texto: "Recursos", href: "/recursos" }, { texto: "API" }]} />
      </div>

      <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
        <Plug size={26} className="text-rojo-acento" aria-hidden="true" />
        API para publicar cursos
      </h1>

      {puedeIntegrar(perfil) ? (
        <div className="mt-8">
          <ClavesApi />
        </div>
      ) : (
        <p className="mt-8 rounded-xl border border-borde bg-superficie px-5 py-4 text-sm leading-relaxed text-texto-suave">
          Tu rol permite leer esta documentación pero no emitir claves. Las
          emiten los roles de desarrollador, agente, gestor y administrador.
        </p>
      )}

      <div className="mt-10">
        <Documento markdown={DOCUMENTO} />
      </div>
      <ItemsRecurso slug="api" administrador={Boolean(perfil?.es_admin || perfil?.rol === "admin")} />
    </div>
  );
}
