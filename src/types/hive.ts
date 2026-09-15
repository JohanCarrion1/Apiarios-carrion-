// Tipos de datos para la aplicación
import type { PhotoData } from '../services/photos';

export type HiveStatus = 'saludable' | 'revision' | 'alerta' | 'sin_reina';

export type QueenMarkColor = 'verde' | 'amarillo' | 'azul' | 'rojo' | 'blanco' | 'sin_marca';

export type EntityType = 'colmena' | 'nucleo';

export interface Hive {
  id: string;
  code: string;
  name?: string;
  location?: string;
  queenYear?: number;
  queenMarkColor?: QueenMarkColor;
  status: HiveStatus;
  notes?: string;
  entityType?: EntityType; // 'colmena' por defecto si no existe
  fotos?: PhotoData[];
  createdAt: string;
  updatedAt: string;
}

// Función helper para obtener el tipo de entidad
export const getEntityType = (hive: Hive): EntityType => {
  return hive.entityType || 'colmena';
};

// Función helper para verificar si es un núcleo
export const isNucleus = (hive: Hive): boolean => {
  return getEntityType(hive) === 'nucleo';
};

export interface Inspection {
  id: string;
  hiveId: string;
  entityType?: EntityType; // 'colmena' por defecto si no existe
  date: string;
  queenSeen: boolean;
  brood: number;
  honey: number;
  varroa: number;
  calm: 1 | 2 | 3;
  note: string;
  fotos?: PhotoData[];
}

export interface Task {
  id: string;
  title: string;
  hiveId?: string;
  dueDate: string;
  priority: 'alta' | 'media' | 'baja';
  completed: boolean;
  completedAt?: string;
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
