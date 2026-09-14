// Re-exportar tipos desde types/hive
export type { Hive, Inspection, Task, HiveStatus, QueenMarkColor, User } from './types/hive';
export { HIVE_STATUS_LABELS, QUEEN_MARK_COLORS, STATUS_COLORS, STATUS_META, STATUS_ORDER } from './types/hive';

export const uid = () => Math.random().toString(36).slice(2, 10);

export interface Toast {
  id: string;
  title: string;
  desc?: string;
}

// Constante eliminada - los datos del apiario ahora vienen del apiario activo del usuario

export const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
