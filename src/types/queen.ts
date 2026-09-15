// Tipos de datos para el seguimiento de reinas

export type QueenOrigin = 'propia' | 'comprada' | 'lote';

export type QueenStatus = 'activa' | 'perdida' | 'cambiada' | 'enjaulada';

export type QueenYearColor = 'blanco' | 'amarillo' | 'rojo' | 'verde' | 'azul';

export type QueenChangeReason = 'perdida' | 'recambio' | 'enjambrazon';

export interface Queen {
  id: string;
  hiveId: string;
  fechaNacimiento: string; // 'yyyy-MM-dd'
  origen: QueenOrigin;
  loteId?: string;
  colorAño: QueenYearColor;
  lineaGenetica?: string;
  caracteristicas: string[];
  estado: QueenStatus;
  fechaCambio?: string;
  notas: string;
  createdAt: string;
}

export interface QueenChange {
  id: string;
  hiveId: string;
  queenId?: string;
  fecha: string;
  razon: QueenChangeReason;
  nota?: string;
}

export const QUEEN_ORIGIN_LABELS: Record<QueenOrigin, string> = {
  propia: 'Propia',
  comprada: 'Comprada',
  lote: 'De lote',
};

export const QUEEN_STATUS_LABELS: Record<QueenStatus, string> = {
  activa: 'Activa',
  perdida: 'Perdida',
  cambiada: 'Cambiada',
  enjaulada: 'Enjaulada',
};

export const QUEEN_STATUS_COLORS: Record<QueenStatus, string> = {
  activa: '#a3bf7f',
  perdida: '#e4603f',
  cambiada: '#f0a41c',
  enjaulada: '#6fa8dc',
};

export const QUEEN_YEAR_COLORS: Record<QueenYearColor, string> = {
  blanco: '#e8e4da',
  amarillo: '#ffc961',
  rojo: '#e4603f',
  verde: '#7fb069',
  azul: '#6fa8dc',
};

export const QUEEN_YEAR_COLOR_LABELS: Record<QueenYearColor, string> = {
  blanco: 'Blanco',
  amarillo: 'Amarillo',
  rojo: 'Rojo',
  verde: 'Verde',
  azul: 'Azul',
};

export const QUEEN_CHARACTERISTIC_OPTIONS = [
  'Mansedumbre',
  'Productividad',
  'Resistencia a enfermedades',
  'Limpieza',
] as const;

export const QUEEN_CHANGE_REASON_LABELS: Record<QueenChangeReason, string> = {
  perdida: 'Pérdida',
  recambio: 'Recambio programado',
  enjambrazon: 'Enjambrazón',
};

// Código de color por año (convención europea: 0/5 azul, 1/6 blanco, 2/7 amarillo, 3/8 rojo, 4/9 verde)
export function queenColorForYear(year: number): QueenYearColor {
  const map: QueenYearColor[] = ['azul', 'blanco', 'amarillo', 'rojo', 'verde'];
  return map[Math.abs(year) % 5];
}

export interface QueenAge {
  semanas: number;
  dias: number;
  totalDias: number;
}

// Edad calculada automáticamente a partir de la fecha de nacimiento
export function getQueenAge(queen: Queen, now: Date = new Date()): QueenAge {
  const birth = new Date(queen.fechaNacimiento + 'T00:00:00');
  const totalDias = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86400000));
  return {
    semanas: Math.floor(totalDias / 7),
    dias: totalDias % 7,
    totalDias,
  };
}

// Alertas visuales según la edad de la reina
export function getQueenAlert(
  queen: Queen,
  now: Date = new Date()
): { nivel: 'joven' | 'recambio' | 'vieja'; label: string; cls: string; color: string } | null {
  const { semanas } = getQueenAge(queen, now);
  if (semanas < 4) {
    return { nivel: 'joven', label: 'Reina joven', cls: 'bg-sage/15 border-sage/40 text-sage', color: '#a3bf7f' };
  }
  if (semanas >= 6 && semanas <= 12) {
    return { nivel: 'recambio', label: 'Considerar recambio', cls: 'bg-honey/15 border-honey/40 text-honey', color: '#f0a41c' };
  }
  if (semanas > 12) {
    return { nivel: 'vieja', label: 'Reina vieja', cls: 'bg-coral/15 border-coral/40 text-coral', color: '#e4603f' };
  }
  return null;
}

export const QUEEN_AGE_LABEL = (queen: Queen, now: Date = new Date()): string => {
  const { semanas, dias } = getQueenAge(queen, now);
  return `${semanas} semana${semanas !== 1 ? 's' : ''}${dias > 0 ? ` · ${dias} día${dias !== 1 ? 's' : ''}` : ''}`;
};