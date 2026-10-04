"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";

type BotonCompartirArticuloProps = {
  titulo: string;
  resumen: string;
  slug: string;
};

type ContenidoArticuloProps = {
  contenido: string;
  /**
   * Oculta el `<nav>` de índice escrito dentro del artículo. La página genera
   * uno a partir de los títulos, y mostrar los dos repite la misma lista.
   */
  ocultarIndiceInterno?: boolean;
};

async function copiarTexto(texto: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto);
    return;
  }

  const campo = document.createElement("textarea");
  campo.value = texto;
  campo.setAttribute("readonly", "");
  campo.style.position = "fixed";
  campo.style.opacity = "0";
  document.body.appendChild(campo);
  campo.select();
  document.execCommand("copy");
  campo.remove();
}

export function BotonCompartirArticulo({
  titulo,
  resumen,
  slug,
}: BotonCompartirArticuloProps) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (temporizador.current !== null) {
        window.clearTimeout(temporizador.current);
      }
    },
    [],
  );

  const compartir = async () => {
    const url = new URL(`/blog/${slug}`, window.location.origin).toString();

    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, text: resumen, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await copiarTexto(url);
    setCopiado(true);

    if (temporizador.current !== null) {
      window.clearTimeout(temporizador.current);
    }
    temporizador.current = window.setTimeout(() => setCopiado(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={compartir}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-texto-tenue transition-colors hover:text-rojo-acento focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento"
      aria-live="polite"
    >
      {copiado ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <Share2 size={14} aria-hidden="true" />
      )}
      <span>{copiado ? "Enlace copiado" : "Compartir"}</span>
    </button>
  );
}

