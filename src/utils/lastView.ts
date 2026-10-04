// ============================================================
// Persistencia de la última vista (PERSISTENCIA-ULTIMA-VISTA)
// ============================================================
//
// 1) ultima_vista (+ timestamp): el destino elegido desde la pantalla
//    de selección (/seleccionar): '/tienda' o '/dashboard[/<apiario>]'.
//    Se guarda con marca de tiempo y caduca a los 7 días.
// 2) tienda_ultima_vista: sub-vista dentro de la Tienda (pestaña y, si
//    estaba en el catálogo, categoría macro y subcategoría).
// 3) dashboard_ultima_vista: sección del dashboard abierta la última vez.
//
// Todas las claves son versionadas y por usuario, igual que el resto de
// datos de la app (panal_v1_user_${uid}_...).
import { getUserKey, getCurrentUserId } from './storage';

export const LAST_VIEW_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export const getUltimaVistaKey = (userId?: string): string =>
  getUserKey('ultima_vista', userId);
const getUltimaVistaTimestampKey = (userId?: string): string =>
  getUserKey('ultima_vista_timestamp', userId);
export const getTiendaUltimaVistaKey = (userId?: string): string =>
  getUserKey('tienda_ultima_vista', userId);
export const getDashboardUltimaVistaKey = (userId?: string): string =>
  getUserKey('dashboard_ultima_vista', userId);

export interface UltimaVista {
  vista: string;
  ts: number;
}

/** Guarda el destino elegido en /seleccionar junto con un timestamp (ms). */
export const saveUltimaVista = (vista: string, userId?: string): void => {
  const uid = userId || getCurrentUserId();
  if (!vista) return;
  try {
    localStorage.setItem(getUltimaVistaKey(uid), vista);
    localStorage.setItem(getUltimaVistaTimestampKey(uid), String(Date.now()));
    console.log(`🧭 [ULTIMAVISTA] Guardada ultima_vista=${vista} en ${getUltimaVistaKey(uid)}`);
  } catch (error) {
    console.error('[ULTIMAVISTA] Error guardando ultima_vista:', error);
  }
};

/**
 * Lee la última vista si existe y no ha expirado (>7 días). Si expiró,
 * la elimina y devuelve null (la pantalla /seleccionar se muestra normal).
 */
export const loadUltimaVista = (userId?: string): UltimaVista | null => {
  const uid = userId || getCurrentUserId();
  try {
    const vista = localStorage.getItem(getUltimaVistaKey(uid));
    if (!vista) return null;
    const rawTs = localStorage.getItem(getUltimaVistaTimestampKey(uid));
    const ts = rawTs ? Number(rawTs) : 0;
    if (!Number.isFinite(ts) || ts <= 0 || Date.now() - ts > LAST_VIEW_MAX_AGE_MS) {
      console.log(`🧭 [ULTIMAVISTA] Vista expirada (ts=${ts}), se limpia para mostrar /seleccionar normal`);
      clearUltimaVista(uid);
      return null;
    }
    return { vista, ts };
  } catch (error) {
    console.error('[ULTIMAVISTA] Error leyendo ultima_vista:', error);
    return null;
  }
};

/** Elimina solo la última vista (se usa al volver manualmente a /seleccionar). */
export const clearUltimaVista = (userId?: string): void => {
  const uid = userId || getCurrentUserId();
  try {
    localStorage.removeItem(getUltimaVistaKey(uid));
    localStorage.removeItem(getUltimaVistaTimestampKey(uid));
  } catch (error) {
    console.error('[ULTIMAVISTA] Error limpiando ultima_vista:', error);
  }
};

export interface TiendaUltimaVista {
  tab: string;
  macro?: string | null;
  sub?: string;
}

export const saveTiendaUltimaVista = (view: TiendaUltimaVista, userId?: string): void => {
  const uid = userId || getCurrentUserId();
  try {
    localStorage.setItem(getTiendaUltimaVistaKey(uid), JSON.stringify(view));
  } catch (error) {
    console.error('[ULTIMAVISTA] Error guardando tienda_ultima_vista:', error);
  }
};

export const loadTiendaUltimaVista = (userId?: string): TiendaUltimaVista | null => {
  const uid = userId || getCurrentUserId();
  try {
    const raw = localStorage.getItem(getTiendaUltimaVistaKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TiendaUltimaVista;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.tab !== 'string') return null;
    return parsed;
  } catch (error) {
    console.error('[ULTIMAVISTA] Error leyendo tienda_ultima_vista:', error);
    return null;
  }
};

export interface DashboardUltimaVista {
  section: string;
}

export const saveDashboardUltimaVista = (view: DashboardUltimaVista, userId?: string): void => {
  const uid = userId || getCurrentUserId();
  try {
    localStorage.setItem(getDashboardUltimaVistaKey(uid), JSON.stringify(view));
  } catch (error) {
    console.error('[ULTIMAVISTA] Error guardando dashboard_ultima_vista:', error);
  }
};

export const loadDashboardUltimaVista = (userId?: string): DashboardUltimaVista | null => {
  const uid = userId || getCurrentUserId();
  try {
    const raw = localStorage.getItem(getDashboardUltimaVistaKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardUltimaVista;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.section !== 'string') return null;
    return parsed;
  } catch (error) {
    console.error('[ULTIMAVISTA] Error leyendo dashboard_ultima_vista:', error);
    return null;
  }
};

/** Limpia todas las preferencias de última vista del usuario (logout). */
export const clearAllLastViews = (userId?: string): void => {
  const uid = userId || getCurrentUserId();
  try {
    localStorage.removeItem(getUltimaVistaKey(uid));
    localStorage.removeItem(getUltimaVistaTimestampKey(uid));
    localStorage.removeItem(getTiendaUltimaVistaKey(uid));
    localStorage.removeItem(getDashboardUltimaVistaKey(uid));
    console.log(`🧭 [ULTIMAVISTA] Preferencias de vista limpiadas para ${uid}`);
  } catch (error) {
    console.error('[ULTIMAVISTA] Error limpiando preferencias de vista:', error);
  }
};