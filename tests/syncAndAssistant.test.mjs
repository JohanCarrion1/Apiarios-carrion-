/**
 * Pruebas de la lógica de sincronización (Firestore) y del Asistente IA.
 * Se empaquetan con esbuild (ya incluido con Vite) para importar los .ts.
 *   npm run test:sync
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
async function carga(entrada) {
  const out = join(mkdtempSync(join(tmpdir(), 'apiar-')), 'm.mjs');
  await build({ entryPoints: [join(root, entrada)], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent' });
  return import(out);
}

const { sinUndefined } = await carga('src/lib/firestoreSafe.ts');
const { prepararChatsParaNube, conservarFotosLocales } = await carga('src/lib/chatSync.ts');
const { interpretarRespuesta } = await carga('src/services/aiAssistant.ts');

test('sinUndefined elimina undefined anidados', () => {
  const r = sinUndefined({ a: 1, b: undefined, c: { d: undefined, e: [1, undefined] } });
  assert.deepEqual(r, { a: 1, c: { e: [1, null] } });
  assert.ok(!('b' in r));
});

test('chats: sin undefined ni fotos base64, conserva fotos remotas', () => {
  const estado = {
    activaId: 'c1',
    conversaciones: [{ id: 'c1', actualizada: 2, mensajes: [
      { id: 'm1', rol: 'user', texto: 'hola', imagenes: ['data:image/png;base64,AAA', 'https://x/y.jpg'] },
      { id: 'm2', rol: 'model', texto: 'ok', imagenes: undefined },
      { id: 'm3', rol: 'user', texto: 'f', imagenes: ['data:image/png;base64,BBB'] },
    ] }],
  };
  const r = prepararChatsParaNube(estado);
  const [m1, m2, m3] = r.conversaciones[0].mensajes;
  assert.deepEqual(m1.imagenes, ['https://x/y.jpg']);
  assert.ok(!('imagenes' in m2));
  assert.ok(!('imagenes' in m3));
  assert.ok(!JSON.stringify(r).includes('data:'));
});

test('chats: respeta el tope de 600 KB descartando lo más antiguo, nunca la activa', () => {
  const grande = 'x'.repeat(150 * 1024);
  const convs = [1, 2, 3, 4, 5, 6].map((n) => ({ id: 'c' + n, actualizada: n, mensajes: [{ id: 'm', rol: 'user', texto: grande }] }));
  const r = prepararChatsParaNube({ activaId: 'c1', conversaciones: convs });
  assert.ok(new TextEncoder().encode(JSON.stringify(r)).length <= 600 * 1024);
  assert.ok(r.conversaciones.some((c) => c.id === 'c1'));
});

test('chats: al bajar de la nube se conservan las fotos locales del mismo mensaje', () => {
  const local = { conversaciones: [{ id: 'c', mensajes: [{ id: 'm', imagenes: ['data:image/png;base64,AAA'] }] }] };
  const remoto = { conversaciones: [{ id: 'c', mensajes: [{ id: 'm' }] }] };
  const r = conservarFotosLocales(remoto, local);
  assert.deepEqual(r.conversaciones[0].mensajes[0].imagenes, ['data:image/png;base64,AAA']);
});

test('asistente: la línea ALERTA nunca queda visible', () => {
  for (const [entrada, alerta, texto] of [
    ['ALERTA: SÍ\nRevisa la reina', true, 'Revisa la reina'],
    ['ALERTA: NO\nTodo bien', false, 'Todo bien'],
    ['**ALERTA: SÍ**\nHola', true, 'Hola'],
    ['alerta: si\nHola', true, 'Hola'],
    ['Sin línea de alerta', false, 'Sin línea de alerta'],
  ]) {
    const r = interpretarRespuesta(entrada);
    assert.equal(r.alerta, alerta, entrada);
    assert.equal(r.texto, texto, entrada);
  }
});
