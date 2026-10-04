import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Check, Clock, FlaskConical, Lock, Play, Route as RouteIcon } from "lucide-react";
import { usuarioActual } from "@/lib/supabase/servidor";
import { perfilActual, misMatriculas } from "@/lib/matriculas";
import { miProgreso, contarPorCurso } from "@/lib/progreso";
import { obtenerCursos } from "@/lib/catalogo-cursos";
import { rutas } from "@/lib/rutas";
import { cerrarSesion } from "@/app/acceder/acciones";
import { CabeceraApp } from "@/components/CabeceraApp";
import { Migas } from "@/components/Migas";
import { Icono } from "@/components/Iconos";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ruta: string }>;
}): Promise<Metadata> {
  const { ruta } = await params;
  const encontrada = (await rutas()).find((r) => r.slug === ruta);
  return {
    title: encontrada ? `${encontrada.nombre} — EDUQA.PE` : "Ruta no encontrada — EDUQA.PE",
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ ruta: string }>;
}) {
  const { ruta: slug } = await params;

  const usuario = await usuarioActual();
  if (!usuario) redirect(`/acceder?volverA=/rutas/${slug}`);

  const ruta = (await rutas()).find((r) => r.slug === slug);
  if (!ruta) notFound();

  const [perfil, matriculas, progreso, catalogo] = await Promise.all([
    perfilActual(),
    misMatriculas(),
    miProgreso(),
    obtenerCursos(),
  ]);

  const vistas = contarPorCurso(progreso);
  const matriculado = new Set(matriculas.map((m) => m.cursoSlug));
  const porSlug = new Map(catalogo.map((c) => [c.slug, c]));

  const pasos = ruta.cursos.flatMap((c) => {
    const curso = porSlug.get(c.slug);
    if (!curso) return [];
    const hechas = vistas.get(c.slug) ?? 0;
    return [
      {
        ...c,
        curso,
        hechas,
        total: curso.lecciones.length,
        completado: hechas >= curso.lecciones.length,
      },
    ];
  });

  const completados = new Set(pasos.filter((p) => p.completado).map((p) => p.slug));
  const hechos = completados.size;
  const horas = pasos.reduce((n, p) => n + p.curso.horas, 0);
  const siguiente = pasos.find((p) => !p.completado) ?? pasos[0];
  const iconos = [...new Set(pasos.map((p) => p.curso.icono).filter(Boolean))];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14 lg:pl-64 xl:pl-32 2xl:pl-6">
      <CabeceraApp
        nombre={perfil?.nombre?.trim().split(" ")[0] ?? ""}
        correo={usuario.email}
        foto={perfil?.foto}
        onSalir={cerrarSesion}
      />

      <div className="mt-8">
        <Migas items={[{ texto: "Cursos", href: "/cursos" }, { texto: ruta.nombre }]} />
      </div>

      <header className="flex flex-wrap items-start gap-5">
        <span className="flex items-center">
          {iconos.map((nombre, i) => (
            <span
              key={nombre}
              className={`flex size-14 shrink-0 items-center justify-center rounded-full border border-borde bg-superficie ${
                i > 0 ? "-ml-4" : ""
              }`}
            >
              <Icono nombre={nombre!} className="size-7 text-texto-suave" />
            </span>
          ))}
        </span>

        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-texto-tenue">
            <RouteIcon size={12} aria-hidden="true" />
            Ruta de aprendizaje
          </span>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{ruta.nombre}</h1>
          {ruta.descripcion && (
            <p className="mt-2 text-sm leading-relaxed text-texto-suave">{ruta.descripcion}</p>
          )}
          <p className="mt-2 text-xs text-texto-tenue">
            {pasos.length} cursos · {horas} h · {hechos} completado
            {hechos === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      {hechos > 0 && hechos < pasos.length && (
        <div className="mt-6">
          <div
            role="progressbar"
            aria-label={`Avance de ${ruta.nombre}`}
            className="h-1.5 overflow-hidden rounded-full bg-borde"
          >
            <div
              className="h-full rounded-full bg-rojo"
              style={{ width: `${(hechos / pasos.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {siguiente && (
        <Link
          href={`/cursos/${siguiente.slug}/${siguiente.curso.lecciones[0].slug}`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-rojo px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rojo-hover"
        >
          <Play size={15} aria-hidden="true" />
          {hechos > 0 ? "Continuar" : "Empezar"}: {siguiente.curso.titulo}
        </Link>
      )}

      {pasos.some((p) => p.curso.icono === "fortran") && (
        <section className="mt-6 rounded-xl border border-borde bg-superficie p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <FlaskConical size={18} aria-hidden="true" className="text-rojo-acento" />
            Sandbox de Fortran
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-texto-suave">
            Un espacio para practicar a lo largo de la ruta: escribe, modifica y ejecuta tus propios programas.
          </p>
          <Link
            href={`/rutas/${ruta.slug}/sandbox`}
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-rojo-acento hover:underline"
          >
            Abrir sandbox
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      )}

      <ol className="mt-8 divide-y divide-borde rounded-xl border border-borde">
        {pasos.map((paso, i) => {
          const falta = paso.requisitos.some((r) => !completados.has(r));
          const dePago = !paso.acceso_libre && !matriculado.has(paso.slug);

          return (
            <li key={paso.slug}>
              <Link
                href={`/cursos/${paso.slug}/${paso.curso.lecciones[0].slug}`}
                className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-superficie"
              >
                <span className="w-6 shrink-0 text-center font-mono text-xs text-texto-tenue">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <Icono
                  nombre={paso.curso.icono}
                  className="size-8 shrink-0 text-texto-tenue transition-colors group-hover:text-rojo-acento"
                />

                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm font-medium ${
                      paso.completado ? "text-texto-suave" : "group-hover:text-rojo-acento"
                    }`}
                  >
                    {paso.curso.titulo}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-texto-tenue">
                    <span>{paso.total} sesiones</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} aria-hidden="true" />
                      {paso.curso.horas} h
                    </span>
                    {paso.hechas > 0 && !paso.completado && (
                      <span className="text-texto-suave">
                        {paso.hechas} de {paso.total} vistas
                      </span>
                    )}
                    {dePago && <span>de pago</span>}
                    {falta && !paso.completado && (
                      <Lock
                        size={10}
                        aria-label="conviene hacer antes los cursos anteriores"
                      />
                    )}
                  </span>
                </span>

                <span className="shrink-0">
                  {paso.completado ? (
                    <Check size={17} className="text-exito" aria-label="completado" />
                  ) : (
                    <Play
                      size={15}
                      className="text-texto-tenue transition-colors group-hover:text-rojo-acento"
                      aria-hidden="true"
                    />
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
