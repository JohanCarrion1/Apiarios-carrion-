// ============================================================
// ADMIN ACCESS (Firestore)
// ============================================================
// La lista de correos administradores de la tienda se lee y se
// escribe en Firestore (documento `config/admins`). Ya NO se
// compara contra un array fijo en el código.
//
// Bootstrap / semilla:
//  - La primera vez (documento inexistente) se crea con la lista
//    de VITE_ADMIN_EMAILS (así `carrionvegajohanedinson@gmail.com`
//    conserva el acceso al migrar).
//  - A partir de ahí, la lista viva ES Firestore. Las reglas de
//    seguridad garantizan que solo un admin existente puede
//    leer/modificar el documento.
//
// Permisos (firestore.rules):
//  - read:  autenticado Y (el documento aún no existe O ya es admin)
//  - create: documento inexistente + cuenta SEMILLA (la que configura
//            VITE_ADMIN_EMAILS en .env) + data válida + se incluye a sí
//            misma (bootstrap de un solo uso, inmune a terceros)
//  - update: SOLO la cuenta propietaria (campo `ownerEmail` del documento) +
//            data válida + `ownerEmail` inmutable + nunca quitar al
//            propietario + nunca dejar la lista vacía
//  - delete: denegado
//
// Hay DOS niveles de admin, y no es solo cosa de la interfaz:
//  - PROPIETARIO (cuenta predeterminada, `ownerEmail`): administra la lista.
//  - Admin añadido: solo entra al panel; agregar/quitar le rebota en Firestore.
// ============================================================

import { useSyncExternalStore } from 'react';
import {
  doc,
  setDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type FirestoreError,
} from 'firebase/firestore';
import { db } from './firebase';
import { ADMIN_EMAILS, OWNER_EMAIL } from '../config';

export const ADMINS_COLLECTION = 'config';
export const ADMINS_DOCUMENT_ID = 'admins';
export const ADMINS_DOC_PATH = `${ADMINS_COLLECTION}/${ADMINS_DOCUMENT_ID}`;

/** Regex de email razonable (sin espacios, con @ y dominio). */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AdminListStatus = 'loading' | 'ready' | 'offline';

export interface AdminUserRef {
  uid: string;
  email: string | null;
}

