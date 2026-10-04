// ============================================================
// SERVICIO DE COTIZACIONES (Firestore)
// ============================================================
// Colección: `cotizaciones`
// Documentos: id = "COT-001" (secuencial). Solo admins del panel
// (lista config/admins) pueden leer/escribir (ver firestore.rules).
// ============================================================

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  runTransaction,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Cotizacion,
  CotizacionEstado,
  CotizacionProducto,
  CotizacionHistorialEntry,
} from '../types/cotizaciones';
import { cotizacionTotal, COTIZACION_ESTADOS } from '../types/cotizaciones';

export const COTIZACIONES_COLLECTION = 'cotizaciones';

/** Número de intentos al reservar un correlativo antes de rendirse. */
const MAX_INTENTOS_NUMERO = 8;

export interface AdminActor {
  uid: string;
  email: string | null;
}

/** Correlativo COT-001... calculado sobre los docs existentes (solo vista previa). */
export async function nextCotizacionNumero(): Promise<string> {
  if (!db) return 'COT-001';
  const snap = await getDocsAll();
  let max = 0;
  snap.forEach((q) => {
    const m = /^COT-(\d+)$/.exec(q.id);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return `COT-${String(max + 1).padStart(3, '0')}`;
}

async function getDocsAll() {
  return getDocs(collection(db!, COTIZACIONES_COLLECTION));
}

export interface CotizacionInput {
  /** Correlativo sugerido. Si ya existe, se asigna el siguiente libre. */
  numero: string;
  clienteNombre?: string;
  clienteTelefono?: string;
  notas?: string;
  validezDias: number;
  productos: CotizacionProducto[];
  adminEmail: string;
}

/** Valida los datos ANTES de enviarlos a Firestore (reglas de la colección). */
function validarDatos(data: Cotizacion, numero: string): void {
  if (!numero) throw new Error('La cotización no tiene número.');
  if (typeof data.total !== 'number' || !Number.isFinite(data.total) || data.total < 0) {
    throw new Error(`Total inválido (esperaba un número >= 0): ${JSON.stringify(data.total)}`);
  }
  if (typeof data.adminEmail !== 'string' || data.adminEmail === '') {
    throw new Error('No se pudo determinar el adminEmail de la cotización.');
  }
  if (!['pendiente', 'enviada', 'aprobada'].includes(data.estado)) {
    throw new Error(`Estado inválido: ${JSON.stringify(data.estado)}`);
  }
  if (!Array.isArray(data.productos) || data.productos.length === 0) {
    throw new Error('La cotización no tiene productos.');
  }
  data.productos.forEach((p, i) => {
    if (typeof p.id !== 'string' || typeof p.nombre !== 'string' || p.nombre === '') {
      throw new Error(`Producto ${i + 1} inválido (id/nombre requeridos).`);
    }
    if (typeof p.precio !== 'number' || typeof p.cantidad !== 'number' || typeof p.subtotal !== 'number') {
      throw new Error(`Producto ${i + 1} inválido (precio, cantidad y subtotal deben ser números).`);
    }
  });
}

/**
 * Guarda una cotización NUEVA reservando el correlativo de forma atómica.
 *
 * Antes hacía un `setDoc` a pelo sobre el número calculado al abrir el modal:
 * si dos admins abrían el formulario a la vez, ambos veían "COT-005" y el
 * segundo `setDoc` PILVABA en silencio la cotización del primero, sin aviso.
 * Ahora la reserva se hace dentro de una transacción que comprueba que el
 * documento no existe y, si existe, reintenta con el correlativo siguiente.
 * El número realmente usado se devuelve en el resultado, porque puede no ser el
 * que se había calculado al abrir el modal.
 */
export async function saveCotizacion(input: CotizacionInput): Promise<Cotizacion> {
  if (!db) throw new Error('Firestore no está disponible.');

  const numeroInicial = String(input.numero || '').trim() || 'COT-001';
  const m = /^COT-(\d+)$/.exec(numeroInicial);
  if (!m) throw new Error(`Número de cotización inválido: ${numeroInicial}`);
  let correlativo = Number(m[1]);

  const adminEmail = (input.adminEmail || '').trim();
  const base = {
    fecha: new Date().toISOString(),
    validezDias: Number(input.validezDias) || 0,
    clienteNombre: (input.clienteNombre || '').trim(),
    clienteTelefono: (input.clienteTelefono || '').trim(),
    notas: (input.notas || '').trim(),
    productos: input.productos,
    total: Number(cotizacionTotal(input.productos)) || 0,
    estado: 'pendiente' as CotizacionEstado,
    adminEmail,
  };

  for (let intento = 0; intento < MAX_INTENTOS_NUMERO; intento += 1) {
    const numero = `COT-${String(correlativo).padStart(3, '0')}`;
    const data: Cotizacion = { ...base, numero };
    validarDatos(data, numero);

    const ref = doc(db, COTIZACIONES_COLLECTION, numero);
    let ocupado = true;
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      ocupado = snap.exists();
      if (ocupado) return; // otro admin se adelantó: probar el siguiente
      tx.set(ref, { ...data, historial: [], updatedAt: serverTimestamp() });
    });

    if (!ocupado) {
      if (import.meta.env.DEV) {
        console.log(`[COTIZACIONES] Guardada ${numero} con ${data.productos.length} producto(s).`);
      }
      return { ...data, saved: true };
    }
    correlativo += 1;
  }

  throw new Error(
    `No se pudo reservar un número de cotización libre tras ${MAX_INTENTOS_NUMERO} intentos. Intenta de nuevo.`
  );
}

