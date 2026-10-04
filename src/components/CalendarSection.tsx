import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addWeeks,
  subWeeks,
  startOfDay,
  endOfDay,
  addYears,
  differenceInDays,
  isBefore,
  isAfter,
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { CalendarEvent, CalendarViewType, EventTemplate, RecurrenceType } from '../types/calendar';
import { EVENT_COLORS, EVENT_LABELS, RECURRING_EVENT_COLOR } from '../types/calendar';
import type { Hive } from '../types/hive';
import type { BreedingLot } from '../types/breeding';
import type { RecurringTask, RecurringTaskDraft, FloweringEntry, FloweringEntryDraft } from '../types/reminders';
import { FLOWERING_COLORS, REMINDER_ICONS, REMINDER_COLORS } from '../types/reminders';
import { computeReminders, generateRecurringTaskInstances, floweringEventsForPeriod } from '../utils/reminders';
import EventForm from './EventForm';
import RecurringTaskForm from './RecurringTaskForm';
import FloweringForm from './FloweringForm';
import { useSettings } from '../context/SettingsContext';
import { formatHour, formatHourFromTime } from '../utils/formatTime';

const uid = () => Math.random().toString(36).slice(2, 11);

/** Plantillas por defecto. Ids nuevos en cada siembra: son de solo lectura. */
const DEFAULT_TEMPLATES = (): EventTemplate[] => [
  {
    id: uid(),
    name: 'Inspeccion rutinaria',
    type: 'inspection',
    title: 'Inspeccion rutinaria',
    description: 'Revision general de la colmena',
    color: EVENT_COLORS.inspection,
  },
  {
    id: uid(),
    name: 'Tratamiento varroa',
    type: 'treatment',
    title: 'Tratamiento varroa',
    description: 'Aplicar tratamiento contra varroa',
    color: EVENT_COLORS.treatment,
  },
  {
    id: uid(),
    name: 'Cosecha de miel',
    type: 'harvest',
    title: 'Cosecha de miel',
    description: 'Cosecha de miel de la colmena',
    color: EVENT_COLORS.harvest,
  },
];

interface CalendarSectionProps {
  hives: Hive[];
  events: CalendarEvent[];
  onEventsChange: Dispatch<SetStateAction<CalendarEvent[]>>;
  recurringTasks: RecurringTask[];
  onRecurringTasksChange: (tasks: RecurringTask[]) => void;
  floweringEntries: FloweringEntry[];
  onFloweringEntriesChange: (entries: FloweringEntry[]) => void;
  eventTemplates: EventTemplate[];
  onEventTemplatesChange: Dispatch<SetStateAction<EventTemplate[]>>;
  breedingLots?: BreedingLot[];
  apiaries?: { id: string; name: string }[];
  apiaryName?: string;
}

