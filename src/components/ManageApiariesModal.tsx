import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX } from '../ui';
import type { Apiary } from '../services/apiaryService';

interface ManageApiariesModalProps {
  open: boolean;
  apiaries: Apiary[];
  currentApiaryId: string;
  onClose: () => void;
  onUpdate: (apiaryId: string, updates: Partial<Apiary>) => Promise<void> | void;
  onDelete: (apiaryId: string) => Promise<void> | void;
}

interface EditState {
  name: string;
  location: string;
  altitud: string;
}

export default function ManageApiariesModal({
  open,
  apiaries,
  currentApiaryId,
  onClose,
  onUpdate,
  onDelete,
}: ManageApiariesModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: '', location: '', altitud: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleClose = () => {
    setEditingId(null);
    setConfirmDeleteId(null);
    onClose();
  };

  const startEdit = (apiary: Apiary) => {
    setEditingId(apiary.id);
    setConfirmDeleteId(null);
    setEditState({
      name: apiary.name || '',
      location: apiary.location || '',
      altitud: apiary.altitud != null ? String(apiary.altitud) : '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (apiaryId: string) => {
    if (!editState.name.trim()) return;
    const updates: Partial<Apiary> = { name: editState.name.trim() };

    const location = editState.location.trim();
    if (location) updates.location = location;

    if (editState.altitud.trim() !== '') {
      const altitud = Number(editState.altitud);
      if (!Number.isNaN(altitud)) updates.altitud = altitud;
    } else {
      updates.altitud = undefined;
    }

    setBusyId(apiaryId);
    try {
      await onUpdate(apiaryId, updates);
      setEditingId(null);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async (apiaryId: string) => {
    setBusyId(apiaryId);
    try {
      await onDelete(apiaryId);
      setConfirmDeleteId(null);
    } finally {
      setBusyId(null);
    }
  };

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
              className="card relative w-full max-w-xl my-8 shadow-[0_30px_80px_rgba(0,0,0,.6)]"
            >
              <div className="border-b border-line p-5 flex items-start justify-between">
                <div>
                  <p className="tick-label mb-1.5">Apiarios</p>
                  <h3 className="font-display text-2xl font-black tracking-tight text-cream">
                    Gestionar mis apiarios
                  </h3>
                </div>
                <motion.button
                  onClick={handleClose}
                  aria-label="Cerrar"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-husk transition-colors hover:border-honey/60 hover:text-cream"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <IconX className="h-5 w-5" />
                </motion.button>
              </div>

              <div className="p-5 max-h-[70vh] overflow-y-auto">
                {apiaries.length === 0 ? (
                  <p className="text-husk text-sm text-center py-8">No tienes apiarios registrados</p>
                ) : (
                  <div className="space-y-3">
                    {apiaries.map((apiary) => {
                      const isEditing = editingId === apiary.id;
                      const isActive = apiary.id === currentApiaryId;

                      return (
                        <div
                          key={apiary.id}
                          className={`rounded-xl border p-4 transition-all ${
                            isActive ? 'border-honey/50 bg-honey/5' : 'border-line bg-ink/50'
                          }`}
                        >
                          {isEditing ? (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-1.5">
                                  Nombre *
                                </label>
                                <input
                                  type="text"
                                  value={editState.name}
                                  onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                                  className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-1.5">
                                  Ubicación
                                </label>
                                <input
                                  type="text"
                                  value={editState.location}
                                  onChange={(e) => setEditState((s) => ({ ...s, location: e.target.value }))}
                                  className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-mono uppercase tracking-widest text-husk mb-1.5">
                                  Altitud (msnm, opcional)
                                </label>
                                <input
                                  type="number"
                                  value={editState.altitud}
                                  onChange={(e) => setEditState((s) => ({ ...s, altitud: e.target.value }))}
                                  className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
                                />
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => saveEdit(apiary.id)}
                                  disabled={busyId === apiary.id || !editState.name.trim()}
                                  className="flex-1 rounded-lg bg-honey py-2 text-sm font-semibold text-ink hover:bg-honeysoft disabled:opacity-50"
                                >
                                  {busyId === apiary.id ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-4 rounded-lg border border-line py-2 text-sm font-semibold text-husk hover:text-cream"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : confirmDeleteId === apiary.id ? (
                            <div>
                              <p className="font-semibold text-coral mb-1">
                                ¿Eliminar «{apiary.name}»?
                              </p>
                              <p className="text-sm text-husk mb-3">
                                ⚠️ Se eliminarán también todas sus colmenas, núcleos, inspecciones, tareas y datos asociados. Esta acción no se puede deshacer.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => confirmDelete(apiary.id)}
                                  disabled={busyId === apiary.id}
                                  className="flex-1 rounded-lg bg-coral py-2 text-sm font-semibold text-ink hover:bg-coral/90 disabled:opacity-50"
                                >
                                  {busyId === apiary.id ? 'Eliminando...' : 'Eliminar definitivamente'}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-4 rounded-lg border border-line py-2 text-sm font-semibold text-husk hover:text-cream"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-display text-lg font-bold text-cream truncate">
                                    {apiary.name}
                                    {isActive && (
                                      <span className="ml-2 inline-block align-middle rounded-full bg-honey/20 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-honey">
                                        activo
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-husk text-sm mt-0.5">
                                    {[apiary.location, apiary.altitud != null ? `${apiary.altitud} msnm` : ''].filter(Boolean).join(' · ') || 'Sin ubicación'}
                                  </p>
                                </div>
                                {isActive && (
                                  <svg className="w-5 h-5 text-honey flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-3">
                                <button
                                  onClick={() => startEdit(apiary)}
                                  className="rounded-lg bg-honey/10 hover:bg-honey/20 text-honey px-3 py-1.5 text-xs font-semibold transition-colors"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(apiary.id)}
                                  className="rounded-lg bg-coral/10 hover:bg-coral/20 text-coral px-3 py-1.5 text-xs font-semibold transition-colors"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}