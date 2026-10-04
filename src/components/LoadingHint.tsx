import { Loader2 } from 'lucide-react';

interface LoadingHintProps {
  /**
   * `true` (por defecto) ocupa la pantalla: es el caso de una espera de ruta,
   * donde no hay nada que pintar detrás. `false` deja un hueco alto y acotado
   * para esperas dentro de una sección ya montada.
   */
  fullScreen?: boolean;
  /** Solo para lectores de pantalla; el indicador es deliberadamente mudo. */
  label?: string;
}

/**
 * Indicador de carga mínimo.
 *
 * Sustituye a los skeletons de bloques grises (`SectionSkeleton`) que se
 * mostraban entre el logo "CARGANDO..." y el contenido real. El problema de
 * esos placeholders no era solo estético: al entrar al dashboard se veían tres
 * capas sucesivas de rectángulos (hidratación, descarga del chunk de la ruta y
 * la del chunk de la sección) y el usuario llegaba a la pantalla real tras
 * pasar por un estado intermedio que parecía otra pantalla. Además ocupaban
 * toda la superficie, así que bloqueaban la vista en lugar de solo informar de
 * que algo está llegando.
 *
 * Aquí solo hay un spinner pequeño, en el mismo centro que el logo del loader
 * inicial y sobre el mismo fondo `bg-ink`. Como el fondo no cambia, la
 * secuencia logo → spinner → contenido se percibe como un único paso continuo
 * en lugar de tres.
 *
 * El texto se oculta visualmente pero se anuncia: `role="status"` hace que un
 * lector de pantalla sepa que la vista se está preparando.
 */
export default function LoadingHint({
  fullScreen = true,
  label = 'Cargando contenido',
}: LoadingHintProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={
        fullScreen
          ? 'flex min-h-screen items-center justify-center bg-ink'
          : 'flex min-h-[40vh] items-center justify-center py-16'
      }
    >
      <Loader2 className="h-5 w-5 animate-spin text-honey/70" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}