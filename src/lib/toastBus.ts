// ============================================================
// BUS GLOBAL DE TOASTS
// ============================================================
// Mecanismo ligero para emitir toasts DESDE CUALQUIER punto de la app
// (listeners, servicios, notificaciones de pedidos) sin acoplar módulos.
// <GlobalToasts/> se monta una sola vez en App.tsx y se suscribe aquí.
// ============================================================

export type GlobalToastTipo = 'success' | 'error' | 'info' | 'pending';

export interface GlobalToast {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: GlobalToastTipo;
}

type Listener = (toast: GlobalToast) => void;

const listeners = new Set<Listener>();

export function emitGlobalToast(
  titulo: string,
  descripcion?: string,
  tipo: GlobalToastTipo = 'info'
): string {
  const toast: GlobalToast = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    titulo,
    descripcion,
    tipo,
  };
  listeners.forEach((l) => {
    try {
      l(toast);
    } catch (err) {
      console.error('[TOAST] Error en listener global:', err);
    }
  });
  return toast.id;
}

/** Suscribe un host (o emisor) a los toasts globales. Devuelve el unsubscribe. */
export function subscribeGlobalToasts(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}