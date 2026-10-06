import Link from "next/link";
import { marcaActual } from "@/lib/marca";
import { MarcaInline } from "@/components/LlamaMarca";
import { MenuPerfil } from "@/components/MenuPerfil";

/**
 * Cabecera de las páginas internas.
 *
 * Existe para que las cinco secciones no repitan el mismo bloque con
 * variaciones: cuando había una copia por página, cambiar el destino del logo
 * obligaba a tocarlas todas y alguna se quedaba atrás.
 */
export async function CabeceraApp({
  nombre,
  correo,
  foto,
  onSalir,
}: {
  nombre?: string;
  correo?: string | null;
  foto?: string | null;
  /** Sin esto no se dibuja el menú: no tiene sentido ofrecer salir sin acción. */
  onSalir?: () => void;
}) {
  // La cabecera pinta la marca personalizada si la hay; la lectura está
  // cacheada por request y ya se pidió para la barra lateral.
  const { cabecera } = await marcaActual();

  return (
    <div className="flex items-start justify-between gap-4">
      <Link href="/cursos" className="flex items-center gap-3">
      <MarcaInline svg={cabecera ?? null} className="h-12 w-auto shrink-0 text-rojo-acento" />
      {/* Sin saludo: es la cabecera de páginas de trabajo; la bienvenida
          va solo en /cursos, que es la entrada. */}
      <span className="text-base font-bold uppercase tracking-[0.2em] text-rojo-acento">
        EDUQA.PE
      </span>
      </Link>

      {onSalir && (
        <MenuPerfil nombre={nombre} correo={correo} foto={foto} onSalir={onSalir} />
      )}
    </div>
  );
}
