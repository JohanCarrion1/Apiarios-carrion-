// ============================================================
// SERVICIO DE CAJAS TRAMPA (Firestore)
// ============================================================
// Colección: `trapBoxes`. Documentos con id = "TRP-001" (secuencial por
// usuario). Cada usuario lee/escribe sus propias cajas; los admins supervisan
// (ver firestore.rules). Incluye listener en tiempo real para el dashboard.

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  TRAP_BOX_TYPES,
  addDaysISO,
  todayISO,
  type TrapBox,
  type TrapBoxInput,
} from '../types/trapBox';

export const TRAPBOXES_COLLECTION = 'trapBoxes';

/** Valida los datos ANTES de enviarlos a Firestore. */
function validarDatos(input: TrapBoxInput, userId: string): void {
  if (!userId) throw new Error('No se pudo determinar el usuario de la sesión.');
  if (!input.name.trim()) throw new Error('El nombre del lugar es obligatorio.');
  if (!TRAP_BOX_TYPES.includes(input.type)) {
    throw new Error(`Tipo inválido: ${JSON.stringify(input.type)}`);
  }
  const { lat, lng } = input.location || ({} as TrapBox['location']);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Marca la ubicación de la caja trampa (coordenadas o mapa).');
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error('Las coordenadas están fuera de rango.');
  }
  if (!input.installedDate) throw new Error('La fecha de instalación es obligatoria.');
  if (!input.nextBaitCheck) {
    throw new Error('La fecha de próxima revisión del atrayente es obligatoria.');
  }
}

/** Siguiente id secuencial TRP-001... TRP-NNN sobre los docs del usuario. */
export async function nextTrapBoxId(userId: string): Promise<string> {
  if (!db) return 'TRP-001';
  const snap = await getDocs(
    query(collection(db, TRAPBOXES_COLLECTION), where('userId', '==', userId))
  );
  let max = 0;
  snap.forEach((s) => {
    const m = /^TRP-(\d+)$/.exec(s.id);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return `TRP-${String(max + 1).padStart(3, '0')}`;
}

/** Crea una caja trampa nueva. Devuelve el documento materializado. */
export async function addTrapBox(userId: string, input: TrapBoxInput): Promise<TrapBox> {
  if (!db) throw new Error('Firestore no está disponible.');
  validarDatos(input, userId);
  const id = await nextTrapBoxId(userId);
  const now = todayISO();
  const data = {
    id,
    userId,
    apiaryId: input.apiaryId,
    name: input.name.trim(),
    type: input.type,
    location: {
      lat: input.location.lat,
      lng: input.location.lng,
      ...(input.location.dms ? { dms: input.location.dms } : {}),
    },
    status: 'available' as const,
    installedDate: input.installedDate,
    lastBaitCheck: input.installedDate || now,
    nextBaitCheck: input.nextBaitCheck,
    captures: [],
    notes: input.notes?.trim() || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, TRAPBOXES_COLLECTION, id), data);
  return { ...data, saved: true } as TrapBox;
}

/** Actualiza parcialmente una caja trampa. */
export async function updateTrapBox(id: string, updates: Partial<TrapBox>): Promise<void> {
  if (!db) throw new Error('Firestore no está disponible.');
  const { id: _ignoreId, userId: _ignoreUser, createdAt: _ignoreCreated, ...rest } = updates;
  await updateDoc(doc(db, TRAPBOXES_COLLECTION, id), {
    ...rest,
    updatedAt: serverTimestamp(),
  });
}

/** Elimina una caja trampa. */
export async function deleteTrapBox(id: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, TRAPBOXES_COLLECTION, id));
}

/** Renueva el atrayente: última revisión hoy y próxima en 30 días. */
export async function renewTrapBait(id: string): Promise<void> {
  if (!db) throw new Error('Firestore no está disponible.');
  await updateDoc(doc(db, TRAPBOXES_COLLECTION, id), {
    lastBaitCheck: todayISO(),
    nextBaitCheck: addDaysISO(30),
    updatedAt: serverTimestamp(),
  });
}

/** Lectura puntual de las cajas de un apiario (para reportes / contadores). */
export async function getTrapBoxesByApiary(userId: string, apiaryId?: string): Promise<TrapBox[]> {
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, TRAPBOXES_COLLECTION), where('userId', '==', userId))
  );
  const list: TrapBox[] = [];
  snap.forEach((d) => {
    const data = d.data() as Partial<TrapBox>;
    if (!data || typeof data.name !== 'string' || !data.location) return;
    if (apiaryId && data.apiaryId !== apiaryId) return;
    list.push({ ...(data as TrapBox), id: d.id || data.id || '', saved: true });
  });
  return list;
}

/**
 * Hook con listener en tiempo real de las cajas trampa del usuario.
 * Filtra por apiario en memoria (así la query solo requiere `userId` y no
 * un índice compuesto en Firestore).
 */
export function useTrapBoxes(
  userId?: string,
  apiaryId?: string
): { trapBoxes: TrapBox[]; loading: boolean; error: string | null } {
  const [all, setAll] = useState<TrapBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setError('Firestore no está disponible.');
      return;
    }
    if (!userId) {
      setAll([]);
      setLoading(false);
      setError(null);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, TRAPBOXES_COLLECTION), where('userId', '==', userId)),
      (snap) => {
        const list: TrapBox[] = [];
        snap.forEach((d) => {
          const data = d.data() as Partial<TrapBox>;
          if (!data || typeof data.name !== 'string' || !data.location) return;
          list.push({
            ...(data as TrapBox),
            id: d.id || (data.id as string),
            captures: Array.isArray(data.captures) ? data.captures : [],
            saved: true,
          });
        });
        list.sort((a, b) => (a.id < b.id ? -1 : 1));
        setAll(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[TRAPBOXES] Error escuchando:', err);
        setLoading(false);
        setError((err as Error)?.message || String(err));
      }
    );
    return unsub;
  }, [userId]);

  const trapBoxes = useMemo(
    () => (apiaryId ? all.filter((b) => b.apiaryId === apiaryId) : all),
    [all, apiaryId]
  );

  return { trapBoxes, loading, error };
}
