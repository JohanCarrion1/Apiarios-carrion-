// Tipos para el inventario de material, herramientas e insumos
// Almacenamiento: user_${userId}_inventory (compartido entre apiarios)

export type InventoryCategory = 'material' | 'herramientas' | 'insumos' | 'envases';

export type InventoryMovementType = 'entrada' | 'salida' | 'transferencia';

export interface InventoryMovement {
  id: string;
  fecha: string; // ISO string
  tipo: InventoryMovementType;
  cantidad: number;
  nota?: string;
  proveedor?: string;
}

export interface InventoryItem {
  id: string;
  nombre: string;
  categoria: InventoryCategory;
  cantidadTotal: number;
  cantidadEnUso: number;
  umbralAlerta: number;
  unidad: string;
  proveedor?: string;
  fechaVencimiento?: string;
  notas?: string;
  movimientos: InventoryMovement[];
}

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  material: 'Material de colmenas',
  herramientas: 'Herramientas',
  insumos: 'Insumos',
  envases: 'Envases',
};

export const INVENTORY_CATEGORIES: InventoryCategory[] = ['material', 'herramientas', 'insumos', 'envases'];

export const INVENTORY_UNITS = ['unidades', 'kg', 'litros', 'metros'] as const;

// Presets iniciales por categoría
export const INVENTORY_PRESETS: Record<InventoryCategory, { nombre: string; unidad?: string }[]> = {
  material: [
    { nombre: 'Alzas' },
    { nombre: 'Cámaras de cría' },
    { nombre: 'Cuadros con cera' },
    { nombre: 'Cuadros sin cera' },
    { nombre: 'Paredes' },
    { nombre: 'Pisos' },
    { nombre: 'Entretapas' },
    { nombre: 'Rejillas excluidoras' },
    { nombre: 'Alimentadores' },
  ],
  herramientas: [
    { nombre: 'Ahumadores' },
    { nombre: 'Palancas' },
    { nombre: 'Trajes' },
    { nombre: 'Guantes' },
    { nombre: 'Cepillos' },
    { nombre: 'Cuchillos desoperculadores' },
    { nombre: 'Centrífuga' },
  ],
  insumos: [
    { nombre: 'Cera laminada', unidad: 'kg' },
    { nombre: 'Jarabe', unidad: 'litros' },
    { nombre: 'Medicamentos' },
    { nombre: 'Cúpulas para cría' },
    { nombre: 'Jaulas para reinas' },
  ],
  envases: [
    { nombre: 'Frascos 250g' },
    { nombre: 'Frascos 500g' },
    { nombre: 'Frascos 1kg' },
    { nombre: 'Etiquetas' },
  ],
};

// Cantidad disponible (calculado: total - enUso)
export const inventoryDisponible = (item: Pick<InventoryItem, 'cantidadTotal' | 'cantidadEnUso'>): number =>
  item.cantidadTotal - item.cantidadEnUso;

// Ítem con stock bajo (disponible <= umbral de alerta)
export const isStockBajo = (item: InventoryItem): boolean =>
  item.cantidadEnUso >= item.cantidadTotal || inventoryDisponible(item) <= item.umbralAlerta;

// Nivel de alerta para la barra de progreso
export const inventoryLevel = (item: InventoryItem): 'bajo' | 'medio' | 'ok' => {
  const disp = inventoryDisponible(item);
  if (disp <= item.umbralAlerta) return 'bajo';
  if (disp <= item.umbralAlerta * 2) return 'medio';
  return 'ok';
};

export const inventoryLevelColor = (item: InventoryItem): string => {
  const level = inventoryLevel(item);
  if (level === 'bajo') return '#e4603f'; // coral
  if (level === 'medio') return '#f0a41c'; // honey
  return '#a3bf7f'; // sage
};