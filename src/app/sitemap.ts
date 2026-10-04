import type { MetadataRoute } from "next";
import { obtenerArticulosBlog } from "@/lib/blog-medium";
import { obtenerCatalogoPublico } from "@/lib/catalogo-publico";
import { esCursoIndexable, urlAbsoluta } from "@/lib/seo";

function fechaValida(valor: string | undefined) {
  if (!valor) return undefined;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? undefined : fecha;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ahora = new Date();
  const [catalogoResultado, blogResultado] = await Promise.allSettled([
    obtenerCatalogoPublico(),
    obtenerArticulosBlog(),
  ]);

  const estaticas: MetadataRoute.Sitemap = [
    {
      url: urlAbsoluta("/"),
      lastModified: ahora,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: urlAbsoluta("/catalogo"),
      lastModified: ahora,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: urlAbsoluta("/blog"),
      lastModified: ahora,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: urlAbsoluta("/equipo"),
      lastModified: ahora,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: urlAbsoluta("/privacidad"),
      lastModified: ahora,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const cursos: MetadataRoute.Sitemap =
    catalogoResultado.status === "fulfilled"
      ? catalogoResultado.value
          .filter(esCursoIndexable)
          .map((curso) => ({
            url: urlAbsoluta(`/catalogo/${curso.slug}`),
            lastModified: fechaValida(curso.actualizadoEn) ?? ahora,
            changeFrequency: "weekly" as const,
            priority: 0.8,
          }))
      : [];

  const articulos: MetadataRoute.Sitemap =
    blogResultado.status === "fulfilled"
      ? blogResultado.value.map((articulo) => ({
          url: urlAbsoluta(`/blog/${articulo.slug}`),
          lastModified: fechaValida(articulo.fechaIso) ?? ahora,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }))
      : [];

  return [...estaticas, ...cursos, ...articulos];
}
