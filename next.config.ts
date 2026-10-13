import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hay un package-lock.json suelto en el home; sin esto Turbopack infiere mal la raíz.
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  /*
   * Las rutas quedaron todas en español. `/courses` fue la única en inglés y
   * llegó a compartirse en público, así que se redirige de forma permanente
   * en lugar de borrarse: un 301 conserva el enlace de quien lo guardó y le
   * pasa el posicionamiento al destino nuevo.
   */
  /*
   * El runtime de Bash arranca Workers desde `/vendor/bash`. Dentro de una
   * lección aislada (ver `proxy.ts`), el script de un Worker tiene que
   * declarar también su política de incrustación.
   */
  async headers() {
    return [
      /*
       * Cabeceras de seguridad para todo el sitio. `frame-ancestors` impide
       * que otra web incruste el acceso o el panel en un iframe invisible y
       * haga clic por el usuario (clickjacking); `nosniff` evita que el
       * navegador ejecute como script un archivo servido con otro tipo.
       */
      {
        source: "/:ruta*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      {
        source: "/vendor/bash/:ruta*",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/courses", destination: "/cursos", permanent: true },
      { source: "/courses/:ruta*", destination: "/cursos/:ruta*", permanent: true },
    ];
  },
};

export default nextConfig;
