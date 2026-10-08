import type { Transition, Variants } from 'framer-motion';

/* ---------------------------------------------------------------------------
   Sistema de transiciones uniforme — ver TRANSICIONES-FLUIDAS.md
   - Entrada: 200ms · Salida: 160ms · easing cúbico con overshoot suave
   - Nada > 300ms en paneles / modales
   --------------------------------------------------------------------------- */

export const EASE = [0.22, 1, 0.36, 1] as const;
export const DUR_IN = 0.2;
export const DUR_OUT = 0.16;
export const DUR_DRAWER_IN = 0.24;
export const DUR_DRAWER_OUT = 0.2;

/* Duración del panel de detalle (CSS .detalle-panel / .anim-in-sm / .closing)
   Entrada 200ms · crossfade de contenido 160ms · salida 140ms
   El desmontaje espera al final del cierre del accordion (200ms) para que el
   espacio de abajo suba suave, sin saltos de layout. */
export const DETAIL_IN_MS = 200;
export const DETAIL_SWAP_MS = 160;
export const DETAIL_OUT_MS = 140;
export const DETAIL_UNMOUNT_MS = 200;

export const tIn: Transition = { duration: DUR_IN, ease: EASE };
export const tOut: Transition = { duration: DUR_OUT, ease: EASE };

/* Fondo oscuro de cualquier modal / drawer */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: tIn },
  exit: { opacity: 0, transition: tOut },
};

/* Tarjeta de modal estándar: escala + deslizamiento */
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: tIn },
  exit: { opacity: 0, scale: 0.96, y: 12, transition: tOut },
};

/* Lightbox de fotos: fondo casi opaco + imagen */
export const lightboxVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: tIn },
  exit: { opacity: 0, transition: tOut },
};

export const lightboxImageVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: tIn },
  exit: { opacity: 0, scale: 0.9, transition: tOut },
};

/* Toast in / out: fade-in + slide-up suave, fade-out sin saltos laterales */
export const toastVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: tIn },
  exit: { opacity: 0, y: 8, scale: 0.97, transition: tOut },
};

/* Drawer lateral del menú: entrada 240ms, salida 200ms */
export const drawerVariants: Variants = {
  hidden: { x: '100%', transition: { duration: DUR_DRAWER_OUT, ease: EASE } },
  visible: { x: 0, transition: { duration: DUR_DRAWER_IN, ease: EASE } },
  exit: { x: '100%', transition: { duration: DUR_DRAWER_OUT, ease: EASE } },
};

/* Pestaña / barra que sube desde abajo (modales en móvil) */
export const sheetVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 24, transition: tIn },
  visible: { opacity: 1, scale: 1, y: 0, transition: tIn },
  exit: { opacity: 0, scale: 0.96, y: 24, transition: tOut },
};

/* ---------------------------------------------------------------------------
   Resortes iOS. Valores verificados, no estimados:

   ζ = damping / (2·√(stiffness·mass))   → razón de amortiguamiento
   overshoot ≈ exp(-πζ/√(1-ζ²))          → cuánto se pasa del punto de reposo

   400/30/0.6 → ζ=0.968, overshoot 0.00 %, asentamiento ≈ 212 ms

   Al ser tan amortiguado se puede usar también sobre bloques de contenido
   grandes sin que se lea como un temblor. El riesgo está en los springs
   blandos (stiffness < 200), que sí producen un rebote visible sobre una
   superficie alta: no se relajan sin volver a medir.
   --------------------------------------------------------------------------- */

/* Pulsación del menú lateral: asentamiento 212 ms, que es lo que hace que el
   micro-feedback responda en el mismo frame en que se levanta el dedo. */
export const SPRING_TAP = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 0.6,
} as const;

/* Escala de la pulsación. iOS usa ~0.96 en listas y barras; bajar más (0.9) se
   percibe como "salta" y desconecta el dedo del elemento. */
export const TAP_SCALE = 0.96;