export default function CalendarSection({
  hives,
  events,
  onEventsChange,
  recurringTasks,
  onRecurringTasksChange,
  floweringEntries,
  onFloweringEntriesChange,
  eventTemplates: templates,
  onEventTemplatesChange: setTemplates,
  breedingLots = [],
  apiaries = [],
  apiaryName = '',
}: CalendarSectionProps) {
  const { settings } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewType, setViewType] = useState<CalendarViewType>('month');
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterHive, setFilterHive] = useState<string>('all');
  const [showOverdue, setShowOverdue] = useState(false);
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed');
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [showFloweringForm, setShowFloweringForm] = useState(false);

  const notificationCfg = settings.notifications;
  const alertDaysBefore =
    typeof notificationCfg.daysBefore === 'number' && notificationCfg.daysBefore > 0
      ? notificationCfg.daysBefore
      : 3;
  const enabledKinds = {
    inspections: notificationCfg.kinds?.inspections ?? true,
    harvests: notificationCfg.kinds?.harvests ?? true,
    breeding: notificationCfg.kinds?.breeding ?? true,
    flowering: notificationCfg.kinds?.flowering ?? true,
    tasks: notificationCfg.kinds?.tasks ?? true,
  };

  // Sembrado inicial de plantillas. Los datos reales llegan como prop desde
  // App.tsx, que los carga con ambito de apiario desde Firestore. Este efecto
  // corre una sola vez por montaje y escribe por el setter de arriba, de modo
  // que la persistencia la haga el efecto guardado de App.tsx y no una
  // escritura suelta dentro del componente.
  useEffect(() => {
    if (templates.length > 0) return;
    setTemplates(DEFAULT_TEMPLATES());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // No activar atajos si estamos escribiendo en un input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'h': // Ir a hoy
          e.preventDefault();
          goToToday();
          break;
        case 'n': // Nuevo evento
          e.preventDefault();
          handleAddEvent();
          break;
        case 'arrowleft': // Navegar anterior
          e.preventDefault();
          navigatePrev();
          break;
        case 'arrowright': // Navegar siguiente
          e.preventDefault();
          navigateNext();
          break;
        case 'm': // Vista mensual
          e.preventDefault();
          setViewType('month');
          break;
        case 'w': // Vista semanal
          e.preventDefault();
          setViewType('week');
          break;
        case 'd': // Vista diaria
          e.preventDefault();
          setViewType('day');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [viewType, currentDate]);

  // Generar instancias de eventos recurrentes
  const generateRecurrentEvents = (baseEvents: CalendarEvent[]): CalendarEvent[] => {
    const allEvents: CalendarEvent[] = [...baseEvents];
    const today = new Date();
    const threeMonthsLater = addMonths(today, 3);

    baseEvents.forEach(event => {
      if (event.recurrence && event.recurrence.type !== 'none') {
        const startDate = new Date(event.date);
        let currentDate = new Date(startDate);
        let count = 0;
        const maxInstances = 12;

        while (count < maxInstances && isBefore(currentDate, threeMonthsLater)) {
          // Avanzar según el tipo de recurrencia
          switch (event.recurrence.type) {
            case 'daily':
              currentDate = addDays(currentDate, 1);
              break;
            case 'weekly':
              currentDate = addWeeks(currentDate, 1);
              break;
            case 'monthly':
              currentDate = addMonths(currentDate, 1);
              break;
            case 'yearly':
              currentDate = addYears(currentDate, 1);
              break;
            case 'custom':
              if (event.recurrence.interval) {
                currentDate = addDays(currentDate, event.recurrence.interval);
              }
              break;
          }

          if (isAfter(currentDate, startDate) && (!event.recurrence.endDate || isBefore(currentDate, new Date(event.recurrence.endDate)))) {
            allEvents.push({
              ...event,
              id: `${event.id}_${count}`,
              date: currentDate.toISOString(),
              isRecurrentInstance: true,
              parentEventId: event.id,
            });
            count++;
          }
        }
      }
    });

    return allEvents;
  };

  // Eventos con recurrencia generada + instancias de tareas recurrentes + floración
  const allEvents = useMemo(() => {
    const base = generateRecurrentEvents(events);
    const now = new Date();
    const recurringInstances = recurringTasks.flatMap((task) =>
      generateRecurringTaskInstances(task, now, 28)
    );
    const flowering = floweringEventsForPeriod(
      floweringEntries,
      new Date(currentDate.getFullYear(), 0, 1),
      new Date(currentDate.getFullYear(), 11, 31)
    );
    return [...base, ...recurringInstances, ...flowering];
  }, [events, recurringTasks, floweringEntries, currentDate]);

  // Recordatorios calculados (panel del día + campanita)
  const dayReminders = useMemo(
    () =>
      computeReminders({
        events: allEvents,
        breedingLots,
        recurringTasks,
        floweringEntries,
        hives,
        daysBefore: alertDaysBefore,
        enabledKinds,
      }),
    [allEvents, breedingLots, recurringTasks, floweringEntries, hives, alertDaysBefore, enabledKinds]
  );

  // Día dentro de la ventana de floración de una entrada
  const isDayInFloweringWindow = (day: Date, entry: FloweringEntry) => {
    const m = day.getMonth() + 1;
    if (entry.startMonth <= entry.endMonth) {
      return m >= entry.startMonth && m <= entry.endMonth;
    }
    return m >= entry.startMonth || m <= entry.endMonth;
  };

  // Filtrar eventos
  const filteredEvents = useMemo(() => {
    let result = allEvents;

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.title.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query)
      );
    }

    // Filtrar por tipo
    if (filterType !== 'all') {
      result = result.filter(e => e.type === filterType);
    }

    // Filtrar por colmena
    if (filterHive !== 'all') {
      result = result.filter(e => e.hiveId === filterHive);
    }

    return result;
  }, [allEvents, searchQuery, filterType, filterHive]);

  // Eventos atrasados
  const overdueEvents = useMemo(() => {
    const today = new Date();
    return filteredEvents.filter(e => 
      !e.completed && isBefore(new Date(e.date), today)
    );
  }, [filteredEvents]);

  // Estadísticas
  const stats = useMemo(() => {
    const thisMonth = filteredEvents.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate.getMonth() === currentDate.getMonth() && 
             eventDate.getFullYear() === currentDate.getFullYear();
    });

    const completed = thisMonth.filter(e => e.completed).length;
    const nextEvent = filteredEvents
      .filter(e => isAfter(new Date(e.date), new Date()))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    return {
      thisMonth: thisMonth.length,
      completed,
      completionRate: thisMonth.length > 0 ? Math.round((completed / thisMonth.length) * 100) : 0,
      nextEvent,
      daysUntilNext: nextEvent ? differenceInDays(new Date(nextEvent.date), new Date()) : null,
    };
  }, [filteredEvents, currentDate]);

  // Navegación
  const navigateNext = () => {
    if (viewType === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewType === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const navigatePrev = () => {
    if (viewType === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewType === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Handlers
  const handleAddEvent = () => {
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleSaveEvent = (eventData: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    if (editingEvent) {
      onEventsChange(prev =>
        prev.map(e => (e.id === editingEvent.id ? { ...e, ...eventData } : e))
      );
    } else {
      const newEvent: CalendarEvent = {
        ...eventData,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      onEventsChange(prev => (prev.some(e => e.id === newEvent.id) ? prev : [...prev, newEvent]));
      
      // Seleccionar automáticamente la fecha del nuevo evento
      setSelectedDate(new Date(newEvent.date));
    }
    setShowEventForm(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    onEventsChange(prev => prev.filter(e => e.id !== eventId));
  };

  const handleToggleComplete = (eventId: string) => {
    onEventsChange(prev =>
      prev.map(e => (e.id === eventId ? { ...e, completed: !e.completed } : e))
    );
  };

  const handlePostpone = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      const tomorrow = addDays(new Date(), 1);
      onEventsChange(prev =>
        prev.map(e => (e.id === eventId ? { ...e, date: tomorrow.toISOString() } : e))
      );
    }
  };

  // Handlers de tareas recurrentes
  const handleCreateRecurringTask = (draft: RecurringTaskDraft) => {
    const task: RecurringTask = {
      id: uid(),
      ...draft,
      active: true,
      createdAt: new Date().toISOString(),
    };
    onRecurringTasksChange([...recurringTasks, task]);
    setShowRecurringForm(false);
  };

  const handleDeleteRecurringTask = (taskId: string) => {
    onRecurringTasksChange(recurringTasks.filter(t => t.id !== taskId));
  };

  const handleToggleRecurringTask = (taskId: string) => {
    onRecurringTasksChange(recurringTasks.map(t =>
      t.id === taskId ? { ...t, active: !t.active } : t
    ));
  };

  // Handlers de floración
  const handleSaveFlowering = (draft: FloweringEntryDraft) => {
    const entry: FloweringEntry = {
      id: uid(),
      ...draft,
      active: true,
      createdAt: new Date().toISOString(),
    };
    onFloweringEntriesChange([...floweringEntries, entry]);
    setShowFloweringForm(false);
  };

  const handleDeleteFlowering = (entryId: string) => {
    onFloweringEntriesChange(floweringEntries.filter(e => e.id !== entryId));
  };

  const handleToggleFlowering = (entryId: string) => {
    onFloweringEntriesChange(floweringEntries.map(e =>
      e.id === entryId ? { ...e, active: !e.active } : e
    ));
  };

  // Compartir evento
  const handleShareEvent = (event: CalendarEvent) => {
    const hive = hives.find(h => h.id === event.hiveId);
    const text = `📅 ${EVENT_LABELS[event.type]}${hive ? ` - Colmena ${hive.code}` : ''}
📆 Fecha: ${format(new Date(event.date), 'dd/MM/yyyy', { locale: es })}${event.time ? ` ${formatHourFromTime(event.time)}` : ''}
📝 ${event.title}
${event.description ? `📋 ${event.description}` : ''}`;
    
    navigator.clipboard.writeText(text);
    alert('Evento copiado al portapapeles');
  };

  // Exportar calendario
  const handleExportCalendar = (exportFormat: 'ics' | 'csv') => {
    if (exportFormat === 'ics') {
      // Generar archivo ICS
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Apiarios Carrion//PANAL//ES',
        ...filteredEvents.map(event => {
          const startDate = new Date(event.date);
          const endDate = addDays(startDate, 1);
          return [
            'BEGIN:VEVENT',
            `UID:${event.id}@apiarioscarrion.com`,
            `DTSTAMP:${format(new Date(), 'yyyyMMdd\'T\'HHmmss\'Z\'')}`,
            `DTSTART:${format(startDate, 'yyyyMMdd\'T\'HHmmss')}`,
            `DTEND:${format(endDate, 'yyyyMMdd\'T\'HHmmss')}`,
            `SUMMARY:${event.title}`,
            event.description ? `DESCRIPTION:${event.description}` : '',
            'END:VEVENT',
          ].filter(Boolean).join('\r\n');
        }),
        'END:VCALENDAR',
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `calendario-apiarios-${format(new Date(), 'yyyy-MM-dd')}.ics`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (exportFormat === 'csv') {
      // Generar archivo CSV
      const csvContent = [
        ['Fecha', 'Hora', 'Tipo', 'Título', 'Descripción', 'Colmena', 'Completado'].join(','),
        ...filteredEvents.map(event => {
          const hive = hives.find(h => h.id === event.hiveId);
          return [
            format(new Date(event.date), 'yyyy-MM-dd'),
            event.time ? formatHourFromTime(event.time) : '',
            EVENT_LABELS[event.type],
            `"${event.title}"`,
            `"${event.description || ''}"`,
            hive?.code || '',
            event.completed ? 'Sí' : 'No',
          ].join(',');
        }),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `calendario-apiarios-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  // Obtener eventos para una fecha específica
  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter(e => isSameDay(new Date(e.date), date));
  };

  // Renderizar vista mensual
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <div className="card p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.button
            onClick={navigatePrev}
            className="p-2 rounded-lg hover:bg-pane2 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-5 h-5 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>

          <motion.h2
            key={currentDate.toString()}
            className="font-display text-2xl font-bold text-cream capitalize"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </motion.h2>

          <motion.button
            onClick={navigateNext}
            className="p-2 rounded-lg hover:bg-pane2 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-5 h-5 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
            <div key={day} className="text-center text-xs font-mono uppercase tracking-wider text-husk py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Grid de días */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <motion.button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={`relative aspect-square rounded-lg border transition-all ${
                  isSelected
                    ? 'border-honey bg-honey/20'
                    : isCurrentDay
                    ? 'border-honey/50 bg-honey/10'
                    : 'border-line hover:border-honey/30 hover:bg-pane2'
                } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className={`text-sm font-semibold ${isCurrentDay ? 'text-honey' : 'text-cream'}`}>
                  {format(day, 'd')}
                </span>

                {/* Indicador de floración */}
                {floweringEntries.filter(e => e.active && isDayInFloweringWindow(day, e)).length > 0 && (
                  <span className="absolute top-0.5 right-0.5 text-[10px] leading-none">🌸</span>
                )}

                {/* Indicadores de eventos */}
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: event.color || EVENT_COLORS[event.type] }}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-husk">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderizar vista semanal
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <motion.button onClick={navigatePrev} className="p-2 rounded-lg hover:bg-pane2" whileHover={{ scale: 1.1 }}>
            <svg className="w-5 h-5 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>

          <h2 className="font-display text-xl font-bold text-cream">
            Semana del {format(weekStart, 'd MMM', { locale: es })}
          </h2>

          <motion.button onClick={navigateNext} className="p-2 rounded-lg hover:bg-pane2" whileHover={{ scale: 1.1 }}>
            <svg className="w-5 h-5 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>

        <div className="space-y-4">
          {days.map(day => {
            const dayEvents = getEventsForDate(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toString()}
                className={`p-4 rounded-lg border ${isCurrentDay ? 'border-honey/50 bg-honey/5' : 'border-line'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-semibold ${isCurrentDay ? 'text-honey' : 'text-cream'}`}>
                    {format(day, 'EEEE, d MMMM', { locale: es })}
                  </h3>
                  <button
                    onClick={() => setSelectedDate(day)}
                    className="text-xs text-honey hover:text-honeysoft"
                  >
                    Ver detalles
                  </button>
                </div>

                {dayEvents.length > 0 ? (
                  <div className="space-y-2">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-ink/50 hover:bg-ink/70 transition-colors cursor-pointer"
                        onClick={() => handleEditEvent(event)}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: event.color || EVENT_COLORS[event.type] }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-cream">{event.title}</p>
                          {event.time && <p className="text-xs text-husk">{formatHourFromTime(event.time)}</p>}
                        </div>
                        {event.completed && (
                          <span className="text-xs text-sage">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-husk text-center py-2">Sin eventos</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderizar vista diaria
  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <motion.button onClick={navigatePrev} className="p-2 rounded-lg hover:bg-pane2" whileHover={{ scale: 1.1 }}>
            <svg className="w-5 h-5 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>

          <h2 className="font-display text-xl font-bold text-cream">
            {format(currentDate, 'EEEE, d MMMM yyyy', { locale: es })}
          </h2>

          <motion.button onClick={navigateNext} className="p-2 rounded-lg hover:bg-pane2" whileHover={{ scale: 1.1 }}>
            <svg className="w-5 h-5 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>

        <div className="space-y-2">
          {hours.map(hour => {
            const hourEvents = dayEvents.filter(e => {
              if (!e.time) return false;
              const eventHour = parseInt(e.time.split(':')[0]);
              return eventHour === hour;
            });

            return (
              <div key={hour} className="flex gap-4 min-h-[60px]">
                <div className="w-16 text-right text-sm text-husk font-mono">
                  {formatHour(new Date(0, 0, 1, hour))}
                </div>
                <div className="flex-1 border-l border-line pl-4">
                  {hourEvents.map(event => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg bg-ink/50 hover:bg-ink/70 transition-colors cursor-pointer mb-2"
                      onClick={() => handleEditEvent(event)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: event.color || EVENT_COLORS[event.type] }}
                        />
                        <p className="font-medium text-cream">{event.title}</p>
                      </div>
                      {event.description && (
                        <p className="text-sm text-husk mt-1">{event.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controles superiores */}
      <div className="space-y-4">
        {/* Barra de búsqueda y filtros */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-3">
            {/* Búsqueda */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar eventos..."
                className="w-full rounded-xl border border-line bg-ink/50 px-4 py-2 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
              />
            </div>

            {/* Filtro por tipo */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-xl border border-line bg-ink/50 px-4 py-2 text-sm text-cream focus:border-honey/70"
            >
              <option value="all">Todos los tipos</option>
              {Object.entries(EVENT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {/* Filtro por colmena */}
            <select
              value={filterHive}
              onChange={(e) => setFilterHive(e.target.value)}
              className="rounded-xl border border-line bg-ink/50 px-4 py-2 text-sm text-cream focus:border-honey/70"
            >
              <option value="all">Todas las colmenas</option>
              {hives.map(hive => (
                <option key={hive.id} value={hive.id}>{hive.code}</option>
              ))}
            </select>

            {/* Toggle vista */}
            <div className="flex rounded-xl border border-line overflow-hidden">
              {(['month', 'week', 'day'] as CalendarViewType[]).map(view => (
                <button
                  key={view}
                  onClick={() => setViewType(view)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    viewType === view ? 'bg-honey text-ink' : 'bg-ink/50 text-husk hover:text-cream'
                  }`}
                >
                  {view === 'month' ? 'Mes' : view === 'week' ? 'Semana' : 'Día'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Este mes</p>
            <p className="font-display text-2xl font-black text-cream">{stats.thisMonth}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Próximo evento</p>
            <p className="font-display text-2xl font-black text-honey">
              {stats.daysUntilNext !== null ? `${stats.daysUntilNext}d` : '—'}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Completados</p>
            <p className="font-display text-2xl font-black text-sage">{stats.completed}/{stats.thisMonth}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Cumplimiento</p>
            <p className="font-display text-2xl font-black text-cream">{stats.completionRate}%</p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-wrap gap-3">
          <motion.button
            onClick={handleAddEvent}
            className="flex items-center gap-2 rounded-xl bg-honey px-4 py-2 text-sm font-semibold text-ink hover:bg-honeysoft"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo evento
          </motion.button>

          <motion.button
            onClick={goToToday}
            className="flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium text-husk hover:text-cream hover:border-honey/50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Hoy
          </motion.button>

          {overdueEvents.length > 0 && (
            <motion.button
              onClick={() => setShowOverdue(!showOverdue)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
                showOverdue ? 'bg-coral/20 text-coral border border-coral/50' : 'border border-coral/30 text-coral hover:bg-coral/10'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ⚠️ Atrasados ({overdueEvents.length})
            </motion.button>
          )}

          {/* Botón de exportar */}
          <div className="relative group">
            <motion.button
              className="flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium text-husk hover:text-cream hover:border-honey/50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar
            </motion.button>
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-line bg-pane p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 max-w-[calc(100vw-1.5rem)]">
              <button
                onClick={() => handleExportCalendar('ics')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-cream hover:bg-pane2 transition-colors"
              >
                📅 Calendario (ICS)
              </button>
              <button
                onClick={() => handleExportCalendar('csv')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-cream hover:bg-pane2 transition-colors"
              >
                📊 Lista (CSV)
              </button>
            </div>
          </div>

          {/* Ayuda de atajos */}
          <div className="relative group">
            <motion.button
              className="flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium text-husk hover:text-cream hover:border-honey/50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Atajos
            </motion.button>
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-line bg-pane p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 max-w-[calc(100vw-1.5rem)]">
              <p className="text-xs font-semibold text-cream mb-2">Atajos de teclado:</p>
              <div className="space-y-1 text-xs text-husk">
                <div className="flex justify-between"><span>Ir a hoy</span><kbd className="px-2 py-0.5 bg-ink rounded">H</kbd></div>
                <div className="flex justify-between"><span>Nuevo evento</span><kbd className="px-2 py-0.5 bg-ink rounded">N</kbd></div>
                <div className="flex justify-between"><span>Navegar</span><kbd className="px-2 py-0.5 bg-ink rounded">← →</kbd></div>
                <div className="flex justify-between"><span>Vista mes</span><kbd className="px-2 py-0.5 bg-ink rounded">M</kbd></div>
                <div className="flex justify-between"><span>Vista semana</span><kbd className="px-2 py-0.5 bg-ink rounded">W</kbd></div>
                <div className="flex justify-between"><span>Vista día</span><kbd className="px-2 py-0.5 bg-ink rounded">D</kbd></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Eventos atrasados */}
      <div className={`accordion-grid ${showOverdue && overdueEvents.length > 0 ? 'open' : ''}`}>
        {showOverdue && overdueEvents.length > 0 && (
          <div>
            <div className="card p-6 border-coral/50">
            <h3 className="font-display text-lg font-bold text-coral mb-4">⚠️ Eventos Atrasados</h3>
            <div className="space-y-2">
              {overdueEvents.map(event => (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-coral/10 border border-coral/30">
                  <div className="flex-1">
                    <p className="font-medium text-cream">{event.title}</p>
                    <p className="text-xs text-husk">{format(new Date(event.date), 'd MMM yyyy')}</p>
                  </div>
                  <button
                    onClick={() => handleToggleComplete(event.id)}
                    className="px-3 py-1 rounded-lg bg-sage/20 text-sage text-xs hover:bg-sage/30"
                  >
                    Completar
                  </button>
                  <button
                    onClick={() => handlePostpone(event.id)}
                    className="px-3 py-1 rounded-lg bg-honey/20 text-honey text-xs hover:bg-honey/30"
                  >
                    Posponer
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Vista del calendario */}
      {viewType === 'month' && renderMonthView()}
      {viewType === 'week' && renderWeekView()}
      {viewType === 'day' && renderDayView()}

      {/* Recordatorios del día */}
      {dayReminders.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-bold text-cream">🔔 Recordatorios próximos</h3>
            <span className="text-xs font-mono text-husk">
              configuración: {alertDaysBefore} {alertDaysBefore === 1 ? 'día' : 'días'} antes
            </span>
          </div>
          <div className="space-y-2">
            {dayReminders.slice(0, 8).map(reminder => (
              <div
                key={reminder.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-ink/50 hover:bg-ink/70 transition-colors"
              >
                <span className="text-xl">{REMINDER_ICONS[reminder.kind]}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-cream text-sm">{reminder.title}</p>
                  {reminder.description && (
                    <p className="text-xs text-husk truncate">{reminder.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: REMINDER_COLORS[reminder.kind] }}
                  />
                  <span className={`text-xs font-semibold ${
                    reminder.daysLeft === 0 ? 'text-coral' : reminder.daysLeft === 1 ? 'text-honey' : 'text-husk'
                  }`}>
                    {reminder.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gestión de tareas recurrentes y floración */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tareas recurrentes */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-cream">🔄 Tareas recurrentes</h3>
            <button
              onClick={() => setShowRecurringForm(true)}
              className="rounded-lg bg-honey px-3 py-1.5 text-xs font-semibold text-ink hover:bg-honeysoft transition-colors"
            >
              + Nueva
            </button>
          </div>
          {recurringTasks.length === 0 ? (
            <p className="text-sm text-husk py-4 text-center">
              Ej: revisar colmenas cada 7 días, control de varroa cada 21 días...
            </p>
          ) : (
            <div className="space-y-2">
              {recurringTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-ink/50">
                  <button
                    onClick={() => handleToggleRecurringTask(task.id)}
                    className={`w-5 h-5 rounded border flex items-center justify-center text-[10px] transition-colors ${
                      task.active ? 'bg-sage/20 border-sage/50 text-sage' : 'border-line text-transparent'
                    }`}
                  >
                    ✓
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.active ? 'text-cream' : 'text-husk line-through'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-husk">
                      cada {task.intervalDays} {task.intervalDays === 1 ? 'día' : 'días'}
                      {task.season === 'winter' ? ' · invierno' : ''}
                      {task.materializeAll ? '' : ' · solo próxima'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteRecurringTask(task.id)}
                    className="text-husk hover:text-coral p-1 transition-colors"
                    title="Eliminar"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendario de floración */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-cream">🌸 Calendario de floración</h3>
            <button
              onClick={() => setShowFloweringForm(true)}
              className="rounded-lg bg-honey px-3 py-1.5 text-xs font-semibold text-ink hover:bg-honeysoft transition-colors"
            >
              + Registrar
            </button>
          </div>
          {floweringEntries.length === 0 ? (
            <p className="text-sm text-husk py-4 text-center">
              Registra flora melífera por apiario para recibir alertas.
            </p>
          ) : (
            <div className="space-y-2">
              {floweringEntries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-ink/50">
                  <button
                    onClick={() => handleToggleFlowering(entry.id)}
                    className={`w-5 h-5 rounded border flex items-center justify-center text-[10px] transition-colors ${
                      entry.active ? 'bg-sage/20 border-sage/50 text-sage' : 'border-line text-transparent'
                    }`}
                  >
                    ✓
                  </button>
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${entry.active ? 'text-cream' : 'text-husk line-through'}`}>
                      {entry.species} · {entry.apiaryName}
                    </p>
                    <p className="text-xs text-husk">
                      {format(new Date(2026, entry.startMonth - 1, 1), 'MMM', { locale: es })} –{' '}
                      {format(new Date(2026, entry.endMonth - 1, 1), 'MMM', { locale: es })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteFlowering(entry.id)}
                    className="text-husk hover:text-coral p-1 transition-colors"
                    title="Eliminar"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel de eventos del día seleccionado */}
      {selectedDate && viewType === 'month' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-bold text-cream">
              Eventos del {format(selectedDate, 'd MMMM yyyy', { locale: es })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-husk hover:text-cream"
            >
              ✕
            </button>
          </div>

          {getEventsForDate(selectedDate).length > 0 ? (
            <div className="space-y-2">
              {getEventsForDate(selectedDate).map(event => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-ink/50 hover:bg-ink/70 transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full cursor-pointer"
                    style={{ backgroundColor: event.color || EVENT_COLORS[event.type] }}
                    onClick={() => handleEditEvent(event)}
                  />
                  <div className="flex-1 cursor-pointer" onClick={() => handleEditEvent(event)}>
                    <p className="font-medium text-cream">{event.title}</p>
                    {event.time && <p className="text-xs text-husk">{formatHourFromTime(event.time)}</p>}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareEvent(event);
                    }}
                    className="p-2 rounded-lg hover:bg-pane2 transition-colors"
                    title="Compartir evento"
                  >
                    <svg className="w-4 h-4 text-husk hover:text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  <input
                    type="checkbox"
                    checked={event.completed}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggleComplete(event.id);
                    }}
                    className="w-5 h-5"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-husk py-8">No hay eventos para este día</p>
          )}
        </div>
      )}

      {/* Formulario de evento */}
      {showEventForm && (
        <EventForm
          isOpen={showEventForm}
          event={editingEvent}
          selectedDate={selectedDate || currentDate}
          hives={hives}
          templates={templates}
          onClose={() => {
            setShowEventForm(false);
            setEditingEvent(null);
          }}
          onSave={handleSaveEvent}
        />
      )}

      {/* Formulario de tarea recurrente */}
      <AnimatePresence>
        {showRecurringForm && (
          <RecurringTaskForm
            onClose={() => setShowRecurringForm(false)}
            onCreate={handleCreateRecurringTask}
          />
        )}
      </AnimatePresence>

      {/* Formulario de floración */}
      <AnimatePresence>
        {showFloweringForm && (
          <FloweringForm
            apiaries={apiaries}
            defaultApiaryName={apiaryName}
            onClose={() => setShowFloweringForm(false)}
            onSave={handleSaveFlowering}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
