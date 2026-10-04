// ============================================================
// Sesión de administrador del panel de la tienda.
// La lista de quién es admin se lee de Firestore (config/admins,
// ver src/lib/adminAccess.ts) y se refleja en un store reactivo.
// Aquí solo se persiste la sesión local (7 días de vigencia).
// ============================================================

import { isEmailAdmin } from './adminAccess';

const SESSION_KEY = 'panal_v1_admin_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export const isAllowedAdmin = (email: string | null | undefined): boolean =>
  isEmailAdmin(email);

/** Registra la sesión de admin tras un login válido. */
export const setAdminSession = (email: string): void => {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        email,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_DURATION_MS,
      })
    );
  } catch (error) {
    console.error('[ADMIN] No se pudo guardar la sesión:', error);
  }
};

export const clearAdminSession = (): void => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
};

export const getAdminSession = (): { email: string; expiresAt: number } | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string; expiresAt?: number };
    if (typeof parsed.email !== 'string' || typeof parsed.expiresAt !== 'number') return null;
    return { email: parsed.email, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
};

/** Sesión vigente: existe, no expiró y el correo sigue autorizado. */
export const hasValidAdminSession = (): boolean => {
  const session = getAdminSession();
  if (!session) return false;
  if (!isAllowedAdmin(session.email)) return false;
  return session.expiresAt > Date.now();
};