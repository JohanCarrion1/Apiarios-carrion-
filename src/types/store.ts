export const STORE_MACROS = [
  {
    emoji: '🍯',
    nombre: 'Productos naturales',
    subcategorias: ['Mieles', 'Polen y Propóleo', 'Jalea Real'],
  },
  {
    emoji: '🛠️',
    nombre: 'Herramientas para apicultura',
    subcategorias: ['Herramientas', 'Equipos', 'Libros y Manuales'],
  },
  {
    emoji: '🐝',
    nombre: 'Material biológico',
    subcategorias: ['Reinas', 'Núcleos', 'Colmenas'],
  },
] as const;

export type StoreMacro = (typeof STORE_MACROS)[number]['nombre'];
export type Subcategoria = string;

// Compat: lista de nombres de macro-categorías (usos genéricos).
export const STORE_CATEGORIES: readonly StoreMacro[] = STORE_MACROS.map((m) => m.nombre);
export type StoreCategory = (typeof STORE_CATEGORIES)[number];

const MACRO_EMOJI: Record<string, string> = {
  'Productos naturales': '🍯',
  'Herramientas para apicultura': '🛠️',
  'Material biológico': '🐝',
};

export const catEmoji = (c: string): string => MACRO_EMOJI[c] || '🐝';

export const POR_ENCARGO_MACRO: StoreMacro = 'Material biológico';
export const POR_ENCARGO_NOTA = 'Reserva por WhatsApp: entrega según temporada';

export interface StoreProduct {
  id: string;
  nombre: string;
  categoria: StoreCategory;
  subcategoria?: Subcategoria;
  precio: number;
  unidad: string;
  descripcion: string;
  stock: number;
  imageUrl: string;
  activo: boolean;
  badge?: string;
  /** Productos sin precio fijo (ej: Faja de transporte): se muestra "Precio por consultar". */
  consultarPrecio?: boolean;
}

export const esMaterialBiologico = (p: Pick<StoreProduct, 'categoria'>): boolean =>
  p.categoria === POR_ENCARGO_MACRO;

export interface CartItem {
  productId: string;
  cantidad: number;
}

export interface CartLine extends CartItem {
  product?: StoreProduct;
}

export const subcategoriasDe = (macro: string): Subcategoria[] => {
  const m = STORE_MACROS.find((mm) => mm.nombre === macro);
  return m ? [...m.subcategorias] : [];
};

/* Orden de prioridad de macro-categorías en la tienda. */
export const CATEGORY_ORDER: Record<string, number> = {
  'Productos naturales': 1,
  'Herramientas para apicultura': 2,
  'Material biológico': 3,
};

/* Orden de prioridad de subcategorías dentro de cada macro-categoría. */
export const SUBCATEGORY_ORDER: Record<string, number> = {
  'Mieles': 1,
  'Polen y Propóleo': 2,
  'Jalea Real': 3,
  'Reinas': 4,
  'Herramientas': 5,
  'Equipos': 6,
  'Libros y Manuales': 7,
  'Colmenas': 8,
  'Núcleos': 9,
};

/* Ordena los productos por macro-categoría → subcategoría → nombre alfabético. */
export const sortProducts = (products: StoreProduct[]): StoreProduct[] =>
  [...products].sort((a, b) => {
    const macroA = CATEGORY_ORDER[a.categoria] ?? 999;
    const macroB = CATEGORY_ORDER[b.categoria] ?? 999;
    if (macroA !== macroB) return macroA - macroB;

    const subA = SUBCATEGORY_ORDER[a.subcategoria ?? ''] ?? 999;
    const subB = SUBCATEGORY_ORDER[b.subcategoria ?? ''] ?? 999;
    if (subA !== subB) return subA - subB;

    return a.nombre.localeCompare(b.nombre, 'es');
  });

/* Remapeo de categorías legadas → macro + sub (catalogo guardado antes de las 3 macro) */
const LEGACY_SUBCAT: Record<string, { macro: StoreMacro; sub: Subcategoria }> = {
  'Mieles': { macro: 'Productos naturales', sub: 'Mieles' },
  'Polen y Propóleo': { macro: 'Productos naturales', sub: 'Polen y Propóleo' },
  'Cera y Velas': { macro: 'Productos naturales', sub: 'Cera y Velas' },
  'Herramientas': { macro: 'Herramientas para apicultura', sub: 'Herramientas' },
  'Libros': { macro: 'Herramientas para apicultura', sub: 'Libros y Manuales' },
};

export const normalizeStoreProduct = (p: StoreProduct): StoreProduct => {
  // El precio se coacciona a número: un `precio` corrupto (string, null, NaN)
  // que venga de localStorage o de una edición manual rompía los cálculos del
  // carrito y el PDF del catálogo.
  const precioNum = Number(p.precio);
  const base: StoreProduct = {
    ...p,
    precio: Number.isFinite(precioNum) ? precioNum : 0,
    stock: Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0,
  };
  const cat = String(p.categoria ?? '');
  const legacy = LEGACY_SUBCAT[cat];
  if (legacy) return { ...base, categoria: legacy.macro, subcategoria: legacy.sub };
  const macro = STORE_MACROS.find((m) => m.nombre === cat);
  if (!macro) {
    return {
      ...base,
      categoria: 'Productos naturales',
      subcategoria: typeof p.subcategoria === 'string' ? p.subcategoria : undefined,
    };
  }
  return {
    ...base,
    categoria: macro.nombre,
    subcategoria: typeof p.subcategoria === 'string' && p.subcategoria ? p.subcategoria : undefined,
  };
};

/* Une semillas faltantes al catálogo persistido (ej: nuevos productos de
   material biológico) sin pisar los cambios del usuario. */
export const mergeStoreSeeds = (stored: StoreProduct[], seeds: StoreProduct[]): StoreProduct[] => {
  const ids = new Set(stored.map((p) => p.id));
  const missing = seeds.filter((s) => !ids.has(s.id));
  return missing.length ? [...stored, ...missing] : stored;
};

/** Formatea un importe en soles. Tolera valores corruptos (null, undefined,
 *  string, NaN) devolviendo "A consultar" en lugar de lanzar: un solo precio
 *  mal guardado en localStorage tumbaba la tienda, el catálogo y las
 *  cotizaciones al completo. */
export const formatSoles = (amount: unknown): string => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 'A consultar';
  return `S/ ${Number.isInteger(n) ? n : n.toFixed(2)}`;
};

export const esPrecioConsultar = (p: Pick<StoreProduct, 'precio' | 'consultarPrecio'>): boolean =>
  typeof p.consultarPrecio === 'boolean' && p.consultarPrecio;

export const precioTexto = (p: Pick<StoreProduct, 'precio' | 'consultarPrecio'>): string =>
  esPrecioConsultar(p) ? 'Precio por consultar' : formatSoles(p.precio);

/* ---------------------------------------------------------------------------
   Pedidos de la tienda (se generan al confirmar el carrito por WhatsApp y se
   listan en el panel de administración /tienda/admin).
   --------------------------------------------------------------------------- */
export type OrderEstado = 'Pendiente' | 'Confirmado' | 'Entregado';

export interface OrderLine {
  productId: string;
  nombre: string;
  cantidad: number;
  precio: number;
  consultarPrecio?: boolean;
  unidad?: string;
}

export interface StoreOrder {
  id: string;
  date: string;
  cliente?: string;
  lineas: OrderLine[];
  total: number;
  estado: OrderEstado;
  nota?: string;
}

export const ORDER_STATES: OrderEstado[] = ['Pendiente', 'Confirmado', 'Entregado'];