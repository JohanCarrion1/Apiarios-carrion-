// Motor de recordatorios, tareas recurrentes y calendario de floración
import {
  addDays,
  startOfDay,
  differenceInCalendarDays,
  parseISO,
  format,
} from 'date-fns';
import type { CalendarEvent } from '../types/calendar';
import { RECURRING_EVENT_COLOR } from '../types/calendar';
import type {
  Reminder,
  ReminderKind,
  RecurringTask,
  FloweringEntry,
} from '../types/reminders';
import type { BreedingLot } from '../types/breeding';

const uid = () => Math.random().toString(36).slice(2, 11);

export interface ReminderKindSettings {
  inspections: boolean;
  harvests: boolean;
  breeding: boolean;
  flowering: boolean;
  tasks: boolean;
}

export interface ComputeRemindersParams {
  events: CalendarEvent[];
  breedingLots: BreedingLot[];
  recurringTasks: RecurringTask[];
  floweringEntries: FloweringEntry[];
  hives?: { id: string; code: string }[];
  daysBefore: number;
  enabledKinds: ReminderKindSettings;
  today?: Date;
}

/** Devuelve cuántos días faltan y su etiqueta ("Hoy", "Mañana", "En X días"...). */
export function getDaysLabel(target: Date, today: Date): { daysLeft: number; label: string } {
  const daysLeft = differenceInCalendarDays(startOfDay(target), startOfDay(today));
  let label: string;
  if (daysLeft === 0) label = 'Hoy';
  else if (daysLeft === 1) label = 'Mañana';
  else if (daysLeft > 1) label = `En ${daysLeft} días`;
  else if (daysLeft === -1) label = 'Ayer';
  else label = `Hace ${-daysLeft} días`;
  return { daysLeft, label };
}

/**
 * Genera las instancias futuras de una tarea recurrente como eventos de calendario.
 * - materializeAll = true  → todas las instancias dentro del horizonte (verificación: 4 semanas)
 * - materializeAll = false → solo la próxima instancia ("Solo la próxima")
 */
export function generateRecurringTaskInstances(
  task: RecurringTask,
  from: Date,
  horizonDays: number
): CalendarEvent[] {
  const instances: CalendarEvent[] = [];
  if (!task.active || task.intervalDays <= 0) return instances;

  const horizonStart = startOfDay(from);
  const horizonEnd = addDays(horizonStart, horizonDays);
  let current = startOfDay(parseISO(task.startDate || from.toISOString()));
  let guard = 0;

  // Avanzar hasta la primera fecha >= hoy
  while (current < horizonStart && guard < 600) {
    current = addDays(current, task.intervalDays);
    guard++;
  }

  guard = 0;
  while (current <= horizonEnd && guard < 300) {
    instances.push({
      id: `${task.id}_${format(current, 'yyyyMMdd')}`,
      type: 'reminder',
      title: task.title,
      description: task.description || `Tarea recurrente cada ${task.intervalDays} días`,
      date: current.toISOString(),
      priority: 'medium',
      completed: false,
      createdAt: task.createdAt,
      color: RECURRING_EVENT_COLOR,
      recurringTaskId: task.id,
    });
    current = addDays(current, task.intervalDays);
    guard++;
  }

  return task.materializeAll ? instances : instances.slice(0, 1);
}

interface FloweringWindow {
  start: Date;
  end: Date;
}

/** Ventanas de floración para un año (maneja rangos que cruzan el año). */
function floweringWindowsForYear(entry: FloweringEntry, year: number): FloweringWindow[] {
  const s = entry.startMonth;
  const e = entry.endMonth;
  if (s <= e) {
    return [{ start: new Date(year, s - 1, 1), end: new Date(year, e, 0) }];
  }
  // Cruza el año: ej. oct (10) → feb (2)
  return [
    { start: new Date(year, s - 1, 1), end: new Date(year + 1, e, 0) },
  ];
}

/** Marcadores (evento visual de floración) para un período dado en el calendario. */
export function floweringEventsForPeriod(
  entries: FloweringEntry[],
  start: Date,
  end: Date
): CalendarEvent[] {
  const result: CalendarEvent[] = [];
  entries.forEach((entry) => {
    if (!entry.active) return;
    const year = start.getFullYear();
    floweringWindowsForYear(entry, year).forEach((window) => {
      const wStart = startOfDay(window.start);
      const wEnd = startOfDay(window.end);
      if (wEnd >= startOfDay(start) && wStart <= end) {
        result.push({
          id: `flower_${entry.id}_${wStart.getFullYear()}`,
          type: 'reminder',
          title: `🌸 ${entry.species} · ${entry.apiaryName}`,
          description: entry.notes || 'Floración melífera',
          date: wStart.toISOString(),
          priority: 'low',
          completed: false,
          createdAt: entry.createdAt,
          color: entry.color,
        });
      }
    });
  });
  return result;
}

