import { useEffect } from 'react';

/**
 * Congela el scroll del fondo (html + body) mientras `active` sea true.
 *
 * Estrategia: overflow:hidden en html Y body, SIN reposicionar el documento
 * (nada de body.position=fixed / top negativo). Así el fondo queda quieto en
 * la posición visual exacta, sin "brincos" al abrir ni al cerrar:
 *  - Al abrir: la página conserva su scroll natural (el navegador NO lo
 *    resetea), la barra de scroll se oculta y se compensa su anchura para
 *    que el contenido no se desplace ni un píxel a los lados.
 *  - Al cerrar: se restaura el scroll exacto (with smooth desactivado)
 *    antes de devolver la barra, para que el regreso sea instantáneo.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const body = document.body;

    // Posición en la que debe congelarse (y a la que debe volver).
    const scrollY = window.scrollY;
    // Ancho de la barra de scroll: compensarlo mientras está oculta evita
    // el salto horizontal del contenido.
    const gutter = window.innerWidth - html.clientWidth;

    const prevHtml = {
      overflow: html.style.overflow,
      scrollBehavior: html.style.scrollBehavior,
    };
    const prevBody = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (gutter > 0) {
      body.style.paddingRight = `${gutter}px`;
    }

    return () => {
      // Devolver la barra y desbloquear el scroll antes de scrollTo: con
      // overflow:hidden el navegador no deja scrollear, hay que restaurar
      // primero para poder volver a la posición guardada.
      Object.assign(html.style, prevHtml);
      Object.assign(body.style, prevBody);

      // Scroll suave desactivado: el regreso debe ser un salto exacto,
      // nunca una animación (html global trae scroll-behavior: smooth).
      html.style.scrollBehavior = 'auto';
      window.scrollTo(0, scrollY);
      html.style.scrollBehavior = prevHtml.scrollBehavior || '';
    };
  }, [active]);
}