"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, MailKey } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import {
  accederConContrasena,
  enviarCodigoAcceso,
  verificarCodigoAcceso,
  type EstadoAcceso,
} from "./acciones";
import { Boton, Campo, claseInput } from "@/components/ui";
import { clienteNavegador } from "@/lib/supabase/navegador";

type Metodo = "contrasena" | "codigo";

export function Formulario({
  volverA,
  errorInicial,
}: {
  volverA: string;
  errorInicial?: string;
}) {
  const [metodo, setMetodo] = useState<Metodo>("contrasena");
  const [emailCodigo, setEmailCodigo] = useState("");
  const [enviandoGoogle, setEnviandoGoogle] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [errorGoogle, setErrorGoogle] = useState<string | null>(errorInicial ?? null);

  const [estadoPass, accionPass, enviandoPass] = useActionState<
    EstadoAcceso | null,
    FormData
  >(accederConContrasena, null);

  const [estadoEnvioCodigo, accionEnvioCodigo, enviandoCodigo] = useActionState<
    EstadoAcceso | null,
    FormData
  >(enviarCodigoAcceso, null);

  const [estadoVerificacion, accionVerificacion, verificandoCodigo] = useActionState<
    EstadoAcceso | null,
    FormData
  >(verificarCodigoAcceso, null);

  async function accederConGoogle() {
    setEnviandoGoogle(true);
    setErrorGoogle(null);

    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", volverA);

    const supabase = clienteNavegador();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
      },
    });

    if (error) {
      console.error("[accederConGoogle]", error.message);
      setErrorGoogle("No pudimos iniciar el acceso con Google. Intenta de nuevo.");
      setEnviandoGoogle(false);
    }
  }

  return (
    <div>
      <Boton
        type="button"
        variante="secundario"
        className="w-full"
        disabled={enviandoGoogle}
        onClick={accederConGoogle}
      >
        {enviandoGoogle ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <FcGoogle size={18} aria-hidden="true" />
        )}
        {enviandoGoogle ? "Abriendo Google…" : "Continuar con Google"}
      </Boton>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-borde" />
        <span className="text-xs text-texto-tenue">o continúa con correo</span>
        <span className="h-px flex-1 bg-borde" />
      </div>

      {errorGoogle && (
        <p
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-rojo-acento/30 bg-rojo-tenue px-3 py-2.5 text-sm text-rojo-acento"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {errorGoogle}
        </p>
      )}

      <div
        role="tablist"
        aria-label="Método de acceso"
        className="mb-6 flex rounded-lg border border-borde bg-superficie p-1"
      >
        {(
          [
            { id: "contrasena", etiqueta: "Contraseña", Icono: KeyRound },
            { id: "codigo", etiqueta: "Código", Icono: MailKey },
          ] as const
        ).map(({ id, etiqueta, Icono }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={metodo === id}
            onClick={() => setMetodo(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
              metodo === id
                ? "bg-fondo text-texto shadow-sm"
                : "text-texto-tenue hover:text-texto"
            }`}
          >
            <Icono size={14} aria-hidden="true" />
            {etiqueta}
          </button>
        ))}
      </div>

      {metodo === "contrasena" ? (
        <form action={accionPass} className="space-y-4">
          <input type="hidden" name="volverA" value={volverA} />

          <Campo etiqueta="Correo">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@correo.com"
              className={claseInput}
            />
          </Campo>

          <Campo etiqueta="Contraseña">
            <div className="relative">
              <input
                name="password"
                type={mostrarContrasena ? "text" : "password"}
                required
                autoComplete="current-password"
                className={`${claseInput} pr-11`}
              />
              <button
                type="button"
                onClick={() => setMostrarContrasena((actual) => !actual)}
                aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={mostrarContrasena}
                title={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-texto-tenue transition-colors hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-rojo-acento"
              >
                {mostrarContrasena ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
          </Campo>

          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Recuperación de contraseña próximamente"
            className="w-full cursor-not-allowed text-right text-xs text-texto-tenue opacity-60"
          >
            Olvidé mi contraseña
          </button>

          {estadoPass && !estadoPass.ok && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rojo-acento/30 bg-rojo-tenue px-3 py-2.5 text-sm text-rojo-acento"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {estadoPass.error}
            </p>
          )}

          <Boton type="submit" disabled={enviandoPass} className="w-full">
            {enviandoPass && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {enviandoPass ? "Comprobando…" : "Entrar"}
          </Boton>
        </form>
      ) : estadoEnvioCodigo?.ok ? (
        <form action={accionVerificacion} className="space-y-4">
          <input type="hidden" name="volverA" value={volverA} />
          <input type="hidden" name="email" value={emailCodigo} />

          <p className="flex items-start gap-2 rounded-lg border border-borde bg-superficie px-3 py-2.5 text-sm text-texto-suave">
            <CheckCircle2
              size={16}
              className="mt-0.5 shrink-0 text-exito"
              aria-hidden="true"
            />
            {estadoEnvioCodigo.aviso}
          </p>

          <Campo etiqueta="Código">
            <input
              name="codigo"
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              className={claseInput}
              autoFocus
            />
          </Campo>

          {estadoVerificacion && !estadoVerificacion.ok && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rojo-acento/30 bg-rojo-tenue px-3 py-2.5 text-sm text-rojo-acento"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {estadoVerificacion.error}
            </p>
          )}

          <Boton type="submit" disabled={verificandoCodigo} className="w-full">
            {verificandoCodigo && (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            )}
            {verificandoCodigo ? "Verificando…" : "Entrar con código"}
          </Boton>

          <button
            type="button"
            onClick={() => setMetodo("codigo")}
            className="w-full text-center text-xs text-texto-tenue hover:text-texto"
          >
            Usar otro correo
          </button>
        </form>
      ) : (
        <form action={accionEnvioCodigo} className="space-y-4">
          <Campo etiqueta="Correo">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@correo.com"
              className={claseInput}
              value={emailCodigo}
              onChange={(event) => setEmailCodigo(event.target.value)}
            />
          </Campo>

          {estadoEnvioCodigo && !estadoEnvioCodigo.ok && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rojo-acento/30 bg-rojo-tenue px-3 py-2.5 text-sm text-rojo-acento"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {estadoEnvioCodigo.error}
            </p>
          )}

          <Boton type="submit" disabled={enviandoCodigo} className="w-full">
            {enviandoCodigo && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {enviandoCodigo ? "Enviando…" : "Enviar código"}
          </Boton>
        </form>
      )}

      <p className="mt-6 text-center text-xs leading-relaxed text-texto-tenue">
        Con Google puedes entrar o crear tu cuenta en el mismo flujo.
      </p>
    </div>
  );
}
