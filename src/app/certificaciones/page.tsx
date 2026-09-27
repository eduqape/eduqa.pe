import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUpRight, BadgeCheck, Bolt, Clock, Eye, Mail, Users } from "lucide-react";
import { usuarioActual } from "@/lib/supabase/servidor";
import { perfilActual } from "@/lib/matriculas";
import { fechaEmision, misCertificaciones } from "@/lib/certificados";
import { cerrarSesion } from "@/app/acceder/acciones";
import { CabeceraApp } from "@/components/CabeceraApp";
import { Migas } from "@/components/Migas";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mis certificaciones — EDUQA.PE",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/certificaciones");

  const [perfil, certificaciones] = await Promise.all([
    perfilActual(),
    misCertificaciones(),
  ]);
  const nombre = perfil?.nombre?.trim().split(" ")[0] ?? "";

  return (
    <div className="mx-auto w-full max-w-3xl px-6 lg:pl-64 xl:pl-32 2xl:pl-6 py-14">
      <CabeceraApp
        nombre={nombre}
        correo={usuario.email}
        foto={perfil?.foto}
        onSalir={cerrarSesion}
      />

      <div className="mt-8">
        <Migas items={[{ texto: "Mis certificaciones" }]} />
      </div>

      <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
        <BadgeCheck size={26} className="text-rojo-acento" aria-hidden="true" />
        Mis certificaciones
      </h1>
      <p className="mt-3 leading-relaxed text-texto-suave">
        Constancias de participación de los dictados en vivo a los que asististe.
        Cada una lleva un código con el que se puede comprobar que es real.
      </p>

      {perfil?.es_admin && (
        <section className="mt-8 rounded-2xl border border-rojo-acento/30 bg-rojo-tenue/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rojo-acento">
                Administración
              </p>
              <h2 className="mt-1 text-lg font-semibold text-texto">
                Gestión de certificaciones
              </h2>
              <p className="mt-1 text-sm text-texto-suave">
                Emite certificados, procesa lotes, previsualiza plantillas, configura activadores y gestiona envíos.
              </p>
            </div>
            <Link
              href="/panel/certificaciones"
              className="inline-flex items-center gap-2 rounded-lg bg-rojo px-4 py-2.5 text-sm font-semibold text-white hover:bg-rojo-hover"
            >
              Abrir gestión
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { href: "/panel/certificaciones#manual", texto: "Manual", Icono: BadgeCheck },
              { href: "/panel/certificaciones#lotes", texto: "Lotes", Icono: Users },
              { href: "/panel/certificaciones/preview", texto: "Preview", Icono: Eye },
              { href: "/panel/certificaciones#activadores", texto: "Activadores", Icono: Bolt },
              { href: "/panel/certificaciones#correos", texto: "Correos", Icono: Mail },
            ].map(({ href, texto, Icono }) => (
              <Link
                key={texto}
                href={href}
                className="flex items-center gap-2 rounded-xl border border-borde bg-superficie px-3 py-3 text-sm font-semibold text-texto transition-colors hover:border-rojo-acento hover:text-rojo-acento"
              >
                <Icono size={16} aria-hidden="true" />
                {texto}
              </Link>
            ))}
          </div>
        </section>
      )}

      {certificaciones.length === 0 ? (
        <div className="mt-8 rounded-xl border border-borde bg-superficie px-5 py-10 text-center">
          <p className="text-sm text-texto-suave">
            Todavía no tienes ninguna constancia.
          </p>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-texto-tenue">
            Se emiten al asistir a un dictado en vivo, no por leer el material.
            Para que salga tu nombre completo, complétalo en Ajustes.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {certificaciones.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-borde bg-superficie p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {c.cohorte?.curso_nombre ?? "Curso"}
                  </p>
                  <p className="mt-0.5 text-sm text-texto-suave">{c.alumno}</p>
                </div>
                {c.anulado_en && (
                  <span className="shrink-0 rounded-full bg-superficie px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-texto-tenue ring-1 ring-inset ring-borde-fuerte">
                    Anulada
                  </span>
                )}
              </div>

              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-texto-tenue">
                {c.cohorte?.horas && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} aria-hidden="true" />
                    {c.cohorte.horas} horas
                  </div>
                )}
                {c.cohorte?.dictada_en && (
                  <div>
                    Dictado el{" "}
                    {new Date(c.cohorte.dictada_en).toLocaleDateString("es-PE", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                )}
                {c.cohorte?.docente && <div>{c.cohorte.docente}</div>}
              </dl>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-borde pt-3">
                <div>
                  <p className="font-mono text-xs text-texto-suave">{c.codigo}</p>
                  <p className="mt-1 text-[11px] text-texto-tenue">
                    Emitida el {fechaEmision(c.emitido_en)}
                  </p>
                </div>
                <Link
                  href={`/certificaciones/${c.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-borde px-3 py-2 text-xs font-semibold text-texto transition-colors hover:border-rojo-acento hover:text-rojo-acento"
                >
                  Ver certificado
                  <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
