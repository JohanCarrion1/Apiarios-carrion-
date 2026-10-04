import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX } from '../ui';
import AppLogo from './AppLogo';

// ============================================================
// Banner de consentimiento de cookies (cumplimiento RGPD/SPD Perú)
// - Aparece solo en la PRIMERA visita (sin preferencia guardada).
// - "Aceptar" / "Rechazar" guarda la decisión en localStorage.
// - Si el usuario rechaza, NO se inicializa analytics ni ninguna
//   herramienta de seguimiento (ver hasConsent en este módulo).
// ============================================================

export const COOKIE_CONSENT_KEY = 'panal_v1_cookie_consent';

export type CookieConsent = 'accepted' | 'rejected';

/** Lee la preferencia de cookies guardada (null = aún sin decidir). */
export const getCookieConsent = (): CookieConsent | null => {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    return raw === 'accepted' || raw === 'rejected' ? raw : null;
  } catch {
    return null;
  }
};

/** True solo si el usuario aceptó las cookies (para analytics). */
export const hasCookieConsent = (): boolean => getCookieConsent() === 'accepted';

export const setCookieConsent = (value: CookieConsent): void => {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch {
    /* almacenamiento lleno: no se bloquea la navegación */
  }
};

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getCookieConsent() === null) setVisible(true);
  }, []);

  const accept = () => {
    setCookieConsent('accepted');
    setVisible(false);
  };

  const reject = () => {
    setCookieConsent('rejected');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-live="polite"
          aria-label="Aviso de cookies"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="fixed inset-x-0 bottom-0 z-[75] px-3 pb-3 sm:px-4 sm:pb-4"
        >
          <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-honey/30 bg-[#201810]/95 shadow-[0_16px_50px_rgba(0,0,0,.6)] backdrop-blur">
            <div className="flex items-start gap-3 p-4 sm:p-5">
              <AppLogo size="sm" className="mt-0.5" />

              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold leading-snug text-cream sm:text-base">
                  🍪 Usamos cookies para que la tienda funcione
                </p>
                <p className="mt-1 text-xs leading-relaxed text-husk sm:text-[13px]">
                  Solo usamos cookies <strong className="text-cream">esenciales</strong> (carrito y sesión) en tu
                  navegador. No vendemos ni compartimos tus datos. Puedes aceptarlas o rechazarlas; si las
                  rechazas no activamos ningún rastreo.
                </p>
              </div>

              <button
                onClick={reject}
                aria-label="Cerrar aviso de cookies sin aceptar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-husk transition-colors hover:bg-pane3 hover:text-cream"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2 border-t border-honey/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <Link
                to="/cookies"
                onClick={() => setVisible(false)}
                className="text-xs font-semibold text-honey underline-offset-4 transition-colors hover:text-honeysoft hover:underline"
              >
                Más información
              </Link>
              <div className="flex flex-col gap-2 sm:flex-row">
                <motion.button
                  onClick={reject}
                  whileTap={{ scale: 0.96 }}
                  className="rounded-full border border-line px-4 py-2.5 text-xs font-bold text-husk transition-colors hover:border-honey/50 hover:text-cream"
                >
                  Rechazar
                </motion.button>
                <motion.button
                  onClick={accept}
                  whileTap={{ scale: 0.96 }}
                  className="rounded-full bg-honey px-5 py-2.5 text-xs font-black text-ink shadow-[0_2px_12px_rgba(240,164,28,.35)] transition-colors hover:bg-honeysoft"
                >
                  Aceptar todas
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}