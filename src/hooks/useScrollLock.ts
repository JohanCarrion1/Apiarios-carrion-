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
 *  - Al cerrar: se restaura el scroll exacto (con smooth desactivado)
 *    antes de devolver la barra, para que el regreso sea instantáneo.
 *
 * REENTRANTE (contador de referencias)
 * ------------------------------------
 * Se permite que varios componentes tengan el bloqueo activo a la vez, que es
 * lo normal en esta app: una sección con su confirmación abierta (p. ej.
 * FecundadoresSection con `promoteId`) y encima un overlay que también lo
 * pide (FecundadorForm o FecundadorDetail con `showMoveModal`).
 *
 * La versión anterior guardaba `prevHtml`/`prevBody` POR INSTANCIA. Con dos
 * locks solapados eso se corrompía: cada uno guardaba como "prev" el estado
 * que el otro ya había alterado ('hidden' en vez de ''), así que según el
 * orden de los cleanups el documento podía desbloquearse mientras aún había
 * un modal abierto, o quedar con `overflow: hidden` PERMANENTEMENTE. Ese
 * segundo caso es exactamente lo que se percibe como "el scroll dejó de
 * funcionar".
 *
 * Ahora el estado de partida se captura SOLO con el primer lock y se restaura
 * SOLO con el último. Entre medias el contador sube y baja, sin tocar nada.
 */
let locks = 0;

type Snapshot = {
  scrollY: number;
  htmlOverflow: string;
  htmlScrollBehavior: string;
  bodyOverflow: string;
  bodyPaddingRight: string;
};

/** Estado capturado ANTES del primer lock. null = no hay bloqueo activo. */
let snapshot: Snapshot | null = null;

/**
 * Nº de componentes que tienen el bloqueo activo ahora mismo.
 *
 * 0 significa que NADIE lo pidió: cualquier `overflow: hidden` inline que
 * siga en <html>/<body> es un resto huérfano de un overlay ya desmontado y
 * hay que barrerlo. Sirve de red de seguridad para rutas que no saben
 * desconfiar (ver `useScrollToTopOnMount`).
 */
export function scrollLocksActivos(): number {
  return locks;
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const body = document.body;

    if (locks === 0) {
      snapshot = {
        // Posición en la que debe congelarse (y a la que debe volver).
        scrollY: window.scrollY,
        htmlOverflow: html.style.overflow,
        htmlScrollBehavior: html.style.scrollBehavior,
        bodyOverflow: body.style.overflow,
        bodyPaddingRight: body.style.paddingRight,
      };

      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';

      // Ancho de la barra de scroll: compensarlo mientras está oculta evita
      // el salto horizontal del contenido.
      const gutter = window.innerWidth - html.clientWidth;
      if (gutter > 0) {
        body.style.paddingRight = `${gutter}px`;
      }
    }

    locks += 1;

    return () => {
      // Defensa: un cleanup desbalanceado no puede llevar el contador a
      // negativo, porque eso "activaría" un lock que no existe y el siguiente
      // restauraría con lo que haya colgado.
      if (locks === 0) return;
      locks -= 1;

      // Sigue habiendo otro componente con el bloqueo: no restaurar nada.
      if (locks > 0) return;

      const prev = snapshot;
      snapshot = null;
      if (!prev) return;

      // Devolver la barra y desbloquear el scroll antes de scrollTo: con
      // overflow:hidden el navegador no deja scrollear, hay que restaurar
      // primero para poder volver a la posición guardada.
      html.style.overflow = prev.htmlOverflow;
      html.style.scrollBehavior = prev.htmlScrollBehavior;
      body.style.overflow = prev.bodyOverflow;
      body.style.paddingRight = prev.bodyPaddingRight;

      // Scroll suave desactivado: el regreso debe ser un salto exacto,
      // nunca una animación (html global trae scroll-behavior: smooth).
      html.style.scrollBehavior = 'auto';
      window.scrollTo(0, prev.scrollY);
      html.style.scrollBehavior = prev.htmlScrollBehavior || '';
    };
  }, [active]);
}
