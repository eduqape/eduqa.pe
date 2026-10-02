"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Library,
  CalendarDays,
  BadgeCheck,
  Bug,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogIn,
  Megaphone,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  Stamp,
  UserRound,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { useSyncExternalStore, type ComponentType } from "react";
import { MarcaInline } from "@/components/LlamaMarca";
import { MarcaTextoLateral } from "@/components/MarcaTextoLateral";
import { SelectorTemaCompacto } from "@/components/Tema";
import { CLAVE_BARRA_LATERAL } from "@/lib/barra-lateral";

type Enlace = {
  href: string;
  etiqueta: string;
  Icono: ComponentType<{ size?: number; className?: string }>;
  roles: string;
};

const EVENTO_BARRA = "eduqa:barra-lateral";

function suscribirBarra(avisar: () => void) {
  window.addEventListener(EVENTO_BARRA, avisar);
  const sincronizarOtraPestana = (evento: StorageEvent) => {
    if (evento.key !== CLAVE_BARRA_LATERAL) return;
    document.documentElement.dataset.sidebar =
      evento.newValue === "collapsed" ? "collapsed" : "expanded";
    avisar();
  };
  window.addEventListener("storage", sincronizarOtraPestana);
  return () => {
    window.removeEventListener(EVENTO_BARRA, avisar);
    window.removeEventListener("storage", sincronizarOtraPestana);
  };
}

function barraColapsada() {
  return document.documentElement.dataset.sidebar === "collapsed";
}

function barraExpandidaEnServidor() {
  return false;
}

/**
 * Barra lateral rectangular, pegada al borde de la aplicación.
 *
 * Va expandida, con la etiqueta al lado de cada icono. Un icono solo obliga a
 * adivinar o a esperar un rótulo emergente, y en una barra de cinco destinos
 * ese coste no compensa el ancho que se ahorra.
 */
