import { clienteServidor } from "@/lib/supabase/servidor";

export type AlertaAdmin = {
  id: string;
  event_key: string;
  tipo: "push" | "deploy";
  estado: "info" | "success" | "error";
  titulo: string;
  cuerpo: string;
  url: string | null;
  metadata: Record<string, unknown>;
  creado_en: string;
};

export async function alertasAdmin(limite = 30): Promise<AlertaAdmin[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("alertas_admin")
    .select("id, event_key, tipo, estado, titulo, cuerpo, url, metadata, creado_en")
    .order("creado_en", { ascending: false })
    .limit(limite);

  if (error) {
    console.error("[alertasAdmin]", error);
    return [];
  }

  return (data ?? []) as AlertaAdmin[];
}
