import { motion } from 'framer-motion';
import { IconPanel, IconHex, IconDrop, IconClipboard, IconCheck, IconChart } from '../ui';

import { IconCalendar } from '../ui';

const NAV_ITEMS = [
  { id: 'panel', label: 'Panel', icon: IconPanel },
  { id: 'colmenas', label: 'Colmenas', icon: IconHex },
  { id: 'estadisticas', label: 'Estadísticas', icon: IconChart },
  { id: 'calendario', label: 'Calendario', icon: IconCalendar },
  { id: 'produccion', label: 'Cosecha', icon: IconDrop },
  { id: 'registro', label: 'Cuaderno', icon: IconClipboard },
  { id: 'tareas', label: 'Tareas', icon: IconCheck },
];

interface BottomNavProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

export function BottomNav({ activeSection, onNavigate }: BottomNavProps) {
  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-pane/95 backdrop-blur-md border-t border-line lg:hidden"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] rounded-xl transition-colors ${
                isActive ? 'text-honey' : 'text-husk hover:text-cream'
              }`}
              whileTap={{ scale: 0.9 }}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute inset-0 bg-honey/10 rounded-xl"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className="h-5 w-5 relative z-10" />
              <span className="text-[10px] font-medium relative z-10">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}
