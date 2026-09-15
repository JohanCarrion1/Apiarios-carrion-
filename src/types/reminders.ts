// Tipos para el sistema de recordatorios, tareas recurrentes y calendario de floración

export type ReminderKind =
  | 'inspection'
  | 'harvest'
  | 'treatment'
  | 'task'
  | 'breeding'
  | 'flowering'
  | 'recurring';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  title: string;
  description?: string;
  date: string; // ISO string
  daysLeft: number; // 0 = hoy, 1 = mañana, n = en n días
  label: string; // "Hoy", "Mañana", "En X días"
  dateKey: string; // yyyy-MM-dd
  apiaryName?: string;
  eventId?: string;
  read?: boolean;
}

export const REMINDER_KIND_LABELS: Record<ReminderKind, string> = {
  inspection: 'Revisión',
  harvest: 'Cosecha',
  treatment: 'Tratamiento',
  task: 'Tarea',
  breeding: 'Cría de reinas',
  flowering: 'Floración',
  recurring: 'Tarea recurrente',
};

export const REMINDER_COLORS: Record<ReminderKind, string> = {
  inspection: '#a3bf7f', // verde
  harvest: '#f0a41c', // ámbar
  treatment: '#e4603f', // rojo
  task: '#bd93b8', // púrpura
  breeding: '#bd93b8', // púrpura
  flowering: '#4ade80', // verde claro
  recurring: '#f97316', // naranja
};

export const REMINDER_ICONS: Record<ReminderKind, string> = {
  inspection: '🔍',
  harvest: '🍯',
  treatment: '💊',
  task: '📋',
  breeding: '👑',
  flowering: '🌸',
  recurring: '🔁',
};

// ============================================
// TAREAS RECURRENTES
// ============================================

export type RecurringTaskFrequency = 'custom' | 'weekly' | 'monthly';

export interface RecurringTask {
  id: string;
  title: string;
  description?: string;
  frequency: RecurringTaskFrequency;
  intervalDays: number; // 7, 3, 21, 30 (mensual)...
  season?: 'all' | 'winter'; // "Alimentar cada 3 días en invierno"
  startDate: string; // ISO date (inicio)
  materializeAll: boolean; // true = "Crear todas las instancias futuras", false = "Solo la próxima"
  active: boolean;
  createdAt: string;
}

export interface RecurringTaskDraft {
  title: string;
  description?: string;
  frequency: RecurringTaskFrequency;
  intervalDays: number;
  season?: 'all' | 'winter';
  startDate: string;
  materializeAll: boolean;
}

// ============================================
// CALENDARIO DE FLORACIÓN
// ============================================

export interface FloweringEntry {
  id: string;
  apiaryId: string;
  apiaryName: string;
  species: string; // "Eucalipto", "Romero", "Laurel"
  startMonth: number; // 1-12 (enero = 1)
  endMonth: number; // 1-12
  notes?: string;
  color: string;
  active: boolean;
  createdAt: string;
}

export interface FloweringEntryDraft {
  apiaryId: string;
  apiaryName: string;
  species: string;
  startMonth: number;
  endMonth: number;
  notes?: string;
  color: string;
}

// Plantillas de floración del documento CALENDARIO.md
export const FLOWERING_PRESETS = [
  { species: 'Eucalipto', startMonth: 2, endMonth: 3, apiaryName: 'Huaraz', color: '#4ade80' },
  { species: 'Romero', startMonth: 5, endMonth: 6, apiaryName: 'Huaraz', color: '#a3bf7f' },
  { species: 'Laurel', startMonth: 8, endMonth: 9, apiaryName: 'Caraz', color: '#34d399' },
];

export const FLOWERING_COLORS = ['#4ade80', '#a3bf7f', '#34d399', '#6fa8dc', '#f0a41c', '#bd93b8'];