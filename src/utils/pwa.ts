/**
 * Helpers PWA: refresco de caché, actualización forzada y detección
 * del modo standalone (app instalada).
 */

// BUMPEÁ esta versión en cada deploy para forzar que la PWA instalada
// descarte el shell antiguo (caches + service worker) una sola vez.
export const PWA_CACHE_VERSION = '2026.09.22-v2';

const SEEN_VERSION_KEY = 'ac_pwa_seen_version';

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

/**
 * Refresco de caché versionado: se ejecuta una única vez por versión.
 * Borra caches de workbox e invalida el service worker viejo, de modo que
 * la PWA instalada carga el shell nuevo (con el botón "Volver al inicio")
 * y no el que quedó cacheado en la instalación original.
 */
export function runCacheRefresh(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    if (localStorage.getItem(SEEN_VERSION_KEY) === PWA_CACHE_VERSION) return;

    // Marcar ANTES de recargar para no caer en un bucle infinito.
    localStorage.setItem(SEEN_VERSION_KEY, PWA_CACHE_VERSION);

    if ('caches' in window) {
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
    }

    window.location.reload();
  } catch (error) {
    console.warn('[PWA] No se pudo refrescar la caché:', error);
  }
}

/**
 * Actualización manual ("Actualizar app"): limpia caches, da de baja el
 * service worker actual y recarga para tomar la última versión publicada.
 */
export async function forcePwaUpdate(): Promise<void> {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  } catch (error) {
    console.warn('[PWA] Fallo al actualizar:', error);
  }

  window.location.reload();
}