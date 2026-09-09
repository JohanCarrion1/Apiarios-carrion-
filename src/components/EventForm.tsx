import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import type { CalendarEvent, EventType, EventPriority } from '../types/calendar';
import { EVENT_LABELS, PRIORITY_LABELS } from '../types/calendar';
import type { Hive } from '../types/hive';

interface EventFormProps {
  isOpen: boolean;
  event: CalendarEvent | null;
  selectedDate: Date;
  hives: Hive[];
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
}

export default function EventForm({
  isOpen,
  event,
  selectedDate,
  hives,
  onClose,
  onSave,
}: EventFormProps) {
  const [type, setType] = useState<EventType>('task');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(selectedDate, 'yyyy-MM-dd'));
  const [time, setTime] = useState('');
  const [hiveId, setHiveId] = useState('');
  const [priority, setPriority] = useState<EventPriority>('medium');

  useEffect(() => {
    if (isOpen) {
      if (event) {
        // Modo edición
        setType(event.type);
        setTitle(event.title);
        setDescription(event.description || '');
        setDate(format(new Date(event.date), 'yyyy-MM-dd'));
        setTime(event.time || '');
        setHiveId(event.hiveId || '');
        setPriority(event.priority);
      } else {
        // Modo creación
        setType('task');
        setTitle('');
        setDescription('');
        setDate(format(selectedDate, 'yyyy-MM-dd'));
        setTime('');
        setHiveId('');
        setPriority('medium');
      }
    }
  }, [isOpen, event, selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('El título es obligatorio');
      return;
    }

    onSave({
      type,
      title: title.trim(),
      description: description.trim() || undefined,
      date: new Date(date).toISOString(),
      time: time || undefined,
      hiveId: hiveId || undefined,
      priority,
      completed: event?.completed || false,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="card w-full max-w-2xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-line p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">
                      {event ? 'Editar' : 'Nuevo'} Evento
                    </p>
                    <h2 className="font-display text-2xl font-bold text-cream">
                      {event ? 'Editar Evento' : 'Agregar Evento'}
                    </h2>
                  </div>
                  <motion.button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-pane2 transition-colors"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg className="w-5 h-5 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Tipo de evento */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                    Tipo de Evento
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.keys(EVENT_LABELS) as EventType[]).map((eventType) => (
                      <motion.button
                        key={eventType}
                        type="button"
                        onClick={() => setType(eventType)}
                        className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                          type === eventType
                            ? 'border-honey bg-honey/10 text-honey'
                            : 'border-line text-husk hover:border-honey/50 hover:text-cream'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {EVENT_LABELS[eventType]}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Título */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Inspección C-08, Cosecha de miel"
                    required
                    className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalles adicionales del evento..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
                  />
                </div>

                {/* Fecha y Hora */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                      Fecha *
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream focus:border-honey/70"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                      Hora (opcional)
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream focus:border-honey/70"
                    />
                  </div>
                </div>

                {/* Colmena asociada */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                    Colmena Asociada (opcional)
                  </label>
                  <select
                    value={hiveId}
                    onChange={(e) => setHiveId(e.target.value)}
                    className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream focus:border-honey/70"
                  >
                    <option value="">Sin colmena asociada</option>
                    {hives.map((hive) => (
                      <option key={hive.id} value={hive.id}>
                        {hive.code} {hive.name ? `- ${hive.name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                    Prioridad
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(PRIORITY_LABELS) as EventPriority[]).map((priorityLevel) => (
                      <motion.button
                        key={priorityLevel}
                        type="button"
                        onClick={() => setPriority(priorityLevel)}
                        className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                          priority === priorityLevel
                            ? 'border-honey bg-honey/10 text-honey'
                            : 'border-line text-husk hover:border-honey/50 hover:text-cream'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {PRIORITY_LABELS[priorityLevel]}
                      </motion.button>
                    ))}
                  </div>
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
                    className="flex-1 px-4 py-3 text-sm font-semibold text-ink bg-honey rounded-xl hover:bg-honeysoft transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {event ? 'Guardar Cambios' : 'Crear Evento'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
