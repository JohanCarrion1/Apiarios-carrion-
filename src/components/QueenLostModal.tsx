import { useState } from 'react';
import { motion } from 'framer-motion';
import { backdropVariants, modalVariants } from '../lib/motion';
import { useScrollLock } from '../hooks/useScrollLock';
import type { Queen } from '../types/queen';
import { IconX } from '../ui';

interface QueenLostModalProps {
  queen: Queen | null;
  getColonyLabel: (id: string) => string;
  onClose: () => void;
  onConfirm: (queen: Queen, nota: string) => void;
}

export default function QueenLostModal({ queen, getColonyLabel, onClose, onConfirm }: QueenLostModalProps) {
  const [nota, setNota] = useState('');

  useScrollLock(true);

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 touch-none"
      onClick={onClose}
    >
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="card max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👑</span>
            <h3 className="font-display text-xl font-bold text-cream">Marcar reina como perdida</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-ink/50 hover:bg-ink/70 flex items-center justify-center">
            <IconX className="w-4 h-4 text-cream" />
          </button>
        </div>

        {queen && (
          <p className="text-sm text-husk mb-4">
            Vas a marcar la reina de <strong className="text-cream">{getColonyLabel(queen.hiveId)}</strong> como perdida. La colmena pasará a estar sin reina registrada y quedará guardado en el historial.
          </p>
        )}

        <div className="mb-5">
          <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
            Nota <span className="normal-case text-husk/60">(opcional)</span>
          </label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej: no avistada en dos inspecciones..."
            rows={2}
            className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70 resize-none"
          />
        </div>

        <div className="flex gap-2">
          <motion.button
            onClick={() => queen && onConfirm(queen, nota.trim())}
            className="flex-1 rounded-xl bg-coral py-2.5 text-sm font-semibold text-white hover:bg-coral/90"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Marcar como perdida
          </motion.button>
          <motion.button
            onClick={onClose}
            className="flex-1 rounded-xl border border-line py-2.5 text-sm font-medium text-husk hover:bg-ink/50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancelar
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}