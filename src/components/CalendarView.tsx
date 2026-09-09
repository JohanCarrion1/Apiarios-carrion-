import { useState, useMemo } from 'react';
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
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { CalendarEvent } from '../types/calendar';
import { EVENT_COLORS } from '../types/calendar';

interface CalendarViewProps {
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
  selectedDate: Date | null;
}

export default function CalendarView({ events, onDateSelect, selectedDate }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generar días del calendario
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Lunes
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Obtener eventos para un día específico
  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.date), date));
  };

  // Días de la semana
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="card p-6">
      {/* Header del calendario */}
      <div className="flex items-center justify-between mb-6">
        <motion.button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-pane2 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <svg className="w-5 h-5 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>

        <motion.h2
          key={currentMonth.toString()}
          className="font-display text-2xl font-bold text-cream"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </motion.h2>

        <motion.button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
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
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-mono uppercase tracking-wider text-husk py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);

          return (
            <motion.button
              key={day.toString()}
              onClick={() => onDateSelect(day)}
              className={`relative aspect-square rounded-lg border transition-all ${
                isSelected
                  ? 'border-honey bg-honey/20'
                  : isCurrentDay
                  ? 'border-honey/50 bg-honey/10'
                  : 'border-line hover:border-honey/30 hover:bg-pane2'
              } ${!isCurrentMonth ? 'opacity-40' : ''}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.01 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Número del día */}
              <span className={`text-sm font-semibold ${
                isCurrentDay ? 'text-honey' : 'text-cream'
              }`}>
                {format(day, 'd')}
              </span>

              {/* Indicador de día actual */}
              {isCurrentDay && (
                <motion.div
                  className="absolute top-1 right-1 w-2 h-2 rounded-full bg-honey"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                />
              )}

              {/* Marcadores de eventos */}
              {dayEvents.length > 0 && (
                <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-0.5">
                  {dayEvents.slice(0, 3).map((event, idx) => (
                    <motion.div
                      key={event.id}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: EVENT_COLORS[event.type] }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
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

      {/* Leyenda */}
      <div className="mt-6 pt-6 border-t border-line">
        <p className="text-xs font-mono uppercase tracking-wider text-husk mb-3">Tipos de eventos</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(EVENT_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-husk capitalize">
                {type === 'inspection' ? 'Inspección' :
                 type === 'harvest' ? 'Cosecha' :
                 type === 'treatment' ? 'Tratamiento' :
                 type === 'task' ? 'Tarea' : 'Recordatorio'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
