// Tipos de datos para la aplicación

export type HiveStatus = 'saludable' | 'revision' | 'alerta' | 'sin_reina';

export type QueenMarkColor = 'verde' | 'amarillo' | 'azul' | 'rojo' | 'blanco' | 'sin_marca';

export interface Hive {
  id: string;
  code: string;
  name?: string;
  location?: string;
  queenYear?: number;
  queenMarkColor?: QueenMarkColor;
  status: HiveStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Inspection {
  id: string;
  hiveId: string;
  date: string;
  queenSeen: boolean;
  brood: number;
  honey: number;
  varroa: number;
  calm: 1 | 2 | 3;
  note: string;
}

export interface Task {
  id: string;
  title: string;
  hiveId?: string;
  dueDate: string;
  priority: 'alta' | 'media' | 'baja';
  completed: boolean;
}

export interface User {
  email: string;
  name?: string;
}

export const HIVE_STATUS_LABELS: Record<HiveStatus, string> = {
  saludable: 'Saludable',
  revision: 'Revisión',
  alerta: 'Alerta',
  sin_reina: 'Sin reina',
};

export const QUEEN_MARK_COLORS: Record<QueenMarkColor, string> = {
  verde: 'Verde',
  amarillo: 'Amarillo',
  azul: 'Azul',
  rojo: 'Rojo',
  blanco: 'Blanco',
  sin_marca: 'Sin marca',
};

export const STATUS_COLORS: Record<HiveStatus, string> = {
  saludable: '#a3bf7f',
  revision: '#f0a41c',
  alerta: '#e4603f',
  sin_reina: '#bd93b8',
};

export const STATUS_META = STATUS_COLORS;
export const STATUS_ORDER: HiveStatus[] = ['saludable', 'revision', 'alerta', 'sin_reina'];
