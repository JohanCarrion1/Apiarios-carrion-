import { Loader2 } from 'lucide-react';
import LoadingScreen from './LoadingScreen';

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
 * Indicador de carga.
 *
 * A pantalla completa NO pinta un spinner suelto: pinta exactamente lo mismo
 * que la pantalla de arranque (logo respirando + "Cargando...") vía
 * `LoadingScreen`. Antes la secuencia era logo → spinner → contenido, es
 * decir DOS pantallas de carga distintas seguidas; con lo mismo en las dos
 * etapas el fondo, el logo y el rótulo nunca cambian y el arranque se lee
 * como una sola espera continua.
 *
 * `fullScreen={false}` sí se queda con el spinner diminuto: es el caso de
 * cambiar de pestaña dentro del dashboard, donde el header y el menú ya están
 * pintados y un takeover a pantalla completa reintroduciría el salto de
 * pantalla que se eliminó al cambiar de sección.
 */
export default function LoadingHint({
  fullScreen = true,
  label = 'Cargando contenido',
}: LoadingHintProps) {
  if (fullScreen) {
    return (
      <div role="status" aria-busy="true" className="flex min-h-screen items-center justify-center bg-ink">
        <LoadingScreen size="lg" label="Cargando..." />
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      className="flex min-h-[40vh] items-center justify-center py-16"
    >
      <Loader2 className="h-5 w-5 animate-spin text-honey/70" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
