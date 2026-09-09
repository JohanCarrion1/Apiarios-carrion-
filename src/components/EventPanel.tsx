import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CalendarEvent, EventType } from '../types/calendar';
import { EVENT_COLORS, EVENT_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '../types/calendar';
import type { Hive } from '../types/hive';

interface EventPanelProps {
  selectedDate: Date | null;
  events: CalendarEvent[];
  hives: Hive[];
  onClose: () => void;
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}

function getEventIcon(type: EventType) {
  switch (type) {
    case 'inspection':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case 'harvest':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case 'treatment':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      );
    case 'task':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case 'reminder':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
  }
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Hoy';
  if (isTomorrow(date)) return 'Mañana';
  if (isYesterday(date)) return 'Ayer';
  return format(date, "EEEE d 'de' MMMM", { locale: es });
}

export default function EventPanel({
  selectedDate,
  events,
  hives,
  onClose,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
}: EventPanelProps) {
  if (!selectedDate) return null;

  const dayEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate.toDateString() === selectedDate.toDateString();
  });

  const dateLabel = formatDateLabel(selectedDate);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-pane border-l border-line shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-pane border-b border-line p-6 z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">
                {format(selectedDate, 'dd/MM/yyyy')}
              </p>
              <h2 className="font-display text-2xl font-bold text-cream capitalize">
                {dateLabel}
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

          <motion.button
            onClick={onAddEvent}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-honey py-3 font-semibold text-ink transition-all hover:bg-honeysoft"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar Evento
          </motion.button>
        </div>

        {/* Lista de eventos */}
        <div className="p-6">
          {dayEvents.length === 0 ? (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pane2">
                <svg className="w-8 h-8 text-husk" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-husk text-sm">No hay eventos para este día</p>
              <p className="text-husk/60 text-xs mt-2">Haz click en "Agregar Evento" para crear uno</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {dayEvents.map((event, index) => {
                const hive = hives.find(h => h.id === event.hiveId);
                
                return (
                  <motion.div
                    key={event.id}
                    className="card p-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icono del evento */}
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ 
                          backgroundColor: `${EVENT_COLORS[event.type]}20`,
                          color: EVENT_COLORS[event.type]
                        }}
                      >
                        {getEventIcon(event.type)}
                      </div>

                      {/* Contenido del evento */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-cream text-sm truncate">
                            {event.title}
                          </h3>
                          <span
                            className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
                            style={{
                              backgroundColor: `${PRIORITY_COLORS[event.priority]}20`,
                              color: PRIORITY_COLORS[event.priority]
                            }}
                          >
                            {PRIORITY_LABELS[event.priority]}
                          </span>
                        </div>

                        <p className="text-xs text-husk mb-2">
                          {EVENT_LABELS[event.type]}
                          {event.time && ` • ${event.time}`}
                          {hive && ` • ${hive.code}`}
                        </p>

                        {event.description && (
                          <p className="text-xs text-husk/80 line-clamp-2 mb-2">
                            {event.description}
                          </p>
                        )}

                        {/* Acciones */}
                        <div className="flex items-center gap-2 mt-3">
                          <motion.button
                            onClick={() => onEditEvent(event)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-husk hover:text-cream hover:bg-pane2 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </motion.button>
                          <motion.button
                            onClick={() => {
                              if (confirm('¿Eliminar este evento?')) {
                                onDeleteEvent(event.id);
                              }
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-coral hover:bg-coral/10 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Eliminar
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
