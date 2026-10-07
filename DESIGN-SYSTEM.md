# Design System — EDUQA

Sistema de diseño de la plataforma EDUQA. Este documento describe los tokens,
reglas y componentes que ya viven en el código: la fuente de verdad de los
tokens es `src/app/globals.css` (Tailwind 4 vía `@theme`) y la de los
componentes base es `src/components/ui.tsx`.

---

## 1. Identidad

- **Rojo de marca**: `#c70724`. Es identidad, no decoración: **no cambia entre
  temas**. Un logo o cabecera que cambia de color según el modo del sistema
  deja de ser marca.
- **Papel vs tinta**: el rojo juega dos roles distintos y cada uno tiene su token:
  - `rojo` / `rojo-hover`: papel (fondo de botones, banderas). Va siempre con
    texto blanco encima.
  - `rojo-acento`: tinta (texto, bordes, anillos de foco sobre el fondo de la
    página). Sí se aclara en oscuro, porque `#c70724` sobre `#0b0b0d` queda en
    3.3:1 y no se lee.

## 2. Tokens de color

Definidos en `@theme` en `src/app/globals.css`. Los componentes usan clases
Tailwind generadas (`bg-rojo`, `text-texto-suave`, `border-borde`, …) o las
variables CSS (`var(--color-fondo)`); nunca valores hex directos.

### Eje claro/oscuro con color

| Token                | Claro      | Oscuro       | Uso |
| -------------------- | ---------- | ------------ | --- |
| `--color-rojo`       | `#c70724`  | `#c70724`    | Marca: fondos, cabecera. Texto blanco encima (6.1:1) |
| `--color-rojo-hover` | `#a3061e`  | `#a3061e`    | Hover sobre superficies de marca |
| `--color-rojo-tenue` | `#fdf2f3`  | `#2a1216`    | Fondo tenue de marca (avisos, destacados suaves) |
| `--color-rojo-acento`| `#c70724`  | `#ff6b7d`    | Tinta roja: texto, bordes, foco |
| `--color-fondo`      | `#ffffff`  | `#0b0b0d`    | Fondo de página |
| `--color-superficie` | `#fafafa`  | `#151518`    | Fondo de tarjetas y paneles elevados |
| `--color-borde`      | `#e4e4e7`  | `#27272b`    | Bordes sutiles (secciones, divisores) |
| `--color-borde-fuerte` | `#d4d4d8`| `#3a3a41`    | Bordes de inputs y botones secundarios |
| `--color-texto`      | `#18181b`  | `#f4f4f5`    | Texto principal |
| `--color-texto-suave`| `#52525b`  | `#b4b4bb`    | Texto secundario |
| `--color-texto-tenue`| `#8b8b93`  | `#85858e`    | Ayuda, placeholders, metadatos |
| `--color-sobre-rojo` | `#ffffff`  | `#ffffff`    | Texto sobre superficies de marca |
| `--color-sobre-rojo-suave` | `#f7cdd3` | `#f7cdd3` | Hover de texto blanco sobre marca |
| `--color-exito`      | `#15803d`  | `#4ade80`    | Acierto, confirmación |

### Eje monocromático (`html.mono`)

El modo monocromático es un **eje aparte del claro/oscuro**, no un tercer tema:
claro/oscuro responde a cuánta luz hay alrededor; mono responde a si se quiere
color de marca o no. Se activa con la clase `mono` en `<html>` (gestionada por
`src/lib/cromatismo.ts`). Cada variante redefine el juego completo de tokens.

En mono no hay tono, así que la jerarquía es por valor: el énfasis pasa a ser
la tinta más fuerte y el texto corriente baja un peldaño. Acierto y error se
distinguen por icono y palabra, no por color.

La marca en mono es negra en ambos temas: `#1c1c1f` en claro y negro puro
(`#000000`, hover `#1c1c1f`) en oscuro. Un gris medio como bloque de marca se
ve lavado junto al fondo oscuro de la página.

## 3. Reglas de uso de color

1. **Nunca escribir variantes `dark:` a mano para colores de tema.** El modo
   oscuro redefinir los mismos tokens CSS; un componente que usa
   `bg-superficie` funciona en ambos temas sin variantes. La variante
   `dark:` está conectada con `@custom-variant` solo para casos excepcionales
   (ej. Shiki).
2. **Texto blanco siempre va sobre `rojo`, nunca sobre `rojo-acento`.**
3. **`rojo-tenue` es fondo, no tinta.** Para texto destacado usar
   `rojo-acento`.
4. **`exito` realza, no comunica solo**: el significado también debe venir del
   icono o la palabra (en mono el color de éxito es neutro).
5. **No inventar grises nuevos**: si falta un paso de jerarquía, revisar
   `texto` → `texto-suave` → `texto-tenue`.

## 4. Tipografía

| Fuente | Variable | Token Tailwind | Uso |
| ------ | -------- | -------------- | --- |
| Inter  | `--font-inter` | `font-sans` | Toda la interfaz |
| Exo 2  | `--font-exo2`  | `font-cert` | Certificados |

Cargadas con `next/font/google` en `src/app/layout.tsx`. La fuente por
defecto del `<body>` es `font-sans`.

Escala observada:

- Título de sección: `text-2xl font-semibold tracking-tight sm:text-3xl`
- Cuerpo: `text-sm` / `text-base`
- Ayudas y metadatos: `text-xs text-texto-tenue`
- Etiqueta de campo: `text-sm font-medium`

