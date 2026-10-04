// ============================================================
// BOOTSTRAP DE ADMINISTRADORES (config/admins en Firestore)
// ============================================================
// Crea o actualiza el documento `config/admins` en Firestore con la
// semilla de administradores de VITE_ADMIN_EMAILS (.env).
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
//     npm run bootstrap:admins
//
// El script SÍ puede correr sin la variable: si no está definida, busca
// `./service-account.json` en la raíz del proyecto.
//
// NOTA sobre la inicialización: con firebase-admin v14 el import por defecto
// (`import admin from 'firebase-admin'`) ya NO expone `admin.credential`
// (undefined), y por eso el `applicationDefault()` anterior reventaba con
// "Cannot read properties of undefined". Este script usa el API modular:
//   import { cert } from 'firebase-admin/app'
// y lee el JSON del service account de forma explícita (fs + JSON.parse).
//
// Alternativa: crear el documento a mano en la consola de Firebase con un
// documento `config/admins` = { emails: [...], ownerEmail: "correo@del_dueno",
// updatedAt: <timestamp>, updatedBy: "<uid>" }. Desde el cliente NO se puede
// crear: firestore.rules tiene `allow create: if false` a propósito, para que
// no exista ninguna cuenta privilegiada ni correo hardcodeado en el repositorio.
//
// `ownerEmail` es la CUENTA PROPIETARIA (la predeterminada). Las reglas de
// seguridad solo permiten escribir esta lista desde esa cuenta, así que este
// script es el único sitio donde se puede fijar o corregir. Si el documento ya
// existe sin ese campo, el script lo rellena: sin él, nadie podría administrar
// admins hasta que se ejecutara.
// ============================================================
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const rootDir = resolve(dirname(new URL(import.meta.url).pathname), '..');

/** Lee .env y devuelve { key: value } sin expandir variables. */
function loadEnv() {
  const out = {};
  try {
    const raw = readFileSync(resolve(rootDir, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    /* sin .env local */
  }
  return out;
}

const parseEmails = (raw = '') =>
  raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

const err = (msg) => {
  console.error(`\n❌ [BOOTSTRAP] ${msg}\n`);
  process.exit(1);
};

const env = loadEnv();
const seed = parseEmails(env.VITE_ADMIN_EMAILS);
if (seed.length === 0) {
  err('VITE_ADMIN_EMAILS está vacío o no se encontró en .env.');
}

// La cuenta propietaria. Las reglas de firestore.rules comparan el correo
// autenticado contra `config/admins.ownerEmail`, así que el valor de aquí es
// el que decide QUIÉN puede agregar o quitar administradores.
const owner = parseEmails(env.VITE_OWNER_EMAILS)[0] || seed[0];
if (!seed.includes(owner)) {
  err(
    `La cuenta propietaria (${owner}) no está en VITE_ADMIN_EMAILS.\n` +
      'La cuenta propietaria debe poder acceder al panel: añádela a la lista.'
  );
}

const projectId = process.env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) {
  err('Falta FIREBASE_PROJECT_ID (o VITE_FIREBASE_PROJECT_ID en .env).');
}

// ---------------------------------------------------------------
// Service account: se lee SIEMPRE de un archivo JSON local (nada de
// `applicationDefault()`). La ruta la decide GOOGLE_APPLICATION_CREDENTIALS
// si existe; si no, `service-account.json` en la raíz del proyecto.
// ---------------------------------------------------------------
const serviceAccountPath = resolve(
  rootDir,
  process.env.GOOGLE_APPLICATION_CREDENTIALS || 'service-account.json'
);

if (!existsSync(serviceAccountPath)) {
  err(
    `No se encontró el service account en: ${serviceAccountPath}\n` +
      'Deja el archivo service-account.json en la raíz del proyecto, o define\n' +
      'GOOGLE_APPLICATION_CREDENTIALS apuntando a él.'
  );
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (e) {
  err(`No se pudo leer o parsear ${serviceAccountPath}: ${e.message}`);
}

for (const field of ['client_email', 'private_key']) {
  if (typeof serviceAccount[field] !== 'string' || serviceAccount[field].length === 0) {
    err(`El service account ${serviceAccountPath} no tiene el campo "${field}".`);
  }
}
if (serviceAccount.private_key.includes('\\n')) {
  // Los JSON descargados a veces llegan con \n escapados: cert() los rechaza.
  console.warn('⚠️  [BOOTSTRAP] private_key contiene \\n escapados: se normalizan a saltos de línea reales.');
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

let app;
try {
  app = initializeApp({ credential: cert(serviceAccount), projectId });
  console.log(`✅ [BOOTSTRAP] Firebase Admin inicializado (${projectId}, ${serviceAccount.client_email}).`);
} catch (e) {
  err('No se pudo inicializar Firebase Admin: ' + e.message);
}

const db = getFirestore(app);
const ref = db.doc('config/admins');
const snap = await ref.get();

if (!snap.exists) {
  await ref.create({
    emails: seed,
    ownerEmail: owner,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'bootstrap-script',
  });
  console.log(`✅ [BOOTSTRAP] config/admins creado con ${seed.length} admin(s):`);
  seed.forEach((e) => console.log('   - ' + e));
  console.log(`👑 [BOOTSTRAP] Cuenta propietaria (única que puede gestionar admins): ${owner}`);
} else {
  const current = parseEmails((snap.get('emails') || []).join(','));
  const next = parseEmails([...new Set([...current, ...seed])].join(','));
  // El propietario siempre está en la lista: sin él, la app se quedaría sin
  // quien pueda administrar la lista en el futuro.
  if (!next.includes(owner)) next.push(owner);
  next.sort((a, b) => a.localeCompare(b));

  const patch = {};
  const added = next.filter((e) => !current.includes(e));
  if (next.join() !== current.join()) patch.emails = next;

  // Backfill / corrección del propietario.
  // - Si falta `ownerEmail` (documento creado antes de este campo), se rellena
  //   con la cuenta de .env. Es obligatorio: las reglas lo leen.
  // - Si ya existe pero NO coincide con .env, se corrige SOLO si el documento no
  //   nombra a nadie (primer despliegue). Si ya hay un propietario
  //   establecido, se respeta el que hay y se avisa, porque cambiarlo en
  //   caliente dejaría sin acceso a la cuenta anterior.
  const currentOwner = snap.get('ownerEmail');
  if (currentOwner !== owner) {
    if (currentOwner) {
      console.warn(
        `⚠️  [BOOTSTRAP] config/admins ya tiene propietario "${currentOwner}" y .env dice "${owner}".\n` +
          '   Se RESPETA el propietario existente. Si quieres cambiarlo, edita a mano\n' +
          '   ownerEmail en la consola de Firebase.'
      );
    } else {
      patch.ownerEmail = owner;
    }
  }

  if (Object.keys(patch).length === 0) {
    console.log('ℹ️  [BOOTSTRAP] config/admins ya existe y está al día. Nada que hacer.');
    console.log(`👑 [BOOTSTRAP] Propietario actual: ${currentOwner}`);
  } else {
    patch.updatedAt = FieldValue.serverTimestamp();
    patch.updatedBy = 'bootstrap-script';
    await ref.update(patch);
    if (added.length) {
      console.log(`✅ [BOOTSTRAP] config/admins actualizado (+${added.length} nuevo(s)):`, added);
    }
    if (patch.ownerEmail) {
      console.log(`👑 [BOOTSTRAP] Propietario fijado: ${owner}`);
    }
  }
}

await deleteApp(app);
console.log('✅ [BOOTSTRAP] Listo.');