export function ContenidoArticulo({ contenido, ocultarIndiceInterno = false }: ContenidoArticuloProps) {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = contenedor.current;
    if (!raiz) return;

    const limpiezas: Array<() => void> = [];

    raiz.querySelectorAll("pre").forEach((bloque) => {
      if (bloque.querySelector(":scope > .boton-copiar-codigo-blog")) return;
      // Una salida se lee, no se pega en la terminal.
      if (bloque.classList.contains("salida")) return;

      const codigo = bloque.querySelector("code");
      const boton = document.createElement("button");
      const icono = document.createElement("span");
      const etiqueta = document.createElement("span");

      boton.type = "button";
      boton.className = "boton-copiar-codigo-blog";
      boton.setAttribute("aria-label", "Copiar código");
      boton.setAttribute("aria-live", "polite");

      icono.className = "icono-copiar-codigo-blog";
      icono.setAttribute("aria-hidden", "true");
      icono.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`;
      etiqueta.textContent = "Copiar";

      boton.append(icono, etiqueta);
      bloque.appendChild(boton);

      let temporizador: number | null = null;

      const alCopiar = async () => {
        await copiarTexto(codigo?.textContent ?? bloque.textContent ?? "");
        etiqueta.textContent = "Copiado";
        icono.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"></path></svg>`;

        if (temporizador !== null) window.clearTimeout(temporizador);
        temporizador = window.setTimeout(() => {
          etiqueta.textContent = "Copiar";
          icono.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`;
        }, 1600);
      };

      boton.addEventListener("click", alCopiar);
      limpiezas.push(() => {
        boton.removeEventListener("click", alCopiar);
        if (temporizador !== null) window.clearTimeout(temporizador);
        boton.remove();
      });
    });

    return () => limpiezas.forEach((limpiar) => limpiar());
  }, [contenido]);

  return (
    <>
      <div
        ref={contenedor}
        className={`contenido-blog${ocultarIndiceInterno ? " sin-indice-interno" : ""}`}
        dangerouslySetInnerHTML={{ __html: contenido }}
      />

      <style jsx global>{`
        .contenido-blog {
          margin-top: 2.5rem;
          max-width: none;
          color: var(--color-texto-suave);
          font-size: 1.0625rem;
          line-height: 1.85;
          overflow-wrap: anywhere;
        }

        .contenido-blog h1,
        .contenido-blog h2,
        .contenido-blog h3,
        .contenido-blog h4 {
          color: var(--color-texto);
          font-weight: 750;
          letter-spacing: -0.025em;
          line-height: 1.18;
          scroll-margin-top: 6rem;
          text-wrap: balance;
        }

        .contenido-blog h1 {
          margin: 3.5rem 0 1.25rem;
          font-size: clamp(2rem, 4.5vw, 2.8rem);
        }

        .contenido-blog h2 {
          margin: 3.25rem 0 1.1rem;
          font-size: clamp(1.75rem, 3.8vw, 2.3rem);
        }

        .contenido-blog h3 {
          margin: 2.5rem 0 0.9rem;
          font-size: clamp(1.35rem, 3vw, 1.7rem);
        }

        .contenido-blog h4 {
          margin: 2rem 0 0.75rem;
          font-size: clamp(1.15rem, 2.5vw, 1.35rem);
        }

        .contenido-blog p {
          margin: 1.15rem 0;
        }

        .contenido-blog .lead {
          color: var(--color-texto);
          font-size: clamp(1.15rem, 2vw, 1.3rem);
          line-height: 1.75;
        }

        .contenido-blog strong,
        .contenido-blog b {
          color: var(--color-texto);
          font-weight: 750;
        }

        .contenido-blog em,
        .contenido-blog i {
          font-style: italic;
        }

        .contenido-blog mark {
          border-radius: 0.25rem;
          background: var(--color-rojo-tenue);
          color: var(--color-texto);
          padding: 0.05em 0.25em;
        }

        .contenido-blog a {
          color: var(--color-rojo-acento);
          font-weight: 600;
          text-decoration: underline;
          text-decoration-color: color-mix(in srgb, var(--color-rojo-acento) 35%, transparent);
          text-underline-offset: 0.2em;
        }

        .contenido-blog a:hover {
          text-decoration-color: currentColor;
        }

        .contenido-blog ul,
        .contenido-blog ol {
          margin: 1.25rem 0;
          padding-left: 1.6rem;
        }

        .contenido-blog ul {
          list-style: disc;
        }

        .contenido-blog ol {
          list-style: decimal;
        }

        .contenido-blog li {
          margin: 0.45rem 0;
          padding-left: 0.2rem;
        }

        .contenido-blog li::marker {
          color: var(--color-rojo-acento);
          font-weight: 700;
        }

        .contenido-blog li > ul,
        .contenido-blog li > ol {
          margin: 0.45rem 0 0.45rem;
        }

        .contenido-blog table {
          display: block;
          width: 100%;
          margin: 1.75rem 0;
          overflow-x: auto;
          border: 1px solid var(--color-borde);
          border-radius: 0.9rem;
          border-spacing: 0;
          border-collapse: separate;
          background: var(--color-fondo);
          -webkit-overflow-scrolling: touch;
        }

        .contenido-blog thead,
        .contenido-blog tbody,
        .contenido-blog tr {
          width: 100%;
        }

        .contenido-blog th,
        .contenido-blog td {
          min-width: 9rem;
          padding: 0.8rem 1rem;
          border-bottom: 1px solid var(--color-borde);
          text-align: left;
          vertical-align: top;
        }

        .contenido-blog th {
          background: var(--color-superficie);
          color: var(--color-texto);
          font-size: 0.82rem;
          font-weight: 750;
          letter-spacing: 0.01em;
        }

        .contenido-blog tr:last-child td {
          border-bottom: 0;
        }

        .contenido-blog code {
          border: 1px solid var(--color-borde);
          border-radius: 0.38rem;
          background: var(--color-superficie);
          color: var(--color-texto);
          padding: 0.12em 0.35em;
          font-size: 0.9em;
        }

        /* En un título, el código se marca solo con la tipografía: la caja del
           código en línea, a ese tamaño, compite con el propio título. */
        .contenido-blog :is(h1, h2, h3, h4) code {
          border: 0;
          background: transparent;
          padding: 0;
          font-size: 0.92em;
        }

        .contenido-blog pre {
          position: relative;
          margin: 1.75rem 0;
          overflow-x: auto;
          border: 1px solid var(--color-borde-fuerte);
          border-radius: 1rem;
          background: #101114;
          color: #f4f4f5;
          padding: 3.4rem 1.1rem 1.1rem;
          font-size: 0.9rem;
          line-height: 1.65;
          tab-size: 2;
        }

        /* La salida de un bloque: se distingue del código por fondo y rótulo,
           para que no haya que adivinar qué se escribe y qué imprime. */
        .contenido-blog pre.salida {
          margin-top: -0.75rem;
          border-color: var(--color-borde);
          background: var(--color-superficie);
          color: var(--color-texto-suave);
          padding-top: 2.3rem;
        }

        .contenido-blog pre.salida::before {
          content: "Salida";
          position: absolute;
          top: 0.8rem;
          left: 1.1rem;
          color: var(--color-texto-tenue);
          font-family: var(--font-sans);
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .contenido-blog pre code {
          border: 0;
          border-radius: 0;
          background: transparent;
          color: inherit;
          padding: 0;
          font-size: inherit;
        }

        .contenido-blog .boton-copiar-codigo-blog {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          min-height: 2rem;
          border: 1px solid #3f3f46;
          border-radius: 0.55rem;
          background: #18181b;
          color: #e4e4e7;
          padding: 0.35rem 0.65rem;
          font-family: var(--font-sans);
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
        }

        .contenido-blog .boton-copiar-codigo-blog:hover {
          border-color: #71717a;
          background: #27272a;
          color: #ffffff;
        }

        .contenido-blog .boton-copiar-codigo-blog:focus-visible {
          outline: 2px solid #ffffff;
          outline-offset: 2px;
        }

        .contenido-blog aside,
        .contenido-blog .nota,
        .contenido-blog [data-tipo="nota"] {
          margin: 1.75rem 0;
          border-radius: 0.9rem;
          background: color-mix(in srgb, var(--color-rojo-tenue) 55%, var(--color-fondo));
          color: var(--color-texto-suave);
          padding: 1rem 1.15rem;
        }

        .contenido-blog aside > :first-child,
        .contenido-blog .nota > :first-child,
        .contenido-blog [data-tipo="nota"] > :first-child {
          margin-top: 0;
        }

        .contenido-blog aside > :last-child,
        .contenido-blog .nota > :last-child,
        .contenido-blog [data-tipo="nota"] > :last-child {
          margin-bottom: 0;
        }

        .contenido-blog blockquote {
          margin: 1.75rem 0;
          border-left: 0.22rem solid var(--color-borde-fuerte);
          color: var(--color-texto-suave);
          padding: 0.25rem 0 0.25rem 1rem;
          font-style: italic;
        }

        .contenido-blog nav {
          margin: 1.75rem 0;
          border-radius: 1rem;
          background: var(--color-superficie);
          padding: 1rem 1.2rem;
        }

        .contenido-blog.sin-indice-interno > nav {
          display: none;
        }

        .contenido-blog details {
          margin: 1.75rem 0;
          border-radius: 0.9rem;
          background: var(--color-superficie);
          padding: 0.85rem 1rem;
        }

        .contenido-blog summary {
          color: var(--color-texto);
          font-weight: 700;
          cursor: pointer;
        }

        .contenido-blog hr {
          margin: 2.75rem 0;
          border: 0;
          border-top: 1px solid var(--color-borde);
        }

        .contenido-blog img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 1.75rem auto;
          border-radius: 1rem;
        }

        .contenido-blog .texto-xs { font-size: 0.75rem; }
        .contenido-blog .texto-sm { font-size: 0.875rem; }
        .contenido-blog .texto-base { font-size: 1rem; }
        .contenido-blog .texto-lg { font-size: 1.125rem; }
        .contenido-blog .texto-xl { font-size: 1.25rem; }
        .contenido-blog .texto-2xl { font-size: 1.5rem; }

        .contenido-blog .texto-izquierda { text-align: left; }
        .contenido-blog .texto-centro { text-align: center; }
        .contenido-blog .texto-derecha { text-align: right; }
        .contenido-blog .texto-justificado {
          text-align: justify;
          text-justify: inter-word;
          hyphens: auto;
        }

        .contenido-blog .espacio-arriba-0 { margin-top: 0; }
        .contenido-blog .espacio-arriba-sm { margin-top: 0.75rem; }
        .contenido-blog .espacio-arriba-md { margin-top: 1.5rem; }
        .contenido-blog .espacio-arriba-lg { margin-top: 2.5rem; }
        .contenido-blog .espacio-arriba-xl { margin-top: 4rem; }

        .contenido-blog .espacio-abajo-0 { margin-bottom: 0; }
        .contenido-blog .espacio-abajo-sm { margin-bottom: 0.75rem; }
        .contenido-blog .espacio-abajo-md { margin-bottom: 1.5rem; }
        .contenido-blog .espacio-abajo-lg { margin-bottom: 2.5rem; }
        .contenido-blog .espacio-abajo-xl { margin-bottom: 4rem; }

        @media (max-width: 640px) {
          .contenido-blog {
            font-size: 1rem;
            line-height: 1.78;
          }

          .contenido-blog table {
            border-radius: 0.75rem;
          }

          .contenido-blog th,
          .contenido-blog td {
            min-width: 8rem;
            padding: 0.7rem 0.8rem;
          }
        }
      `}</style>
    </>
  );
}