## 5. Layout y espaciado

- Página: `<body>` en columna flexible de altura mínima completa
  (`flex min-h-full flex-col`).
- Contenedores centrados: `mx-auto w-full` con dos anchos:
  - Normal (lectura, formularios): `max-w-3xl`
  - Amplio (catálogos, tableros): `max-w-6xl`
- Secciones: separadas por borde superior, con padding vertical generoso:
  `border-t border-borde px-6 py-16 sm:py-20`.
- Espaciado interno de controles: botones `px-6 py-3`, inputs `px-3.5 py-2.5`.
- Radios: controles `rounded-lg`.

## 6. Componentes base

Viven en `src/components/ui.tsx`. Ante una necesidad nueva, primero extender
estos; crear un componente nuevo solo cuando no encaje.

### Boton

```tsx
<Boton variante="principal">Matricularme</Boton>
```

Base: `inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3
text-sm font-semibold transition-colors focus-visible:outline-2
focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50`

| Variante     | Clases | Uso |
| ------------ | ------ | --- |
| `principal`  | `bg-rojo text-white hover:bg-rojo-hover focus-visible:outline-rojo-acento` | Acción primaria de la vista |
| `secundario` | `border border-borde-fuerte bg-fondo text-texto hover:bg-superficie focus-visible:outline-rojo-acento` | Acciones alternativas |
| `sobreRojo`  | `bg-white text-rojo hover:bg-sobre-rojo-suave focus-visible:outline-white` | Solo dentro de la cabecera roja |

### Seccion

Envoltorio de sección con borde superior, contenedor centrado y título
opcional (`h2` con la escala tipográfica de sección). Prop `ancho`:
`"normal"` (`max-w-3xl`) o `"amplio"` (`max-w-6xl`).

### Campo

Etiqueta accesible para formularios: `<label>` que envuelve al input, con
etiqueta (`text-sm font-medium`) y ayuda opcional debajo (`mt-1.5 block
text-xs text-texto-tenue`).

### claseInput / claseInputBase

Estilo canónico de entrada de texto:

```
rounded-lg border border-borde-fuerte bg-fondo px-3.5 py-2.5 text-sm text-texto
placeholder:text-texto-tenue
focus:border-rojo-acento focus:outline-none focus:ring-1 focus:ring-rojo-acento
```

- `claseInput`: añade `w-full` (caso común).
- `claseInputBase`: sin ancho, para cuando el ancho lo decide quien lo usa.
- El foco usa `rojo-acento` (tinta), nunca `rojo`.

## 7. Iconografía

Iconos con [Lucide](https://lucide.dev). Reglas:

- Un solo juego de iconos; no mezclar bibliotecas.
- El significado nunca depende solo del icono: acompañarlo de texto o
  contexto (requisito también del modo monocromático).
- Iconos compartidos centralizados en `src/components/Iconos.tsx`.

## 8. Movimiento

Todas las animaciones viven en `globals.css` como utilidades `.animar-*` y se
anulan bajo `prefers-reduced-motion: reduce` (globalmente y por utilidad).

| Utilidad | Animación | Duración | Uso |
| -------- | --------- | -------- | --- |
| `animar-colapsable` | altura con Radix (`data-state`) | 180 ms abrir / 160 ms cerrar | Collapsibles de Radix |
| `animar-velo` | fundido | 220 ms | Velo de celebración |
| `animar-marca` | escala con rebote corto | 520 ms | Marca en celebración |
| `animar-anillo` | anillo expansivo, infinito | 1.4 s | Ondas de celebración |
| `animar-texto` | subida + fundido | 420 ms | Texto de celebración |
| `animar-latido` | pulsación lenta, infinito | 1.6 s | Estado "trabajando" |

Principios:

- Micro-interacciones cortas (≤ ~200 ms); celebraciones pueden ser más largas.
- Lo infinito (`anillo`, `latido`) comunica actividad continua con poco
  recorrido, sin robar atención.
- Nada nuevo debe animar sin su contraparte en `prefers-reduced-motion`
  (la regla global ya cubre `*`; añadir a la lista explícita si la animación
  fija propiedades).

## 9. Temas y preferencias

Dos ejes independientes, ambos resueltos antes del primer pintado:

| Eje | Valores | Gestión |
| --- | ------- | ------- |
| Claro/Oscuro | clase `dark` en `<html>` | `next-themes` |
| Color/Mono | clase `mono` en `<html>` | `src/lib/cromatismo.ts` + script de arranque inline |

Un componente correcto **no sabe qué tema está activo**: consume tokens y
listo. Si algo parece necesitar saberlo, casi siempre falta un token.

## 10. Accesibilidad

- **Contraste garantizado por el sistema**: texto blanco sobre `rojo` da
  6.1:1; `rojo-acento` se aclara en oscuro precisamente para mantener el
  contraste sobre el fondo.
- **Foco visible siempre**: los controles base incluyen
  `focus-visible:outline-2 focus-visible:outline-offset-2` con color definido.
- **Movimiento reducido**: todas las animaciones se desactivan con
  `prefers-reduced-motion`.
- **Redundancia sensorial**: estado y significado se comunican con más de un
  canal (color + icono/palabra), obligatorio en modo mono.
