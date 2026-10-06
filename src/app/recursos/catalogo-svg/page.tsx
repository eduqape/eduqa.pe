import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Shapes } from "lucide-react";
import { usuarioActual } from "@/lib/supabase/servidor";
import { perfilActual } from "@/lib/matriculas";
import { esInterno } from "@/lib/roles";
import { cerrarSesion } from "@/app/acceder/acciones";
import { CabeceraApp } from "@/components/CabeceraApp";
import { Migas } from "@/components/Migas";
import { listarAssetsSvg } from "@/lib/catalogo-svg";
import { GaleriaSvg } from "./GaleriaSvg";

export const metadata: Metadata = {
  title: "Catálogo de SVG — EDUQA.PE",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/recursos/catalogo-svg");

  const perfil = await perfilActual();
  if (!esInterno(perfil)) redirect("/cursos");

  const administrador = Boolean(perfil?.es_admin || perfil?.rol === "admin");
  const [assets, { estado }] = await Promise.all([listarAssetsSvg(), searchParams]);
  // Solo la eliminación vuelve por URL; la subida informa dentro de su panel.
  const mensajes: Record<string, string> = {
    eliminado: "El asset se quitó del catálogo.",
    error: "No se pudo completar la operación. Inténtalo de nuevo.",
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-14 lg:pl-64 xl:pl-32 2xl:pl-6">
      <CabeceraApp
        nombre={perfil?.nombre?.trim().split(" ")[0] ?? ""}
        correo={usuario.email}
        foto={perfil?.foto}
        onSalir={cerrarSesion}
      />

      <div className="mt-8">
        <Migas
          items={[
            { texto: "Recursos", href: "/recursos" },
            { texto: "Catálogo de SVG" },
          ]}
        />
      </div>

      <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
        <Shapes size={26} className="text-rojo-acento" aria-hidden="true" />
        Catálogo de SVG
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-texto-suave">
        Ilustraciones vectoriales disponibles para la interfaz. Cambia el tono de
        la vista previa, copia la ruta del archivo para usarla como máscara o
        imagen, o descárgalo.
      </p>

      {estado && mensajes[estado] && (
        <p role="status" className="mt-5 rounded-xl border border-borde bg-fondo p-3 text-sm">
          {mensajes[estado]}
        </p>
      )}
      <GaleriaSvg assets={assets} administrador={administrador} />
    </div>
  );
}
