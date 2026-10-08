import { IconPlus } from '../ui';

interface ShowMoreButtonProps {
  /** Elementos renderizados hasta ahora. */
  shown: number;
  /** Total de elementos tras aplicar búsqueda y filtros. */
  total: number;
  /** Muestra el siguiente bloque (suma `step` a lo mostrado). */
  onClick: () => void;
  label?: string;
}

/**
 * Botón "Cargar más" de la paginación progresiva.
 *
 * OPTIMIZACIÓN (paginación): las rejillas hexagonales montaban TODAS las
 * colmenas/núcleos/fecundadores de golpe. Cada celda es un `motion.div` con su
 * propio estado de animación, así que con listas largas el coste de render y
 * de memoria en móvil crece de forma innecesaria: solo se ve una fracción. La
 * lista completa sigue en memoria (los filtros y los contadores siguen usando
 * el total real); lo que se pagina es lo que se PINTA, cargando el siguiente
 * bloque bajo demanda. Es paginación de render, no de red: en este modelo los
 * datos llegan en el documento del apiario (`items: [...]`), por lo que
 * `limit()`/`startAfter()` de Firestore no aplican sin cambiar el esquema.
 */
export default function ShowMoreButton({
  shown,
  total,
  onClick,
  label = 'Cargar más',
}: ShowMoreButtonProps) {
  if (shown >= total) return null;
  const restantes = total - shown;
  return (
    <div className="mt-4 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}. Quedan ${restantes} por mostrar`}
        className="flex items-center gap-2 rounded-full border border-honey/50 bg-pane px-5 py-2 font-mono text-xs font-bold uppercase tracking-wide text-honey transition-all duration-200 hover:border-honey hover:bg-honey/10"
      >
        <IconPlus className="h-4 w-4" />
        {label}
        <span className="rounded-full bg-honey/15 px-1.5 py-0.5 text-[9px] leading-none">
          {shown}/{total}
        </span>
      </button>
    </div>
  );
}
