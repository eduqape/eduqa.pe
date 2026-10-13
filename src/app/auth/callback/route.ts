import { NextResponse, type NextRequest } from "next/server";
import { clienteServidor } from "@/lib/supabase/servidor";
import { rutaInterna } from "@/lib/ruta-interna";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const destino = rutaInterna(searchParams.get("next"));

  if (code) {
    const supabase = await clienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${destino}`);
    }

    console.error("[auth/callback]", error.message);
  }

  const volver = new URL("/acceder", origin);
  volver.searchParams.set("error", "oauth_google");
  if (destino !== "/panel") volver.searchParams.set("volverA", destino);
  return NextResponse.redirect(volver);
}
