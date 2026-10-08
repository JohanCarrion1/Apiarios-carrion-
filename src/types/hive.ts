// Tipos de datos para la aplicación
import type { PhotoData } from '../services/photos';

export type HiveStatus = 'saludable' | 'revision' | 'alerta' | 'sin_reina';

export type QueenMarkColor = 'verde' | 'amarillo' | 'azul' | 'rojo' | 'blanco' | 'sin_marca';

export type EntityType = 'colmena' | 'nucleo';

export type QueenInfoOrigin = 'criada' | 'comprada' | 'desconocido';

export type BroodPattern = 'uniforme' | 'fallada' | 'zanganera';

export interface QueenInfo {
  origin?: QueenInfoOrigin;
  introducedAt?: string; // fecha ISO 'yyyy-MM-dd'
  mark?: string; // color/marca de la reina
}

export interface Hive {
  id: string;
  code: string;
  name?: string;
  location?: string;
  queenYear?: number;
  queenMarkColor?: QueenMarkColor;
  status: HiveStatus;
  hasQueen?: boolean; // true = tiene reina; false = huérfana (sin reina)
  queenInfo?: QueenInfo; // datos opcionales de la reina actual
  notes?: string;
  entityType?: EntityType; // 'colmena' por defecto si no existe
  fotos?: PhotoData[];
  createdAt: string;
  updatedAt: string;
  // Campos de transferencia entre apiarios
  apiario?: string;
  apiario_original?: string;
  transferida?: boolean;
  fecha_transferencia?: string;
  motivo_transferencia?: string;
  // Equipamiento de la colmena (solo colmenas)
  equipamiento?: Equipamiento;
}

/** Equipamiento instalado en una colmena. */
export interface Equipamiento {
  alzas: number; // cantidad de alzas instaladas
  rejillaExcluidora: boolean;
  alimentador: boolean;
  trampaPolen: boolean;
  mallaPropoleo: boolean;
  colectorApitoxina: boolean;
}

export const EMPTY_EQUIPAMIENTO: Equipamiento = {
  alzas: 0,
  rejillaExcluidora: false,
  alimentador: false,
  trampaPolen: false,
  mallaPropoleo: false,
  colectorApitoxina: false,
};

/** Devuelve el equipamiento con valores por defecto para una colmena sin datos previos. */
export const getEquipamiento = (hive: Hive): Equipamiento => ({
  ...EMPTY_EQUIPAMIENTO,
  ...(hive.equipamiento || {}),
});

// Función helper para obtener el tipo de entidad
export const getEntityType = (hive: Hive): EntityType => {
  return hive.entityType || 'colmena';
};

// Función helper para verificar si es un núcleo
export const isNucleus = (hive: Hive): boolean => {
  return getEntityType(hive) === 'nucleo';
};

// Una colmena/núcleo tiene reina salvo que se haya marcado explícitamente como huérfana
// (los datos viejos sin el campo 'hasQueen' se asumen con reina).
export const hiveHasQueen = (hive: Hive): boolean => hive.hasQueen !== false;

export const QUEEN_INFO_ORIGIN_LABELS: Record<QueenInfoOrigin, string> = {
  criada: 'Criada propia',
  comprada: 'Comprada',
  desconocido: 'Desconocido',
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
  photos?: string[]; // URLs de Firebase Storage
  // Recolección avanzada del "Parte de colmena"
  framesMounted?: number; // Cuadros montados (Total) del nido
  framesWorked?: number; // Cuadros trabajados
  broodPattern?: BroodPattern; // Patrón de postura (uniforme | fallada | zanganera)
  hasSupers?: boolean; // ¿Tiene sobre-nido / alza?
}

/**
 * Tratamiento sanitario aplicado a una colmena/núcleo (o a todo el apiario).
 * `waitingDays` es el PERÍODO DE ESPERA: días que deben pasar tras el fin del
 * tratamiento para poder cosechar con seguridad.
 */
export interface Treatment {
  id: string;
  hiveId: string; // id de colmena/núcleo, o 'apiario' para todo el apiario
  product: string;
  dose?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (si falta, se toma el propio inicio)
  waitingDays: number;
  notes?: string;
  createdAt: string;
}

export interface TreatmentDraft {
  hiveId: string;
  product: string;
  dose?: string;
  startDate: string;
  endDate?: string;
  waitingDays: number;
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  hiveId?: string;
  colmenaId?: string;
  dueDate: string;
  priority: 'alta' | 'media' | 'baja';
  tipo?: 'simple' | 'recurrente';
  recurrencia?: number;
  asignado?: string;
  estado?: 'pendiente' | 'completada';
  completed: boolean;
  completedAt?: string;
  createdAt?: string;
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

// Colores de borde por TIPO de entidad (BORDES-POR-TIPO.md).
// El borde del hexágono indica el tipo, no el estado.
export const ENTITY_BORDER_COLORS: Record<'colmena' | 'nucleo' | 'fecundador', string> = {
  colmena: '#E9B44C', // dorado (ámbar miel)
  nucleo: '#C98A4B', // cobre (cera/bronce)
  fecundador: '#B794D9', // lila suave (reina/cría)
};

// Colores del ícono/halo de ESTADO dentro de los hexágonos.
// El borde del tipo nunca se mezcla con el color del estado.
export const STATUS_HALO_COLORS: Record<HiveStatus, string> = {
  saludable: 'transparent',
  revision: '#F5A623', // ámbar
  alerta: '#E2694A', // rojo
  sin_reina: '#B794D9', // morado lila
};

export const STATUS_META = STATUS_COLORS;
export const STATUS_ORDER: HiveStatus[] = ['saludable', 'revision', 'alerta', 'sin_reina'];
