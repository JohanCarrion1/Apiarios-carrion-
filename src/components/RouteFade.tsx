import type { ReactNode } from 'react';

/**
 * Envoltura de transición para el contenido de cada ruta.
 *
 * El problema que resuelve: entre una página y otra el router desmontaba la
 * vista anterior y montaba la nueva de golpe. Si la nueva necesita resolver
 * algo (chunk lazy, datos), el hueco se pintaba como fondo vacío — un flash
 * blanco o negro — o como un loader a pantalla completa con el logo.
 *
 * Aquí no hay loader, logo ni texto: solo un fundido de entrada muy corto
 * (opacity 0 → 1) sobre el fondo del tema (--color-ink). La animación es
 * exclusivamente de opacidad, así que no provoca reflow ni desplaza el layout,
 * y termina antes de que el usuario llegue a interactuar.
 *
 * Dos detalles que importan y que conviene no romper:
 *
 * 1. Solo opacidad, NUNCA transform. Animar `transform` (o poner `will-change`)
 *    convierte al elemento en containing block y sus descendientes
 *    `position: fixed` —cabecera, modales, toasts— dejan de anclarse al
 *    viewport y saltan durante el fundido.
 *
 * 2. Se monta DENTRO de los gates que bloquean (DataHydrationGate). Si el
 *    fundido envolviera al gate, animaría el skeleton y la pantalla real
 *    aparecería de golpe al terminar la hidratación, que es justo el tirón que
 *    se quiere evitar.
 *
 * No lleva `key` a propósito: al compartir tipo de nodo entre renders, un
 * cambio de parámetro dentro de la MISMA ruta (p. ej. /dashboard/a → /dashboard/b)
 * conserva el estado del componente hijo en lugar de remontarlo desde cero.
 * El fundido se dispara al montarse la envoltura, es decir, al cambiar de
 * pantalla.
 */
export default function RouteFade({ children }: { children: ReactNode }) {
  return <div className="route-fade">{children}</div>;
}