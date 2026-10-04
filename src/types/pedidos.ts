// ============================================================
// Tipos de pedidos de la tienda (pago con Yape)
// ============================================================

/** Estado de vida de un pedido con pago por Yape. */
export type PedidoEstado = 'pendiente_pago' | 'pagado' | 'rechazado' | 'completado';

export const PEDIDO_ESTADOS: PedidoEstado[] = ['pendiente_pago', 'pagado', 'rechazado', 'completado'];

/** Nombres legibles de cada estado. */
export const PEDIDO_ESTADO_LABEL: Record<PedidoEstado, string> = {
  pendiente_pago: 'Pendiente de pago',
  pagado: 'Pagado',
  rechazado: 'Rechazado',
  completado: 'Completado',
};

export interface PedidoCliente {
  nombre: string;
  telefono: string;
  correo?: string;
  direccion: string;
}

export interface PedidoProducto {
  id: string;
  nombre: string;
  unidad: string;
  precio: number;
  consultarPrecio: boolean;
  cantidad: number;
  subtotal: number;
}

export interface ComprobantePago {
  /** URL de descarga en Firebase Storage. */
  url: string;
  /** Nombre original del archivo. */
  nombre: string;
  mime: string;
  /** Tamaño en bytes. */
  tamaño: number;
  subidoAt: string;
}

/** Evento del historial de estados de un pedido. */
export interface PedidoEstadoEvent {
  estado: PedidoEstado;
  descripcion?: string;
  at: string;
  actor: string;
}

export interface Pedido {
  /** Número corto tipo PED-001 (usado como id de documento en Firestore). */
  numero: string;
  /** UID del usuario que realizó el pedido (aislamiento del cliente). */
  clienteUid: string;
  clienteEmail?: string;
  cliente: PedidoCliente;
  productos: PedidoProducto[];
  total: number;
  comprobantePago: ComprobantePago;
  metodoPago: 'yape';
  estado: PedidoEstado;
  motivoRechazo?: string;
  historial: PedidoEstadoEvent[];
  /** ISO del momento en que se creó. */
  fechaCreacion: string;
  /** Marca el pedido como guardado en Firestore. */
  saved?: boolean;
}

/** Subtotal de una línea (0 si es "Precio por consultar"). */
export const pedidoSubtotal = (
  p: Pick<PedidoProducto, 'precio' | 'consultarPrecio' | 'cantidad'>
): number => (p.consultarPrecio ? 0 : (p.precio || 0) * p.cantidad);

/** Total general de una lista de líneas (ignora "Precio por consultar"). */
export const pedidoTotal = (
  lineas: Pick<PedidoProducto, 'precio' | 'consultarPrecio' | 'cantidad'>[]
): number => lineas.reduce((sum, l) => sum + pedidoSubtotal(l), 0);