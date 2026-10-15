import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Notification } from '../types/calendar';

const RECENT_DAYS = 7;
const MAX_ITEMS = 6;

interface NotificationDropdownProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick?: (notification: Notification) => void;
  onViewAll?: () => void;
  recentDays?: number;
  maxItems?: number;
}

function getNotificationEmoji(notification: Notification): string {
  switch (notification.type) {
    case 'inspection_reminder':
      return '🔔';
    case 'treatment':
      return '💊';
    case 'harvest':
      return '🍯';
    case 'stock_alert':
      return '📦';
    case 'queen_alert':
      return '🐝';
    case 'alert':
    default: {
      const text = `${notification.title} ${notification.description}`.toLowerCase();
      if (text.includes('floración') || text.includes('floracion') || text.includes('🌸')) return '🌸';
      if (text.includes('enjaulado') || text.includes('nacimiento') || text.includes('cría') || text.includes('cria')) return '🐝';
      return '🔔';
    }
  }
}

function getNotificationColor(notification: Notification): string {
  switch (notification.type) {
    case 'inspection_reminder': return '#93cc68';
    case 'treatment': return '#f4552b';
    case 'harvest': return '#ffa90a';
    case 'stock_alert': return '#f4552b';
    case 'queen_alert': return '#c987c3';
    case 'alert':
    default: {
      const emoji = getNotificationEmoji(notification);
      if (emoji === '🌸') return '#4ade80';
      if (emoji === '🐝') return '#c987c3';
      return '#ffa90a';
    }
  }
}

export default function NotificationDropdown({
  notifications,
  isOpen,
  onClose,
  anchorRef,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  onViewAll,
  recentDays = RECENT_DAYS,
  maxItems = MAX_ITEMS,
}: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 320,
  });

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const isMobile = window.innerWidth < 640;
      const maxHeight = 400;
      const width = isMobile
        ? Math.min(Math.round(window.innerWidth * 0.9), 320)
        : 350;

      let left: number;
      if (isMobile) {
        left = rect.left + rect.width / 2 - width / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      } else {
        left = rect.right - width + 8;
        left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      }

      let top = rect.bottom + 10;
      if (top + maxHeight > window.innerHeight - 8) {
        top = Math.max(8, rect.top - 10 - Math.min(maxHeight, window.innerHeight - 8));
      }

      setPosition({ top, left, width });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, anchorRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      // La campana es el ancla del dropdown y vive FUERA de dropdownRef. Si se
      // cerrara aquí, su onClick (que alterna) vería isOpen=false y volvería a
      // abrir: el menú quedaba imposible de cerrar pulsando la campana.
      if (anchorRef.current && anchorRef.current.contains(target)) return;
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const recent = [...notifications]
    .filter((n) => {
      const created = new Date(n.createdAt).getTime();
      return !isNaN(created) && created >= subDays(new Date(), recentDays).getTime();
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxItems);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          role="dialog"
          aria-label="Notificaciones"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ top: position.top, left: position.left, width: position.width }}
          className="fixed z-50 overflow-hidden rounded-xl border border-honey/40 bg-ink shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-line bg-pane px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-display text-sm font-bold text-cream truncate">
                Notificaciones
              </h3>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[10px] font-bold text-ink">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-husk transition-colors hover:bg-pane2 hover:text-cream"
              aria-label="Cerrar notificaciones"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>

          {/* Lista */}
          <div className="max-h-[400px] overflow-y-auto">
            {recent.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-husk">No hay notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-line/60">
                {recent.map((notification) => {
                  const emoji = getNotificationEmoji(notification);
                  const color = getNotificationColor(notification);
                  return (
                    <button
                      key={notification.id}
                      onClick={() => {
                        onMarkAsRead?.(notification.id);
                        onNotificationClick?.(notification);
                        onClose();
                      }}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-pane2 ${
                        !notification.read ? 'bg-honey/[0.04]' : ''
                      }`}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                        style={{ backgroundColor: `${color}1c` }}
                      >
                        {emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-xs font-semibold ${
                            notification.read ? 'text-husk' : 'text-cream'
                          }`}
                        >
                          {notification.title}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[11px] text-husk/80">
                          {notification.description}
                        </span>
                        <span className="mt-1 block font-mono text-[10px] text-husk/60">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </span>
                      {!notification.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-honey" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-line bg-pane px-3 py-2.5">
            {onViewAll && (
              <button
                onClick={() => {
                  onViewAll();
                  onClose();
                }}
                className="w-full rounded-lg px-3 py-2 text-center text-xs font-medium text-husk transition-colors hover:bg-pane2 hover:text-cream"
              >
                Ver todas
              </button>
            )}
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-husk transition-colors hover:bg-pane2 hover:text-cream"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Marcar todas como leídas
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}