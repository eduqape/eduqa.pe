import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { clienteServidor } from "@/lib/supabase/servidor";
import { rutaInterna } from "@/lib/ruta-interna";

/**
 * Destino del enlace enviado por correo. Supabase manda aquí un token de un
 * solo uso; al verificarlo se establece la sesión mediante cookies.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Solo rutas internas: un destino externo convertiría esto en redirección abierta.
  const destino = rutaInterna(searchParams.get("volverA"));

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/acceder?error=enlace_invalido`);
  }

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    return NextResponse.redirect(`${origin}/acceder?error=enlace_caducado`);
  }

  return NextResponse.redirect(`${origin}${destino}`);
}
