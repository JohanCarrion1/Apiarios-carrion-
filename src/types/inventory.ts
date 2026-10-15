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

export const INVENTORY_UNITS = ['unidades', 'láminas', 'kg', 'litros', 'metros', 'rollos', 'ml'] as const;

// Unidades que admiten decimales (kg, ml)
export const INVENTORY_DECIMAL_UNITS = ['kg', 'ml'] as const;

// Unidades que solo admiten enteros (láminas, unidades)
export const allowsDecimals = (unidad: string): boolean => (INVENTORY_DECIMAL_UNITS as readonly string[]).includes(unidad);

// Formatea una cantidad según la unidad (evita ruido flotante y enteros truncos)
export const formatInventoryQuantity = (value: number, unidad: string): string => {
  const n = Number.isFinite(value) ? value : 0;
  if (allowsDecimals(unidad)) return String(parseFloat(n.toFixed(3)));
  return String(Math.round(n));
};

// Presets iniciales por categoría
export const INVENTORY_PRESETS: Record<InventoryCategory, { nombre: string; unidad?: string; label?: string }[]> = {
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
    { label: 'Cera estampada (láminas)', nombre: 'Cera estampada', unidad: 'láminas' },
    { label: 'Cera estampada (kg)', nombre: 'Cera estampada', unidad: 'kg' },
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
    { label: 'Cera en bloques (kg)', nombre: 'Cera en bloques', unidad: 'kg' },
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
  if (level === 'bajo') return '#f4552b'; // coral
  if (level === 'medio') return '#ffa90a'; // honey
  return '#93cc68'; // sage
};