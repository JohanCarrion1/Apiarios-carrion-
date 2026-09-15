import { motion } from 'framer-motion';
import type { Reminder } from '../types/reminders';
import { REMINDER_COLORS, REMINDER_ICONS } from '../types/reminders';

interface RemindersWidgetProps {
  reminders: Reminder[];
  limit?: number;
  onNavigate?: () => void;
}

export default function RemindersWidget({ reminders, limit = 5, onNavigate }: RemindersWidgetProps) {
  const list = reminders.slice(0, limit);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl font-bold text-cream">Próximos recordatorios</h3>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="text-xs text-honey hover:text-honeysoft transition-colors"
          >
            Ver calendario →
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-5xl mb-3">🔔</div>
          <p className="text-husk">No hay recordatorios pendientes</p>
          <p className="text-xs text-husk/70 mt-2">Los recordatorios aparecerán aquí cuando haya eventos próximos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((reminder, index) => (
            <motion.div
              key={reminder.id}
              className="p-3 rounded-lg bg-ink/50 border border-line hover:border-honey/30 transition-all cursor-pointer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ x: 4 }}
              onClick={onNavigate}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{REMINDER_ICONS[reminder.kind]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cream mb-1">{reminder.title}</p>
                  {reminder.description && (
                    <p className="text-xs text-husk line-clamp-1">{reminder.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: REMINDER_COLORS[reminder.kind] }}
                    />
                    <span className={`text-xs font-semibold ${
                      reminder.daysLeft === 0 ? 'text-coral' :
                      reminder.daysLeft === 1 ? 'text-honey' : 'text-husk'
                    }`}>
                      {reminder.label}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}