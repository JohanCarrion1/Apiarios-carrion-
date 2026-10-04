// ============================================================
// SANITIZACIÓN DE INPUTS (prevención de XSS)
// ============================================================
// React ya escapa el texto por defecto, pero toda entrada del
// usuario que pueda persistirse (formularios de la tienda, admin,
// etc.) pasa por aquí para neutralizar etiquetas HTML, scripts y
// URLs peligrosas antes de guardarse o mostrarse.

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
};

/** Escapa caracteres HTML sensibles (para render con innerHTML). */
export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"'`]/g, (c) => HTML_ESCAPE[c] ?? c);

/** Elimina cualquier etiqueta HTML/script y colapsa espacios. */
export const stripHtml = (value: string): string =>
  value.replace(/<[^>]*>/g, '').replace(/\s{2,}/g, ' ').trim();

/**
 * Texto seguro para persistir: elimina HTML y limita la longitud.
 * Devuelve '' si no es string.
 */
export const sanitizeText = (value: unknown, maxLength = 500): string => {
  if (typeof value !== 'string') return '';
  return stripHtml(value).slice(0, maxLength);
};

// Esquemas peligrosos que no deben llegar a un href/src/img.
const UNSAFE_PROTOCOLS = /^\s*(javascript|vbscript|file):/i;

// Base64 raster válido en <img>: png, jpeg/jpg, gif, webp, avif, heic/heif,
// bmp, tiff y x-icon. Se REZACHA explícitamente data:image/svg… (puede
// contener scripts/eventos). Cualquier otro data: también queda rechazado.
const RASTER_DATAURL = /^data:image\/(?!svg)(?:[a-z0-9_.+-]+);base64,/i;

/** URLs permitidas: http(s), relativas ('/'), '//' o data:image/* (base64 de la tienda). */
export const sanitizeUrl = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const v = value.trim();
  if (!v) return '';
  if (UNSAFE_PROTOCOLS.test(v)) return '';
  if (/^(https?:)?\/\//i.test(v)) return v;
  if (RASTER_DATAURL.test(v)) return v;
  if (v.startsWith('data:')) return '';
  if (v.startsWith('/') || v.startsWith('.')) return v;
  return v;
};

/**
 * Verifica que un email tenga formato básico válido.
 */
export const isValidEmail = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
};