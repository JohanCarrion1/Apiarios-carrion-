// ============================================================
// CONTADOR DE CONSULTAS IA (límite de 5 por usuario y día)
// ============================================================
// Se guarda en localStorage con la clave `ia_usage_${userId}_${fecha}`.
// Como la fecha forma parte de la clave, el contador se reinicia solo a
// medianoche: al cambiar el día empieza una clave nueva a cero.

export const MAX_CONSULTAS_DIA = 5;

/** Fecha local en formato YYYY-MM-DD (no UTC, para que el corte sea a medianoche local). */
export function fechaLocal(fecha: Date = new Date()): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function claveUsage(userId: string, fecha: Date = new Date()): string {
  return `ia_usage_${userId}_${fechaLocal(fecha)}`;
}

/** Consultas usadas hoy por el usuario (0 si no hay nada guardado). */
export function getConsultasHoy(userId: string, fecha: Date = new Date()): number {
  if (!userId) return 0;
  try {
    const raw = window.localStorage.getItem(claveUsage(userId, fecha));
    const n = Number.parseInt(raw ?? '0', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Consultas restantes hoy. */
export function getConsultasRestantes(userId: string, fecha: Date = new Date()): number {
  return Math.max(0, MAX_CONSULTAS_DIA - getConsultasHoy(userId, fecha));
}

/** ¿Se alcanzó el límite diario? */
export function limiteAlcanzado(userId: string, fecha: Date = new Date()): boolean {
  return getConsultasHoy(userId, fecha) >= MAX_CONSULTAS_DIA;
}

/** Suma una consulta al contador del día y devuelve el total actualizado. */
export function registrarConsulta(userId: string, fecha: Date = new Date()): number {
  if (!userId) return 0;
  const total = getConsultasHoy(userId, fecha) + 1;
  try {
    window.localStorage.setItem(claveUsage(userId, fecha), String(total));
  } catch {
    // Sin localStorage (modo privado estricto) el contador no persiste,
    // pero la sesión sigue funcionando.
  }
  return total;
}
