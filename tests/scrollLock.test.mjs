/**
 * TESTS DEL BLOQUEO DE SCROLL (`src/hooks/scrollLockCore.ts`).
 *
 * Por qué existen: este es el mecanismo que puede dejar el documento con
 * `overflow: hidden` pegado, es decir el "scroll no funciona" que se reporta
 * en pantallas que scrollean por el documento como /seleccionar. No se puede
 * reproducir fácilmente en navegador (hace falta una interacción real con dos
 * overlays a la vez y orden de desmontaje concreto), así que aquí se simula
 * exactamente ese escenario contra el código real.
 *
 * El caso crítico es "dos bloqueos solapados": con la versión antigua, que
 * guardaba los estilos previos POR INSTANCIA, cada lock archivaba como
 * "prev" el estado que el otro ya había alterado ('hidden' en vez de ''), y
 * según el orden de los cleanups el documento quedaba bloqueado para siempre.
 *
 * Cómo se ejecuta:  npm run test:scroll
 *
 * No hace falta jsdom ni navegador: el core solo toca `document`, `window` y
 * variables de módulo, así que se le inyecta un DOM de mentira. El módulo se
 * compila con esbuild y se importa con una URL distinta por test para que
 * cada test empiece con el contador de bloqueos a cero.
 */

import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const rutaCore = new URL('../src/hooks/scrollLockCore.ts', import.meta.url);

let instancias = 0;

/** Compila el core y devuelve una INSTANCIA NUEVA de módulo (estado a cero). */
async function cargarCore() {
  const ts = readFileSync(rutaCore, 'utf8');
  const { code } = transformSync(ts, {
    loader: 'ts',
    format: 'esm',
    target: 'es2022',
    sourcefile: 'scrollLockCore.ts',
  });
  instancias += 1;
  const fuente = `// instancia ${instancias}\n${code}`;
  return import('data:text/javascript,' + encodeURIComponent(fuente));
}

/**
 * Estilos inline con el comportamiento del DOM real: leer una propiedad no
 * fijada devuelve `''`, no `undefined`. Sin esto los tests de "quedó limpio"
 * fallarían por la diferencia entre `''` y `undefined` y no probarían nada.
 */
function estiloDom() {
  return new Proxy(
    {},
    {
      get: (obj, clave) => (clave in obj ? obj[clave] : ''),
      set: (obj, clave, valor) => {
        obj[clave] = valor;
        return true;
      },
    },
  );
}

/**
 * DOM de mentira. `clientWidth` es el ancho del viewport SIN barra de scroll
 * y `innerWidth` el total: la diferencia es el gutter que el core compensa.
 */
function instalarDom({ scrollY = 0, innerWidth = 1000, clientWidth = 1000 } = {}) {
  const html = { style: estiloDom(), clientWidth };
  const body = { style: estiloDom() };
  const scrolls = [];
  globalThis.document = { documentElement: html, body };
  globalThis.window = {
    scrollY,
    innerWidth,
    scrollTo: (x, y) => scrolls.push({ x, y }),
  };
  return { html, body, scrolls };
}

afterEach(() => {
  delete globalThis.document;
  delete globalThis.window;
});

