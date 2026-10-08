import { motion } from 'framer-motion';
import { useId, type ReactNode } from 'react';
import { DUR_IN, EASE } from '../lib/motion';

/**
 * Pestañas / chips con indicador deslizante reutilizable.
 *
 * El "pill" activo es un único `motion.span` con `layoutId` compartido: al
 * cambiar de pestaña, Framer Motion interpola su posición y tamaño entre el
 * botón anterior y el nuevo (misma técnica que `BottomNav`). El texto de cada
 * chip hace la transición de color por CSS (`transition-colors`).
 *
 * La duración/easing son los del sistema de motion del proyecto
 * (`DUR_IN` + `EASE`), los mismos que usa la Tienda.
 */
export interface AnimatedTabItem<T extends string> {
  key: T;
  /** Texto para accesibilidad cuando el render interno es complejo. */
  label: string;
}

interface AnimatedTabsProps<T extends string> {
  items: AnimatedTabItem<T>[];
  value: T | null;
  onChange: (key: T) => void;
  renderTab: (item: AnimatedTabItem<T>, active: boolean) => ReactNode;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: (active: boolean) => string;
  contentClassName?: string;
  pillClassName?: string;
  hoverScale?: number;
}

const DEFAULT_BUTTON =
  'relative flex w-auto items-center whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wide transition-colors duration-200';

const defaultButtonClass = (active: boolean) =>
  `${DEFAULT_BUTTON} ${
    active
      ? 'border-transparent text-ink'
      : 'border-line bg-pane text-husk hover:border-honey/60 hover:text-cream'
  }`;

export default function AnimatedTabs<T extends string>({
  items,
  value,
  onChange,
  renderTab,
  ariaLabel,
  className = 'flex flex-wrap items-center gap-1.5',
  buttonClassName = defaultButtonClass,
  contentClassName = 'relative z-10 flex w-auto items-center gap-1.5',
  pillClassName = 'border border-honey bg-honey shadow-[0_0_20px_rgba(240,164,28,.4)]',
  hoverScale = 1,
}: AnimatedTabsProps<T>) {
  // `useId` mantiene el layoutId único por instancia: Colmenas y Núcleos
  // montan dos grids a la vez y sus indicadores no deben "saltar" entre sí.
  const uid = useId();

  return (
    <div role="tablist" aria-label={ariaLabel} className={className}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <motion.button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            whileHover={hoverScale > 1 ? { scale: hoverScale } : undefined}
            whileTap={{ scale: 0.95 }}
            className={buttonClassName(active)}
          >
            {active && (
              <motion.span
                layoutId={`animated-tabs-${uid}`}
                className={`absolute inset-0 rounded-full ${pillClassName}`}
                initial={false}
                transition={{ duration: DUR_IN, ease: EASE }}
                aria-hidden="true"
              />
            )}
            <span className={contentClassName}>{renderTab(item, active)}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
