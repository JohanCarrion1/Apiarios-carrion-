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