import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CalendarEvent, EventType, EventPriority, RecurrenceType, ReminderType, EventTemplate } from '../types/calendar';
import { EVENT_COLORS, EVENT_LABELS } from '../types/calendar';
import type { Hive } from '../types/hive';

interface EventFormProps {
  isOpen: boolean;
  event: CalendarEvent | null;
  selectedDate: Date;
  hives: Hive[];
  templates: EventTemplate[];
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
}

interface FormData {
  type: EventType;
  title: string;
  description: string;
  date: string;
  time: string;
  hiveId: string;
  priority: EventPriority;
  color: string;
  recurrence: {
    type: RecurrenceType;
    interval?: number;
    endDate?: string;
  };
  reminders: ReminderType[];
  completed: boolean;
}

export default function EventForm({
  isOpen,
  event,
  selectedDate,
  hives,
  templates,
  onClose,
  onSave,
}: EventFormProps) {
  const [formData, setFormData] = useState<FormData>({
    type: 'inspection',
    title: '',
    description: '',
    date: format(selectedDate, 'yyyy-MM-dd'),
    time: '',
    hiveId: '',
    priority: 'medium',
    color: EVENT_COLORS.inspection,
    recurrence: {
      type: 'none',
    },
    reminders: [],
    completed: false,
  });

  // Cargar datos del evento si estamos editando
  useEffect(() => {
    if (event) {
      setFormData({
        type: event.type,
        title: event.title,
        description: event.description || '',
        date: format(new Date(event.date), 'yyyy-MM-dd'),
        time: event.time || '',
        hiveId: event.hiveId || '',
        priority: event.priority,
        color: event.color || EVENT_COLORS[event.type],
        recurrence: event.recurrence || { type: 'none' as RecurrenceType },
        reminders: event.reminders || [],
        completed: event.completed,
      });
    } else {
      // Resetear formulario
      setFormData({
        type: 'inspection',
        title: '',
        description: '',
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: '',
        hiveId: '',
        priority: 'medium',
        color: EVENT_COLORS.inspection,
        recurrence: { type: 'none' as RecurrenceType },
        reminders: [],
        completed: false,
      });
    }
  }, [event, selectedDate, isOpen]);

  // Actualizar color cuando cambia el tipo
  useEffect(() => {
    if (!event) {
      setFormData(prev => ({
        ...prev,
        color: EVENT_COLORS[prev.type],
      }));
    }
  }, [formData.type, event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const eventData: Omit<CalendarEvent, 'id' | 'createdAt'> = {
      type: formData.type,
      title: formData.title,
      description: formData.description || undefined,
      date: new Date(formData.date).toISOString(),
      time: formData.time || undefined,
      hiveId: formData.hiveId || undefined,
      priority: formData.priority,
      color: formData.color,
      recurrence: formData.recurrence.type !== 'none' ? formData.recurrence : undefined,
      reminders: formData.reminders.length > 0 ? formData.reminders : undefined,
      completed: formData.completed,
    };

    onSave(eventData);
  };

  const handleApplyTemplate = (template: EventTemplate) => {
    setFormData(prev => ({
      ...prev,
      type: template.type,
      title: template.title,
      description: template.description || '',
      color: template.color || EVENT_COLORS[template.type],
    }));
  };

  const toggleReminder = (reminder: ReminderType) => {
    setFormData(prev => ({
      ...prev,
      reminders: prev.reminders.includes(reminder)
        ? prev.reminders.filter(r => r !== reminder)
        : [...prev.reminders, reminder],
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-cream">
                {event ? 'Editar Evento' : 'Nuevo Evento'}
              </h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-ink/50 hover:bg-ink/70 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Plantillas */}
              {!event && templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-cream mb-2">
                    Plantillas rápidas
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {templates.map(template => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleApplyTemplate(template)}
                        className="p-3 rounded-lg border border-line hover:border-honey/50 hover:bg-honey/5 transition-all text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: template.color || EVENT_COLORS[template.type] }}
                          />
                          <span className="text-xs font-medium text-cream">{template.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tipo de evento */}
              <div>
                <label className="block text-sm font-medium text-cream mb-2">
                  Tipo de evento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(EVENT_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: key as EventType }))}
                      className={`p-3 rounded-lg border transition-all ${
                        formData.type === key
                          ? 'border-honey bg-honey/10'
                          : 'border-line hover:border-honey/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: EVENT_COLORS[key as EventType] }}
                        />
                        <span className="text-sm font-medium text-cream">{label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-cream mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                  placeholder="Ej: Inspección rutinaria"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-cream mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70 resize-none"
                  placeholder="Detalles del evento..."
                />
              </div>

              {/* Fecha y hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cream mb-2">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cream mb-2">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                  />
                </div>
              </div>

              {/* Colmena asociada */}
              <div>
                <label className="block text-sm font-medium text-cream mb-2">
                  Colmena asociada
                </label>
                <select
                  value={formData.hiveId}
                  onChange={(e) => setFormData(prev => ({ ...prev, hiveId: e.target.value }))}
                  className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70"
                >
                  <option value="">Sin colmena asociada</option>
                  {hives.map(hive => (
                    <option key={hive.id} value={hive.id}>
                      {hive.code} {hive.name ? `- ${hive.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prioridad */}
              <div>
                <label className="block text-sm font-medium text-cream mb-2">
                  Prioridad
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as EventPriority[]).map(priority => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priority }))}
                      className={`p-2 rounded-lg border transition-all ${
                        formData.priority === priority
                          ? 'border-honey bg-honey/10'
                          : 'border-line hover:border-honey/50'
                      }`}
                    >
                      <span className="text-xs font-medium text-cream capitalize">
                        {priority === 'low' ? 'Baja' : priority === 'medium' ? 'Media' : priority === 'high' ? 'Alta' : 'Urgente'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recurrencia */}
              <div>
                <label className="block text-sm font-medium text-cream mb-2">
                  Repetir
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {([
                    { value: 'none', label: 'No repetir' },
                    { value: 'daily', label: 'Diario' },
                    { value: 'weekly', label: 'Semanal' },
                    { value: 'monthly', label: 'Mensual' },
                    { value: 'yearly', label: 'Anual' },
                    { value: 'custom', label: 'Personalizado' },
                  ] as const).map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        recurrence: { ...prev.recurrence, type: option.value }
                      }))}
                      className={`p-2 rounded-lg border transition-all ${
                        formData.recurrence.type === option.value
                          ? 'border-honey bg-honey/10'
                          : 'border-line hover:border-honey/50'
                      }`}
                    >
                      <span className="text-xs font-medium text-cream">{option.label}</span>
                    </button>
                  ))}
                </div>

                {formData.recurrence.type === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-husk mb-1">Cada X días</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.recurrence.interval || 7}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          recurrence: { ...prev.recurrence, interval: parseInt(e.target.value) || 7 }
                        }))}
                        className="w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-cream focus:border-honey/70"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-husk mb-1">Fecha límite</label>
                      <input
                        type="date"
                        value={formData.recurrence.endDate || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          recurrence: { ...prev.recurrence, endDate: e.target.value }
                        }))}
                        className="w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-cream focus:border-honey/70"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Recordatorios */}
              <div>
                <label className="block text-sm font-medium text-cream mb-2">
                  Recordatorios
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: '1day', label: '1 día antes' },
                    { value: '3days', label: '3 días antes' },
                    { value: '1week', label: '1 semana antes' },
                  ] as const).map(reminder => (
                    <button
                      key={reminder.value}
                      type="button"
                      onClick={() => toggleReminder(reminder.value)}
                      className={`p-2 rounded-lg border transition-all ${
                        formData.reminders.includes(reminder.value)
                          ? 'border-honey bg-honey/10'
                          : 'border-line hover:border-honey/50'
                      }`}
                    >
                      <span className="text-xs font-medium text-cream">{reminder.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color personalizado */}
              <div>
                <label className="block text-sm font-medium text-cream mb-2">
                  Color personalizado
                </label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full h-10 rounded-xl border border-line bg-ink cursor-pointer"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <motion.button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border border-line text-sm font-medium text-husk hover:bg-ink/50 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-honey text-sm font-semibold text-ink hover:bg-honeysoft transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {event ? 'Guardar cambios' : 'Crear evento'}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
