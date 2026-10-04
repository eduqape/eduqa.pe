import { Llama } from "./Llama";

export type Variante = "banda" | "marco" | "solido";

export type DatosCertificado = {
  alumno: string;
  curso: string;
  horas: number;
  fecha: string; // ya formateada, ej. "23 de agosto de 2026"
  docente: string;
  docenteFirmaUrl?: string | null;
  directorAcademico: string;
  directorFirmaUrl?: string | null;
  codigo: string;
};

const VERIFICAR_EN = "eduqape.vercel.app/verificar";

/**
 * Se define en milímetros sobre A4 apaisado (297×210) para que lo que se ve
 * en pantalla sea exactamente lo que sale impreso o exportado a PDF.
 * Quien lo use decide la escala de previsualización.
 */
export function Certificado({
  datos,
  variante = "banda",
}: {
  datos: DatosCertificado;
  variante?: Variante;
}) {
  const {
    alumno,
    curso,
    horas,
    fecha,
    docente,
    docenteFirmaUrl,
    directorAcademico,
    directorFirmaUrl,
    codigo,
  } = datos;

  const esSolido = variante === "solido";
  const tinta = esSolido ? "text-white" : "text-texto";
  const suave = esSolido ? "text-sobre-rojo-suave" : "text-texto-suave";
  const acento = esSolido ? "text-white" : "text-rojo";

  return (
    <div
      className={`certificado relative flex flex-col overflow-hidden font-cert ${
        esSolido ? "bg-rojo" : "bg-white"
      }`}
      style={{ width: "297mm", height: "210mm" }}
    >
      {/* Banda superior */}
      {variante === "banda" && (
        <div className="h-[22mm] w-full shrink-0 bg-rojo" />
      )}

      {/* Marco */}
      {variante === "marco" && (
        <div
          className="pointer-events-none absolute inset-[8mm] rounded-[3mm] border-[1.2mm] border-rojo"
          aria-hidden="true"
        />
      )}

      {/* Llama de fondo */}
      <Llama
        aria-hidden="true"
        className={`pointer-events-none absolute -right-[18mm] bottom-[-10mm] h-[150mm] w-auto ${
          esSolido ? "text-white/10" : "text-rojo/[0.06]"
        }`}
      />

      <div className="relative flex flex-1 flex-col px-[26mm] py-[16mm]">
        {/* Cabecera */}
        <header className="flex items-center gap-[3mm]">
          <Llama className={`h-[11mm] w-auto ${acento}`} />
          <span className={`text-[4.6mm] font-bold tracking-[0.22em] ${acento}`}>
            EDUQA.PE
          </span>
        </header>

        {/* Cuerpo */}
        <div className="flex flex-1 flex-col justify-center">
          <p className={`text-[4.4mm] uppercase tracking-[0.3em] ${suave}`}>
            Constancia de participación
          </p>

          <p className={`mt-[9mm] text-[4.6mm] ${suave}`}>Se otorga a</p>

          <h1
            className={`mt-[2mm] text-[17mm] font-bold leading-[1.05] tracking-tight ${tinta}`}
          >
            {alumno}
          </h1>

          <div
            className={`mt-[5mm] h-[0.8mm] w-[70mm] ${esSolido ? "bg-white/40" : "bg-rojo"}`}
          />

          <p className={`mt-[7mm] max-w-[180mm] text-[5mm] leading-[1.6] ${suave}`}>
            por haber cursado y completado{" "}
            <strong className={`font-semibold ${tinta}`}>{curso}</strong>, con una
            duración de{" "}
            <strong className={`font-semibold ${tinta}`}>
              {horas} {horas === 1 ? "hora" : "horas"}
            </strong>{" "}
            lectivas dictadas en vivo el {fecha}.
          </p>
        </div>

        {/* Pie */}
        <footer className="grid grid-cols-[1fr_1fr_auto] items-end gap-[10mm]">
          <div className="min-w-[58mm]">
            {docenteFirmaUrl && (
              <div className="mb-[2mm] flex h-[18mm] w-[55mm] items-center justify-center">
                <img
                  src={docenteFirmaUrl}
                  alt=""
                  className="h-[18mm] w-[55mm] object-contain object-center"
                />
              </div>
            )}
            <div
              className={`h-[0.4mm] w-[55mm] ${esSolido ? "bg-white/50" : "bg-borde-fuerte"}`}
            />
            <p className={`mt-[2mm] text-[3.7mm] font-semibold ${tinta}`}>{docente}</p>
            <p className={`text-[3.2mm] ${suave}`}>Docente</p>
          </div>

          <div className="min-w-[58mm]">
            {directorFirmaUrl && (
              <div className="mb-[2mm] flex h-[18mm] w-[55mm] items-center justify-center">
                <img
                  src={directorFirmaUrl}
                  alt=""
                  className="h-[18mm] w-[55mm] object-contain object-center"
                />
              </div>
            )}
            <div
              className={`h-[0.4mm] w-[55mm] ${esSolido ? "bg-white/50" : "bg-borde-fuerte"}`}
            />
            <p className={`mt-[2mm] text-[3.7mm] font-semibold ${tinta}`}>
              {directorAcademico}
            </p>
            <p className={`text-[3.2mm] ${suave}`}>Director Académico</p>
          </div>

          <div className="text-right">
            <p className={`text-[3.2mm] uppercase tracking-[0.18em] ${suave}`}>
              Código de verificación
            </p>
            <p className={`mt-[1mm] font-mono text-[4.4mm] font-semibold ${acento}`}>
              {codigo}
            </p>
            <p className={`mt-[1mm] text-[3.2mm] ${suave}`}>
              Verifica en {VERIFICAR_EN}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** Envoltorio que escala el A4 para verlo en pantalla sin deformarlo. */
export function VistaPrevia({
  datos,
  variante,
  escala = 0.42,
}: {
  datos: DatosCertificado;
  variante?: Variante;
  escala?: number;
}) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-borde shadow-sm"
      style={{ width: `calc(297mm * ${escala})`, height: `calc(210mm * ${escala})` }}
    >
      <div style={{ transform: `scale(${escala})`, transformOrigin: "top left" }}>
        <Certificado datos={datos} variante={variante} />
      </div>
    </div>
  );
}
