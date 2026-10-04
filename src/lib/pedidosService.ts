// ============================================================
// SERVICIO DE PEDIDOS — pago con Yape (Firestore + Storage)
// ============================================================
// Colección: `pedidos`
// Documentos: id = "PED-001" (secuencial). Cualquier usuario autenticado
// puede crear un pedido (pagará un comprobante por Yape); solo los admins
// un admin de la tienda (lista config/admins) y el
// propio cliente (clienteUid) pueden leerlo/actualizarlo (firestore.rules).
// Los comprobantes se suben a Firebase Storage: `comprobantes/{id}/{ts}.jpg`
// ============================================================

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  runTransaction,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  type QuerySnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { isEmailAdmin } from './adminAccess';
import { useAuth } from '../context/AuthContext';
import { PEDIDO_ESTADOS, type Pedido, type PedidoCliente, type PedidoEstado, type PedidoProducto, type ComprobantePago } from '../types/pedidos';

export const PEDIDOS_COLLECTION = 'pedidos';

/** Parte numérica de un número de pedido (PED-007 → 7). Devuelve 0 si el
 *  formato no es el esperado, para que la ordenación nunca devuelva NaN. */
export const numeroPedido = (numero: string): number => {
  const m = /^PED-(\d+)$/.exec(numero || '');
  return m ? Number(m[1]) : 0;
};

/** Ruta del QR de Yape (imagen en /public/yape-qr.png). */
export const YAPE_QR_IMAGE = '/yape-qr.png';

/** Tamaño máximo del comprobante (2 MB). */
export const COMPROBANTE_MAX_MB = 2;
export const COMPROBANTE_ACEPTADOS: string[] = ['image/jpeg', 'image/png', 'image/webp'];

export const ESTADOS_ADMIN: PedidoEstado[] = ['pendiente_pago', 'pagado', 'rechazado', 'completado'];

/** Nombre del archivo original (sin ruta). */
const nombreArchivo = (file: File): string => file.name.split('/').pop() || file.name;

/** ¿El archivo es una imagen aceptada y no excede el tamaño máximo? */
export function comprobanteValido(file: File): string | null {
  if (!COMPROBANTE_ACEPTADOS.includes(file.type)) {
    return 'El comprobante debe ser una imagen JPG, PNG o WebP.';
  }
  if (file.size > COMPROBANTE_MAX_MB * 1024 * 1024) {
    return `El comprobante supera los ${COMPROBANTE_MAX_MB} MB.`;
  }
  return null;
}

async function getDocsAll(): Promise<QuerySnapshot> {
  return getDocs(collection(db!, PEDIDOS_COLLECTION));
}

/** Lee el número más alto ya usado. Solo un admin de la tienda puede leer la
 *  colección completa (firestore.rules), así que un cliente normal recibe
 *  `null` en lugar de un error: en ese caso se usa el número por tiempo. */
async function maxPedidoNumero(): Promise<number | null> {
  try {
    const snap = await getDocsAll();
    let max = 0;
    snap.forEach((q) => {
      const m = /^PED-(\d+)$/.exec(q.id);
      if (m) max = Math.max(max, Number(m[1]));
    });
    return max;
  } catch (error) {
    // permission-denied (cliente normal) u offline: no es un error fatal,
    // se degrada al número por tiempo (ver nextPedidoNumero).
    console.warn('[PEDIDOS] No se pudo leer la colección para numerar:', error);
    return null;
  }
}

/** Genera un número libre único a partir del reloj. Se usa cuando el cliente
 *  no puede leer la colección (las reglas solo lo permiten a admins), de modo
 *  que el flujo de pedido nunca quede bloqueado por un permission-denied.
 *  El resultado sigue cumpliendo /^PED-\d+$/ para el panel y la ordenación. */
function numeroPorTiempo(): string {
  return `PED-${String(Date.now()).slice(-9)}`;
}

/** Hace el id secuencial PED-001... PED-NNN calculado sobre los docs existentes.
 *  Si el usuario no puede leer la colección, devuelve un número único basado en
 *  el reloj para que el cliente siempre pueda registrar su pedido. */
export async function nextPedidoNumero(): Promise<string> {
  if (!db) return numeroPorTiempo();

  const max = await maxPedidoNumero();
  if (max === null) return numeroPorTiempo();
  return `PED-${String(max + 1).padStart(3, '0')}`;
}