/** Normaliza una lista de correos: minúsculas, sin espacios, únicas, válidas. */
export const normalizeEmails = (raw: string[] | undefined | null): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of raw || []) {
    if (typeof e !== 'string') continue;
    const email = e.trim().toLowerCase();
    if (!email || seen.has(email) || !EMAIL_REGEX.test(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out.sort((a, b) => a.localeCompare(b));
};

/** Semilla inicial: la lista que venía de VITE_ADMIN_EMAILS. */
const envSeed: string[] = normalizeEmails(ADMIN_EMAILS);

/** Propietario de respaldo (VITE_OWNER_EMAILS) si el documento aún no lo tiene. */
const envOwner: string = (OWNER_EMAIL || '').trim().toLowerCase();

// ---------------------------------------------------------------------------
// Estado reactivo compartido (useSyncExternalStore)
// ---------------------------------------------------------------------------

let emails: string[] = [...envSeed];
let ownerEmail: string = envOwner;
let status: AdminListStatus = 'loading';
let errorMessage: string | null = null;
let docExists = false;
let firestoreConfirmed = false;
let unsubscribe: (() => void) | null = null;
let boundUserId: string | null = null;

const listeners = new Set<() => void>();

// Snapshot cacheadizado: useSyncExternalStore exige la misma referencia
// mientras el estado no cambie (si no, React entraría en bucle de render).
export interface AdminListSnapshot {
  emails: string[];
  /** Correo de la cuenta propietaria: la única que administra la lista. */
  ownerEmail: string;
  status: AdminListStatus;
  error: string | null;
}

let cachedSnapshot: Readonly<AdminListSnapshot> = Object.freeze({
  emails: [...emails],
  ownerEmail,
  status,
  error: errorMessage,
});

const replaceSnapshot = (): void => {
  cachedSnapshot = Object.freeze({
    emails: [...emails],
    ownerEmail,
    status,
    error: errorMessage,
  });
};

const emit = (): void => {
  replaceSnapshot();
  listeners.forEach((l) => {
    try {
      l();
    } catch (err) {
      console.error('[ADMIN] Error en listener del store de admins:', err);
    }
  });
};

export const subscribeAdminAccess = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export const getAdminEmails = (): string[] => emails;
export const getAdminListStatus = (): AdminListStatus => status;
export const getAdminListError = (): string | null => errorMessage;
export const hasAdminDocument = (): boolean => docExists;
export const isFirestoreAdminConfirmed = (): boolean => firestoreConfirmed;

/** Correo de la cuenta propietaria vigente. */
export const getAdminOwnerEmail = (): string => ownerEmail;

/**
 * ¿Este correo es la cuenta propietaria (la predeterminada) del panel?
 *
 * Es la única que puede agregar o quitar administradores. OJO: esto decide lo
 * que se MUESTRA (botones, avisos). La garantía real está en firestore.rules,
 * que rechaza la escritura a cualquier admin que no sea el propietario. Aquí
 * solo evitamos que el botón aparezca y que se pierda un viaje de ida y vuelta.
 */
export const isAdminOwner = (email: string | null | undefined): boolean => {
  const e = (email || '').trim().toLowerCase();
  if (!e) return false;
  // El documento manda; si aún no se ha leído (o el listener falló), se cae al
  // valor de .env para que la cuenta propietaria no quede sin sus botones.
  return ownerEmail ? e === ownerEmail : e === envOwner;
};

/** ¿Puede este correo administrar la lista de administradores? */
export const canManageAdmins = (email: string | null | undefined): boolean =>
  isAdminOwner(email);

/** ¿Este correo está en la lista vigente de administradores? */
export const isEmailAdmin = (email: string | null | undefined): boolean => {
  const e = (email || '').toLowerCase();
  // Unión de la lista viva (Firestore) con la semilla de VITE_ADMIN_EMAILS:
  // las cuentas fundadoras del .env SIEMPRE cuentan como admin. Así el
  // administrador original no pierde el rol de la interfaz si el listener
  // falla. OJO: esto solo afecta a la UI; las reglas de Firestore dependen
  // exclusivamente del documento `config/admins`.
  return emails.includes(e) || envSeed.includes(e);
};

const snapshot = (): Readonly<AdminListSnapshot> => cachedSnapshot;

function useSnapshot(): AdminListSnapshot {
  return useSyncExternalStore(subscribeAdminAccess, snapshot, snapshot);
}

/** Hook reactivo para componentes: lista de admins + estado de carga. */
export function useAdminList(): AdminListSnapshot {
  return useSnapshot();
}

// ---------------------------------------------------------------------------
// Acceso a la lista de admins
// ---------------------------------------------------------------------------
// `config/admins` NO se puede crear desde el cliente (en firestore.rules,
// `allow create: if false`: no hay ninguna cuenta privilegiada hardcodeada).
// Se crea una sola vez por fuera con Admin SDK: `npm run bootstrap:admins`.
// Ver scripts/bootstrap-admins.mjs.

const adminsRef = () => doc(db!, ADMINS_COLLECTION, ADMINS_DOCUMENT_ID);

// ---------------------------------------------------------------------------
// Listener en tiempo real
// ---------------------------------------------------------------------------

const isPermissionDenied = (err: unknown): boolean =>
  !!(err && (err as FirestoreError).code === 'permission-denied');

/**
 * (Re)conecta el listener de Firestore para el usuario autenticado.
 * - Si el documento existe y el usuario es admin, la lista en vivo se refleja.
 * - Si el documento aún no existe, se mantiene la semilla y se intenta crear.
 * - Si el usuario ya no pertenece a la lista (permission-denied), se marca
 *   como 'offline' → el cliente lo trata como NO admin.
 * Se re-ejecuta cuando cambia el usuario autenticado.
 */
export function setupAdminAccess(user: AdminUserRef | null): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  const userKey = user ? `${user.uid}|${(user.email || '').toLowerCase()}` : '';
  if (boundUserId === userKey) return;
  boundUserId = userKey;

  if (!db || !user || !user.email) {
    status = 'loading';
    docExists = false;
    firestoreConfirmed = false;
    errorMessage = null;
    emit();
    return;
  }

  const ref = adminsRef();
  unsubscribe = onSnapshot(
    ref,
    (snap) => {
      docExists = snap.exists();
      if (snap.exists()) {
        const data = snap.data() as { emails?: string[]; ownerEmail?: string } | undefined;
        if (Array.isArray(data?.emails)) {
          emails = normalizeEmails(data!.emails);
          status = 'ready';
          firestoreConfirmed = true;
          errorMessage = null;
        } else {
          status = 'ready';
          firestoreConfirmed = true;
        }
        // `ownerEmail` es lo que leen las reglas de Firestore. Si el documento
        // aún no lo tiene (creado antes de este campo), se usa el de .env
        // hasta que `bootstrap:admins` lo rellene.
        const owner = (data?.ownerEmail || '').trim().toLowerCase();
        ownerEmail = owner || envOwner;
      } else {
        // Documento no existe aún: mantiene la semilla en espera.
        emails = [...envSeed];
        ownerEmail = envOwner;
        status = 'loading';
        firestoreConfirmed = false;
        errorMessage = null;
      }
      emit();
    },
    (err) => {
      console.error('[ADMIN] Error escuchando config/admins:', err);
      if (isPermissionDenied(err)) {
        // El documento no se puede leer (reglas no desplegadas, falta en la
        // lista, o mismatch de caja del email). Se vuelve a la semilla del
        // .env para no dejar de mostrar como admin a las cuentas fundadoras;
        // un admin añadido después (y luego removido) pierde el acceso.
        status = 'offline';
        emails = [...envSeed];
        ownerEmail = envOwner;
        errorMessage = 'Acceso restringido a administradores de la tienda.';
      } else {
        errorMessage = err.message || String(err);
      }
      emit();
    }
  );
  console.log('[ADMIN] Listener de admins activo para', user.email);
}

// ---------------------------------------------------------------------------
// Mutaciones (seguras por transacción + reglas de Firestore)
// ---------------------------------------------------------------------------

/** Valida formato y devuelve mensaje de error en español, o null si es válido. */
export const validateAdminEmail = (raw: string): string | null => {
  const email = (raw || '').trim().toLowerCase();
  if (!email) return 'Escribe un correo para agregar.';
  if (!EMAIL_REGEX.test(email)) return 'El correo no tiene un formato válido.';
  if (emails.includes(email)) return 'Ese correo ya es administrador.';
  return null;
};

/** Mensaje para cuando alguien sin permiso de propiedad intenta gestionar la lista. */
const OWNER_ONLY_MESSAGE = 'Solo la cuenta predeterminada puede agregar o quitar administradores.';

export async function addAdminEmail(email: string, actor: AdminUserRef): Promise<void> {
  if (!db) throw new Error('Firestore no está disponible.');
  if (!EMAIL_REGEX.test(email)) throw new Error('Formato de correo inválido.');

  // Corta aquí para dar un mensaje claro. Si alguien se salta esta comprobación
  // (console, curl), las reglas de Firestore igual lo rechazan.
  if (!isAdminOwner(actor.email)) throw new Error(OWNER_ONLY_MESSAGE);

  await runTransaction(db, async (tx) => {
    const ref = adminsRef();
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('El documento de admins aún no existe.');

    const current = normalizeEmails(snap.data().emails);
    const next = normalizeEmails([...current, email]);
    if (next.length === current.length) throw new Error('Ese correo ya es administrador.');

    tx.update(ref, {
      emails: next,
      updatedAt: serverTimestamp(),
      updatedBy: actor.uid,
    });
  });

  // Reflect inmediato en la UI (la snapshot lo confirmará luego).
  emails = normalizeEmails([...emails, email]);
  emit();
}

export async function removeAdminEmail(email: string, actor: AdminUserRef): Promise<void> {
  if (!db) throw new Error('Firestore no está disponible.');
  const target = email.trim().toLowerCase();
  const selfEmail = (actor.email || '').trim().toLowerCase();

  if (!isAdminOwner(actor.email)) throw new Error(OWNER_ONLY_MESSAGE);
  // La cuenta predeterminada es intocable: ni ella misma se quita, ni aunque
  // quedara sola en la lista. Si se perdiera, nadie podría volver a
  // administrar la lista (las reglas solo dejan escribir al propietario).
  if (target === ownerEmail || target === envOwner) {
    throw new Error('La cuenta predeterminada no se puede eliminar.');
  }

  await runTransaction(db, async (tx) => {
    const ref = adminsRef();
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('El documento de admins aún no existe.');

    const current = normalizeEmails(snap.data().emails);
    if (!current.includes(target)) throw new Error('Ese correo no está en la lista.');
    if (current.length === 1) throw new Error('Debe quedar al menos un administrador.');
    if (selfEmail === target && current.length === 1) {
      throw new Error('No puedes quitarte a ti mismo si eres el único administrador.');
    }

    const next = current.filter((e) => e !== target);
    tx.update(ref, {
      emails: next,
      updatedAt: serverTimestamp(),
      updatedBy: actor.uid,
    });
  });

  emails = emails.filter((e) => e !== target);
  emit();
}