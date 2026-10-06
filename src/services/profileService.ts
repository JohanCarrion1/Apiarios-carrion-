// ============================================================
// PERFILES DE USUARIO (users/{uid}) — sistema multiusuario
// ============================================================
// Cada usuario que inicia sesión por primera vez recibe un documento
// users/{uid} con:
//   uid, email, displayName, photoURL, role ('admin'|'user'),
//   apiario: { nombre, ubicacion, altitud } | null,
//   createdAt, lastLogin
// El rol se define por presencia en config/admins; el apiario lo configura el
// usuario no-admin en el modal de bienvenida.
// ============================================================
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseAvailable } from '../lib/firebase';
import { isEmailAdmin } from '../lib/adminAccess';

export interface UserApiaryMeta {
  nombre: string;
  ubicacion: string;
  altitud: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'user';
  apiario: UserApiaryMeta | null;
  createdAt?: unknown;
  lastLogin?: unknown;
  /** Instante en que el usuario marcó las tres casillas legales del
      post-login. `null`/ausente = todavía no aceptó. Se guarda con
      `serverTimestamp()`, así que en el snapshot llega como `Timestamp`. */
  termsAcceptedAt?: unknown;
  /** Versión del juego de documentos aceptada. Permite re-preguntar si las
      políticas cambian de versión en el futuro. */
  termsVersion?: number;
}

const USERS_COLLECTION = 'users';

const docFor = (uid: string) => doc(db!, USERS_COLLECTION, uid);

function profileFrom(data: any, uid: string): UserProfile | null {
  if (!data || typeof data !== 'object') return null;
  const apiario = data.apiario && typeof data.apiario === 'object'
    ? {
        nombre: String(data.apiario.nombre || ''),
        ubicacion: String(data.apiario.ubicacion || ''),
        altitud: String(data.apiario.altitud || ''),
      }
    : null;
  return {
    uid,
    email: String(data.email || ''),
    displayName: data.displayName ? String(data.displayName) : undefined,
    photoURL: data.photoURL ? String(data.photoURL) : undefined,
    role: data.role === 'admin' ? 'admin' : 'user',
    apiario,
    createdAt: data.createdAt,
    lastLogin: data.lastLogin,
    termsAcceptedAt: data.termsAcceptedAt ?? null,
    termsVersion: typeof data.termsVersion === 'number' ? data.termsVersion : undefined,
  };
}

/**
 * Crea el perfil en Firestore si no existe y actualiza lastLogin en cada
 * inicio de sesión. También refresca el rol según la lista de admins vigente.
 */
export const ensureUserProfile = async (user: User): Promise<UserProfile | null> => {
  if (!isFirebaseAvailable() || !db || !user) return null;
  const uid = user.uid;
  try {
    const ref = docFor(uid);
    const snap = await getDoc(ref);
    const role: UserProfile['role'] = isEmailAdmin(user.email) ? 'admin' : 'user';
    const base = {
      userId: uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      role,
      lastLogin: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        role,
        apiario: null,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
    } else {
      // Ya existe: actualizar lastLogin y el rol.
      await setDoc(
        ref,
        {
          role,
          lastLogin: serverTimestamp(),
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
        },
        { merge: true }
      );
    }
    return profileFrom({ ...(snap.exists() ? snap.data() : {}), ...base }, uid);
  } catch (error) {
    console.warn('[PROFILE] No se pudo inicializar el perfil:', error);
    return null;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!isFirebaseAvailable() || !db) return null;
  try {
    const snap = await getDoc(docFor(uid));
    return snap.exists() ? profileFrom(snap.data(), uid) : null;
  } catch (error) {
    console.warn('[PROFILE] Error leyendo perfil:', error);
    return null;
  }
};

/** Guarda los datos del apiario del usuario (modal de bienvenida / edición). */
export const saveUserApiario = async (
  uid: string,
  apiario: UserApiaryMeta
): Promise<void> => {
  if (!isFirebaseAvailable() || !db) return;
  await setDoc(docFor(uid), { apiario }, { merge: true });
};

