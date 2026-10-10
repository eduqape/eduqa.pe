"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";

/**
 * Avatar con el menú de la cuenta, arriba a la derecha.
 *
 * La foto se guarda en un bucket público y se muestra tal cual; si no hay,
 * se dibujan las iniciales. Nunca se deja el hueco vacío ni un icono genérico:
 * el avatar es lo que dice de un vistazo con qué cuenta estás dentro, que en
 * una plataforma con modo administrador importa.
 */
export function MenuPerfil({
  nombre,
  correo,
  foto,
  onSalir,
}: {
  nombre?: string | null;
  correo?: string | null;
  foto?: string | null;
  onSalir: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("mousedown", fuera);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("mousedown", fuera);
      window.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  const iniciales = (nombre ?? correo ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Tu cuenta"
        className="flex size-10 items-center justify-center overflow-hidden rounded-lg border border-borde bg-superficie text-sm font-semibold text-texto-suave transition-colors hover:border-rojo-acento"
      >
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" className="size-full object-cover" />
        ) : (
          iniciales || <User size={17} aria-hidden="true" />
        )}
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-56 rounded-xl border border-borde bg-fondo p-1.5 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-texto">{nombre || "Tu cuenta"}</p>
            {correo && <p className="truncate text-xs text-texto-tenue">{correo}</p>}
          </div>
          <span className="mx-1 block h-px bg-borde" aria-hidden="true" />

          <Link
            href="/ajustes"
            role="menuitem"
            onClick={() => setAbierto(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-texto-suave transition-colors hover:bg-superficie hover:text-texto"
          >
            <Settings size={15} aria-hidden="true" />
            Ajustes
          </Link>

          <span className="mx-1 my-1 block h-px bg-borde" aria-hidden="true" />
          <form action={onSalir}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-texto-suave transition-colors hover:bg-superficie hover:text-rojo-acento"
            >
              <LogOut size={15} aria-hidden="true" />
              Salir
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
