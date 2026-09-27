import { NextResponse } from "next/server";
import { perfilActual } from "@/lib/matriculas";
import { alertasAdmin } from "@/lib/alertas-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const perfil = await perfilActual();
  if (!perfil?.es_admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const alertas = await alertasAdmin(12);
  return NextResponse.json(
    { alertas },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
