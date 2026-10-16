// ============================================================
// SERVICIO DE POLINIZACIÓN (Firestore)
// ============================================================
// Colección: `polinizacion`
// Documentos: id = "POL-001" (secuencial por usuario). Cada usuario
// lee/escribe sus propios contratos (userId coincide con auth.uid;
// ver firestore.rules). Los admins pueden supervisar.
// ============================================================

import { sinUndefined } from './firestoreSafe';
import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  ContratoPolinizacion,
  PolinizacionEstado,
  PolinizacionInput,
} from '../types/polinizacion';
import { POLINIZACION_ESTADOS, polinizacionTotal } from '../types/polinizacion';

export const POLINIZACION_COLLECTION = 'polinizacion';

/** Valida los datos ANTES de enviarlos a Firestore. */
function validarDatos(input: PolinizacionInput, userId: string): void {
  if (!userId) throw new Error('No se pudo determinar el usuario de la sesión.');
  if (!input.clienteNombre.trim()) throw new Error('El nombre del cliente es obligatorio.');
  if (!input.cultivo.trim()) throw new Error('El cultivo a polinizar es obligatorio.');
  if (!Number.isFinite(input.cantidadColmenas) || input.cantidadColmenas < 1) {
    throw new Error('La cantidad de colmenas debe ser al menos 1.');
  }
  if (!input.fechaInicio) throw new Error('La fecha de inicio es obligatoria.');
  if (!input.fechaFin) throw new Error('La fecha de fin es obligatoria.');
  if (input.fechaFin < input.fechaInicio) {
    throw new Error('La fecha de fin no puede ser anterior a la fecha de inicio.');
  }
  if (!Number.isFinite(input.precioPorColmena) || input.precioPorColmena < 0) {
    throw new Error('El precio por colmena debe ser un número mayor o igual a 0.');
  }
  if (!POLINIZACION_ESTADOS.includes(input.estado)) {
    throw new Error(`Estado inválido: ${JSON.stringify(input.estado)}`);
  }
}

function buildData(input: PolinizacionInput, userId: string): Omit<ContratoPolinizacion, 'id' | 'createdAt' | 'updatedAt' | 'saved'> {
  validarDatos(input, userId);
  const cantidad = Number(input.cantidadColmenas) || 0;
  const precio = Number(input.precioPorColmena) || 0;
  return {
    userId,
    cliente: {
      nombre: input.clienteNombre.trim(),
      telefono: input.clienteTelefono.trim(),
    },
    cultivo: input.cultivo.trim(),
    cantidadColmenas: cantidad,
    colmenasAsignadas: Array.from(new Set((input.colmenasAsignadas || []).map((c) => c.trim()).filter(Boolean))),
    fechaInicio: input.fechaInicio,
    fechaFin: input.fechaFin,
    ubicacion: input.ubicacion.trim(),
    precioPorColmena: precio,
    total: polinizacionTotal(cantidad, precio),
    estado: input.estado,
    notas: input.notas.trim(),
  };
}

/** Siguiente id secuencial POL-001... POL-NNN calculado sobre los docs del usuario. */
export async function nextPolinizacionId(userId: string): Promise<string> {
  if (!db) return 'POL-001';
  const snap = await getDocs(
    query(collection(db, POLINIZACION_COLLECTION), where('userId', '==', userId))
  );
  let max = 0;
  snap.forEach((s) => {
    const m = /^POL-(\d+)$/.exec(s.id);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return `POL-${String(max + 1).padStart(3, '0')}`;
}

/** Guarda un contrato nuevo, o actualiza si ya existe (por id). */
export async function savePolinizacion(
  userId: string,
  input: PolinizacionInput,
  id?: string
): Promise<ContratoPolinizacion> {
  if (!db) throw new Error('Firestore no está disponible.');
  const finalId = id || (await nextPolinizacionId(userId));
  const data = buildData(input, userId);
  const ref = doc(db, POLINIZACION_COLLECTION, finalId);
  console.log('[POLINIZACION] Guardando contrato:', JSON.stringify({ id: finalId, ...data }, null, 2));
  if (id) {
    await updateDoc(ref, { ...sinUndefined(data), id: finalId, updatedAt: serverTimestamp() });
  } else {
    // `id` se guarda DENTRO del documento, no solo como clave. El listener lo
    // necesita para materializar el contrato; sin este campo el documento se
    // escribia bien pero quedaba invisible en la lista.
    await setDoc(ref, { id: finalId, ...sinUndefined(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
  return { id: finalId, ...data, saved: true };
}

/** Actualiza únicamente el estado del contrato. */
export async function updatePolinizacionEstado(id: string, estado: PolinizacionEstado): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, POLINIZACION_COLLECTION, id), {
    estado,
    updatedAt: serverTimestamp(),
  });
}

/** Elimina un contrato. */
export async function deletePolinizacion(id: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, POLINIZACION_COLLECTION, id));
}

/** Hook con listener en tiempo real de los contratos del usuario. */
export function usePolinizacion(
  userId?: string
): { contratos: ContratoPolinizacion[]; loading: boolean; error: string | null } {
  const [contratos, setContratos] = useState<ContratoPolinizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setError('Firestore no está disponible.');
      return;
    }
    if (!userId) {
      setContratos([]);
      setLoading(false);
      setError(null);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, POLINIZACION_COLLECTION), where('userId', '==', userId)),
      (snap) => {
        const list: ContratoPolinizacion[] = [];
        snap.forEach((d) => {
          const data = d.data() as Partial<ContratoPolinizacion>;
          // El id canonico es el identificador del documento. Los contratos
          // creados antes de que `id` se guardara dentro del documento no lo
          // tienen en sus campos, asi que se usa d.id como fuente de verdad y
          // el campo `id` queda solo como respaldo.
          const id = d.id || data.id;
          if (!id || !data.cliente || typeof data.cliente.nombre !== 'string') return;
          list.push({ ...(data as ContratoPolinizacion), id, saved: true });
        });
        list.sort((a, b) => (a.id < b.id ? -1 : 1));
        setContratos(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[POLINIZACION] Error escuchando:', err);
        setLoading(false);
        setError((err as Error)?.message || String(err));
      }
    );
    return unsub;
  }, [userId]);

  return { contratos, loading, error };
}