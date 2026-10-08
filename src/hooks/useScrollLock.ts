import { useEffect } from 'react';
import { adquirirScrollLock } from './scrollLockCore';

/**
 * Congela el scroll del fondo (html + body) mientras `active` sea true.
 *
 * Toda la lógica vive en `scrollLockCore` (reentrante, con contador de
 * referencias, ver ahí el por qué) para poder testearla sin DOM real. Este
 * hook es solo el puente con React: adquiere el bloqueo cuando `active` pasa
 * a true y lo libera al desmontar o cuando vuelve a false.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    return adquirirScrollLock();
  }, [active]);
}

export { scrollLocksActivos } from './scrollLockCore';
