// ============================================================
// Mensaje de WhatsApp para cotizaciones
// ============================================================

import type { Cotizacion, CotizacionProducto } from '../types/cotizaciones';
import { formatSoles } from '../types/store';

/** Formatea una línea de producto para el mensaje. */
export const lineaCotizacion = (p: CotizacionProducto, idx: number): string => {
  const base = `${idx + 1}. ${p.nombre} × ${p.cantidad}`;
  if (p.consultarPrecio) return `${base} — Precio por consultar`;
  return `${base} — ${formatSoles(p.precio)} (subtotal ${formatSoles(p.subtotal)})`;
};

/** Arma el texto completo de la cotización para WhatsApp. */
export const buildCotizacionMessage = (q: Cotizacion): string => {
  const items = q.productos.map((p, i) => lineaCotizacion(p, i)).join('\n');
  const partes: string[] = [
    `*COTIZACIÓN ${q.numero} · Apiarios Carrión*`,
    '',
    items,
    '',
    '──────────────────',
    `*Total: ${formatSoles(q.total)}*`,
    `Validez: ${q.validezDias} día${q.validezDias === 1 ? '' : 's'}`,
    q.clienteNombre ? `\nCliente: ${q.clienteNombre}` : '',
    q.clienteTelefono ? `Teléfono: ${q.clienteTelefono}` : '',
    q.notas ? `Notas: ${q.notas}` : '',
  ];
  return partes.filter(Boolean).join('\n');
};

/** Abre el chat de WhatsApp con la cotización (usa el teléfono del cliente, o el de la tienda). */
export const openWhatsAppCotizacion = (
  q: Cotizacion,
  fallbackNumber: string
): void => {
  const digits = (q.clienteTelefono || fallbackNumber || '').replace(/\D/g, '');
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(buildCotizacionMessage(q))}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};