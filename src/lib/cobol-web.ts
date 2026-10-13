/**
 * COBOL en el navegador: GnuCOBOL 3.2 y Clang compilados a WebAssembly,
 * fijados en `public/vendor/cobol` (origen y límites en su README). El motor
 * corre en un Worker de módulo; la página solo lo arranca, le pasa programas
 * y lo reemplaza si una ejecución no termina a tiempo.
 *
 * A diferencia de Fortran, el Worker se conserva entre ejecuciones: arrancar
 * Clang cuesta segundos y compilar con el motor ya caliente, décimas.
 */

export type FaseCobol = "cargando" | "compilando" | "ejecutando";
export type EstadoCobol = "sin-empezar" | "cargando" | "listo" | "error";
export type ResultadoCobol = {
  /** Salida estándar y de error en el orden en que se escribieron. */
  salida: string;
  /** No compiló, terminó de forma anormal, se canceló o no se pudo ejecutar. */
  error: boolean;
  compilo: boolean;
  /** Errores o avisos del compilador, sin la carpeta de trabajo del motor. */
  diagnosticos: string;
  codigo: number | null;
  /** Archivos que el programa creó o modificó, con su contenido. */
  archivos: Record<string, string>;
  /** Los de `archivos` que no son texto: su contenido es un volcado hexadecimal. */
  binarios: string[];
};

const WORKER = "/vendor/cobol/worker.mjs?v=3";
const LIMITE_CARGA_MS = 180000;
/** La primera compilación con el motor recién cargado tarda algunos segundos. */
const LIMITE_COMPILACION_MS = 60000;
export const LIMITE_EJECUCION_MS = 10000;

type Motor = { worker: Worker; listo: Promise<string | null> };
let motor: Motor | null = null;
let estado: EstadoCobol = "sin-empezar";
let cola: Promise<unknown> = Promise.resolve();
let siguienteId = 0;
let lectores = 0;
let salidaDelCurso: ReturnType<typeof setTimeout> | undefined;
const oyentes = new Set<() => void>();

function cambiarEstado(valor: EstadoCobol) {
  estado = valor;
  oyentes.forEach((avisar) => avisar());
}

export const estadoCobol = () => estado;
export function suscribirseCobol(avisar: () => void) {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

function crearMotor(): Motor {
  const worker = new Worker(WORKER, { type: "module" });
  const listo = new Promise<string | null>((resolver) => {
    const reloj = setTimeout(() => resolver("Se alcanzó el tiempo límite al cargar COBOL."), LIMITE_CARGA_MS);
    worker.onmessage = ({ data }) => {
      if (data.tipo === "listo" || data.tipo === "fallo") {
        clearTimeout(reloj);
        resolver(data.tipo === "listo" ? null : "No se pudo cargar COBOL. Comprueba tu conexión e inténtalo de nuevo.");
      }
    };
    worker.onerror = () => {
      clearTimeout(reloj);
      resolver("No se pudo cargar COBOL. Comprueba tu conexión e inténtalo de nuevo.");
    };
  });
  worker.postMessage({ tipo: "preparar" });
  return { worker, listo };
}

function descartarMotor() {
  motor?.worker.terminate();
  motor = null;
}

/** Descarga e inicializa el compilador una sola vez por documento. */
export async function prepararCobol(): Promise<boolean> {
  if (!motor) {
    cambiarEstado("cargando");
    try {
      motor = crearMotor();
    } catch {
      cambiarEstado("error");
      return false;
    }
  }
  const actual = motor;
  const fallo = await actual.listo;
  if (motor !== actual) return !fallo;
  if (fallo) descartarMotor();
  cambiarEstado(fallo ? "error" : "listo");
  return !fallo;
}

/**
 * Lo llama cada lección que contiene COBOL. El Worker se conserva al pasar de
 * una lección a otra y se libera al salir del curso: Clang ocupa decenas de
 * megabytes de memoria.
 */
export function mantenerCobolPreparado() {
  lectores++;
  clearTimeout(salidaDelCurso);
  void prepararCobol();
  return () => {
    lectores--;
    salidaDelCurso = setTimeout(() => {
      if (lectores !== 0) return;
      descartarMotor();
      cambiarEstado("sin-empezar");
    }, 0);
  };
}

const fallo = (salida: string): ResultadoCobol => ({
  salida,
  error: true,
  compilo: false,
  diagnosticos: "",
  codigo: null,
  archivos: {},
  binarios: [],
});

/**
 * Compila y ejecuta un programa. Las ejecuciones se encolan; si una supera el
 * tiempo límite o se cancela, el Worker se termina y el siguiente programa
 * arranca uno nuevo.
 */
export function ejecutarCobol(
  codigo: string,
  opciones: {
    signal?: AbortSignal;
    entrada?: string;
    archivos?: Record<string, string>;
    formato?: "fixed" | "free";
    alCambiarFase?: (fase: FaseCobol) => void;
  } = {},
): Promise<ResultadoCobol> {
  const turno = cola.then(() => ejecutarAhora(codigo, opciones));
  cola = turno.catch(() => {});
  return turno;
}

async function ejecutarAhora(
  codigo: string,
  { signal, entrada = "", archivos = {}, formato = "fixed", alCambiarFase }: Parameters<typeof ejecutarCobol>[1] = {},
): Promise<ResultadoCobol> {
  if (signal?.aborted) return fallo("Ejecución cancelada.");
  alCambiarFase?.("cargando");
  if (!(await prepararCobol()) || !motor) {
    return fallo("No se pudo cargar COBOL. Comprueba tu conexión e inténtalo de nuevo.");
  }
  if (signal?.aborted) return fallo("Ejecución cancelada.");

  const { worker } = motor;
  const id = ++siguienteId;
  return new Promise<ResultadoCobol>((resolver) => {
    let terminado = false;
    const terminar = (resultado: ResultadoCobol, descartar: boolean) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(reloj);
      signal?.removeEventListener("abort", cancelar);
      if (descartar) {
        descartarMotor();
        cambiarEstado("sin-empezar");
      }
      resolver(resultado);
    };
    const cancelar = () => terminar(fallo("Ejecución cancelada."), true);
    let reloj = setTimeout(() => terminar(fallo("Se alcanzó el tiempo límite al compilar."), true), LIMITE_COMPILACION_MS);
    signal?.addEventListener("abort", cancelar, { once: true });
    worker.onmessage = ({ data }) => {
      if (data.id !== id) return;
      if (data.tipo === "fase") {
        alCambiarFase?.(data.fase);
        // El límite del alumno es el de su programa, no el del compilador.
        if (data.fase === "ejecutando") {
          clearTimeout(reloj);
          reloj = setTimeout(
            () => terminar(fallo(`Se alcanzó el tiempo límite de ${LIMITE_EJECUCION_MS / 1000} s. Revisa que el programa termine.`), true),
            LIMITE_EJECUCION_MS,
          );
        }
      } else if (data.tipo === "resultado") {
        terminar(
          {
            salida: data.compilo ? data.salida : data.diagnosticos,
            error: !data.compilo || Boolean(data.anormal),
            compilo: data.compilo,
            diagnosticos: data.diagnosticos ?? "",
            codigo: data.codigo ?? null,
            archivos: data.archivos ?? {},
            binarios: data.binarios ?? [],
          },
          false,
        );
      }
    };
    worker.onerror = () => terminar(fallo("No se pudo ejecutar el programa."), true);
    worker.postMessage({ tipo: "ejecutar", id, codigo, entrada, archivos, formato });
  });
}
