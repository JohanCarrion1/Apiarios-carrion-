// Tipos para eventos del calendario
export type EventType = 'inspection' | 'harvest' | 'treatment' | 'task' | 'reminder';

export type EventPriority = 'low' | 'medium' | 'high' | 'urgent';

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
}

// Tipos para notificaciones
export type NotificationType = 'inspection_reminder' | 'treatment' | 'alert' | 'harvest' | 'queen_alert';

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
  inspection: '#a3bf7f', // verde
  harvest: '#f0a41c', // ámbar
  treatment: '#e4603f', // rojo
  task: '#bd93b8', // púrpura
  reminder: '#6fa8dc', // azul
};

// Etiquetas para tipos de eventos
export const EVENT_LABELS: Record<EventType, string> = {
  inspection: 'Inspección',
  harvest: 'Cosecha',
  treatment: 'Tratamiento',
  task: 'Tarea',
  reminder: 'Recordatorio',
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
  low: '#a3906a',
  medium: '#f0a41c',
  high: '#e4603f',
  urgent: '#dc2626',
};
