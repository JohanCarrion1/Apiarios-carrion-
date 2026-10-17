import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * Dimensiona el panal (colmenas, núcleos, fecundadores) con el ANCHO REAL del
 * recuadro que lo contiene, no con breakpoints del viewport.
 *
 * Antes el ancho del hexágono salía de `100vw - constante` y el nº de columnas
 * de tres tramos fijos (6/9/11). Esas constantes suponían el padding del
 * <main>; en cuanto cambiaba el padding o el usuario ampliaba el zoom, las
 * filas se salían del recuadro y las celdas del borde quedaban cortadas.
 * Midiendo el contenedor (ResizeObserver) siempre caben: se elige cuántas
 * columnas entran con un lado mínimo legible y el hexágono se reparte el resto.
 *
 * Fija --hex-count / --hex-gaps / --hex-gap / --hex-w en el propio elemento;
 * el resto del layout (alto, offset de filas, solape) sigue en index.css.
 */
export function useHexGrid<T extends HTMLElement = HTMLDivElement>() {
  const elRef = useRef<T | null>(null);
  const [cols, setCols] = useState({ even: 6, odd: 5 });

  const measure = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const inner = el.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0');
    if (inner <= 0) return;

    // Columnas por fila: 20 en PC (inner >= 1000 px), 12 en tablet / celular en
    // modo escritorio, ~6 en celular (celdas grandes y legibles).
    const gap = inner < 520 ? 3 : inner < 1000 ? 6 : 5;
    const cap = inner < 760 ? 96 : 110;
    const target = inner >= 1000 ? 20 : inner >= 760 ? 12 : 6;
    const n = Math.max(3, Math.min(target, Math.floor((inner + gap) / (28 + gap))));
    const w = Math.min(cap, Math.floor(((inner - (n - 1) * gap) / n) * 100) / 100);

    el.style.setProperty('--hex-count', String(n));
    el.style.setProperty('--hex-gaps', String(n - 1));
    el.style.setProperty('--hex-gap', `${gap}px`);
    el.style.setProperty('--hex-w', `${w}px`);
    setCols((prev) => (prev.even === n ? prev : { even: n, odd: n - 1 }));
  }, []);

  const ref = useCallback(
    (node: T | null) => {
      elRef.current = node;
      if (node) measure();
    },
    [measure]
  );

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return { ref, cols };
}
