import "server-only";

import { cache } from "react";
import { articuloJev } from "@/content/blog/jev-typesafe-ai";
import { articuloPython315 } from "@/content/blog/python-315";
import type { ArticuloBlog, EstadoFeedMedium } from "@/lib/blog-types";

export type { ArticuloBlog, EstadoFeedMedium } from "@/lib/blog-types";

const articulosLocales: ArticuloBlog[] = [articuloPython315, articuloJev];

function extraerImagen(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function limpiarTexto(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Dirección del feed: la variable de entorno manda; el usuario es el respaldo. */
function urlFeedMedium(): string {
  return (
    process.env.MEDIUM_FEED_URL ||
    (process.env.NEXT_PUBLIC_MEDIUM_USERNAME
      ? `https://medium.com/feed/@${process.env.NEXT_PUBLIC_MEDIUM_USERNAME.replace(/^@/, "")}`
      : "https://medium.com/feed/@seminarioA")
  );
}

const consultarFeedMedium = cache(
  async (): Promise<{ articulos: ArticuloBlog[]; estado: EstadoFeedMedium }> => {
    const url = urlFeedMedium();

    try {
      const res = await fetch(url, {
        next: { revalidate: 3600, tags: ["medium-blog"] },
        headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      });

      if (!res.ok) {
        console.warn(`El feed de Medium respondió ${res.status}: ${url}`);
        return { articulos: [], estado: { tipo: "http", url, codigo: res.status } };
      }

      const articulos = parsearRssMedium(await res.text());
      return {
        articulos,
        estado:
          articulos.length > 0
            ? { tipo: "ok", url, articulos: articulos.length }
            : { tipo: "vacio", url },
      };
    } catch (error) {
      console.warn("No se pudo consultar el feed de Medium:", error);
      return { articulos: [], estado: { tipo: "red", url } };
    }
  },
);

/**
 * Obtiene los artículos sincronizados desde el feed de Medium de la empresa.
 * Si el feed falla o no contiene entradas, no se publican artículos ficticios.
 */
export const obtenerArticulosMedium = cache(
  async (): Promise<ArticuloBlog[]> => (await consultarFeedMedium()).articulos,
);

export const estadoFeedMedium = cache(
  async (): Promise<EstadoFeedMedium> => (await consultarFeedMedium()).estado,
);

export const obtenerArticulosBlog = cache(async (): Promise<ArticuloBlog[]> => {
  const medium = await obtenerArticulosMedium();
  const locales = new Set(articulosLocales.map((articulo) => articulo.slug));

  return [
    ...articulosLocales,
    ...medium.filter((articulo) => !locales.has(articulo.slug)),
  ].sort(
    (a, b) =>
      new Date(b.fechaIso).getTime() - new Date(a.fechaIso).getTime(),
  );
});

function parsearRssMedium(xml: string): ArticuloBlog[] {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) ?? [];
  const articulos: ArticuloBlog[] = [];

  for (const item of items) {
    const sacar = (tag: string) => {
      const match = item.match(
        new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
      );
      if (!match) return "";
      return match[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
        .trim();
    };

    const titulo = sacar("title");
    const link = sacar("link");
    const guid = sacar("guid") || link;
    const pubDate = sacar("pubDate");
    const creator = sacar("dc:creator");
    const content = sacar("content:encoded") || sacar("description");

    const categoriasMatches =
      item.match(/<category>([\s\S]*?)<\/category>/gi) ?? [];
    const categorias = categoriasMatches
      .map((c) =>
        c
          .replace(/<category[^>]*>|<\/category>/gi, "")
          .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
          .trim(),
      )
      .filter(Boolean);

    if (
      !titulo ||
      !content ||
      !link ||
      !pubDate ||
      Number.isNaN(new Date(pubDate).getTime())
    ) {
      continue;
    }

    const portada = extraerImagen(content);
    const textoPlano = limpiarTexto(content);
    const resumen = textoPlano.slice(0, 220).trim() + "...";
    const palabras = textoPlano.split(/\s+/).length;
    const minutosLectura = Math.max(1, Math.round(palabras / 180));

    const fechaObj = new Date(pubDate);
    const fecha = fechaObj.toLocaleDateString("es-PE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    articulos.push({
      guid,
      slug: slugificar(titulo),
      titulo,
      resumen,
      contenido: content,
      portada,
      fecha,
      fechaIso: fechaObj.toISOString(),
      autor: creator || "Autor no indicado",
      enlaceMedium: link,
      categorias,
      minutosLectura,
    });
  }

  return articulos;
}

export const buscarArticuloBlog = cache(
  async (slug: string): Promise<ArticuloBlog | undefined> => {
    const articulos = await obtenerArticulosBlog();
    return articulos.find((articulo) => articulo.slug === slug);
  },
);

export const buscarArticuloMedium = cache(
  async (slug: string): Promise<ArticuloBlog | undefined> => {
    const articulos = await obtenerArticulosMedium();
    return articulos.find((articulo) => articulo.slug === slug);
  },
);

export const obtenerCategoriasBlog = cache(async (): Promise<string[]> => {
  const articulos = await obtenerArticulosBlog();
  const set = new Set<string>();

  for (const articulo of articulos) {
    for (const categoria of articulo.categorias) set.add(categoria);
  }

  return [...set];
});
