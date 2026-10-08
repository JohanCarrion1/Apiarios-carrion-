/**
 * Avisos del sistema del navegador (entrega "Push (PWA)" de Ajustes).
 *
 * No hay backend de push (VAPID/Web Push): se usa la Notifications API con el
 * service worker de la PWA, que es lo que permite mostrar el aviso con la
 * pestaña en segundo plano (en Android/escritorio) y que al tocarlo se enfoque
 * la app. En iOS solo funciona con la app instalada en el inicio (16.4+); si
 * no hay permiso o el navegador no lo soporta, todo falla en silencio y la app
 * sigue mostrando sus avisos visuales de siempre.
 */

export const isPushSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

export const getPushPermission = (): NotificationPermission =>
  isPushSupported() ? Notification.permission : 'denied';

/** Pide permiso. Debe llamarse desde un gesto del usuario (clic). */
export const requestPushPermission = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
};

export interface LocalPush {
  title: string;
  body?: string;
  tag?: string;
}

/**
 * Muestra un aviso del sistema. Nunca rechaza: sin permiso no hace nada.
 * Prefiere el service worker (requisito en iOS y para las notificaciones de
 * la PWA) y cae al constructor clásico como red de seguridad.
 */
export const showLocalPush = async ({ title, body, tag }: LocalPush): Promise<void> => {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  const options: NotificationOptions = {
    body: body || '',
    tag,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
  };
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration && registration.showNotification) {
      await registration.showNotification(title, options);
      return;
    }
  } catch {
    /* sin SW se intenta con el constructor */
  }
  try {
    new Notification(title, options);
  } catch {
    /* navegador que lo prohíbe (p.ej. iOS sin instalar): se ignora */
  }
};
