// ============================================================
// Tipos de cotizaciones de la tienda (POS exclusivo de admins)
// ============================================================

/** Estado de vida de una cotización. */
export type CotizacionEstado = 'pendiente' | 'enviada' | 'aprobada';

export const COTIZACION_ESTADOS: CotizacionEstado[] = ['pendiente', 'enviada', 'aprobada'];

export interface CotizacionProducto {
  id: string;
  nombre: string;
  unidad: string;
  /** Precio unitario. 0 para productos "Precio por consultar". */
  precio: number;
  consultarPrecio?: boolean;
  cantidad: number;
  /** precio × cantidad (0 si consultarPrecio). */
  subtotal: number;
}

/** Entrada del bitácora de estados de una cotización. */
export interface CotizacionHistorialEntry {
  estado: CotizacionEstado;
  /** Admin que realizó el cambio. */
  adminEmail: string;
  /** ISO. */
  ts: string;
}

export interface Cotizacion {
  /** Número corto tipo COT-001 (usado como id de documento en Firestore). */
  numero: string;
  fecha: string;
  validezDias: number;
  clienteNombre?: string;
  clienteTelefono?: string;
  notas?: string;
  productos: CotizacionProducto[];
  total: number;
  estado: CotizacionEstado;
  /** Correo del admin que la generó. */
  adminEmail: string;
  /** Bitácora de cambios de estado (izquierda hacia atrás). */
  historial?: CotizacionHistorialEntry[];
  /** Marca la cotización como guardada en Firestore. */
  saved?: boolean;
}

/** Subtotal de una línea (0 si es "Precio por consultar"). */
export const cotizacionSubtotal = (p: Pick<CotizacionProducto, 'precio' | 'consultarPrecio' | 'cantidad'>): number =>
  p.consultarPrecio ? 0 : (p.precio || 0) * p.cantidad;

/** Total general de una lista de líneas (ignora "Precio por consultar"). */
export const cotizacionTotal = (lineas: Pick<CotizacionProducto, 'precio' | 'consultarPrecio' | 'cantidad'>[]): number =>
  lineas.reduce((sum, l) => sum + cotizacionSubtotal(l), 0);

/** Fecha legible en español (dd/mm/aaaa). */
export const formatearFechaCorta = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};