import Link from "next/link";
import type { Metadata } from "next";
import { Llama } from "@/components/Llama";
import { Formulario } from "./Formulario";
import { Llama3DPerezosa } from "./Llama3DPerezosa";

export const metadata: Metadata = {
  title: "Acceder — EDUQA.PE",
  robots: { index: false, follow: false },
};

function destinoSeguro(valor: string | string[] | undefined) {
  return typeof valor === "string" && valor.startsWith("/") && !valor.startsWith("//")
    ? valor
    : "/panel";
}

export default async function Page({ searchParams }: PageProps<"/acceder">) {
  // Next 16: searchParams llega como promesa.
  const { volverA, error } = await searchParams;
  const destino = destinoSeguro(volverA);
  const errorInicial =
    error === "oauth_google"
      ? "No pudimos completar el acceso con Google. Intenta de nuevo."
      : undefined;

  return (
    <main className="grid min-h-dvh bg-rojo text-white lg:grid-cols-2">
      <section className="flex flex-col px-6 pt-8 lg:px-12 lg:py-10">
        <Link href="/" className="flex items-center gap-3 self-center lg:self-start">
          <Llama className="h-12 w-auto text-white" />
          <span className="text-base font-bold uppercase tracking-[0.2em]">EDUQA.PE</span>
        </Link>
        <div className="hidden min-h-0 flex-1 lg:block" aria-hidden="true">
          <Llama3DPerezosa />
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 lg:py-12">
        <div className="w-full max-w-sm rounded-2xl border border-borde bg-fondo p-7 text-texto shadow-xl">
          <h1 className="text-xl font-semibold tracking-tight">Acceder</h1>

          <div className="mt-6">
            <Formulario volverA={destino} errorInicial={errorInicial} />
          </div>
        </div>
      </section>
    </main>
  );
}
