// ============================================================
// ORDEN NUMÉRICO DE CÓDIGOS DE ENTIDAD
// ============================================================
// Las colmenas, núcleos y fecundadores se identifican por un código con
// prefijo y número: "C-01", "C-1", "C-10", "N-03", "F-08".
//
// El problema: un `.sort()` por defecto (o un `localeCompare`) ordena como
// TEXTO, así que "C-10" queda antes que "C-2" (porque '1' < '2'). El
// resultado es un honeycomb desordenado, sobre todo tras transferir o
// recargar, porque el orden de inserción no coincide con el numérico.
//
// Este módulo centraliza la extracción del número y el comparador para que
// todas las rutas (carga, alta, transferencia y render) usen la misma regla.

/** Prefijos de código que la app genera. */
const CODE_PATTERN = /^([CNF])-(\d+)$/i;

/**
 * Extrae el número de un código de entidad.
 * "C-01" -> 1 · "C-10" -> 10 · "N-3" -> 3 · "F-08" -> 8
 * Devuelve `null` si el código no sigue el patrón (no numérico o vacío).
 */
export function entityCodeNumber(code: unknown): number | null {
  if (typeof code !== 'string') return null;
  const m = CODE_PATTERN.exec(code.trim());
  return m ? parseInt(m[2], 10) : null;
}

/**
 * Comparador numérico por código de entidad.
 *
 * - Ambos con número  -> compara el número (a - b), no el texto.
 * - Uno con número, otro sin  -> el numérico va primero.
 * - Ninguno con número -> orden alfabético estable, para no perder
 *   elementos por comparador incompleto.
 */
export function compareByEntityCode(
  a: { code?: string } | null | undefined,
  b: { code?: string } | null | undefined
): number {
  const na = entityCodeNumber(a?.code);
  const nb = entityCodeNumber(b?.code);

  if (na !== null && nb !== null) {
    if (na !== nb) return na - nb;
    // Mismo número: desempate por texto ("C-2" antes que "C-02").
    return String(a?.code).localeCompare(String(b?.code));
  }
  if (na !== null) return -1;
  if (nb !== null) return 1;
  return String(a?.code ?? '').localeCompare(String(b?.code ?? ''));
}

/**
 * Devuelve una copia del arreglo ordenada por código numérico.
 * NO muta el original (los state de React nunca deben mutarse).
 */
export function sortByEntityCode<T extends { code?: string }>(items: T[]): T[] {
  return [...items].sort(compareByEntityCode);
}
