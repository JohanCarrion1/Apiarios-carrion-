// ============================================================
// MAPA INTERACTIVO PARA MARCAR UNA CAJA TRAMPA (modal)
// ============================================================

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScrollLock } from '../hooks/useScrollLock';
import { backdropVariants, modalVariants } from '../lib/motion';
import LocationMap from './LocationMap';
import { IconMapPin, IconX } from '../ui';
import { formatTrapCoords } from '../types/trapBox';

interface Props {
  open: boolean;
  lat: number;
  lng: number;
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
}

export default function TrapBoxMapModal({ open, lat, lng, onClose, onConfirm }: Props) {
  const [pos, setPos] = useState({ lat, lng });
  useScrollLock(open);

  useEffect(() => {
    if (open) setPos({ lat, lng });
  }, [open, lat, lng]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-pane p-6 sm:rounded-2xl"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-husk">
                  <IconMapPin className="h-3 w-3" /> Ubicación
                </p>
                <h3 className="font-display text-2xl font-bold text-cream">Marcar en el mapa</h3>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-ink text-husk transition-colors hover:border-honey/60 hover:text-honey"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <LocationMap
              latitude={pos.lat}
              longitude={pos.lng}
              onLocationChange={(la, ln) => setPos({ lat: la, lng: ln })}
            />

            <div className="mt-4 flex items-center justify-between rounded-xl border border-honey/30 bg-honey/10 px-4 py-3">
              <span className="text-xs uppercase tracking-widest text-honey">Punto elegido</span>
              <span className="font-mono text-sm font-semibold text-honey">
                {formatTrapCoords(pos.lat, pos.lng)}
              </span>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3 border-t border-line pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-line bg-ink px-5 py-2.5 text-sm font-semibold text-husk transition-colors hover:text-cream"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm(pos.lat, pos.lng);
                  onClose();
                }}
                className="flex items-center gap-2 rounded-xl bg-honey px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-honey/90"
              >
                <IconMapPin className="h-4 w-4" /> Usar esta ubicación
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
