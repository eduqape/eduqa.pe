import type { Metadata } from "next";
import { Exo_2, Inter } from "next/font/google";
import Script from "next/script";
import { marca } from "@/lib/catalogo";
import { SITE_URL } from "@/lib/seo";
import { ProveedorTema } from "@/components/Tema";
import { GUION_ARRANQUE } from "@/lib/cromatismo";
import { BotonReporte } from "@/components/reportes/BotonReporte";
import { BotonModoAdmin } from "@/components/BotonModoAdmin";
import { Isla } from "@/components/Isla";
import { perfilActual } from "@/lib/matriculas";
import { esInterno } from "@/lib/roles";
import { usuarioActual } from "@/lib/supabase/servidor";
import { marcaActual } from "@/lib/marca";
import { GUION_BARRA_LATERAL } from "@/lib/barra-lateral";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const exo2 = Exo_2({ variable: "--font-exo2", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${marca.nombre} — ${marca.lema}`,
  description: marca.gancho,
  openGraph: {
    title: `${marca.nombre} — ${marca.lema}`,
    description: marca.gancho,
    type: "website",
    locale: "es_PE",
  },
  icons: {
    // Sirve el SVG de la marca si hay uno guardado; si no, la llama original.
    icon: [{ url: "/icono-marca", type: "image/svg+xml" }],
  },
  // Prueba ante Google Search Console de que eduqape.vercel.app es nuestro;
  // la exige la marca de OAuth para publicar el acceso con Google (#106).
  // El token vive en Vercel: sin la variable no se emite la etiqueta.
  ...(process.env.GOOGLE_SITE_VERIFICATION && {
    verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
  }),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // El botón de reportar solo aparece con sesión: sin cuenta no hay a quién
  // atribuir el reporte ni con quién seguir la conversación.
  const usuario = await usuarioActual();
  const perfil = usuario ? await perfilActual() : null;
  // La barra lateral pinta la marca personalizada si la hay; una sola lectura
  // por request porque `marcaActual` está cacheada.
  const { sidebar } = await marcaActual();

  const gtmId = "GTM-PRP5PMK2";

  return (
    <html
      lang="es-PE"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${exo2.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <Script id="google-tag-manager" strategy="beforeInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      <body className="flex min-h-full flex-col font-sans">
        <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              className="hidden invisible"
              title="Google Tag Manager"
            />
          </noscript>
        {/* Antes de nada: si la preferencia guardada es monocromo, la clase
            tiene que estar puesta ya en el primer pintado. */}
        <script dangerouslySetInnerHTML={{ __html: GUION_ARRANQUE }} />
        <script dangerouslySetInnerHTML={{ __html: GUION_BARRA_LATERAL }} />
        <ProveedorTema>
          <Isla
            autenticado={Boolean(usuario)}
            esAdmin={perfil?.es_admin ?? false}
            esInterno={esInterno(perfil)}
            marcaSidebar={sidebar ?? null}
          />
          {children}
          {usuario && <BotonReporte esAdmin={perfil?.es_admin ?? false} />}
          {perfil?.es_admin && <BotonModoAdmin />}
        </ProveedorTema>
      </body>
    </html>
  );
}
