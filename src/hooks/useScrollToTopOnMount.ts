// ============================================================
// RESET DE SCROLL AL MONTAR UNA RUTA
// ============================================================
// En una SPA, el navegador NO reinicia el scroll al cambiar de ruta: la
// página nueva hereda la posición de la anterior. En rutas largas (Catálogo,
// Pedidos) eso significa entrar con la cabecera fuera de pantalla y caer
// directamente dentro de la vista previa o de la lista.
//
// Son cuatro cosas y las cuatro importan:
//
// 1. `scrollRestoration: 'manual'`. Por defecto el Chrome/Edge guarda la
//    posición de scroll por entrada del historial y la restituye al volver
//    atrás con el botón "Atrás", aunque la SPA ya haya pedido el tope.
// 2. `useLayoutEffect` en lugar de `useEffect`. El efecto normal corre DESPUÉS
//    del pintado: hay un frame en el que la vista ya se ve desplazada, y el
//    scroll anchoring puede volver a empujarla cuando las imágenes cargan.
// 3. Anular `scroll-behavior: smooth`. Viene global en `html` (index.css), así
//    que un `window.scrollTo(0, 0)` a secas se ANIMA: el usuario ve la página
//    bajando hasta arriba en vez de aparecer ya en el título.
// 4. Reafirmar el tope en el frame siguiente. Las miniaturas de producto y las
//    filas del historial adjustan la altura al cargar y desplazan el ancla.
//
// No bloquea el scroll del usuario: sólo actúa al montar y en el frame
// siguiente. A partir de ahí la rueda funciona con normalidad.

import { useLayoutEffect } from 'react';

export function useScrollToTopOnMount(): void {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const scrollBehaviorPrevio = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';

    const alTope = () => window.scrollTo(0, 0);
    alTope();
    const raf = requestAnimationFrame(alTope);

    const scrollRestorationPrevio =
      'scrollRestoration' in window.history ? window.history.scrollRestoration : null;
    if (scrollRestorationPrevio !== null) {
      window.history.scrollRestoration = 'manual';
    }

    return () => {
      cancelAnimationFrame(raf);
      html.style.scrollBehavior = scrollBehaviorPrevio;
      if (scrollRestorationPrevio !== null) {
        window.history.scrollRestoration = scrollRestorationPrevio;
      }
    };
  }, []);
}