export function Isla({
  autenticado,
  esAdmin,
  esInterno = false,
  marcaSidebar = null,
}: {
  autenticado: boolean;
  esAdmin: boolean;
  /** Profesores, gestores, desarrolladores y agentes, además de administradores. */
  esInterno?: boolean;
  /** SVG personalizado de la marca para la barra lateral; null usa la llama original. */
  marcaSidebar?: string | null;
}) {
  const ruta = usePathname();
  const colapsada = useSyncExternalStore(
    suscribirBarra,
    barraColapsada,
    barraExpandidaEnServidor,
  );

  const alternarBarra = () => {
    const siguiente = colapsada ? "expanded" : "collapsed";
    document.documentElement.dataset.sidebar = siguiente;
    try {
      window.localStorage.setItem(CLAVE_BARRA_LATERAL, siguiente);
    } catch {
      // La barra sigue funcionando si el navegador bloquea el almacenamiento.
    }
    window.dispatchEvent(new Event(EVENTO_BARRA));
  };

  /*
   * Para quien ya entró, el inicio es la lista de cursos. La portada es una
   * página comercial: no pinta nada en la navegación de alguien que ya es
   * alumno, así que ni el logo ni el icono de casa llevan allí.
   */
  const inicio = autenticado ? "/cursos" : "/";

  // La portada y las pantallas de autenticación tienen un layout propio y no
  // necesitan navegación lateral: mostrarla ahí añade ruido antes de entrar.
  if (ruta === "/" || ruta === "/acceder" || ruta === "/registro") return null;

  // Dentro de una lección manda el índice del curso.
  if (/^\/cursos\/[^/]+\/[^/]+/.test(ruta)) return null;

  /*
   * Enlaces principales organizados por áreas de uso.
   */
  const enlaces: Enlace[] = autenticado
    ? [
        { href: "/cursos", etiqueta: "Cursos", Icono: GraduationCap, roles: "Alumno, Profesor, Gestor, Desarrollador, Agente de IA y Administrador" },
        { href: "/proximos-cursos", etiqueta: "Próximos cursos", Icono: ListChecks, roles: "Alumno, Profesor, Gestor, Desarrollador, Agente de IA y Administrador" },
        { href: "/equipo", etiqueta: "Equipo", Icono: Users, roles: "Alumno, Profesor, Gestor, Desarrollador, Agente de IA y Administrador" },
        { href: "/blog", etiqueta: "Blog", Icono: Newspaper, roles: "Alumno, Profesor, Gestor, Desarrollador, Agente de IA y Administrador" },
        { href: "/calendario", etiqueta: "Calendario", Icono: CalendarDays, roles: "Alumno, Profesor, Gestor, Desarrollador, Agente de IA y Administrador" },
        { href: "/compras", etiqueta: "Mis compras", Icono: Receipt, roles: "Alumno, Profesor, Gestor, Desarrollador, Agente de IA y Administrador" },
        {
          href: "/certificaciones",
          etiqueta: "Certificaciones",
          Icono: BadgeCheck,
          roles: "Alumno, Profesor, Gestor, Desarrollador, Agente de IA y Administrador",
        },
        ...(esInterno
          ? [{ href: "/recursos", etiqueta: "Recursos", Icono: Library, roles: "Profesor, Gestor, Desarrollador, Agente de IA y Administrador" }]
          : []),
        ...(esAdmin
          ? [
              { href: "/panel/cursos", etiqueta: "Gestión académica", Icono: GraduationCap, roles: "Administrador" },
              { href: "/panel/personas", etiqueta: "Equipo", Icono: Users, roles: "Administrador" },
              { href: "/panel/avisos", etiqueta: "Avisos", Icono: Megaphone, roles: "Administrador" },
              { href: "/panel/reportes", etiqueta: "Reportes", Icono: Bug, roles: "Administrador" },
              { href: "/panel/marca", etiqueta: "Marca", Icono: Stamp, roles: "Administrador" },
            ]
          : []),
      ]
    : [
        { href: "/acceder", etiqueta: "Entrar", Icono: LogIn, roles: "Visitante" },
        { href: "/registro", etiqueta: "Crear cuenta", Icono: UserRoundPlus, roles: "Visitante" },
        { href: "/equipo", etiqueta: "Equipo", Icono: Users, roles: "Visitante" },
        { href: "/blog", etiqueta: "Blog", Icono: Newspaper, roles: "Visitante" },
      ];

  return (
    <nav
      id="barra-lateral"
      aria-label="Navegación principal"
      className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-borde bg-fondo lg:flex"
    >
      <Link
        href={inicio}
        aria-label={autenticado ? "Ir a cursos" : "Ir al inicio"}
        title={autenticado ? "Cursos" : "Inicio"}
        className="sidebar-marca flex items-center gap-2 border-b border-borde px-6 py-4 transition-colors hover:bg-superficie"
      >
        <MarcaInline svg={marcaSidebar} className="h-9 w-auto text-rojo-acento" />
        <MarcaTextoLateral ocultarAlColapsar />
      </Link>

      <div className="sidebar-scroll mx-3 mt-3 flex flex-1 flex-col gap-1 overflow-y-auto">
        {enlaces.map(({ href, etiqueta, Icono, roles }) => {
          const activo = ruta === href || (href !== "/cursos" && href !== "/" && ruta.startsWith(href)) || (href === "/panel/cursos" && ruta.startsWith("/panel/rutas"));
          return (
            <Link
              key={href}
              href={href}
              title={esAdmin ? `${etiqueta} — Visible para: ${roles}` : etiqueta}
              aria-label={etiqueta}
              className={`sidebar-enlace flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento ${
                activo
                  ? "bg-superficie font-medium text-rojo-acento"
                  : "text-texto-suave hover:bg-superficie"
              }`}
            >
              <Icono size={18} className={`shrink-0 ${activo ? "text-rojo-acento" : ""}`} />
              <span className="sidebar-etiqueta truncate">{etiqueta}</span>
            </Link>
          );
        })}
      </div>

      {autenticado && (
        <div className="mx-3 border-t border-borde pt-2">
          <Link
            href="/panel"
            title={esAdmin ? "Mi cuenta — Visible para: Alumno, Profesor, Gestor, Desarrollador, Agente de IA y Administrador" : "Mi cuenta"}
            aria-label="Mi cuenta"
            aria-current={ruta === "/panel" ? "page" : undefined}
            className={`sidebar-enlace mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento ${
              ruta === "/panel"
                ? "bg-superficie font-medium text-rojo-acento"
                : "text-texto-suave hover:bg-superficie"
            }`}
          >
            {esInterno ? (
              <LayoutDashboard
                size={18}
                className={`shrink-0 ${ruta === "/panel" ? "text-rojo-acento" : ""}`}
              />
            ) : (
              <UserRound
                size={18}
                className={`shrink-0 ${ruta === "/panel" ? "text-rojo-acento" : ""}`}
              />
            )}
            <span className="sidebar-etiqueta truncate">Mi cuenta</span>
          </Link>

          <Link
            href="/ajustes"
            title={esAdmin ? "Ajustes — Visible para: Alumno, Profesor, Gestor, Desarrollador, Agente de IA y Administrador" : "Ajustes"}
            aria-label="Ajustes"
            aria-current={ruta.startsWith("/ajustes") ? "page" : undefined}
            className={`sidebar-enlace flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rojo-acento ${ruta.startsWith("/ajustes") ? "bg-superficie font-medium text-rojo-acento" : "text-texto-suave hover:bg-superficie"}`}
          >
            <Settings size={18} className={`shrink-0 ${ruta.startsWith("/ajustes") ? "text-rojo-acento" : ""}`} />
            <span className="sidebar-etiqueta truncate">Ajustes</span>
          </Link>
        </div>
      )}

      <div className="sidebar-pie mx-3 mb-4 mt-2 flex items-center justify-between gap-1 border-t border-borde px-1 pt-3">
        <SelectorTemaCompacto />

        <button
          type="button"
          onClick={alternarBarra}
          aria-label={colapsada ? "Expandir barra lateral" : "Colapsar barra lateral"}
          aria-pressed={colapsada}
          title={colapsada ? "Expandir barra lateral" : "Colapsar barra lateral"}
          className="sidebar-control flex size-8 shrink-0 items-center justify-center rounded-lg text-texto-suave transition-colors hover:bg-superficie hover:text-texto focus-visible:outline-2 focus-visible:outline-rojo-acento"
        >
          <PanelLeftClose size={18} className="sidebar-icono-expandido" aria-hidden="true" />
          <PanelLeftOpen size={18} className="sidebar-icono-colapsado" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
