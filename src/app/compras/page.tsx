import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { usuarioActual } from "@/lib/supabase/servidor";
import { perfilActual } from "@/lib/matriculas";
import { misCompras } from "@/lib/compras";
import { obtenerCursos } from "@/lib/catalogo-cursos";
import { cerrarSesion } from "@/app/acceder/acciones";
import { CabeceraApp } from "@/components/CabeceraApp";
import { Migas } from "@/components/Migas";

export const metadata: Metadata = {
  title: "Mis compras — EDUQA.PE",
  robots: { index: false, follow: false },
};

const ETIQUETA: Record<string, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
  vencido: "Vencido",
  anulado: "Anulado",
};

const COLOR: Record<string, string> = {
  pagado:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  pendiente:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
};

export default async function Page() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/compras");

  const [perfil, compras] = await Promise.all([perfilActual(), misCompras()]);
  const nombre = perfil?.nombre?.trim().split(" ")[0] ?? "";
  const titulos = new Map((await obtenerCursos()).map((c) => [c.slug, c.titulo]));

  return (
    <div className="mx-auto w-full max-w-3xl px-6 lg:pl-64 xl:pl-32 2xl:pl-6 py-14">
      <CabeceraApp
        nombre={nombre}
        correo={usuario.email}
        foto={perfil?.foto}
        onSalir={cerrarSesion}
      />

      <div className="mt-8">
        <Migas items={[{ texto: "Mis compras" }]} />
      </div>

      <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
        <Receipt size={26} className="text-rojo-acento" aria-hidden="true" />
        Mis compras
      </h1>
      <p className="mt-3 leading-relaxed text-texto-suave">
        Los cursos que compraste aparte de los gratuitos, con su comprobante.
      </p>

      {compras.length === 0 ? (
        <p className="mt-8 rounded-xl border border-borde bg-superficie px-5 py-10 text-center text-sm text-texto-suave">
          Todavía no compraste ningún curso.{" "}
          <Link href="/cursos" className="font-medium text-rojo-acento hover:underline">
            Ver el catálogo
          </Link>
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-borde rounded-xl border border-borde">
          {compras.map((c) => (
            <li key={c.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {c.cursoSlug ? (titulos.get(c.cursoSlug) ?? c.concepto) : c.concepto}
                  </p>
                  <p className="mt-0.5 text-xs text-texto-tenue">
                    {new Date(c.pagado_en ?? c.creado_en).toLocaleDateString("es-PE", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {c.numero_operacion && ` · operación ${c.numero_operacion}`}
                  </p>
                </div>

                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-medium">
                    {c.moneda === "USD" ? "$" : "S/"}
                    {c.monto.toFixed(2)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${
                      COLOR[c.estado] ?? "bg-superficie text-texto-tenue ring-borde-fuerte"
                    }`}
                  >
                    {ETIQUETA[c.estado] ?? c.estado}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
