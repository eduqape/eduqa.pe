import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  Mail,
  Radio,
  UserPlus,
} from "lucide-react";
import {
  comoFunciona,
  faq,
  marca,
  promesas,
  plazaLibre,
} from "@/lib/catalogo";
import { personasQueEnsenan } from "@/lib/personas";
import { LIMITE_PLAN_GRATIS } from "@/lib/matriculas";
import { usuarioActual } from "@/lib/supabase/servidor";
import { FichaPersona } from "@/components/FichaPersona";
import { IconoRed, Stack } from "@/components/Iconos";
import { Llama } from "@/components/Llama";
import { SelectorTema } from "@/components/Tema";
import { Boton, Seccion } from "@/components/ui";

const pilares = [
  {
    titulo: "Siempre en vivo",
    texto: "Clases en directo para preguntar, corregir y comprobar lo aprendido.",
  },
  {
    titulo: "Nichos técnicos poco atendidos",
    texto: "Formación accesible en español para áreas técnicas poco cubiertas.",
  },
  {
    titulo: "Todo listo para practicar",
    texto: "Herramientas, ejemplos y ejercicios preparados para entrar y trabajar.",
  },
  {
    titulo: "Rigor verificable",
    texto: "Contenido respaldado por documentación oficial, libros y ejemplos ejecutados.",
  },
];

