import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX } from '../ui';
import { useAuth } from '../context/AuthContext';
import { createApiary } from '../services/apiaryService';
import { saveLastActiveApiaryId } from '../utils/storage';

interface CreateApiaryModalProps {
  open: boolean;
  /** 'modal' → ventana superpuesta (dropdown del dashboard) | 'screen' → pantalla completa (onboarding) */
  variant?: 'modal' | 'screen';
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  onClose?: () => void;
  onCreated?: (apiaryId: string) => void;
}

export default function CreateApiaryModal({
  open,
  variant = 'modal',
  title = 'Crear nuevo apiario',
  subtitle = 'Registra un apiario para empezar a gestionar sus colmenas',
  submitLabel = 'Crear apiario',
  onClose,
  onCreated,
}: CreateApiaryModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [altitud, setAltitud] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const resetForm = () => {
    setName('');
    setLocation('');
    setAltitud('');
    setError('');
  };

  const handleClose = () => {
    if (creating) return;
    resetForm();
    onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user) return;
    if (!name.trim()) {
      setError('El nombre del apiario es obligatorio');
      return;
    }

    let altitudNum: number | undefined;
    if (altitud.trim() !== '') {
      altitudNum = Number(altitud);
      if (Number.isNaN(altitudNum)) {
        setError('La altitud debe ser un número en metros');
        return;
      }
    }

    try {
      setCreating(true);
      const apiaryId = await createApiary(
        user.uid,
        name,
        location,
        undefined,
        undefined,
        altitudNum
      );
      saveLastActiveApiaryId(apiaryId, user.uid);
      resetForm();
      onCreated?.(apiaryId);
    } catch (err: any) {
      console.error('❌ [CREATE APIARY] Error:', err);
      setError(err?.message || 'Error al crear el apiario');
    } finally {
      setCreating(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nombre */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
          Nombre del apiario *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="Ej: Apiario Caraz, La Dehesa..."
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(240,164,28,.12)]"
        />
      </div>

      {/* Ubicación */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
          Ubicación
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ej: Cochac, Independencia, Áncash"
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(240,164,28,.12)]"
        />
      </div>

      {/* Altitud (opcional) */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
          Altitud (opcional)
        </label>
        <input
          type="number"
          value={altitud}
          onChange={(e) => setAltitud(e.target.value)}
          placeholder="Ej: 2100 (msnm)"
          min={-500}
          className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(240,164,28,.12)]"
        />
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 rounded-lg border border-coral/40 bg-coral/10 text-coral text-sm"
        >
          {error}
        </motion.p>
      )}

      <div className="flex gap-3 pt-1">
        <motion.button
          type="submit"
          disabled={creating}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 rounded-xl bg-honey py-3 font-semibold text-ink hover:bg-honeysoft disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? 'Creando...' : submitLabel}
        </motion.button>
        {variant === 'modal' && onClose && (
          <motion.button
            type="button"
            onClick={handleClose}
            disabled={creating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 rounded-xl border border-line py-3 font-semibold text-husk hover:text-cream"
          >
            Cancelar
          </motion.button>
        )}
      </div>
    </form>
  );

  if (variant === 'screen') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-ink">
        <div className="absolute inset-0">
          <svg className="absolute inset-0 w-full h-full opacity-[0.08]" aria-hidden="true">
            <defs>
              <pattern id="hex-pattern-onboarding" width="50" height="87" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
                <path d="M25 7.5L43.3 18.5v22L25 51.5 6.7 40.5v-22Z" fill="none" stroke="#f0a41c" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hex-pattern-onboarding)" />
          </svg>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #f0a41c 0%, transparent 70%)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #b97d15 0%, transparent 70%)' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="card p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="font-display text-3xl font-black tracking-tight text-cream">
                {title}
              </h1>
              <p className="text-husk mt-2">{subtitle}</p>
            </div>
            {formContent}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-ink/90 backdrop-blur-sm"
            onClick={handleClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="card relative w-full max-w-md my-8 shadow-[0_30px_80px_rgba(0,0,0,.6)]"
            >
              <div className="border-b border-line p-5 flex items-start justify-between">
                <div>
                  <p className="tick-label mb-1.5">Apiarios</p>
                  <h3 className="font-display text-2xl font-black tracking-tight text-cream">{title}</h3>
                </div>
                <motion.button
                  onClick={handleClose}
                  aria-label="Cerrar"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-husk transition-colors hover:border-honey/60 hover:text-cream"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={creating}
                >
                  <IconX className="h-5 w-5" />
                </motion.button>
              </div>
              <div className="p-5 max-h-[70vh] overflow-y-auto">{formContent}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}