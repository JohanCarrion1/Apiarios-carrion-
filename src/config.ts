// ============================================================
// CONFIGURACIÓN SENSIBLE DE LA TIENDA
// ============================================================
// REGLA DE SEGURIDAD: emails y teléfonos NUNCA van hardcodeados
// en el código frontend. Todos se leen de variables de entorno
// (.env → VITE_*), que no se exponen en el repositorio en claro
// para datos personales de contacto.
// ============================================================

const env = import.meta.env;

/** Email de contacto público de la tienda (footer / contacto). */
export const CONTACT_EMAIL: string = env.VITE_CONTACT_EMAIL?.trim() ?? '';

/** Email del responsable del tratamiento (páginas legales). */
export const LEGAL_CONTACT_EMAIL: string = env.VITE_LEGAL_CONTACT_EMAIL?.trim() ?? '';

/** Número de WhatsApp para pedidos (código país + número, sin '+'). */
export const WHATSAPP_NUMBER: string = env.VITE_WHATSAPP_NUMBER?.trim() ?? '';

/** Etiqueta visible del WhatsApp (ej: '+51 941 668 305'). */
export const WHATSAPP_LABEL: string = env.VITE_WHATSAPP_LABEL?.trim() ?? '';

/** Correos que pueden gestionar productos desde la propia tienda. */
export const OWNER_EMAILS: string[] = parseEmails(env.VITE_OWNER_EMAILS);

/** Correos con acceso al panel de administración /tienda/admin. */
export const ADMIN_EMAILS: string[] = parseEmails(env.VITE_ADMIN_EMAILS);

/**
 * CUENTA PROPIETARIA (la predeterminada) del panel de tienda.
 *
 * Es el único correo con permiso para agregar o quitar administradores. El
 * valor se lee de VITE_OWNER_EMAILS, que es donde lo fijó `bootstrap:admins`
 * dentro de `config/admins.ownerEmail`; lo que vive en Firestore es la fuente
 * de verdad y `.env` es el respaldo (ver isAdminOwner en lib/adminAccess.ts).
 */
export const OWNER_EMAIL: string = parseEmails(env.VITE_OWNER_EMAILS)[0] ?? '';

export function parseEmails(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
