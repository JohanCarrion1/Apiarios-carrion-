import { useEffect, useState } from 'react';

/**
 * Devuelve una copia del valor que solo se actualiza tras `delay` ms sin
 * cambios.
 *
 * OPTIMIZACIÓN (buscadores): antes cada pulsación del buscador re-evaluaba el
 * filtro sobre todo el array (y, con la paginación, reiniciaba la página). Con
 * 20+ colmenas por apiario no se nota, pero con listas largas cada tecla
 * disparaba un render completo de la rejilla hexagonal + framer-motion. La
 * caja de texto se mantiene reactiva en el momento (`value` no se ralentiza);
 * solo el filtrado usa el valor diferido.
 */
export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
