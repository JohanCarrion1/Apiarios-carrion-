/**
 * Hooks de animación para los bloques nuevos de la tienda.
 *
 * Se aíslan aquí porque son genéricos y no dependen de React state de la tienda.
 * `useCountUp` NO usa `whileInView` de Framer Motion a propósito: necesitamos
 * polling por frame para el número, y Framer solo puede animar valores que él
 * controla. Sí respeta `prefers-reduced-motion` (además del `MotionConfig
 * reducedMotion="user"` global), porque el contador es JS puro y Framer no lo
 * puede interrumpir.
 */
import { useEffect, useRef, useState } from 'react';

/** Marca el elemento como visible una sola vez (como `whileInView` + `once`). */
export function useInViewOnce<T extends HTMLElement = HTMLDivElement>(rootMargin = '-60px') {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Sin IntersectionObserver (o en SSR/tests) se muestra el valor final
    // directo: es preferible no animar a dejar el bloque en cero.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Cuenta de 0 a `target` con easing cúbico. Solo arranca cuando `active`
 * (típicamente `inView`), y salta al final si el usuario pidió menos movimiento.
 * `done` permite dejar de repintar cuando ya llegó al valor final.
 */
export function useCountUp(target: number, active: boolean, durationMs = 1500) {
  const [value, setValue] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;

    if (prefersReducedMotion() || durationMs <= 0) {
      setValue(target);
      setDone(true);
      return;
    }

    let raf = 0;
    const start =
      typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDone(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, durationMs]);

  return { value, done };
}