#!/usr/bin/env node
// ============================================================
// migrate-products-to-firestore.mjs
// Sube el catálogo de la tienda a la colección `products` de Firestore,
// preservando las URLs de Cloudinary que ya tenga cada producto.
//
// POR QUÉ HACE FALTA
// El catálogo vivía solo en localStorage, que está aislado por origen: las
// imágenes subidas desde el admin en localhost no llegaban nunca a producción.
// Firestore pasa a ser la fuente de verdad. Este script vuelca el catálogo que
// tienes en el navegador (localStorage) a Firestore para no perder esas URLs.
//
// CÓMO USARLO
//   1. En el navegador donde está el catálogo (el que subiste las imágenes),
//      abre la consola y ejecuta el export de abajo. Se descarga un .json.
//   2. node scripts/migrate-products-to-firestore.mjs --dry-run ~/Descargas/catalogo.json
//      → revisa qué haría SIN escribir nada
//   3. node scripts/migrate-products-to-firestore.mjs ~/Descargas/catalogo.json
//      → escribe de verdad
//
// El export para la consola del navegador:
//   copy(JSON.stringify(JSON.parse(localStorage.getItem('apiarios_carrion_products_v1')||'[]')))
//
// Opciones:
//   --dry-run        solo informa, no escribe
//   --file <ruta>    ruta al JSON (o usa el primer argumento posicional)
//   --prune          borra de Firestore los productos que NO estén en el JSON
//                    (desactivado por defecto: es destructivo)
//   --batch <n>      tamaño de batch (por defecto 400, el límite es 500)
//
// Las credenciales salen de service-account.json (Admin SDK). Ese archivo NUNCA
// se sube a git ni se copia al bundle del cliente.
// ============================================================
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// ------------------------------------------------------------
// Args
// ------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const DRY_RUN = flag('--dry-run');
const PRUNE = flag('--prune');
const BATCH = Math.max(1, Math.min(500, Number(opt('--batch', '400')) || 400));
const FILE =
  opt('--file') || argv.find((a) => !a.startsWith('--') && a.endsWith('.json'));

if (!FILE) {
  console.error(
    'Uso: node scripts/migrate-products-to-firestore.mjs [--dry-run] [--prune] <catalogo.json>'
  );
  process.exit(1);
}

// ------------------------------------------------------------
// Validación (mismas reglas que src/services/productsSync.ts)
// ------------------------------------------------------------
const isCloudinary = (u) => /^https?:\/\/res\.cloudinary\.com\//i.test(u.trim());

const validar = (u) => {
  if (typeof u !== 'string') return { ok: false, motivo: 'no es texto' };
  const t = u.trim();
  if (t === '') return { ok: true, valor: '' };
  if (t.startsWith('data:')) return { ok: true, valor: t, aviso: 'base64 (no ideal en Firestore)' };
  if (isCloudinary(t)) return { ok: true, valor: t };
  return { ok: false, motivo: `URL no válida/no es Cloudinary: ${t.slice(0, 70)}` };
};

let crudos;
try {
  crudos = JSON.parse(readFileSync(FILE, 'utf8'));
} catch (error) {
  console.error(`✗ No se pudo leer ${FILE}:`, error.message);
  process.exit(1);
}
const lista = Array.isArray(crudos) ? crudos : crudos?.products;
if (!Array.isArray(lista)) {
  console.error('✗ El JSON no es un array de productos (ni un { products: [...] }).');
  process.exit(1);
}

// ------------------------------------------------------------
// Sanear + informar
// ------------------------------------------------------------
const sinId = [];
const urlsInvalidas = [];
const usados = new Set();
const limpios = [];

for (const p of lista) {
  if (!p || typeof p !== 'object') continue;
  let id = typeof p.id === 'string' ? p.id.trim() : '';
  if (!id) {
    sinId.push(p.nombre || '(sin nombre)');
    continue;
  }
  if (usados.has(id)) id = `${id}-dup`;
  usados.add(id);

  const v = validar(p.imageUrl);
  if (!v.ok) {
    urlsInvalidas.push(`${id} → "${v.motivo}"`);
    limpios.push({ ...p, id, imageUrl: '' });
  } else {
    if (v.aviso) console.log(`  ⚠ ${id}: ${v.aviso}`);
    limpios.push({ ...p, id, imageUrl: v.valor });
  }
}

