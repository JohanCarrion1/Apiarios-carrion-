import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { isAfter, isBefore, addDays, differenceInDays } from 'date-fns';
import CalendarView from './CalendarView';
import EventPanel from './EventPanel';
import EventForm from './EventForm';
import type { CalendarEvent, Notification } from '../types/calendar';
import type { Hive } from '../types/hive';
import type { Task } from '../types/hive';

const uid = () => Math.random().toString(36).slice(2, 11);

interface CalendarSectionProps {
  hives: Hive[];
  tasks: Task[];
}

export default function CalendarSection({ hives, tasks }: CalendarSectionProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Cargar eventos desde localStorage
  useEffect(() => {
    const savedEvents = localStorage.getItem('panal_events');
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    }
  }, []);

  // Guardar eventos en localStorage
  useEffect(() => {
    localStorage.setItem('panal_events', JSON.stringify(events));
  }, [events]);

  // Generar notificaciones automáticas
  useEffect(() => {
    const newNotifications: Notification[] = [];

    // Notificaciones de inspecciones pendientes (> 14 días)
    hives.forEach(hive => {
      if (hive.updatedAt) {
        const daysSinceInspection = differenceInDays(new Date(), new Date(hive.updatedAt));
        if (daysSinceInspection > 14) {
          newNotifications.push({
            id: uid(),
            type: 'inspection_reminder',
            title: `Colmena ${hive.code} necesita revisión`,
            description: `Han pasado ${daysSinceInspection} días desde la última inspección`,
            hiveId: hive.id,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    // Notificaciones de colmenas en alerta
    hives.forEach(hive => {
      if (hive.status === 'alerta') {
        newNotifications.push({
          id: uid(),
          type: 'alert',
          title: `Colmena ${hive.code} en estado Alerta`,
          description: 'Esta colmena requiere atención inmediata',
          hiveId: hive.id,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    });

    // Notificaciones de colmenas sin reina
    hives.forEach(hive => {
      if (hive.status === 'sin_reina') {
        newNotifications.push({
          id: uid(),
          type: 'queen_alert',
          title: `Colmena ${hive.code} sin reina detectada`,
          description: 'Se necesita introducir una nueva reina',
          hiveId: hive.id,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    });

    // Notificaciones de tareas próximas (próximos 7 días)
    tasks.forEach(task => {
      if (!task.completed && task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        const daysUntilDue = differenceInDays(dueDate, today);
        
        if (daysUntilDue >= 0 && daysUntilDue <= 7) {
          newNotifications.push({
            id: uid(),
            type: 'treatment',
            title: `Tarea pendiente: ${task.title}`,
            description: daysUntilDue === 0 ? 'Vence hoy' : `Vence en ${daysUntilDue} días`,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    // Notificaciones de cosechas programadas
    events.forEach(event => {
      if (event.type === 'harvest') {
        const eventDate = new Date(event.date);
        const today = new Date();
        const daysUntilEvent = differenceInDays(eventDate, today);
        
        if (daysUntilEvent >= 0 && daysUntilEvent <= 7) {
          newNotifications.push({
            id: uid(),
            type: 'harvest',
            title: `Cosecha programada: ${event.title}`,
            description: daysUntilEvent === 0 ? 'Programada para hoy' : `Programada en ${daysUntilEvent} días`,
            eventId: event.id,
            hiveId: event.hiveId,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    setNotifications(newNotifications);
  }, [hives, tasks, events]);

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
      // Editar evento existente
      setEvents(events.map(e => 
        e.id === editingEvent.id 
          ? { ...e, ...eventData }
          : e
      ));
    } else {
      // Crear nuevo evento
      const newEvent: CalendarEvent = {
        ...eventData,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      setEvents([...events, newEvent]);
    }
    setShowEventForm(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id);
    
    // Navegar al evento si existe
    if (notification.eventId) {
      const event = events.find(e => e.id === notification.eventId);
      if (event) {
        setSelectedDate(new Date(event.date));
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Vista de Calendario */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <CalendarView
          events={events}
          onDateSelect={setSelectedDate}
          selectedDate={selectedDate}
        />
      </motion.div>

      {/* Panel de Eventos del Día */}
      {selectedDate && (
        <EventPanel
          selectedDate={selectedDate}
          events={events}
          hives={hives}
          onClose={() => setSelectedDate(null)}
          onAddEvent={handleAddEvent}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      )}

      {/* Formulario de Evento */}
      <EventForm
        isOpen={showEventForm}
        event={editingEvent}
        selectedDate={selectedDate || new Date()}
        hives={hives}
        onClose={() => {
          setShowEventForm(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
      />
    </div>
  );
}
