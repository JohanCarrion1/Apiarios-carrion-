// ============================================================
// HELPERS COMPARTIDOS DE LOS TESTS DE REGLAS
// ============================================================
// Carga los .rules REALES del repo (nada de reglas de mentira: si alguien
// rompe firestore.rules, esta suite falla). Los emuladores los levanta
// `firebase emulators:exec`, que además exporta FIRESTORE_EMULATOR_HOST y
// FIREBASE_STORAGE_EMULATOR_HOST; rules-unit-testing los descubre por ahí.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

const aqui = dirname(fileURLToPath(import.meta.url));
export const RAIZ = join(aqui, '..', '..');

export const REGLAS_FIRESTORE = readFileSync(join(RAIZ, 'firestore.rules'), 'utf8');
export const REGLAS_STORAGE = readFileSync(join(RAIZ, 'storage.rules'), 'utf8');

export const PROJECT_ID = 'demo-apiar-reglas';

// Identidades de prueba. El aislamiento por rol de la app depende del CORREO,
// no del uid, así que los tests lo respetan.
export const ADMIN = { uid: 'uid-admin', email: 'admin@apiar.com' };
export const USUARIO_A = { uid: 'uid-a', email: 'ana@correo.com' };
export const USUARIO_B = { uid: 'uid-b', email: 'bruno@correo.com' };

/**
 * Admin AÑADIDO: está en la lista y entra al panel, pero no es la cuenta
 * predeterminada, así que no puede modificar la lista (regla `isAdminOwner`).
 */
export const ADMIN_SECUNDARIO = { uid: 'uid-admin-2', email: 'segundo@apiar.com' };

export const CARRIL = 'PED-2026';
export const BUCKET = `gs://${PROJECT_ID}.appspot.com`;

/**
 * Levanta el entorno con las reglas reales. Llamar una vez por suite.
 *
 * El SDK compat se registra en la app `[DEFAULT]` a propósito: las llamadas
 * `firebase.firestore()` / `firebase.storage()` sin argumento resuelven contra
 * ella, y es la que encaja con lo que devuelve `ctx.firestore()` / `ctx.storage()`.
 */
export async function crearEntorno() {
  if (!firebase.apps.length) {
    firebase.initializeApp({ projectId: PROJECT_ID, storageBucket: BUCKET });
  }
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: REGLAS_FIRESTORE },
    storage: { rules: REGLAS_STORAGE },
  });
}

/**
 * Siembra datos saltándose las reglas (equivalente al Admin SDK).
 * `fn` recibe el cliente privilegiado de Firestore.
 */
export function sembrar(entorno, fn) {
  return entorno.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));
}

/**
 * Crea la lista de admins: es la ÚNICA fuente de privilegio de la app.
 *
 * `ownerEmail` es la cuenta predeterminada (la única que puede modificar la
 * lista) y vive EN el documento porque firestore.rules no puede leer el .env.
 * Por defecto es ADMIN.email.
 */
export function sembrarAdmins(entorno, emails = [ADMIN.email], ownerEmail = ADMIN.email) {
  return sembrar(entorno, (db) =>
    db.doc('config/admins').set({
      emails,
      ownerEmail,
      updatedAt: firebase.firestore.Timestamp.now(),
      updatedBy: ADMIN.uid,
    })
  );
}

// email_verified: true porque las cuentas reales de la app llegan aqui con el
// correo verificado; isAdmin() ahora lo exige.
export function comoAdmin(entorno) {
  return entorno.authenticatedContext(ADMIN.uid, { email: ADMIN.email, email_verified: true });
}
export function comoAdminSecundario(entorno) {
  return entorno.authenticatedContext(ADMIN_SECUNDARIO.uid, { email: ADMIN_SECUNDARIO.email, email_verified: true });
}
export function como(entorno, usuario) {
  return entorno.authenticatedContext(usuario.uid, { email: usuario.email, email_verified: true });
}
export function comoAnonimo(entorno) {
  return entorno.unauthenticatedContext();
}

// `ctx.firestore()` devuelve una instancia COMPAT, así que los helpers de
// `firebase/compat` encajan sin sorpresas de tipos.
export const fs = firebase.firestore;

export { firebase };

/**
 * Sesion con el correo SIN verificar: el token dice el email, pero
 * email_verified es false. Las reglas deben tratarla como NO admin aunque
 * ese correo este en config/admins (vector: registrar el correo ajeno).
 */
export function comoSinVerificar(entorno, usuario = ADMIN) {
  return entorno.authenticatedContext(usuario.uid, {
    email: usuario.email,
    email_verified: false,
  });
}
