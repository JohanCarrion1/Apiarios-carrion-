// Re-exportar tipos desde types/hive
export type { Hive, Inspection, Task, HiveStatus, QueenMarkColor, User } from './types/hive';
export { HIVE_STATUS_LABELS, QUEEN_MARK_COLORS, STATUS_COLORS, STATUS_META, STATUS_ORDER } from './types/hive';

export const uid = () => Math.random().toString(36).slice(2, 10);

export interface Toast {
  id: string;
  title: string;
  desc?: string;
}

export const APIARY = {
  name: "Apiario La Dehesa",
  place: "Sierra de San Pedro · Extremadura",
  coords: "39.46° N, 6.72° O",
  keeper: "Marta Ruano",
  season: "Temporada 2025",
};

export const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
