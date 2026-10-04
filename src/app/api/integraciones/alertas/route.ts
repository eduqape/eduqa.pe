import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Evento = {
  tipo?: "push" | "deploy";
  sha?: string;
  branch?: string;
  actor?: string;
  message?: string;
};

function shaValido(sha: string) {
  return /^[0-9a-f]{40}$/i.test(sha);
}

async function validarPush(sha: string) {
  const respuesta = await fetch(
    `https://api.github.com/repos/seminarioA/eduqa.pe/commits/${sha}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "eduqa.pe-alertas-ci",
      },
      cache: "no-store",
    },
  );

  if (!respuesta.ok) return null;
  const commit = (await respuesta.json()) as {
    sha?: string;
    html_url?: string;
    commit?: { message?: string; committer?: { date?: string } };
  };

  if (commit.sha !== sha) return null;

  const fecha = commit.commit?.committer?.date
    ? new Date(commit.commit.committer.date).getTime()
    : 0;
  if (!fecha || Date.now() - fecha > 24 * 60 * 60 * 1000) return null;

  return commit;
}

export async function POST(request: Request) {
  let body: Evento;
  try {
    body = (await request.json()) as Evento;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const tipo = body.tipo;
  const sha = String(body.sha ?? "").toLowerCase();
  if ((tipo !== "push" && tipo !== "deploy") || !shaValido(sha)) {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }

  let titulo = "";
  let cuerpo = "";
  let url: string | null = null;
  let estado: "info" | "success" = "info";
  let metadata: Record<string, unknown> = { sha };

  if (tipo === "push") {
    const commit = await validarPush(sha);
    if (!commit) {
      return NextResponse.json({ error: "Push no verificable" }, { status: 403 });
    }

    const branch = String(body.branch ?? "dev").slice(0, 80);
    const actor = String(body.actor ?? "GitHub").slice(0, 120);
    const message = String(body.message ?? commit.commit?.message ?? "Nuevo commit")
      .split("\n")[0]
      .slice(0, 180);

    titulo = `Push en ${branch}`;
    cuerpo = `${actor} · ${message} · ${sha.slice(0, 7)}`;
    url = commit.html_url ?? null;
    metadata = { sha, branch, actor };
  } else {
    if (
      process.env.VERCEL_ENV !== "production" ||
      process.env.VERCEL_GIT_COMMIT_SHA?.toLowerCase() !== sha
    ) {
      return NextResponse.json(
        { error: "El commit todavía no está activo en producción" },
        { status: 409 },
      );
    }

    titulo = "Deploy listo en producción";
    cuerpo = `Producción ya sirve el commit ${sha.slice(0, 7)}.`;
    estado = "success";
    const dominio =
      process.env.VERCEL_PROJECT_PRODUCTION_URL ??
      process.env.VERCEL_URL ??
      "eduqape.vercel.app";
    url = dominio.startsWith("http") ? dominio : `https://${dominio}`;
    metadata = {
      sha,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? "main",
    };
  }

  const { error } = await supabaseAdmin()
    .from("alertas_admin")
    .upsert(
      {
        event_key: `${tipo}:${sha}`,
        tipo,
        estado,
        titulo,
        cuerpo,
        url,
        metadata,
      },
      { onConflict: "event_key", ignoreDuplicates: true },
    );

  if (error) {
    console.error("[alertas-ci]", error);
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
