import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX } from '../ui';
import type { Hive, HiveStatus, QueenMarkColor } from '../types/hive';
import { HIVE_STATUS_LABELS, QUEEN_MARK_COLORS } from '../types/hive';

interface AddHiveModalProps {
  open: boolean;
  hive: Hive | null;
  existingCodes: string[];
  onClose: () => void;
  onSave: (hive: Partial<Hive>) => void;
}

export default function AddHiveModal({ open, hive, existingCodes, onClose, onSave }: AddHiveModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [queenYear, setQueenYear] = useState<number | undefined>(undefined);
  const [queenMarkColor, setQueenMarkColor] = useState<QueenMarkColor | undefined>(undefined);
  const [status, setStatus] = useState<HiveStatus>('saludable');
  const [lastInspection, setLastInspection] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [autoCode, setAutoCode] = useState(true);

  // Generar código automático
  const generateNextCode = () => {
    const numbers = existingCodes
      .map(c => {
        const match = c.match(/C-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => n > 0);
    
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNum = maxNum + 1;
    return `C-${nextNum.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (open) {
      if (hive) {
        // Modo edición
        setCode(hive.code);
        setName(hive.name || '');
        setLocation(hive.location || '');
        setQueenYear(hive.queenYear);
        setQueenMarkColor(hive.queenMarkColor);
        setStatus(hive.status);
        setLastInspection(hive.updatedAt ? hive.updatedAt.split('T')[0] : '');
        setNotes(hive.notes || '');
        setAutoCode(false);
      } else {
        // Modo agregar
        const nextCode = generateNextCode();
        setCode(nextCode);
        setName('');
        setLocation('');
        setQueenYear(undefined);
        setQueenMarkColor(undefined);
        setStatus('saludable');
        setLastInspection(new Date().toISOString().split('T')[0]);
        setNotes('');
        setAutoCode(true);
      }
      setError('');
    }
  }, [open, hive, existingCodes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('El código de colmena es obligatorio');
      return;
    }

    // Validar código único (excepto si estamos editando la misma colmena)
    if (!hive && existingCodes.includes(code.trim())) {
      setError('Ya existe una colmena con ese código');
      return;
    }

    if (hive && code.trim() !== hive.code && existingCodes.includes(code.trim())) {
      setError('Ya existe una colmena con ese código');
      return;
    }

    onSave({
      code: code.trim(),
      name: name.trim() || undefined,
      location: location.trim() || undefined,
      queenYear,
      queenMarkColor,
      status,
      notes: notes.trim() || undefined,
      updatedAt: lastInspection ? new Date(lastInspection).toISOString() : new Date().toISOString(),
    });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - i);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-ink/90 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="card relative w-full max-w-2xl my-8 shadow-[0_30px_80px_rgba(0,0,0,.6)]"
            >
              {/* Header */}
              <div className="border-b border-line p-6 flex items-start justify-between">
                <div>
                  <p className="tick-label mb-1.5">{hive ? 'Editar' : 'Nueva'} Colmena</p>
                  <h3 className="font-display text-3xl font-black tracking-tight text-cream">
                    {hive ? 'Editar Colmena' : 'Nueva Colmena'}
                  </h3>
                </div>
                <motion.button
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-husk transition-colors hover:border-honey/60 hover:text-cream"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <IconX className="h-5 w-5" />
                </motion.button>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-3 rounded-lg border border-coral/40 bg-coral/10 text-coral text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Código */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
                      Código de Colmena *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value);
                          setAutoCode(false);
                        }}
                        placeholder="Ej: C-01, C-02"
                        required
                        disabled={autoCode && !hive}
                        className="flex-1 rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(240,164,28,.12)] disabled:opacity-50"
                      />
                      {!hive && (
                        <motion.button
                          type="button"
                          onClick={() => {
                            setAutoCode(!autoCode);
                            if (!autoCode) {
                              setCode(generateNextCode());
                            }
                          }}
                          className={`px-4 py-3 rounded-xl border text-xs font-semibold transition-all ${
                            autoCode
                              ? 'border-honey bg-honey/10 text-honey'
                              : 'border-line text-husk hover:border-honey/50'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Auto
                        </motion.button>
                      )}
                    </div>
                    {autoCode && !hive && (
                      <p className="mt-1 text-xs text-husk">Código generado automáticamente</p>
                    )}
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
                      Nombre (opcional)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: La Reina, Abeja Dorada"
                      className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(240,164,28,.12)]"
                    />
                  </div>

                  {/* Ubicación */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
                      Ubicación en el Apiario
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ej: Bancal norte, cerca del río"
                      className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(240,164,28,.12)]"
                    />
                  </div>

                  {/* Grid de 2 columnas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Año de la reina */}
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
                        Año de la Reina
                      </label>
                      <select
                        value={queenYear || ''}
                        onChange={(e) => setQueenYear(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream focus:border-honey/70"
                      >
                        <option value="">Sin especificar</option>
                        {years.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    {/* Color de marca */}
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
                        Color de Marca
                      </label>
                      <select
                        value={queenMarkColor || ''}
                        onChange={(e) => setQueenMarkColor(e.target.value as QueenMarkColor || undefined)}
                        className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream focus:border-honey/70"
                      >
                        <option value="">Sin especificar</option>
                        {Object.entries(QUEEN_MARK_COLORS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
                      Estado Inicial
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(HIVE_STATUS_LABELS).map(([value, label]) => (
                        <motion.button
                          key={value}
                          type="button"
                          onClick={() => setStatus(value as HiveStatus)}
                          className={`rounded-xl border py-3 text-xs font-semibold transition-all ${
                            status === value
                              ? 'border-honey bg-honey/15 text-honey'
                              : 'border-line text-husk hover:border-honey/50 hover:text-cream'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Fecha de última inspección */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
                      Fecha de Última Inspección
                    </label>
                    <input
                      type="date"
                      value={lastInspection}
                      onChange={(e) => setLastInspection(e.target.value)}
                      className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream focus:border-honey/70"
                    />
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-2">
                      Notas Adicionales
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Observaciones, historial, características especiales..."
                      className="w-full resize-none rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
                    />
                  </div>

                  {/* Botones */}
                  <div className="flex gap-3 pt-4 border-t border-line">
                    <motion.button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-3 text-sm font-medium text-husk border border-line rounded-xl hover:bg-pane2 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancelar
                    </motion.button>
                    <motion.button
                      type="submit"
                      className="flex-1 px-4 py-3 text-sm font-semibold text-ink bg-honey rounded-xl hover:bg-honeysoft transition-colors shadow-[0_4px_20px_rgba(240,164,28,.3)]"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {hive ? 'Guardar Cambios' : 'Crear Colmena'}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