/** Suscripción en vivo al perfil del usuario (para header y modal). */
export function useProfile(uid?: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'offline'>('loading');

  useEffect(() => {
    if (!uid || !db || !isFirebaseAvailable()) {
      setProfile(null);
      setStatus('offline');
      return;
    }
    let alive = true;
    setStatus('loading');
    const unsub = onSnapshot(
      docFor(uid),
      (snap) => {
        if (!alive) return;
        setProfile(snap.exists() ? profileFrom(snap.data(), uid) : null);
        setStatus('ready');
      },
      (error) => {
        console.warn('[PROFILE] Error en suscripción al perfil:', error);
        if (!alive) return;
        setStatus('offline');
      }
    );
    return () => {
      alive = false;
      unsub();
    };
  }, [uid]);

  return { profile, status };
}

/** Estado del apiario configurado por el usuario no-admin (o null si falta). */
export const profileNeedsOnboarding = (p: UserProfile | null): boolean => {
  return !p || !p.apiario || !p.apiario.nombre;
};
// ================================================================
// CONSENTIMIENTO DE TÉRMINOS (post-login, paso 1 de /seleccionar)
// ================================================================
/**
 * El paso 1 del post-login pide marcar las tres políticas. El resultado se
 * guarda en `users/{uid}.termsAcceptedAt` para que el paso 2 no vuelva a
 * mostrarse en futuros inicios de sesión.
 *
 * ORDEN DE LECTURA (importante para que no aparezca un flash):
 *   1. localStorage — síncrono, decide en el primer render.
 *   2. Firestore — después, y si dice que sí, refresca la caché local.
 *
 * Si solo existiera Firestore, cada login pagaría un round-trip y el paso 1
 * aparecería durante ese instante aunque el usuario ya hubiera aceptado.
 *
 * `saveTermsAccepted` marca localStorage ANTES de tocar la red: si Firestore
 * falla (sin conexión, reglas), el usuario no tiene que repetir el paso 1 en
 * cada recarga de la misma sesión. Firestore queda como fuente de verdad
 * cuando está disponible.
 */

/** Versión actual del juego de documentos. Súbela si cambian las políticas. */
export const TERMS_VERSION = 1;

/** Clave de la caché local. El `uid` aísla el valor por cuenta. */
const termsCacheKey = (uid: string) => `panal_v1_terms_${uid}`;

const readCache = (uid: string): boolean => {
  try {
    return localStorage.getItem(termsCacheKey(uid)) === 'accepted';
  } catch {
    return false;
  }
};

const writeCache = (uid: string): void => {
  try {
    localStorage.setItem(termsCacheKey(uid), 'accepted');
  } catch {
    /* almacenamiento lleno o bloqueado: no bloquea el flujo */
  }
};

/** ¿Aceptó los términos? Consulta SOLO la caché local ( síncrono). */
export const hasAcceptedTermsCached = (uid: string): boolean => readCache(uid);

/** El usuario ya aceptó y la versión guardada es la vigente. */
export const isTermsAccepted = (profile: UserProfile | null): boolean =>
  Boolean(profile?.termsAcceptedAt) && profile?.termsVersion === TERMS_VERSION;

/**
 * Registra la aceptación. Devuelve `true` si quedó registrada en Firestore,
 * `false` si solo quedó en la caché local (la interfaz avanza igual).
 */
export const saveTermsAccepted = async (
  uid: string,
  email?: string
): Promise<boolean> => {
  writeCache(uid);
  if (!isFirebaseAvailable() || !db) return false;
  try {
    await setDoc(
      docFor(uid),
      {
        termsAcceptedAt: serverTimestamp(),
        termsVersion: TERMS_VERSION,
        ...(email ? { email } : {}),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn('[TERMS] No se pudo guardar en Firestore, se conserva solo en local:', error);
    return false;
  }
};

/**
 * Reconcilia la caché local con Firestore.
 *
 * Se llama en paralelo al primer render de /seleccionar: si la cuenta aceptó
 * en otro dispositivo, aquí se recupera ese estado y se salta el paso 1.
 * `defaultValue` es lo que se devuelve mientras la lectura viaja.
 */
export const syncTermsFromFirestore = async (
  uid: string
): Promise<{ accepted: boolean; version: number | null }> => {
  if (!isFirebaseAvailable() || !db) return { accepted: readCache(uid), version: null };
  try {
    const snap = await getDoc(docFor(uid));
    const accepted = Boolean(snap.data()?.termsAcceptedAt);
    const version = typeof snap.data()?.termsVersion === 'number' ? snap.data()!.termsVersion : null;
    if (accepted && version === TERMS_VERSION) writeCache(uid);
    return { accepted, version };
  } catch (error) {
    console.warn('[TERMS] Error leyendo el consentimiento:', error);
    return { accepted: readCache(uid), version: null };
  }
};
