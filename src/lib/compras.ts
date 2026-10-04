import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";

/** Un pago registrado por el flujo de Niubiz. */
export type Compra = {
  id: string;
  concepto: string;
  monto: number;
  moneda: string;
  estado: string;
  curso_id: string | null;
  /** Slug del curso para enlazarlo; sale de `cursos` (#112). */
  cursoSlug: string | null;
  numero_operacion: string | null;
  creado_en: string;
  pagado_en: string | null;
};

/**
 * Compras de quien pregunta.
 *
 * El filtro por usuario lo aplica RLS, no esta consulta: la política de
 * `pagos` solo devuelve las filas cuyo `usuario_id` coincide con quien pide.
 */
export async function misCompras(): Promise<Compra[]> {
  const usuario = await usuarioActual();
  if (!usuario) return [];

  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("pagos")
    .select(
      "id, concepto, monto, moneda, estado, curso_id, numero_operacion, creado_en, pagado_en, cursos(slug)",
    )
    .order("creado_en", { ascending: false });

  type Fila = Omit<Compra, "cursoSlug" | "monto"> & { monto: number | string; cursos: { slug: string } | null };
  return ((data ?? []) as unknown as Fila[]).map(({ cursos, ...p }) => ({
    ...p,
    monto: Number(p.monto),
    cursoSlug: cursos?.slug ?? null,
  }));
}

/** Constancia emitida a nombre del alumno. */
export type Certificacion = {
  id: string;
  codigo: string;
  alumno: string;
  emitido_en: string;
  anulado_en: string | null;
  cohorte: {
    curso_nombre: string | null;
    horas: number | null;
    dictada_en: string | null;
    docente: string | null;
  } | null;
};

/**
 * Certificaciones de quien pregunta.
 *
 * La tabla se relaciona con el alumno por correo y no por identificador, así
 * que la política compara contra el correo del token. Aquí no se vuelve a
 * filtrar: hacerlo daría la falsa impresión de que la consulta es la barrera.
 */
export async function misCertificaciones(): Promise<Certificacion[]> {
  const usuario = await usuarioActual();
  if (!usuario) return [];

  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("certificados")
    .select(
      "id, codigo, alumno, emitido_en, anulado_en, cohorte:cohortes(curso_nombre, horas, dictada_en, docente)",
    )
    .order("emitido_en", { ascending: false });

  return (data ?? []) as unknown as Certificacion[];
}
