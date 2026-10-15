// Tipos de datos para la sección "Fecundadores" (baby nucs / portaúcleos)
// Ciclo de la reina: celda real → virgen → fecundada → en puesta
import type { PhotoData } from '../services/photos';

export type FecundadorQueenState = 'celda_real' | 'virgen' | 'fecundada' | 'en_puesta';

export type FecundadorEstado = 'activo' | 'promovido';

export type FecundadorHistorialTipo =
  | 'creado'
  | FecundadorQueenState
  | 'promovido'
  | 'eliminado'
  | 'inspeccion';

export interface FecundadorHistorialEntry {
  id: string;
  fecha: string; // ISO
  tipo: FecundadorHistorialTipo;
  descripcion?: string;
  /** URLs de Cloudinary de las fotos tomadas durante la inspección. */
  photos?: string[];
}

export interface FecundadorPromotion {
  nucleoId: string;
  nucleoCode: string;
  fecha: string; // ISO
}

export interface Fecundador {
  id: string;
  code: string; // F-XX
  name?: string;
  location?: string;
  breedingLotId?: string; // vínculo con un lote de cría
  queenState: FecundadorQueenState;
  fechaCelda?: string; // 'yyyy-MM-dd' instalación de la celda real
  fechaNacimiento?: string; // nacimiento (virgen)
  fechaFecundacion?: string;
  fechaPuesta?: string;
  notes?: string;
  estado: FecundadorEstado; // 'activo' o 'promovido' (promovido a núcleo)
  promotion?: FecundadorPromotion;
  /** Próxima revisión programada (yyyy-MM-dd) definida en la última inspección. */
  proximaRevision?: string;
  fotos?: PhotoData[];
  photos?: string[]; // URLs de Firebase Storage
  historial: FecundadorHistorialEntry[];
  createdAt: string;
  updatedAt: string;
  // Campos de transferencia entre apiarios
  apiario?: string;
  apiario_original?: string;
  transferida?: boolean;
  fecha_transferencia?: string;
  motivo_transferencia?: string;
}

export const FECUNDADOR_STATE_ORDER: FecundadorQueenState[] = [
  'celda_real',
  'virgen',
  'fecundada',
  'en_puesta',
];

export const FECUNDADOR_STATE_LABELS: Record<FecundadorQueenState, string> = {
  celda_real: 'Celda real',
  virgen: 'Virgen',
  fecundada: 'Fecundada',
  en_puesta: 'En puesta',
};

export const FECUNDADOR_STATE_COLORS: Record<FecundadorQueenState, string> = {
  celda_real: '#ffa90a',
  virgen: '#6fa8dc',
  fecundada: '#c987c3',
  en_puesta: '#93cc68',
};

// Índice de la etapa actual dentro del ciclo (0-3)
export const fecundadorStateIndex = (state: FecundadorQueenState): number =>
  FECUNDADOR_STATE_ORDER.indexOf(state);

// Siguiente estado del ciclo o null si ya está en puesta
export const nextFecundadorState = (state: FecundadorQueenState): FecundadorQueenState | null => {
  const idx = fecundadorStateIndex(state);
  if (idx < 0 || idx >= FECUNDADOR_STATE_ORDER.length - 1) return null;
  return FECUNDADOR_STATE_ORDER[idx + 1];
};

// Fecha relevante para cada estado (campo de fecha asociado en el modelo)
export const fecundadorStateDateField: Record<FecundadorQueenState, keyof Fecundador> = {
  celda_real: 'fechaCelda',
  virgen: 'fechaNacimiento',
  fecundada: 'fechaFecundacion',
  en_puesta: 'fechaPuesta',
};