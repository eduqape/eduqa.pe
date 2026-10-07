/**
 * Lee todas las filas de una consulta, en páginas.
 *
 * PostgREST devuelve como máximo `max_rows` filas por petición (1000 en este
 * proyecto) y no avisa del corte: las que sobran simplemente no llegan. Con
 * más de 1000 sesiones en la base, los cursos publicados más tarde perdían su
 * `curso.md` y desaparecían del catálogo sin error.
 *
 * `consulta` recibe el rango de cada página y debe devolver la consulta con un
 * orden total (por ejemplo, por clave primaria); sin él, las páginas podrían
 * solaparse o saltarse filas.
 */
export const TAMANO_PAGINA = 1000;

export async function leerTodo<T>(
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await consulta(desde, desde + TAMANO_PAGINA - 1);
    if (error) return { data: filas, error };
    filas.push(...(data ?? []));
    if (!data || data.length < TAMANO_PAGINA) return { data: filas, error: null };
  }
}
