import {
  BASE_BASH,
  DIRECTORIO_BASH,
  ENTORNO_BASH,
  LIMITE_MS_BASH,
  LIMITE_SALIDA_BASH,
  ORDEN_BASH,
  PAQUETES_BASH,
  SCRIPT_BASH,
  limpiarSalidaBash,
  prepararScriptBash,
} from "@/lib/bash-comun";

export type ResultadoBash = { salida: string; error: boolean; codigo: number | null };
export type EstadoBash = "sin-empezar" | "cargando" | "listo" | "error" | "no-disponible";

/*
 * Tipos mínimos del SDK de Wasmer. El SDK no pasa por el bundler: se sirve
 * tal cual desde `public/vendor/bash/sdk` y se importa en tiempo de ejecución,
 * porque resuelve su Worker y su `.wasm` relativos a su propia URL.
 */
type Paquete = unknown;
type Salida = { exitCode: number | null; reason: "exited" | "terminated" | "timeout"; stdout: { bytes: Uint8Array; truncated: boolean } };
type Sandbox = {
  command(nombre: string, args: string[], opciones: { cwd: string }): {
    run(opciones: { stdin?: string; timeoutMs: number; outputBytes: number; check: false }): Promise<Salida>;
  };
  close(): Promise<void>;
};
type Cliente = {
  packages: { load(bytes: Uint8Array): Promise<Paquete> };
  sandboxes: { create(opciones: { packages: Paquete[]; files: Record<string, string>; env: Record<string, string> }): Promise<Sandbox> };
};

let motor: Promise<{ cliente: Cliente; paquetes: Paquete[] }> | null = null;
let estado: EstadoBash = "sin-empezar";
let ejecucionesActivas = 0;
const oyentes = new Set<() => void>();

function cambiarEstado(valor: EstadoBash) {
  estado = valor;
  oyentes.forEach((avisar) => avisar());
}

export const estadoBash = () => estado;
export function suscribirseBash(avisar: () => void) {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

/**
 * El runtime de WASIX reparte los procesos entre Workers que comparten
 * memoria, y `SharedArrayBuffer` solo existe en un documento aislado
 * (cabeceras COOP y COEP, que `proxy.ts` pone en las lecciones).
 */
export const bashDisponible = () =>
  typeof window !== "undefined" && window.crossOriginIsolated === true;

async function cargarMotor() {
  const url = `${BASE_BASH}/sdk/dist/index.js`;
  const { Wasmer } = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as {
    Wasmer: new () => Cliente;
  };
  const cliente = new Wasmer();
  const paquetes = await Promise.all(
    PAQUETES_BASH.map(async (nombre) => {
      const respuesta = await fetch(`${BASE_BASH}/paquetes/${nombre}`);
      if (!respuesta.ok) throw new Error(`No se pudo descargar ${nombre}.`);
      return cliente.packages.load(new Uint8Array(await respuesta.arrayBuffer()));
    }),
  );
  return { cliente, paquetes };
}

/** Descarga el runtime y los paquetes una sola vez por documento. */
export async function prepararBash(): Promise<boolean> {
  if (!bashDisponible()) {
    cambiarEstado("no-disponible");
    return false;
  }
  if (!motor) {
    cambiarEstado("cargando");
    motor = cargarMotor();
  }
  try {
    await motor;
    cambiarEstado("listo");
    return true;
  } catch {
    motor = null;
    cambiarEstado("error");
    return false;
  }
}

/**
 * Cada ejecución usa un sandbox nuevo: un bloque no ve los archivos ni las
 * variables que dejó el anterior, igual que quien entra directo a esa sesión.
 */
export async function ejecutarBash(
  codigo: string,
  opciones: { signal?: AbortSignal; entrada?: string; archivos?: Record<string, string> } = {},
): Promise<ResultadoBash> {
  if (opciones.signal?.aborted) return { salida: "Ejecución cancelada.", error: true, codigo: null };
  if (ejecucionesActivas >= 2) {
    return { salida: "Espera a que termine una de las ejecuciones abiertas.", error: true, codigo: null };
  }
  if (!(await prepararBash()) || !motor) {
    return {
      salida: bashDisponible()
        ? "No se pudo cargar Bash. Comprueba tu conexión e inténtalo de nuevo."
        : "Este navegador no permite ejecutar Bash aquí. Funciona en Chrome, Edge y Firefox actualizados.",
      error: true,
      codigo: null,
    };
  }

  ejecucionesActivas++;
  const { cliente, paquetes } = await motor;
  let sandbox: Sandbox | null = null;
  const cancelar = () => void sandbox?.close();
  opciones.signal?.addEventListener("abort", cancelar, { once: true });
  try {
    sandbox = await cliente.sandboxes.create({
      packages: paquetes,
      files: { ...opciones.archivos, [SCRIPT_BASH]: prepararScriptBash(codigo) },
      env: ENTORNO_BASH,
    });
    if (opciones.signal?.aborted) return { salida: "Ejecución cancelada.", error: true, codigo: null };
    const resultado = await sandbox
      .command("bash", ORDEN_BASH, { cwd: DIRECTORIO_BASH })
      .run({ stdin: opciones.entrada, timeoutMs: LIMITE_MS_BASH, outputBytes: LIMITE_SALIDA_BASH, check: false });
    const salida = limpiarSalidaBash(new TextDecoder().decode(resultado.stdout.bytes));
    if (resultado.reason === "timeout") {
      return { salida: `${salida}\nSe alcanzó el tiempo límite de ${LIMITE_MS_BASH / 1000} s.`, error: true, codigo: null };
    }
    return {
      salida: resultado.stdout.truncated ? `${salida}\n[Salida recortada]` : salida,
      error: false,
      codigo: resultado.exitCode,
    };
  } catch {
    return {
      salida: opciones.signal?.aborted ? "Ejecución cancelada." : "No se pudo ejecutar el script.",
      error: true,
      codigo: null,
    };
  } finally {
    ejecucionesActivas--;
    opciones.signal?.removeEventListener("abort", cancelar);
    void sandbox?.close().catch(() => {});
  }
}
