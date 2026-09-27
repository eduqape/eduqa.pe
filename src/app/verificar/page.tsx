import { redirect } from "next/navigation";
import { BadgeCheck, Search } from "lucide-react";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  const { codigo } = await searchParams;
  const limpio = codigo?.trim();

  if (limpio) {
    redirect(`/verificar/${encodeURIComponent(limpio.toUpperCase())}`);
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <div className="flex items-center gap-2 text-rojo-acento">
        <BadgeCheck size={24} aria-hidden="true" />
        <span className="text-sm font-bold tracking-[0.18em]">EDUQA.PE</span>
      </div>

      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-texto">
        Verificar certificado
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-texto-suave">
        Ingresa el código impreso en la constancia para comprobar su validez.
      </p>

      <form method="get" className="mt-8 flex gap-2">
        <input
          name="codigo"
          required
          autoComplete="off"
          placeholder="EDUQA-..."
          className="min-w-0 flex-1 rounded-lg border border-borde bg-fondo px-4 py-3 font-mono text-sm text-texto outline-none transition-colors focus:border-rojo-acento"
        />
        <button
          type="submit"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-rojo px-4 py-3 text-sm font-semibold text-white hover:bg-rojo-hover"
        >
          <Search size={15} aria-hidden="true" />
          Verificar
        </button>
      </form>
    </main>
  );
}
