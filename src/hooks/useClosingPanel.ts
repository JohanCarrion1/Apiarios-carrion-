import { useCallback, useEffect, useRef, useState } from 'react';
import { DETAIL_UNMOUNT_MS } from '../lib/motion';

/* Gestión del estado "closing" de un panel de detalle con NODO ÚNICO.
   - Al cerrar: marca el id en closing y programa el desmontaje (unmount).
   - Si se reabre (otro clic) antes de terminar el cierre: cancela el timeout
     huérfano para que NO desmonte el panel recién abierto (clearTimeout).
   - El timeout se limpia también al desmontar la sección. */
export function useClosingPanel() {
  const [closingId, setClosingId] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearCloseTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearCloseTimeout, [clearCloseTimeout]);

  const beginClose = useCallback(
    (id: string, done: () => void) => {
      clearCloseTimeout();
      setClosingId(id);
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        setClosingId(null);
        done();
      }, DETAIL_UNMOUNT_MS);
    },
    [clearCloseTimeout],
  );

  const cancelClosing = useCallback(() => {
    clearCloseTimeout();
    setClosingId(null);
  }, [clearCloseTimeout]);

  return { closingId, beginClose, cancelClosing };
}