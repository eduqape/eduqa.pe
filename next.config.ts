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
  async redirects() {
    return [
      { source: "/courses", destination: "/cursos", permanent: true },
      { source: "/courses/:ruta*", destination: "/cursos/:ruta*", permanent: true },
    ];
  },
};

export default nextConfig;
