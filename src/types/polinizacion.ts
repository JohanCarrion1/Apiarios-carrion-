// ============================================================
// Tipos de contratos de polinización (alquiler de colmenas)
// ============================================================

/** Estado de vida de un contrato de polinización. */
export type PolinizacionEstado = 'pendiente' | 'activo' | 'completado' | 'cancelado';

export const POLINIZACION_ESTADOS: PolinizacionEstado[] = [
  'pendiente',
  'activo',
  'completado',
  'cancelado',
];

export const POLINIZACION_ESTADO_LABELS: Record<PolinizacionEstado, string> = {
  pendiente: 'Pendiente',
  activo: 'Activo',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

export const POLINIZACION_ESTADO_COLORS: Record<PolinizacionEstado, string> = {
  pendiente: '#ffa90a',
  activo: '#93cc68',
  completado: '#8fa3bf',
  cancelado: '#f4552b',
};

/** Cultivos soportados por el selector del formulario. */
export const CULTIVOS_POLINIZACION = [
  'Palto',
  'Arándano',
  'Manzana',
  'Pera',
  'Cítricos',
  'Kiwi',
  'Almendra',
  'Otros',
] as const;

export interface ClientePolinizacion {
  nombre: string;
  telefono: string;
}

export interface ContratoPolinizacion {
  /** Id corto tipo POL-001 (usado como id de documento en Firestore). */
  id: string;
  userId: string;
  cliente: ClientePolinizacion;
  cultivo: string;
  /** Cantidad contratada de colmenas. */
  cantidadColmenas: number;
  /** Códigos de colmena concretas asignadas al contrato. */
  colmenasAsignadas: string[];
  /** Fechas YYYY-MM-DD. */
  fechaInicio: string;
  fechaFin: string;
  ubicacion: string;
  precioPorColmena: number;
  total: number;
  estado: PolinizacionEstado;
  notas: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  /** Marca el documento como guardado en Firestore. */
  saved?: boolean;
}

export interface PolinizacionInput {
  clienteNombre: string;
  clienteTelefono: string;
  cultivo: string;
  cantidadColmenas: number;
  colmenasAsignadas: string[];
  fechaInicio: string;
  fechaFin: string;
  ubicacion: string;
  precioPorColmena: number;
  estado: PolinizacionEstado;
  notas: string;
}

/** Total automático del contrato: cantidad × precio por colmena. */
export const polinizacionTotal = (cantidad: number, precio: number): number => {
  const c = Number(cantidad);
  const p = Number(precio);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return 0;
  return Math.round(c * p * 100) / 100;
};

/** Formatea un total en soles usando el formato de la tienda. */
export const formatSolesPolinizacion = (n: number): string =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(Number(n) || 0);