/** Borra una cotización guardada. */
export async function deleteCotizacion(numero: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, COTIZACIONES_COLLECTION, numero));
}

/**
 * Cambia el estado (pendiente/enviada/aprobada) dejando rastro en `historial`.
 *
 * Antes era un `updateDoc` suelto: no quedaba traza de quién cambió qué ni
 * cuándo, y dos admins pulsando a la vez se pisaban. Con la transacción la
 * lectura del historial y su escritura son atómicas.
 */
export async function updateCotizacionEstado(
  numero: string,
  estado: CotizacionEstado,
  adminEmail: string = ''
): Promise<CotizacionHistorialEntry> {
  if (!db) return { estado, adminEmail, ts: new Date().toISOString() };
  if (!COTIZACION_ESTADOS.includes(estado)) {
    throw new Error(`Estado inválido: ${JSON.stringify(estado)}`);
  }
  const ref = doc(db, COTIZACIONES_COLLECTION, numero);
  const entrada: CotizacionHistorialEntry = {
    estado,
    adminEmail: (adminEmail || '').trim(),
    ts: new Date().toISOString(),
  };
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`La cotización ${numero} ya no existe.`);
    const data = snap.data() as Partial<Cotizacion>;
    const previo = Array.isArray(data.historial) ? data.historial : [];
    // Si el documento nació sin bitácora, el primer cambio deja constancia
    // del estado del que se parte.
    const historial: CotizacionHistorialEntry[] =
      previo.length === 0 && data.estado
        ? [{ estado: data.estado, adminEmail: data.adminEmail || '', ts: data.fecha || entrada.ts }]
        : [...previo];
    historial.push(entrada);
    tx.update(ref, { estado, historial, updatedAt: serverTimestamp() });
  });
  return entrada;
}

/** Hook con listener en tiempo real de todas las cotizaciones. */
export function useCotizaciones(): { cotizaciones: Cotizacion[]; loading: boolean; error: string | null } {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setError('Firestore no está disponible.');
      return;
    }
    const unsub = onSnapshot(
      collection(db, COTIZACIONES_COLLECTION),
      (snap) => {
        const list: Cotizacion[] = [];
        snap.forEach((d) => {
          const data = d.data() as Partial<Cotizacion>;
          if (data && data.numero && Array.isArray(data.productos)) {
            list.push({ ...(data as Cotizacion), saved: true });
          }
        });
        list.sort((a, b) => (a.numero < b.numero ? -1 : 1));
        setCotizaciones(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[COTIZACIONES] Error escuchando:', err);
        setLoading(false);
        setError((err as Error)?.message || String(err));
      }
    );
    return unsub;
  }, []);

  return { cotizaciones, loading, error };
}