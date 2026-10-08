/**
 * TESTS DEL CAMBIO DE SECCIÓN (`src/App.tsx` + `src/lib/motion.ts`).
 *
 * Por qué existen: el cambio de pestaña del dashboard se ha fijado como
 * DIRECTO, sin animación — como una app normal — después de dos intentos con
 * transiciones (deslizamiento lateral y descenso con sombra) que al usuario le
 * parecieron horribles. Aquí queda escrito para que no se reintroduzca otra
 * animación "mejor" sin que alguien decida explícitamente:
 *
 * 1. Las secciones son `<section>` normales, sin variants ni motion.
 * 2. No hay AnimatePresence rodeando el bloque de secciones (`popLayout`
 *    desapareció junto con la transición).
 * 3. `motion.ts` ya no exporta nada de transición de secciones: si vuelve a
 *    aparecer `sectionSlideVariants`, es que alguien la está montando.
 *
 * Cómo se ejecuta:  npm run test:motion
 *
 * No hace falta jsdom: son comprobaciones sobre el código fuente.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
const app = leer('../src/App.tsx');
const motionSrc = leer('../src/lib/motion.ts');

describe('cambio de sección directo, sin animación', () => {
  test('las secciones del dashboard son <section> normales', () => {
    assert.ok(!app.includes('<motion.section'), 'no debería haber <motion.section>');
    assert.ok(!app.includes('</motion.section>'), 'no debería haber </motion.section>');

    const secciones = app.match(/^ *<section$/gm) ?? [];
    assert.ok(secciones.length >= 11, `se esperaban 11 secciones, hay ${secciones.length}`);
  });

  test('sin variants de sección en App.tsx', () => {
    assert.ok(!app.includes('sectionSlideVariants'), 'no debería usar variants de sección');

    // El bloque de secciones va del comentario de cabecera hasta el footer:
    // ahí no debe haber ni variants ni animate/exit (fuera siguen los toasts).
    const inicio = app.indexOf('{/* Cambio de sección');
    const fin = app.indexOf('<motion.footer', inicio);
    assert.ok(inicio >= 0 && fin > inicio, 'no se encontró el bloque de secciones');
    const bloque = app.slice(inicio, fin);
    assert.ok(!bloque.includes('variants='), 'las secciones no deberían llevar variants');
    assert.ok(!bloque.includes('animate='), 'las secciones no deberían llevar animate');
    assert.ok(!bloque.includes('exit='), 'las secciones no deberían llevar exit');
  });

  test('sin AnimatePresence alrededor del bloque de secciones', () => {
    assert.ok(!app.includes('popLayout'), 'popLayout murió con la transición');
  });

  test('motion.ts ya no exporta nada de transición de secciones', () => {
    for (const prohibido of [
      'sectionSlideVariants',
      'EASE_PUSH',
      'DUR_SECTION',
      'BAJADA_NUEVA',
      'HUNDIMIENTO_VIEJA',
      'HOLD_SECTION',
    ]) {
      assert.ok(!motionSrc.includes(prohibido), `motion.ts no debería contener ${prohibido}`);
    }
  });

  test('el resto de animaciones de la app sigue intacto', () => {
    for (const presente of ['toastVariants', 'modalVariants', 'drawerVariants', 'sheetVariants']) {
      assert.ok(motionSrc.includes(`export const ${presente}`), `${presente} debería seguir exportado`);
      assert.ok(app.includes('AnimatePresence'), 'AnimatePresence sigue para modales y toasts');
    }
  });
});
