import { redirect } from "next/navigation";
import { Migas } from "@/components/Migas";
import { perfilActual } from "@/lib/matriculas";
import { resumenCertificacionesAdmin } from "@/lib/certificaciones-admin";
import { usuarioActual } from "@/lib/supabase/servidor";
import { ConsolaCertificaciones } from "./ConsolaCertificaciones";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    modo?: string;
    curso?: string;
    estado?: string;
    cantidad?: string;
  }>;
}) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/panel/certificaciones");

  const perfil = await perfilActual();
  if (!perfil?.es_admin) redirect("/panel");

  const params = await searchParams;
  const resumen = await resumenCertificacionesAdmin();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 lg:pl-64 xl:pl-32 2xl:pl-6">
      <Migas
        items={[
          { texto: "Mi cuenta", href: "/panel" },
          { texto: "Certificaciones" },
        ]}
      />

      <header className="mt-4 border-b border-borde pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-texto">
          Gestión de certificaciones
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-suave">
          Trabaja directamente con cursos y matrículas. Las cohortes quedan como contexto opcional para dictados en vivo.
        </p>
      </header>

      <ConsolaCertificaciones
        cursos={resumen.cursos}
        matriculados={resumen.matriculados}
        reglas={resumen.reglas}
        envios={resumen.envios}
        certificados={resumen.certificados}
        configs={resumen.configs}
        modoInicial={params.modo}
        cursoInicial={params.curso}
        estado={params.estado}
        cantidad={params.cantidad}
      />
    </main>
  );
}