describe('scrollLockCore', () => {
  test('un solo bloqueo congela el fondo y lo restaura con su scroll', async () => {
    const core = await cargarCore();
    const dom = instalarDom({ scrollY: 123 });

    const liberar = core.adquirirScrollLock();

    assert.equal(core.scrollLocksActivos(), 1, 'debe contar un bloqueo activo');
    assert.equal(dom.html.style.overflow, 'hidden');
    assert.equal(dom.body.style.overflow, 'hidden');
    assert.equal(dom.scrolls.length, 0, 'no debe mover el scroll al abrir');

    liberar();

    assert.equal(core.scrollLocksActivos(), 0);
    assert.equal(dom.html.style.overflow, '', 'html debe quedar limpio');
    assert.equal(dom.body.style.overflow, '', 'body debe quedar limpio');
    assert.deepEqual(dom.scrolls, [{ x: 0, y: 123 }], 'debe volver al scroll original');
  });

  test('compensa el gutter de la barra de scroll y lo devuelve', async () => {
    const core = await cargarCore();
    const dom = instalarDom({ innerWidth: 1040, clientWidth: 1000 });

    const liberar = core.adquirirScrollLock();
    assert.equal(dom.body.style.paddingRight, '40px', 'debe compensar la barra');

    liberar();
    assert.equal(dom.body.style.paddingRight, '', 'debe devolver el padding previo');
  });

  test('el guardado previo sobrevive a un overflow heredado no vacío', async () => {
    const core = await cargarCore();
    const dom = instalarDom();
    // Caso de partida con estilos ya puestos por CSS en línea.
    dom.html.style.overflow = 'clip';
    dom.body.style.overflow = 'visible';

    const liberar = core.adquirirScrollLock();
    assert.equal(dom.html.style.overflow, 'hidden');

    liberar();
    assert.equal(dom.html.style.overflow, 'clip', 'debe restaurar el valor heredado');
    assert.equal(dom.body.style.overflow, 'visible');
  });

  describe('dos bloqueos solapados (el bug del scroll congelado)', () => {
    test('limpiando primero el que se abrió primero', async () => {
      const core = await cargarCore();
      const dom = instalarDom();

      const primero = core.adquirirScrollLock();
      const segundo = core.adquirirScrollLock();
      assert.equal(core.scrollLocksActivos(), 2);

      primero();
      assert.equal(dom.html.style.overflow, 'hidden', 'sigue habiendo uno activo');

      segundo();
      assert.equal(core.scrollLocksActivos(), 0);
      assert.equal(
        dom.html.style.overflow,
        '',
        'con el orden FIFO el documento debe quedar DESBLOQUEADO: si da "hidden" es que se reintrodujo el guardado de estilos por instancia',
      );
      assert.equal(dom.body.style.overflow, '');
    });

    test('limpiando primero el que se abrió último (orden inverso)', async () => {
      const core = await cargarCore();
      const dom = instalarDom();

      const primero = core.adquirirScrollLock();
      const segundo = core.adquirirScrollLock();

      segundo();
      assert.equal(dom.html.style.overflow, 'hidden', 'el primero sigue bloqueando');

      primero();
      assert.equal(dom.html.style.overflow, '', 'el orden de limpieza no debe importar');
      assert.equal(dom.body.style.overflow, '');
      assert.equal(core.scrollLocksActivos(), 0);
    });

    test('tres bloqueos anidados se liberan solo cuando el último sale', async () => {
      const core = await cargarCore();
      const dom = instalarDom();

      const a = core.adquirirScrollLock();
      const b = core.adquirirScrollLock();
      const c = core.adquirirScrollLock();
      assert.equal(core.scrollLocksActivos(), 3);

      a();
      b();
      assert.equal(dom.html.style.overflow, 'hidden', 'aún queda uno activo');
      assert.equal(core.scrollLocksActivos(), 1);

      c();
      assert.equal(dom.html.style.overflow, '');
      assert.equal(core.scrollLocksActivos(), 0);
    });
  });

  test('un cleanup repetido no deja el contador en negativo', async () => {
    const core = await cargarCore();
    const dom = instalarDom();

    const liberar = core.adquirirScrollLock();
    liberar();
    assert.doesNotThrow(() => liberar(), 'el cleanup debe ser idempotente');
    assert.equal(core.scrollLocksActivos(), 0, 'jamás debe quedar en negativo');
    assert.equal(dom.html.style.overflow, '');

    // Si el contador hubiera quedado en -1, este segundo bloqueo creería que
    // ya había uno activo y NO capturaría el estado previo: nunca se
    // restauraría. Por eso el test sigue comprobando un ciclo completo.
    const otro = core.adquirirScrollLock();
    assert.equal(dom.html.style.overflow, 'hidden');
    otro();
    assert.equal(dom.html.style.overflow, '', 'los ciclos posteriores deben seguir funcionando');
    assert.equal(core.scrollLocksActivos(), 0);
  });

  test('nunca se registra un bloqueo sin liberación si el caller no la usa', async () => {
    const core = await cargarCore();
    instalarDom();
    // Un effect que se desmonta sin ejecutar cleanup no debería ser posible,
    // pero si lo fuera el contador se quedaría alto y el barrido nunca actuaría.
    core.adquirirScrollLock();
    assert.equal(core.scrollLocksActivos(), 1);
  });

  describe('barrerLockesHuerfanos', () => {
    test('limpia el overflow residual cuando nadie tiene el bloqueo', async () => {
      const core = await cargarCore();
      const dom = instalarDom();
      // Resto de un overlay desmontado sin cleanup.
      dom.html.style.overflow = 'hidden';
      dom.body.style.overflow = 'hidden';
      dom.body.style.paddingRight = '40px';

      core.barrerLockesHuerfanos();

      assert.equal(dom.html.style.overflow, '');
      assert.equal(dom.body.style.overflow, '');
      assert.equal(dom.body.style.paddingRight, '');
    });

    test('NO toca nada si hay un bloqueo legítimamente activo', async () => {
      const core = await cargarCore();
      const dom = instalarDom();

      const liberar = core.adquirirScrollLock();
      core.barrerLockesHuerfanos();

      assert.equal(dom.html.style.overflow, 'hidden', 'no debe desbloquear un modal abierto');
      assert.equal(dom.body.style.overflow, 'hidden');

      liberar();
      assert.equal(dom.html.style.overflow, '');
    });

    test('es inocuo cuando todo está limpio', async () => {
      const core = await cargarCore();
      const dom = instalarDom();
      assert.doesNotThrow(() => core.barrerLockesHuerfanos());
      assert.equal(dom.html.style.overflow, '');
      assert.equal(core.scrollLocksActivos(), 0);
    });
  });
});
