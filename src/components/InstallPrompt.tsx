import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { IconDownload, IconX, IconRefresh, IconCheck } from '../ui';
import AppLogo from './AppLogo';

/**
 * Evento beforeinstallprompt — no está en los tipos estándar de TS.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const STORAGE_KEY = 'pwa_install_prompt';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

/**
 * Banner inferior (tipo toast) para instalar la PWA.
 * Solo se muestra si beforeinstallprompt dispara y el usuario no lo ha descartado antes.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isInstalled =
      isStandalone() || window.matchMedia('(display-mode: browser)').matches === false;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      if (isInstalled) return;
      if (localStorage.getItem(STORAGE_KEY) === 'dismissed') return;
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      localStorage.setItem(STORAGE_KEY, 'accepted');
      setDeferred(null);
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') {
      localStorage.setItem(STORAGE_KEY, 'accepted');
      setVisible(false);
      setDeferred(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'dismissed');
    setVisible(false);
    setDeferred(null);
  };

  return (
    <AnimatePresence>
      {visible && deferred && (
        <motion.div
          className="fixed bottom-24 lg:bottom-5 left-1/2 z-[70] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2"
          initial={{ opacity: 0, y: 80, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        >
          <div className="card flex items-center gap-3 border-honey/40 p-4 shadow-[0_16px_40px_rgba(0,0,0,.5)]">
            <AppLogo size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-cream">
                Instala Apiarios Carrión para usar sin internet
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <motion.button
                onClick={handleInstall}
                className="flex items-center gap-1.5 rounded-full bg-honey px-3 py-2 text-xs font-bold text-ink shadow-[0_2px_10px_rgba(255,169,10,.35)] transition-colors hover:bg-honeysoft"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                aria-label="Instalar aplicación"
              >
                <IconDownload className="h-3.5 w-3.5" />
                Instalar
              </motion.button>
              <motion.button
                onClick={handleDismiss}
                className="flex h-8 w-8 items-center justify-center rounded-full text-husk transition-colors hover:bg-pane3 hover:text-cream"
                whileTap={{ scale: 0.9 }}
                aria-label="Ahora no"
                title="Ahora no"
              >
                <IconX className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Toast de actualización: detecta una nueva versión del service worker
 * y ofrece recargar. La actualización ya se descargó en background
 * (registerType: 'autoUpdate').
 */
export function PWAUpdateToast() {
  const { updateServiceWorker } = useRegisterSW({
    onNeedReload() {
      // Nueva versión ya descargada y activada en background:
      // mostramos el toast en lugar de forzar la recarga.
      setShowUpdate(true);
    },
    onOfflineReady() {
      // La app ya está lista para funcionar sin conexión.
      setOfflineReady(true);
    },
  });

  const [showUpdate, setShowUpdate] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  const reload = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  const showOfflineReady = offlineReady && !isStandalone();

  if (!showUpdate && !showOfflineReady) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex justify-center px-4">
      <AnimatePresence mode="wait">
        {showUpdate ? (
          <motion.div
            key="update"
            className="pointer-events-auto card flex w-full max-w-md items-center gap-3 border-honey/40 p-4 shadow-[0_16px_40px_rgba(0,0,0,.5)]"
            initial={{ opacity: 0, y: -40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-honey text-ink">
              <IconRefresh className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-cream">
                Nueva versión disponible
              </p>
            </div>
            <motion.button
              onClick={() => {
                setShowUpdate(false);
                reload();
              }}
              className="shrink-0 rounded-full bg-honey px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-honeysoft"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              aria-label="Recargar para actualizar"
            >
              Recargar
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="offline-ready"
            className="pointer-events-auto card flex w-full max-w-md items-center gap-3 border-sage/40 p-4 shadow-[0_16px_40px_rgba(0,0,0,.5)]"
            initial={{ opacity: 0, y: -40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage text-ink">
              <IconCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-cream">
                Lista para usar sin conexión
              </p>
            </div>
            <motion.button
              onClick={() => setOfflineReady(false)}
              className="shrink-0 rounded-full bg-pane3 px-3 py-2 text-xs font-semibold text-husk transition-colors hover:text-cream"
              whileTap={{ scale: 0.95 }}
              aria-label="Cerrar"
            >
              Cerrar
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}