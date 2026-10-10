"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { Contrast, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ACENTOS,
  acentoActivo,
  acentoEnServidor,
  alternarMonocromo,
  elegirAcento,
  monocromoActivo,
  monocromoEnServidor,
  suscribirseCromatismo,
  suscribirseMonocromo,
} from "@/lib/cromatismo";

/**
 * Modo claro y oscuro con next-themes: gestiona la clase en <html>,
 * respeta la preferencia del sistema y evita el parpadeo inicial
 * inyectando un script antes de que pinte la página.
 */
export function ProveedorTema({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}

const OPCIONES = [
  { valor: "light", etiqueta: "Claro", Icono: Sun },
  { valor: "dark", etiqueta: "Oscuro", Icono: Moon },
  { valor: "system", etiqueta: "Sistema", Icono: Monitor },
] as const;

/**
 * Interruptor del modo monocromático.
 *
 * Se dibuja fuera del grupo de claro/oscuro a propósito: son ejes distintos,
 * y ponerlo como un cuarto botón en la misma fila daría a entender que se
 * elige uno de cuatro cuando en realidad se combina con cualquiera de los tres.
 */
function BotonMonocromo({ className }: { className?: string }) {
  const activo = useSyncExternalStore(
    suscribirseMonocromo,
    monocromoActivo,
    monocromoEnServidor,
  );
  const etiqueta = activo ? "Volver al color de marca" : "Modo monocromático";

  return (
    <button
      type="button"
      onClick={alternarMonocromo}
      aria-label={etiqueta}
      aria-pressed={activo}
      title={etiqueta}
      className={`rounded-md p-1.5 transition-colors ${
        activo
          ? "bg-fondo text-rojo-acento shadow-sm"
          : "text-texto-tenue hover:text-texto"
      } ${className ?? ""}`}
    >
      <Contrast size={15} aria-hidden="true" />
    </button>
  );
}

/**
 * Muestras del color de acento. Cada una se pinta con su propio tono, no con
 * los tokens: tiene que verse aunque no sea el acento activo. En monocromático
 * ninguna aparece marcada, porque ninguna es la que se ve; pulsar una vuelve
 * al color con ese acento.
 */
function SelectorAcento({ className, boton = "p-1.5" }: { className?: string; boton?: string }) {
  const acento = useSyncExternalStore(suscribirseCromatismo, acentoActivo, acentoEnServidor);
  const mono = useSyncExternalStore(suscribirseMonocromo, monocromoActivo, monocromoEnServidor);
  return (
    <div role="group" aria-label="Color de acento" className={`inline-flex gap-0.5 ${className ?? ""}`}>
      {ACENTOS.map(({ id, nombre, muestra }) => {
        const activo = !mono && acento === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => elegirAcento(id)}
            aria-label={`Acento ${nombre.toLowerCase()}`}
            aria-pressed={activo}
            title={`Acento ${nombre.toLowerCase()}`}
            className={`rounded-md transition-colors ${boton} ${activo ? "bg-fondo shadow-sm" : "hover:bg-fondo"}`}
          >
            <span
              aria-hidden="true"
              className={`block size-[15px] rounded-full ${activo ? "ring-2 ring-texto-tenue ring-offset-1 ring-offset-fondo" : ""}`}
              style={{ backgroundColor: muestra }}
            />
          </button>
        );
      })}
    </div>
  );
}

export function SelectorTema({
  className,
  orientacion = "horizontal",
}: {
  className?: string;
  /** En la isla lateral no hay ancho para tres botones en fila. */
  orientacion?: "horizontal" | "vertical";
}) {
  const { theme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);

  // El tema real solo se conoce en el cliente: hasta montar, el servidor no
  // puede saber qué prefiere el sistema. Sin esto habría un desajuste de
  // hidratación entre lo que renderiza el servidor y lo que ve el navegador.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- marca de montaje para evitar desajuste de hidratación
  useEffect(() => setMontado(true), []);

  const marco =
    orientacion === "vertical"
      ? "flex-col gap-0.5"
      : "border border-borde bg-superficie";

  return (
    <div
      className={`inline-flex gap-1.5 ${
        orientacion === "vertical" ? "flex-col" : "items-center"
      } ${className ?? ""}`}
    >
      <div
        role="group"
        aria-label="Tema de la página"
        className={`inline-flex rounded-lg p-0.5 ${marco}`}
      >
      {OPCIONES.map(({ valor, etiqueta, Icono }) => {
        const activo = montado && theme === valor;
        return (
          <button
            key={valor}
            type="button"
            onClick={() => setTheme(valor)}
            aria-label={etiqueta}
            aria-pressed={activo}
            title={etiqueta}
            className={`rounded-md p-1.5 transition-colors ${
              activo
                ? "bg-fondo text-rojo-acento shadow-sm"
                : "text-texto-tenue hover:text-texto"
            }`}
          >
            <Icono size={15} aria-hidden="true" />
          </button>
        );
      })}
      </div>

      <div className={`inline-flex rounded-lg p-0.5 ${marco}`}>
        <BotonMonocromo />
      </div>

      <SelectorAcento
        className={`rounded-lg p-0.5 ${orientacion === "vertical" ? "flex-col" : "border border-borde bg-superficie"}`}
      />
    </div>
  );
}

/**
 * Versión compacta para la isla lateral: un solo botón con el tema en uso,
 * que despliega los tres al pulsarlo. Tres botones apilados ocupaban un
 * tercio de la barra para una preferencia que casi nadie cambia dos veces.
 */
export function SelectorTemaCompacto() {
  const { theme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- marca de montaje para evitar desajuste de hidratación
  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = () => setAbierto(false);
    // Cualquier clic fuera cierra: el menú no debe quedarse abierto cuando
    // la atención ya se fue a otra parte.
    window.addEventListener("click", cerrar);
    return () => window.removeEventListener("click", cerrar);
  }, [abierto]);

  const actual = OPCIONES.find((o) => o.valor === theme) ?? OPCIONES[2];
  const IconoActual = montado ? actual.Icono : Monitor;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAbierto((v) => !v);
        }}
        aria-label="Tema de la página"
        title="Tema de la página"
        aria-expanded={abierto}
        className="flex size-10 items-center justify-center rounded-xl text-texto-tenue transition-colors hover:bg-fondo hover:text-rojo-acento"
      >
        <IconoActual size={17} aria-hidden="true" />
      </button>

      {abierto && (
        <div
          role="group"
          aria-label="Tema de la página"
          onClick={(e) => e.stopPropagation()}
          className="absolute left-full top-1/2 ml-3 flex -translate-y-1/2 gap-0.5 rounded-xl border border-borde bg-fondo p-1 shadow-lg"
        >
          {OPCIONES.map(({ valor, etiqueta, Icono }) => {
            const activo = montado && theme === valor;
            return (
              <button
                key={valor}
                type="button"
                onClick={() => {
                  setTheme(valor);
                  setAbierto(false);
                }}
                aria-label={etiqueta}
                aria-pressed={activo}
                title={etiqueta}
                className={`rounded-lg p-2 transition-colors ${
                  activo
                    ? "bg-superficie text-rojo-acento"
                    : "text-texto-tenue hover:text-texto"
                }`}
              >
                <Icono size={15} aria-hidden="true" />
              </button>
            );
          })}

          <span className="mx-0.5 w-px self-stretch bg-borde" aria-hidden="true" />
          <BotonMonocromo className="p-2" />
          <span className="mx-0.5 w-px self-stretch bg-borde" aria-hidden="true" />
          <SelectorAcento boton="p-2" />
        </div>
      )}
    </div>
  );
}
