"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { rutaInterna } from "@/lib/ruta-interna";

export type EstadoAcceso = { ok: false; error: string } | { ok: true; aviso: string };

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_CODIGO = /^\d{6}$/;

function limpiar(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

export async function accederConContrasena(
  _prev: EstadoAcceso | null,
  formData: FormData,
): Promise<EstadoAcceso> {
  const email = limpiar(formData.get("email")).toLowerCase();
  const password = limpiar(formData.get("password"));
  const volverA = rutaInterna(limpiar(formData.get("volverA")));

  if (!RE_EMAIL.test(email)) return { ok: false, error: "Ese correo no parece válido." };
  if (!password) return { ok: false, error: "Escribe tu contraseña." };

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mismo mensaje para correo inexistente y contraseña incorrecta: distinguirlos
    // permitiría averiguar qué correos están registrados.
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }

  revalidatePath("/", "layout");
  redirect(volverA);
}

export async function enviarCodigoAcceso(
  _prev: EstadoAcceso | null,
  formData: FormData,
): Promise<EstadoAcceso> {
  const email = limpiar(formData.get("email")).toLowerCase();

  if (!RE_EMAIL.test(email)) return { ok: false, error: "Ese correo no parece válido." };

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Las altas se hacen desde el flujo de registro; iniciar sesión no crea cuentas.
      shouldCreateUser: false,
    },
  });

  if (error) {
    console.error("[enviarCodigoAcceso]", error);
    return { ok: false, error: "No pudimos enviar el código. Intenta de nuevo." };
  }

  return {
    ok: true,
    aviso: "Si ese correo está registrado, recibirás un código de 6 dígitos.",
  };
}

export async function verificarCodigoAcceso(
  _prev: EstadoAcceso | null,
  formData: FormData,
): Promise<EstadoAcceso> {
  const email = limpiar(formData.get("email")).toLowerCase();
  const codigo = limpiar(formData.get("codigo"));
  const volverA = rutaInterna(limpiar(formData.get("volverA")));

  if (!RE_EMAIL.test(email)) return { ok: false, error: "Ese correo no parece válido." };
  if (!RE_CODIGO.test(codigo)) {
    return { ok: false, error: "Escribe el código de 6 dígitos." };
  }

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: codigo,
    type: "email",
  });

  if (error) {
    return { ok: false, error: "El código es incorrecto o ya caducó." };
  }

  revalidatePath("/", "layout");
  redirect(volverA);
}

export async function cerrarSesion() {
  const supabase = await clienteServidor();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/acceder");
}
