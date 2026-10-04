// ============================================================
// TESTS DE REGLAS DE STORAGE
// ============================================================
// Los comprobantes de Yape son lo más delicado: los sube el cliente en su
// propio flujo de pago, así que las reglas son la única barrera contra subir
// archivos arbitrarios o gigantes.

import { test, before, after, describe } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { BUCKET, crearEntorno, como, comoAnonimo } from './helpers.mjs';

let entorno;
const CARRIL = 'PED-001';
const USUARIO = { uid: 'uid-a', email: 'ana@correo.com' };

before(async () => {
  entorno = await crearEntorno();
});
after(async () => {
  await entorno.cleanup();
});

/** Blob en memoria del tamaño y mime pedidos. */
function archivo(bytes, type) {
  return new Blob([new Uint8Array(bytes)], { type });
}

const jpg = () => archivo(2048, 'image/jpeg');
const png = () => archivo(2048, 'image/png');
const webp = () => archivo(2048, 'image/webp');
const deDosMBMasUno = () => archivo(2 * 1024 * 1024 + 1, 'image/jpeg');

/**
 * Referencia dentro del bucket del contexto indicado.
 *
 * OJO: la forma que funciona con rules-unit-testing es `ctx.storage(bucket)
 * .ref(path)`. Las variantes del espacio de nombres (`firebase.storage()
 * .ref(ctx.storage(...), path)`) revientan con "childPath.split is not a
 * function" en esta versión del SDK.
 */
function refDe(contexto, ruta) {
  return contexto.storage(BUCKET).ref(ruta);
}

/** Sube saltándose las reglas (para preparar casos de lectura/borrado). */
function sembrarArchivo(ruta, blob, contentType) {
  return entorno.withSecurityRulesDisabled((ctx) =>
    ctx.storage(BUCKET).ref(ruta).put(blob, { contentType })
  );
}

describe('comprobantes de pago', () => {
  test('un usuario firmado sube su comprobante en formato válido', async () => {
    const ctx = como(entorno, USUARIO);
    await assertSucceeds(refDe(ctx, `comprobantes/${CARRIL}/compra.jpg`).put(jpg(), { contentType: 'image/jpeg' }));
  });

  test('acepta PNG y WebP (los tres formatos que acepta el cliente)', async () => {
    const ctx = como(entorno, USUARIO);
    await assertSucceeds(refDe(ctx, `comprobantes/${CARRIL}/compra.png`).put(png(), { contentType: 'image/png' }));
    await assertSucceeds(refDe(ctx, `comprobantes/${CARRIL}/compra.webp`).put(webp(), { contentType: 'image/webp' }));
  });

  test('un anónimo NO sube comprobantes', async () => {
    await assertFails(
      refDe(comoAnonimo(entorno), `comprobantes/${CARRIL}/nope.jpg`).put(jpg(), { contentType: 'image/jpeg' })
    );
  });

  test('se rechaza un archivo que no es imagen', async () => {
    const ctx = como(entorno, USUARIO);
    await assertFails(
      refDe(ctx, `comprobantes/${CARRIL}/factura.pdf`).put(archivo(2048, 'application/pdf'), {
        contentType: 'application/pdf',
      })
    );
    await assertFails(
      refDe(ctx, `comprobantes/${CARRIL}/script.jpg`).put(archivo(64, 'application/javascript'), {
        contentType: 'application/javascript',
      })
    );
  });

  test('se rechaza un archivo de más de 2 MB', async () => {
    const ctx = como(entorno, USUARIO);
    await assertFails(
      refDe(ctx, `comprobantes/${CARRIL}/enorme.jpg`).put(deDosMBMasUno(), { contentType: 'image/jpeg' })
    );
  });

  test('NO se puede borrar un comprobante (evidencia de pago)', async () => {
    await sembrarArchivo(`comprobantes/${CARRIL}/borrable.jpg`, jpg(), 'image/jpeg');
    await assertFails(refDe(como(entorno, USUARIO), `comprobantes/${CARRIL}/borrable.jpg`).delete());
  });

  test('la lectura es pública (la URL lleva token de descarga)', async () => {
    await sembrarArchivo(`comprobantes/${CARRIL}/publico.jpg`, jpg(), 'image/jpeg');
    await assertSucceeds(
      refDe(comoAnonimo(entorno), `comprobantes/${CARRIL}/publico.jpg`).getDownloadURL()
    );
  });

  test('una ruta sin regla declarada queda cerrada', async () => {
    const ctx = como(entorno, USUARIO);
    await assertFails(
      refDe(ctx, `otra-carpeta/${CARRIL}/x.jpg`).put(jpg(), { contentType: 'image/jpeg' })
    );
  });
});
