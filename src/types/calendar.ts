// Tipos para eventos del calendario
export type EventType = 'inspection' | 'harvest' | 'treatment' | 'task' | 'reminder' | 'custom';

export type EventPriority = 'low' | 'medium' | 'high' | 'urgent';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export type ReminderType = '1day' | '3days' | '1week';

export type CalendarViewType = 'month' | 'week' | 'day';

export interface CalendarEvent {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  date: string; // ISO string
  time?: string; // HH:mm
  hiveId?: string;
  priority: EventPriority;
  completed: boolean;
  createdAt: string;
  // Nuevas propiedades
  color?: string; // Color personalizado
  recurrence?: {
    type: RecurrenceType;
    interval?: number; // Para "custom": cada X días
    endDate?: string; // Fecha límite de recurrencia
  };
  reminders?: ReminderType[];
  isRecurrentInstance?: boolean; // Si es una instancia de un evento recurrente
  parentEventId?: string; // ID del evento padre si es recurrente
  recurringTaskId?: string; // Si proviene de una tarea recurrente
}

export interface EventTemplate {
  id: string;
  name: string;
  type: EventType;
  title: string;
  description?: string;
  color?: string;
}

// Tipos para notificaciones
export type NotificationType = 'inspection_reminder' | 'treatment' | 'alert' | 'harvest' | 'queen_alert' | 'stock_alert';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  hiveId?: string;
  eventId?: string;
  read: boolean;
  createdAt: string;
}

// Configuración de notificaciones
export interface NotificationSettings {
  inspectionReminders: boolean;
  treatments: boolean;
  alerts: boolean;
  harvests: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  soundEnabled: boolean;
}

// Colores para tipos de eventos
export const EVENT_COLORS: Record<EventType, string> = {
  inspection: '#93cc68', // verde
  harvest: '#ffa90a', // ámbar
  treatment: '#f4552b', // rojo
  task: '#c987c3', // púrpura
  reminder: '#6fa8dc', // azul
  custom: '#ffa90a', // ámbar por defecto
};

// Color naranja para eventos de recordatorio/tarea recurrente
export const RECURRING_EVENT_COLOR = '#f97316';

// Etiquetas para tipos de eventos
export const EVENT_LABELS: Record<EventType, string> = {
  inspection: 'Inspección',
  harvest: 'Cosecha',
  treatment: 'Tratamiento',
  task: 'Tarea',
  reminder: 'Recordatorio',
  custom: 'Personalizado',
};

// Etiquetas para prioridades
export const PRIORITY_LABELS: Record<EventPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

// Colores para prioridades
export const PRIORITY_COLORS: Record<EventPriority, string> = {
  low: '#b19a68',
  medium: '#ffa90a',
  high: '#f4552b',
  urgent: '#dc2626',
};
