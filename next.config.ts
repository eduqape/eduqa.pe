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
