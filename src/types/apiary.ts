// ============================================================
// TIPOS DE APIARIO
// ============================================================
import type { PhotoData } from '../services/photos';

/** Tipo de colmena utilizada en el apiario. */
export type HiveType = 'langstroth' | 'layens' | 'dadant' | 'otros';

export interface HiveTypeOption {
  value: HiveType;
  label: string;
  description: string;
}

export const HIVE_TYPE_OPTIONS: HiveTypeOption[] = [
  {
    value: 'langstroth',
    label: 'Langstroth',
    description: 'Estándar de cuadros móviles · el más común',
  },
  {
    value: 'layens',
    label: 'Layens',
    description: 'Horizontal, ideal para climas fríos',
  },
  {
    value: 'dadant',
    label: 'Dadant',
    description: 'Cuadros grandes, muy bueno para la cría',
  },
  {
    value: 'otros',
    label: 'Otros',
    description: 'Otro modelo o colmenar mixto',
  },
];

export const DEFAULT_HIVE_TYPE: HiveType = 'langstroth';

export function hiveTypeLabel(value?: HiveType | string): string {
  return HIVE_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? '—';
}

export interface ApiaryCoordinates {
  lat: number;
  lng: number;
  /** Dirección legible obtenida por reverse geocoding (opcional). */
  address?: string;
}

/** Apiario del usuario. */
export interface Apiary {
  id: string;
  userId: string;
  name: string;
  /** Ubicación en texto. Solo se guarda si el usuario dio alguna. */
  location?: string;
  /** Ubicación en texto guardada como `address` dentro del documento. */
  address?: string;
  coordinates?: ApiaryCoordinates;
  altitud?: number;
  hiveType?: HiveType;
  fotos?: PhotoData[];
  createdAt: string;
  updatedAt: string;
}
