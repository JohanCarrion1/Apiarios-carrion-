import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeGlobalToasts, type GlobalToast, type GlobalToastTipo } from '../lib/toastBus';
import { toastVariants } from '../lib/motion';

/** Icono y color del anillo para cada tipo de toast. */
function TipoIcono({ tipo }: { tipo: GlobalToastTipo }) {
  if (tipo === 'success') {
    return (
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-honey text-ink">✓</span>
    );
  }
  if (tipo === 'error') {
    return (
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-coral text-ink">✕</span>
    );
  }
  if (tipo === 'pending') {
    return (
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-ink">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-husk text-ink">i</span>
  );
}

/** Host de toasts GLOBALES (se monta una vez en App.tsx). */
const MAX_VISIBLES = 4;

export default function GlobalToasts() {
  const [toasts, setToasts] = useState<GlobalToast[]>([]);

  useEffect(() => {
    const unsub = subscribeGlobalToasts((toast) => {
      // Se descartan los más antiguos: sin tope, varios avisos seguidos (por
      // ejemplo, el watch de pedidos más los errores de una acción) se
      // apilaban hacia arriba y tapaban media pantalla.
      setToasts((prev) => [...prev, toast].slice(-MAX_VISIBLES));
      window.setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== toast.id)),
        toast.tipo === 'error' ? 5600 : 4200
      );
    });
    return unsub;
  }, []);

  return (
    // lives en la esquina IZQUIERDA a propósito: los toasts de la propia Tienda
    // ya ocupan la esquina derecha (fixed bottom-24 right-5 w-72) y ahí también
    // está el botón flotante del carrito (bottom-5 right-4). Con este host en la
    // derecha los dos sistemas se superponían exactamente y el aviso global
    // tapaba al local y al carrito.
    <div
      className="pointer-events-none fixed bottom-24 left-4 z-[90] flex w-[min(18rem,calc(100vw-2rem))] flex-col gap-2 sm:left-5"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className="card pointer-events-auto flex items-start gap-3 border-honey/40 p-4 shadow-[0_16px_40px_rgba(0,0,0,.5)]"
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <TipoIcono tipo={t.tipo} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-cream">{t.titulo}</p>
              {t.descripcion && <p className="mt-0.5 truncate font-mono text-[11px] text-husk">{t.descripcion}</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}