const conFoto = limpios.filter((p) => p.imageUrl && isCloudinary(p.imageUrl)).length;
console.log('\n── Resumen del catálogo ─────────────────────────────');
console.log(`  Productos en el JSON     : ${lista.length}`);
console.log(`  Tras validar             : ${limpios.length}`);
console.log(`  Con imagen de Cloudinary : ${conFoto}`);
console.log(`  Sin imagen (placeholder) : ${limpios.length - conFoto}`);
if (sinId.length) console.log(`  Descartados por falta de id: ${sinId.length} → ${sinId.join(', ')}`);
if (urlsInvalidas.length) {
  console.log(`  URLs inválidas (a placeholder): ${urlsInvalidas.length}`);
  urlsInvalidas.forEach((l) => console.log(`     · ${l}`));
}
console.log('──────────────────────────────────────────────────────\n');

if (DRY_RUN) {
  console.log('🧪 --dry-run: no se ha escrito nada en Firestore.');
  process.exit(0);
}
if (conFoto === 0) {
  console.error('✗ Ningún producto tiene URL de Cloudinary: no tiene sentido migrar.');
  console.error('  Sube primero las imágenes desde /tienda/admin y repite el export.');
  process.exit(1);
}

// ------------------------------------------------------------
// Escribir
// ------------------------------------------------------------
let credencial;
try {
  const ruta = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'service-account.json';
  credencial = JSON.parse(readFileSync(ruta, 'utf8'));
  // Los JSON descargados desde la consola de Google traen la private_key con
  // los saltos de línea escapados ("\n" en lugar de saltos reales) y `cert()`
  // los rechaza con un error de firma. Se normalizan, igual que en
  // bootstrap-admins.mjs.
  if (typeof credencial.private_key === 'string' && credencial.private_key.includes('\\n')) {
    console.warn('⚠️  private_key tenía \\n escapados: se normalizan.');
    credencial.private_key = credencial.private_key.replace(/\\n/g, '\n');
  }
  for (const campo of ['client_email', 'private_key', 'project_id']) {
    if (!credencial[campo]) {
      console.error(`✗ ${ruta} no tiene "${campo}".`);
      process.exit(1);
    }
  }
} catch (error) {
  console.error(
    `✗ No se pudo leer la credencial: ${error.message}\n  Usa GOOGLE_APPLICATION_CREDENTIALS o deja service-account.json en la raíz.`
  );
  process.exit(1);
}

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ credential: cert(credencial), projectId: credencial.project_id });
const db = getFirestore();

const subir = async (docs) => {
  for (let i = 0; i < docs.length; i += BATCH) {
    const lote = docs.slice(i, i + BATCH);
    const batch = db.batch();
    for (const p of lote) {
      batch.set(db.collection('products').doc(p.id), { ...p, updatedAt: new Date() }, { merge: true });
    }
    await batch.commit();
    console.log(`  ✓ ${Math.min(i + BATCH, docs.length)}/${docs.length}`);
  }
};

try {
  console.log(`⬆ Subiendo ${limpios.length} productos a la colección "products"...`);
  await subir(limpios);

  if (PRUNE) {
    const snap = await db.collection('products').get();
    const keep = new Set(limpios.map((p) => p.id));
    const sobrantes = snap.docs.filter((d) => !keep.has(d.id));
    for (let i = 0; i < sobrantes.length; i += BATCH) {
      const batch = db.batch();
      sobrantes.slice(i, i + BATCH).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    console.log(`🧹 --prune: ${sobrantes.length} productos borrados de Firestore.`);
  }

  const total = (await db.collection('products').get()).size;
  console.log(`\n✅ Listo. La colección "products" tiene ${total} documentos.`);
  console.log('   Recarga la app: la tienda leerá el catálogo de Firestore.');
} catch (error) {
  console.error('\n✗ Error escribiendo en Firestore:', error.message);
  console.error('  Comprueba las credenciales y las reglas (allow create/update: isAdmin).');
  process.exit(1);
}