export default async function Page() {
  // La portada cambia según haya sesión: a quien ya entró no se le ofrece
  // crear cuenta como llamada principal.
  const usuario = await usuarioActual();

  // Solo quienes tienen un rol docente. Un practicante o un invitado pueden
  // estar publicados en /equipo sin aparecer aquí, que es la respuesta a
  // "¿quién me enseña?" y no el censo completo.
  const docentes = await personasQueEnsenan();

  return (
    <>
      <main className="flex-1">
        {/* Hero */}
        <header className="bg-rojo px-6 py-14 text-white sm:py-20">
          <div className="mx-auto w-full max-w-5xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Llama className="h-7 w-auto text-white" />
                <span className="text-sm font-bold uppercase tracking-[0.22em]">
                  {marca.nombre}
                </span>
              </div>
              <SelectorTema />
            </div>

            <div className="mt-10 grid items-center gap-12 sm:grid-cols-[1fr_auto]">
              <div>
                <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
                  {marca.lema}
                </h1>

                <p className="mt-5 max-w-xl text-lg leading-relaxed text-sobre-rojo-suave">
                  {marca.gancho}
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-3">
                  {usuario ? (
                    <Link href="/cursos">
                      <Boton variante="sobreRojo">
                        Ir a mis cursos
                        <ArrowRight size={16} aria-hidden="true" />
                      </Boton>
                    </Link>
                  ) : (
                    <>
                      <Link href="/registro">
                        <Boton variante="sobreRojo">
                          Crear cuenta gratis
                          <ArrowRight size={16} aria-hidden="true" />
                        </Boton>
                      </Link>
                      <Link
                        href="/acceder"
                        className="rounded-lg border border-white/45 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
                      >
                        Ya tengo cuenta
                      </Link>
                    </>
                  )}
                </div>

                <p className="mt-5 max-w-md text-sm leading-relaxed text-sobre-rojo-suave">
                  {LIMITE_PLAN_GRATIS} cursos gratis a la vez, con todo su material. Los
                  demás, {marca.moneda}
                  {marca.precio} cada uno.
                </p>
              </div>

              <Llama className="hidden h-72 w-auto text-white sm:block lg:h-96" />
            </div>
          </div>
        </header>

        {/* Pilares fundamentales */}
        <Seccion titulo="¿Qué nos hace diferentes?" ancho="amplio">
          <p className="-mt-4 mb-8 max-w-2xl leading-relaxed text-texto-suave">
            La propuesta educativa de EDUQA.PE se sostiene en cuatro principios claros.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pilares.map((pilar, indice) => (
              <article
                key={pilar.titulo}
                className="relative min-h-[280px]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-0 size-full"
                >
                  <path
                    d="M25 0 H96 Q100 0 100 4 V96 Q100 100 96 100 H4 Q0 100 0 96 V19 Q0 15 4 15 H17 Q21 15 21 11 V4 Q21 0 25 0 Z"
                    className="fill-fondo stroke-borde"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                <span className="absolute left-5 top-4 z-10 text-sm font-semibold tabular-nums text-rojo-acento">
                  0{indice + 1}
                </span>

                <div className="relative z-10 flex h-full min-h-[280px] flex-col px-5 pb-5 pt-8">
                  <div
                    aria-hidden="true"
                    className="flex h-[112px] shrink-0 items-center justify-center"
                  >
                    {indice === 3 ? (
                      <span
                        className="block h-24 w-24 bg-rojo-acento/70"
                        style={{
                          WebkitMaskImage: "url('/llama-rigor-verificable.svg')",
                          maskImage: "url('/llama-rigor-verificable.svg')",
                          WebkitMaskRepeat: "no-repeat",
                          maskRepeat: "no-repeat",
                          WebkitMaskPosition: "center",
                          maskPosition: "center",
                          WebkitMaskSize: "contain",
                          maskSize: "contain",
                        }}
                      />
                    ) : (
                      <Llama className="h-20 w-auto text-rojo-acento/70" />
                    )}
                  </div>

                  <h3 className="mt-5 flex min-h-[2.5rem] items-center justify-center text-center text-[13px] font-semibold leading-snug tracking-tight text-texto">
                    {pilar.titulo}
                  </h3>
                  <p className="mt-3 text-center text-sm leading-relaxed text-texto-suave">
                    {pilar.texto}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Seccion>

        {/* Cómo se accede */}
        <Seccion titulo="Cómo se accede">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-borde p-5">
              <p className="text-sm font-semibold">Cuenta gratuita</p>
              <p className="mt-1 text-2xl font-semibold">{marca.moneda}0</p>
              <ul className="mt-4 space-y-2 text-sm text-texto-suave">
                {[
                  `Hasta ${LIMITE_PLAN_GRATIS} cursos matriculados a la vez`,
                  "Todo el material de esos cursos",
                  "Constancia de participación al terminar",
                ].map((x) => (
                  <li key={x} className="flex gap-2">
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-rojo-acento"
                      aria-hidden="true"
                    />
                    {x}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border-2 border-rojo-acento p-5">
              <p className="text-sm font-semibold text-rojo-acento">Un curso más</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                <span>
                  {marca.moneda}
                  {marca.precio}
                </span>
                <span className="text-sm font-normal text-texto-tenue">por curso</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-texto-suave">
                {[
                  `Cuando ya ocupaste los ${LIMITE_PLAN_GRATIS} gratuitos`,
                  "Se paga escaneando un QR desde el celular",
                  "Sin tarjeta ni suscripción que se renueva sola",
                ].map((x) => (
                  <li key={x} className="flex gap-2">
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-rojo-acento"
                      aria-hidden="true"
                    />
                    {x}
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-center gap-4 border-t border-borde pt-4">
                <Image
                  src="/yape.png"
                  alt="Yape"
                  width={28}
                  height={28}
                  className="size-7 rounded"
                />
                <Image
                  src="/plin.png"
                  alt="Plin"
                  width={28}
                  height={28}
                  className="size-7 rounded"
                />
                <span className="text-xs text-texto-tenue">Yape o Plin</span>
              </div>
            </div>
          </div>
        </Seccion>

        {/* Promesas */}
        <Seccion titulo="Qué nos hace distintos">
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {promesas.map((p) => (
              <div key={p.titulo}>
                <h3 className="flex items-start gap-2 font-medium">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rojo" />
                  {p.titulo}
                </h3>
                <p className="mt-2 pl-3.5 text-sm leading-relaxed text-texto-suave">
                  {p.texto}
                </p>
              </div>
            ))}
          </div>
        </Seccion>

        {/* Certificados */}
        <Seccion titulo="La constancia lleva código">
          <div className="flex flex-col gap-4 rounded-xl border border-borde bg-superficie p-6 sm:flex-row sm:items-start">
            <BadgeCheck size={34} className="shrink-0 text-rojo-acento" aria-hidden="true" />
            <div>
              <p className="leading-relaxed text-texto-suave">
                Quien asiste a un dictado en vivo recibe una constancia de participación
                con su nombre completo, las horas cursadas, la fecha y un código único
                de emisión. Es una constancia, no un título universitario, y no se
                vende como tal.
              </p>
            </div>
          </div>
        </Seccion>

        {/* Stack */}
        <Seccion titulo="Las herramientas de las clases" ancho="amplio">
          <p className="-mt-4 mb-9 leading-relaxed text-texto-suave">
            Lo que vas a tocar en las sesiones. Nada de pseudocódigo ni entornos de
            juguete.
          </p>
          <Stack />
        </Seccion>

        {/* Cómo funciona */}
        <Seccion titulo="Cómo funciona">
          <dl className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {comoFunciona.map((c) => (
              <div key={c.titulo}>
                <dt className="font-medium">{c.titulo}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-texto-suave">
                  {c.texto}
                </dd>
              </div>
            ))}
          </dl>
        </Seccion>

        {/* Quién enseña. Sale de `personas`, la misma tabla que gestiona el
            panel: no hay una lista aparte en el código. Cuando el equipo se
            amplía, esta sección cambia sin desplegar nada. */}
        <Seccion titulo="Quién enseña" ancho="amplio">
          <div className="grid items-stretch gap-5 sm:grid-cols-2">
            {docentes.length > 0 ? (
              docentes.map((persona) => <FichaPersona key={persona.id} persona={persona} />)
            ) : (
              <article className="flex flex-col justify-center rounded-xl bg-superficie p-6 shadow-sm">
                <p className="text-sm leading-relaxed text-texto-suave">
                  Estamos cerrando las fechas de los próximos cursos. Mientras
                  tanto,{" "}
                  <Link
                    href="/equipo"
                    className="font-medium text-rojo-acento underline-offset-4 hover:underline"
                  >
                    mira quién forma el equipo
                  </Link>
                  .
                </p>
              </article>
            )}

            {/* Plaza libre: se lee como un hueco por llenar, no como un aviso de empleo. */}
            <article className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-borde-fuerte bg-superficie p-6 text-center">
              <div
                aria-hidden="true"
                className="flex size-14 items-center justify-center rounded-full border-2 border-dashed border-borde-fuerte"
              >
                <UserPlus size={22} className="text-texto-tenue" />
              </div>

              {/* Esqueleto: insinúa la ficha que todavía no existe. */}
              <div aria-hidden="true" className="mt-5 w-full max-w-[13rem] space-y-2">
                <div className="mx-auto h-3 w-3/4 rounded bg-borde" />
                <div className="mx-auto h-2.5 w-1/2 rounded bg-borde" />
                <div className="mt-4 space-y-1.5">
                  <div className="h-2 w-full rounded bg-borde" />
                  <div className="h-2 w-11/12 rounded bg-borde" />
                  <div className="h-2 w-4/6 rounded bg-borde" />
                </div>
              </div>

              <h3 className="mt-7 font-medium text-texto">{plazaLibre.titulo}</h3>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-texto-suave">
                {plazaLibre.texto}
              </p>

              <a
                href={`mailto:${plazaLibre.correo}?subject=Quiero dictar en EDUQA.PE`}
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-rojo-acento underline-offset-4 hover:underline"
              >
                <Mail size={16} aria-hidden="true" />
                {plazaLibre.correo}
              </a>
            </article>
          </div>
        </Seccion>

        {/* FAQ */}
        <Seccion titulo="Preguntas">
          <div className="divide-y divide-borde border-y border-borde">
            {faq.map((f) => (
              <details key={f.p} className="group py-4">
                <summary className="flex cursor-pointer list-none items-start gap-2.5 font-medium marker:content-none">
                  <ChevronDown
                    size={18}
                    className="mt-0.5 shrink-0 text-texto-tenue transition-transform group-open:rotate-180 group-open:text-rojo-acento"
                    aria-hidden="true"
                  />
                  {f.p}
                </summary>
                <p className="mt-2.5 pl-7 leading-relaxed text-texto-suave">{f.r}</p>
              </details>
            ))}
          </div>
        </Seccion>

        {/* Cierre. El papel rojo es de la cabecera: repetirlo aquí competía
            con ella y dejaba un bloque suelto antes del pie. El cierre se lee
            como una sección más, con su título a la misma escala, y la acción
            lleva el botón principal de la página. */}
        <Seccion>
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-md">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {usuario
                  ? "Sigue donde lo dejaste"
                  : `Empieza con ${LIMITE_PLAN_GRATIS} cursos gratis`}
              </h2>
              <p className="mt-3 leading-relaxed text-texto-suave">
                {usuario
                  ? "Tus cursos y tu material te están esperando."
                  : "Crear la cuenta toma un minuto y no pide tarjeta. Te matriculas y el material se abre al instante."}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <Link href={usuario ? "/cursos" : "/registro"}>
                <Boton>
                  {usuario ? "Ir a mis cursos" : "Crear cuenta gratis"}
                  <ArrowRight size={16} aria-hidden="true" />
                </Boton>
              </Link>
              {!usuario && (
                <Link href="/catalogo">
                  <Boton variante="secundario">Ver cursos</Boton>
                </Link>
              )}
            </div>
          </div>
        </Seccion>
      </main>

      <footer className="border-t border-borde bg-superficie">
        <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:py-12">
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <Llama className="h-7 w-auto text-rojo-acento" />
                <span className="text-sm font-bold uppercase tracking-[0.18em] text-texto">
                  {marca.nombre}
                </span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-texto-suave">
                Formación técnica en vivo, en español y desde Perú.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs text-texto-tenue">
                <Radio size={14} aria-hidden="true" />
                {marca.ciudad}
              </span>

              {/* Las redes son de la marca, no un enlace más de navegación. */}
              <div className="-ml-2 mt-4 flex items-center gap-1">
                <a
                  href="https://www.linkedin.com/company/eduqa-pe"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="EDUQA.PE en LinkedIn"
                  className="flex size-9 items-center justify-center rounded-lg text-texto-suave transition-colors hover:bg-fondo hover:text-rojo-acento"
                >
                  <IconoRed nombre="linkedin" className="size-5" />
                </a>
              </div>
            </div>

            {/* Cada enlace tiene que servirle a quien lo ve. Sin sesión no se
                muestran destinos que solo devuelven al login, y lo interno del
                equipo (recursos) no se anuncia en la portada: se llega desde
                la barra lateral según el rol. */}
            <ColumnaPie
              titulo="Explora"
              enlaces={[
                { href: "/catalogo", texto: "Cursos" },
                { href: "/blog", texto: "Blog" },
                { href: "/verificar", texto: "Verificar una constancia" },
              ]}
            />

            <ColumnaPie
              titulo="Nosotros"
              enlaces={[
                { href: "/equipo", texto: "Equipo" },
                {
                  href: `mailto:${plazaLibre.correo}?subject=Quiero dictar en EDUQA.PE`,
                  texto: "Quiero dictar en EDUQA",
                },
              ]}
            />

            <ColumnaPie
              titulo="Cuenta"
              enlaces={
                usuario
                  ? [
                      { href: "/cursos", texto: "Mis cursos" },
                      { href: "/calendario", texto: "Calendario" },
                      { href: "/certificaciones", texto: "Mis certificaciones" },
                      { href: "/ajustes", texto: "Ajustes" },
                    ]
                  : [
                      { href: "/registro", texto: "Crear cuenta" },
                      { href: "/acceder", texto: "Acceder" },
                    ]
              }
            />
          </div>
        </div>

        {/* Franja legal: el Libro de Reclamaciones es una obligación del
            proveedor, va junto al copyright y no entre redes o comunidad. */}
        <div className="border-t border-borde bg-fondo/60">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-5 text-sm text-texto-tenue sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {marca.nombre}. Todos los derechos reservados.
            </p>
            <Link
              href="/reclamaciones"
              className="inline-flex items-center gap-2.5 transition-colors hover:text-rojo-acento"
            >
              <span className="rounded bg-white px-1.5 py-1 ring-1 ring-borde">
                <img
                  src="/libro-de-reclamaciones.svg"
                  alt=""
                  width={48}
                  height={33}
                  className="h-5 w-auto"
                />
              </span>
              Libro de Reclamaciones
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

function ColumnaPie({
  titulo,
  enlaces,
}: {
  titulo: string;
  enlaces: { href: string; texto: string }[];
}) {
  return (
    <div className="min-w-0">
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-texto">
        {titulo}
      </h2>
      <ul className="space-y-3 text-sm text-texto-suave">
        {enlaces.map((enlace) => (
          <li key={enlace.href}>
            {enlace.href.startsWith("mailto:") ? (
              <a href={enlace.href} className="transition-colors hover:text-rojo-acento">
                {enlace.texto}
              </a>
            ) : (
              <Link href={enlace.href} className="transition-colors hover:text-rojo-acento">
                {enlace.texto}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