/** Calcula los recordatorios pendientes según las fuentes activadas. */
export function computeReminders({
  events,
  breedingLots,
  recurringTasks,
  floweringEntries,
  hives = [],
  daysBefore,
  enabledKinds,
  today = new Date(),
}: ComputeRemindersParams): Reminder[] {
  const reminders: Reminder[] = [];
  const todayStart = startOfDay(today);

  const push = (
    kind: ReminderKind,
    date: Date,
    title: string,
    description?: string,
    eventId?: string,
    apiaryName?: string
  ) => {
    const { daysLeft, label } = getDaysLabel(date, todayStart);
    if (daysLeft < 0 || daysLeft > daysBefore) return;
    reminders.push({
      id: uid(),
      kind,
      title: `${label}: ${title}`,
      description,
      date: date.toISOString(),
      daysLeft,
      label,
      dateKey: format(date, 'yyyy-MM-dd'),
      apiaryName,
      eventId,
    });
  };

  const hiveCode = (id?: string) => hives.find((h) => h.id === id)?.code;

  // 1. Eventos del calendario
  events.forEach((event) => {
    if (event.completed) return;
    const eventDate = parseISO(event.date);
    const isRecurringInstance = Boolean(event.recurringTaskId);

    let kind: ReminderKind = 'task';
    const prefixApiary = hiveCode(event.hiveId) ? ` (${hiveCode(event.hiveId)})` : '';
    const description = event.description
      ? `${event.description}${prefixApiary}`
      : prefixApiary.trim();

    if (event.type === 'inspection') {
      if (!enabledKinds.inspections) return;
      kind = 'inspection';
    } else if (event.type === 'treatment') {
      if (!enabledKinds.inspections) return;
      kind = 'treatment';
    } else if (event.type === 'harvest') {
      if (!enabledKinds.harvests) return;
      kind = 'harvest';
    } else {
      if (!enabledKinds.tasks) return;
      kind = isRecurringInstance ? 'recurring' : event.type === 'reminder' ? 'task' : 'task';
    }

    push(kind, eventDate, event.title, description || undefined, event.id);
  });

  // 2. Alerta automática de cría de reinas (enjaulado D+10, nacimiento D+12-13)
  if (enabledKinds.breeding) {
    breedingLots.forEach((lot) => {
      if (lot.estado === 'perdidas' || lot.estado === 'aceptadas') return;
      const lotTag = `lote #${lot.id.slice(-6).toUpperCase()}`;
      push(
        'breeding',
        parseISO(lot.fechaEnjauladoEstimada),
        `Enjaulado ${lotTag} de cría de reinas`,
        `Lote ${lot.tipo} · donante ${lot.coloniaDonante || ''}`.trim()
      );
      push(
        'breeding',
        parseISO(lot.fechaNacimientoEstimada),
        `Nacimiento ${lotTag} de cría de reinas`,
        `Nacimiento estimado del lote ${lot.tipo}`.trim()
      );
    });
  }

  // 3. Calendario de floración
  if (enabledKinds.flowering) {
    floweringEntries.forEach((entry) => {
      if (!entry.active) return;
      const windows = [
        ...floweringWindowsForYear(entry, todayStart.getFullYear()),
        ...floweringWindowsForYear(entry, todayStart.getFullYear() + 1),
      ];
      // Próxima ventana que comienza hoy o después
      const upcoming = windows
        .filter((w) => w.start >= todayStart)
        .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
      // Ventana actual
      const current = windows.find((w) => todayStart >= w.start && todayStart <= w.end);

      if (current) {
        push(
          'flowering',
          todayStart,
          `En floración de ${entry.species} en ${entry.apiaryName} - aumentar revisiones`,
          entry.notes,
          undefined,
          entry.apiaryName
        );
      } else if (upcoming) {
        push(
          'flowering',
          upcoming.start,
          `Inicia floración de ${entry.species} en ${entry.apiaryName} - aumentar revisiones`,
          entry.notes,
          undefined,
          entry.apiaryName
        );
      }
    });
  }

  // 4. Tareas recurrentes
  if (enabledKinds.tasks) {
    recurringTasks.forEach((task) => {
      generateRecurringTaskInstances(task, todayStart, daysBefore).forEach((event) => {
        // Para "Solo la próxima" solo interesa la primera instancia dentro de la ventana
        push('recurring', parseISO(event.date), event.title, event.description, event.id);
      });
    });
  }

  // Ordenar: primero lo más urgente (días restantes, luego fecha)
  return reminders.sort((a, b) => a.daysLeft - b.daysLeft || a.date.localeCompare(b.date));
}