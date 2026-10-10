import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Infinity as Infinito, UserRound } from "lucide-react";
import { obtenerCursos, publicacionesCursos } from "@/lib/catalogo-cursos";
import { valoraciones } from "@/lib/valoraciones";
import { rutas } from "@/lib/rutas";
import { popularidad, ordenarPorPopularidad, ordenarRutasPorPopularidad } from "@/lib/popularidad";
import { misMatriculas, perfilActual, resumenPlan } from "@/lib/matriculas";
import { precios } from "@/lib/precios";
import { contarPorCurso, miProgreso } from "@/lib/progreso";
import { avisosVisibles } from "@/lib/avisos";
import { titulosSeccion } from "@/lib/titulos-seccion";
import { Tablero } from "@/components/Tablero";
import { MenuPerfil } from "@/components/MenuPerfil";
import { cerrarSesion } from "@/app/acceder/acciones";
import { usuarioActual } from "@/lib/supabase/servidor";
import { Migas } from "@/components/Migas";
import { TituloEditable } from "@/components/TituloEditable";
import { Listado } from "./Listado";
import { AvisoTope } from "./AvisoTope";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cursos & Microcursos — EDUQA.PE",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceder?volverA=/cursos");

  const [perfil, matriculas, tarifas, progreso, avisos, titulos, publicaciones] =
    await Promise.all([
      perfilActual(),
      misMatriculas(),
      precios(),
      miProgreso(),
      avisosVisibles(),
      titulosSeccion(),
      publicacionesCursos(),
    ]);
  const vistasPorCurso = contarPorCurso(progreso);
  const plan = resumenPlan(perfil, matriculas);
  const esAdmin = perfil?.es_admin ?? false;

  const nombre =
    perfil?.nombre?.trim().split(" ")[0] ?? usuario.email?.split("@")[0] ?? "";

  const porCurso = new Map(matriculas.map((m) => [m.cursoSlug, m]));
  const notas = await valoraciones();
  const itinerarios = await rutas();
  const catalogo = await obtenerCursos();
  const cuentas = await popularidad();
  const disponibles = catalogo.filter((c) => tarifas.has(c.slug));
  const cursosPorSlug = new Map(disponibles.map((c) => [c.slug, c]));
  const rutasVisibles = itinerarios.map((r) => ({
    slug: r.slug,
    nombre: r.nombre,
    descripcion: r.descripcion,
    cursos: r.cursos.flatMap((c) => {
      const curso = cursosPorSlug.get(c.slug);
      if (!curso) return [];
      return [
        {
          slug: c.slug,
          titulo: c.titulo,
          requisitos: c.requisitos,
          acceso_libre: c.acceso_libre,
          horas: curso.horas,
          icono: curso.icono,
        },
      ];
    }),
  }));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-14 lg:pl-64 xl:pl-32 2xl:pl-6">
      <Listado
        populares={ordenarPorPopularidad(disponibles, cuentas).map((c) => {
          const matricula = porCurso.get(c.slug);
          const tarifa = tarifas.get(c.slug)!;
          return {
            slug: c.slug,
            codigo: tarifa.codigo,
            titulo: tarifa.titulo ?? c.titulo,
            resumen: tarifa.resumen ?? c.resumen,
            primeraLeccion: c.lecciones[0].slug,
            matriculas: cuentas.get(c.slug) ?? 0,
            matriculado:
              matricula?.estado === "activa" || matricula?.estado === "completada",
            precio: tarifa.precio ?? 0,
            icono: c.icono,
            publicadoEn: publicaciones.get(c.slug) ?? null,
          };
        })}
        cabecera={<Tablero avisos={avisos} />}
        acciones={
          <MenuPerfil
            nombre={nombre}
            correo={usuario.email}
            foto={perfil?.foto}
            onSalir={cerrarSesion}
          />
        }
        entreBarraYRejilla={
          <>
            <div className="mt-8">
              <Migas items={[{ texto: "Cursos" }]} />
            </div>

            {!perfil?.nombre?.trim() && (
              <Link
                href="/ajustes"
                className="mt-2 flex items-center gap-2 rounded-lg border border-borde bg-superficie px-4 py-3 text-sm text-texto-suave transition-colors hover:border-rojo-acento"
              >
                <UserRound size={15} className="shrink-0 text-rojo-acento" aria-hidden="true" />
                Falta tu nombre completo. Se necesita para emitir tu certificado.
                <span className="ml-auto font-medium text-rojo-acento">Completar</span>
              </Link>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                <TituloEditable
                  clave="cursos-titulo-pagina"
                  valorInicial={titulos["cursos-titulo-pagina"]}
                  esAdmin={esAdmin}
                />
              </h1>
              {nombre && (
                <span className="text-sm text-texto-suave">
                  Bienvenido, <span className="font-medium text-texto">{nombre}</span>
                </span>
              )}
              {/* Badge de plan: solo se muestra cuando NO se está al tope.
                  Si alTope=true, el AvisoTope de abajo ya comunica ese estado. */}
              {!plan.alTope && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-superficie px-3 py-1 text-xs font-medium text-texto-suave">
                  {plan.ilimitado ? (
                    <>
                      <Infinito size={13} className="text-rojo-acento" aria-hidden="true" />
                      Cursos sin límite
                    </>
                  ) : (
                    `${plan.activas} de ${plan.limite} cursos gratis en uso`
                  )}
                </span>
              )}
            </div>

            {plan.alTope && (
              <AvisoTope limite={plan.limite} esAdmin={esAdmin} />
            )}
          </>
        }
        rutas={ordenarRutasPorPopularidad(rutasVisibles, cuentas)}
        alTope={plan.alTope}
        esAdmin={esAdmin}
        titulosSeccion={titulos}
        cursos={disponibles.map((c) => {
          const m = porCurso.get(c.slug);
          const t = tarifas.get(c.slug);
          return {
            slug: c.slug,
            codigo: t!.codigo,
            titulo: t?.titulo ?? c.titulo,
            resumen: t?.resumen ?? c.resumen,
            area: c.area,
            nivel: c.nivel,
            horas: c.horas,
            formato: c.formato,
            sesiones: c.lecciones.length,
            primeraLeccion: c.lecciones[0].slug,
            valoracion: notas.get(c.slug),
            icono: c.icono,
            matriculado: m?.estado === "activa" || m?.estado === "completada",
            completado: m?.estado === "completada",
            precio: t?.precio ?? 0,
            matriculadoEn: m?.creada_en ? new Date(m.creada_en).getTime() : null,
            vistas: vistasPorCurso.get(c.slug) ?? 0,
            publicadoEn: publicaciones.get(c.slug) ?? null,
          };
        })}
      />
    </div>
  );
}