/** Sube el comprobante de pago a Storage y devuelve sus datos + URL pública. */
export async function subirComprobante(file: File, pedidoNumero: string): Promise<ComprobantePago> {
  if (!storage) throw new Error('Firebase Storage no está disponible.');
  const ts = Date.now();
  // La extensión sigue al mime real: antes todo se guardaba como ".jpg"
  // aunque el comprobante fuera PNG o WebP.
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `comprobantes/${pedidoNumero}/${ts}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
  const url = await getDownloadURL(storageRef);
  return {
    url,
    nombre: nombreArchivo(file),
    mime: file.type || 'image/jpeg',
    tamaño: file.size,
    subidoAt: new Date().toISOString(),
  };
}

export interface NuevoPedidoInput {
  clienteUid: string;
  clienteEmail?: string;
  cliente: PedidoCliente;
  productos: PedidoProducto[];
  total: number;
  comprobantePago: ComprobantePago;
}

/** Valida los datos ANTES de enviarlos a Firestore (reglas de la colección). */
function validarDatos(data: Pedido): void {
  if (!data.numero) throw new Error('El pedido no tiene número.');
  if (!data.clienteUid) throw new Error('No se pudo identificar al cliente.');
  if (typeof data.total !== 'number' || !Number.isFinite(data.total) || data.total < 0) {
    throw new Error(`Total inválido (esperaba un número >= 0): ${JSON.stringify(data.total)}`);
  }
  if (!Array.isArray(data.productos) || data.productos.length === 0) {
    throw new Error('El pedido no tiene productos.');
  }
  data.productos.forEach((p, i) => {
    if (typeof p.id !== 'string' || typeof p.nombre !== 'string' || p.nombre === '') {
      throw new Error(`Producto ${i + 1} inválido (id/nombre requeridos).`);
    }
    if (typeof p.precio !== 'number' || typeof p.cantidad !== 'number' || typeof p.subtotal !== 'number') {
      throw new Error(`Producto ${i + 1} inválido (precio, cantidad y subtotal deben ser números).`);
    }
  });
  if (!data.cliente?.nombre?.trim() || !data.cliente?.telefono?.trim() || !data.cliente?.direccion?.trim()) {
    throw new Error('El cliente debe indicar nombre, teléfono y dirección.');
  }
  if (!data.comprobantePago?.url) {
    throw new Error('El pedido requiere el comprobante de pago subido.');
  }
}

/** Crea el pedido en Firestore con estado 'pendiente_pago'. Si se pasa
 *  numeroFijo (ya reservado para la subida del comprobante), se usa ese;
 *  si no, se calcula uno secuencial. La escritura va dentro de una
 *  transacción que falla si el id ya existe, para que dos pedidos simultáneos
 *  nunca se pisen entre sí. */
export async function crearPedido(input: NuevoPedidoInput, numeroFijo?: string): Promise<Pedido> {
  if (!db) throw new Error('Firestore no está disponible.');
  const numero = numeroFijo || (await nextPedidoNumero());
  const ahora = new Date().toISOString();
  const data: Pedido = {
    numero,
    clienteUid: input.clienteUid,
    clienteEmail: (input.clienteEmail || '').trim() || undefined,
    cliente: input.cliente,
    productos: input.productos,
    total: Number(input.total) || 0,
    comprobantePago: input.comprobantePago,
    metodoPago: 'yape',
    estado: 'pendiente_pago',
    historial: [{ estado: 'pendiente_pago', at: ahora, actor: input.clienteUid }],
    fechaCreacion: ahora,
  };

  validarDatos(data);

  const pedidoRef = doc(db, PEDIDOS_COLLECTION, numero);
  // Reintenta con otro número si el elegido ya estaba ocupado (dos clientes
  // simultáneos pueden calcular el mismo siguiente número).
  const intentos = [numero];
  for (let i = 0; i < 3; i++) intentos.push(numeroPorTiempo());

  for (const candidato of intentos) {
    const candidatoRef = doc(db, PEDIDOS_COLLECTION, candidato);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(candidatoRef);
        if (snap.exists()) throw new Error('__PEDIDO_EXISTE__');
        tx.set(candidatoRef, {
          ...(candidato === numero ? data : { ...data, numero: candidato }),
          updatedAt: serverTimestamp(),
        });
      });
      console.log(`[PEDIDOS] Pedido creado: ${candidato}`);
      return candidato === numero ? { ...data, saved: true } : { ...data, numero: candidato, saved: true };
    } catch (error) {
      const esChoque = error instanceof Error && error.message === '__PEDIDO_EXISTE__';
      const yaExiste = (error as { code?: string })?.code === 'already-exists';
      if (!esChoque && !yaExiste) throw error;
      if (candidato === intentos[intentos.length - 1]) {
        throw new Error('No se pudo asignar un número de pedido libre. Intenta de nuevo.');
      }
    }
  }

  throw new Error('No se pudo registrar el pedido. Intenta de nuevo.');
}

export interface ActualizarPedidoOpts {
  estado: PedidoEstado;
  descripcion?: string;
  actor: string;
}

/** Cambia el estado del pedido y registra el evento en el historial.
 *  Todo dentro de una transacción: así el historial nunca se pisa (antes un
 *  fallo de lectura lo reiniciaba a un solo elemento) ni se pierde un cambio
 *  si dos admins actúan a la vez. */
export async function actualizarEstadoPedido(numero: string, opts: ActualizarPedidoOpts): Promise<void> {
  if (!db) throw new Error('Firestore no está disponible.');
  const ref = doc(db, PEDIDOS_COLLECTION, numero);
  const ahora = new Date().toISOString();

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.data() as Partial<Pedido> | undefined;
    const historial: { estado: PedidoEstado; descripcion?: string; at: string; actor: string }[] =
      Array.isArray(cur?.historial) ? cur!.historial! : [];

    tx.update(ref, {
      estado: opts.estado,
      motivoRechazo:
        opts.estado === 'rechazado' ? opts.descripcion?.trim() || 'Sin motivo especificado' : null,
      historial: [
        ...historial,
        { estado: opts.estado, descripcion: opts.descripcion?.trim() || undefined, at: ahora, actor: opts.actor },
      ],
      updatedAt: serverTimestamp(),
    } as Partial<Pedido>);
  });
}

/** Opciones de `usePedidos`.
 *  - `enabled: false` NO abre ninguna suscripción en tiempo real. Sirve para
 *    superficies que solo quieren el badge de "pedidos pendientes" y que no
 *    deben pagar el coste de un onSnapshot solo para pintar un número. */
export interface UsePedidosOpts {
  enabled?: boolean;
}

/** Hook con listener en tiempo real:
 *  - admin → todos los pedidos que las reglas permitan;
 *  - cliente → solo sus propios pedidos (clienteUid).
 *
 *  Con `enabled: false` el hook devuelve la lista vacía y `loading: false`
 *  sin abrir listener: la pantalla de selección lo usa para pintar el badge
 *  diferido, y antes esto montaba un onSnapshot de la colección completa en
 *  CADA página de la app (incluida /seleccionar y /login). */
export function usePedidos(opts: UsePedidosOpts = {}): {
  pedidos: Pedido[];
  loading: boolean;
  error: string | null;
} {
  const enabled = opts.enabled !== false;
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const isAdmin = isEmailAdmin(user?.email);

  useEffect(() => {
    if (!enabled) {
      setPedidos([]);
      setError(null);
      setLoading(false);
      return;
    }
    if (!db || !user) {
      setPedidos([]);
      setLoading(false);
      return;
    }

    // Limpia la lista del usuario anterior antes de suscribirse: sin esto el
    // nuevo usuario ve un instante los pedidos de la sesión previa y el
    // notifier sella su línea base con datos ajenos.
    setPedidos([]);
    setError(null);
    setLoading(true);

    // El query usará SIEMPRE un filtro que el lector pueda satisfacer por las
    // reglas (evita "query no satisfiable"):
    //   - admin → sin filtro (las reglas leen todos los pedidos)
    //   - cliente → clienteUid
    const base = collection(db, PEDIDOS_COLLECTION);
    const q = isAdmin ? base : query(base, where('clienteUid', '==', user.uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Pedido[] = [];
        snap.forEach((d) => {
          const data = d.data() as Partial<Pedido>;
          if (data && data.numero && Array.isArray(data.productos) && data.clienteUid) {
            // Descarta estados desconocidos: si no, la fila no pertenece a
            // ninguna pestaña y la etiqueta sale "undefined".
            if (!PEDIDO_ESTADOS.includes(data.estado as PedidoEstado)) return;
            // Normaliza campos opcionales que la vista de detalle lee sin
            // guarding: un pedido creado antes de que existieran (o escrito a
            // mano desde la consola) llegan sin historial y sin motivoRechazo,
            // y `[...pedido.historial]` reventaba la vista completa del panel.
            list.push({
              ...(data as Pedido),
              historial: Array.isArray(data.historial) ? data.historial : [],
              motivoRechazo: typeof data.motivoRechazo === 'string' ? data.motivoRechazo : undefined,
              comprobantePago: (data.comprobantePago ?? {}) as Pedido['comprobantePago'],
              cliente: (data.cliente ?? { nombre: '', email: '' }) as Pedido['cliente'],
              total: Number.isFinite(data.total) ? Number(data.total) : 0,
              saved: true,
            });
          }
        });
        list.sort((a, b) => numeroPedido(b.numero) - numeroPedido(a.numero));
        setPedidos(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[PEDIDOS] Error escuchando:', err);
        setPedidos([]);
        setLoading(false);
        setError((err as Error)?.message || String(err));
      }
    );
    return unsub;
  }, [user?.uid, isAdmin, enabled]);

  return { pedidos, loading, error };
}