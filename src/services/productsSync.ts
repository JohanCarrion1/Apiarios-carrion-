// ============================================================
// CATÁLOGO DE LA TIENDA EN FIRESTORE (colección `products`)
// ============================================================
// POR QUÉ ESTE MÓDULO
// El catálogo de la tienda se guardaba solo en localStorage, que está aislado
// por origen. Las imágenes subidas desde el admin en localhost vivían en el
// localStorage de `localhost` y nunca llegaban al despliegue de producción, que
// además arrancaba sin catálogo y caía a las semillas (22 productos, 4 con
// imagen). El resultado era una tienda con placeholders en Vercel.
//
// Ahora Firestore es la fuente de verdad del catálogo y localStorage queda como
// caché de lectura síncrona, igual que el resto de entidades de la app
// (`firestoreSync`). La tienda es de lectura pública, así que la LECTURA no
// exige sesión; las reglas (`allow read: if true`) ya lo permiten. La ESCRITURA
// sí exige admin, y aquí solo se intenta si hay usuario: las reglas la
// impermeabilizan igual.
//
// Este módulo NO importa `productsService` a propósito: `firestoreSync` lo
// llama durante la hidratación y `productsService` lo llama al guardar, así que
// importarlo aquí cerraría un ciclo de módulos. Laubertad es: este módulo solo
// habla con Firestore y devuelve/acepta `StoreProduct[]`; de la caché local se
// encarga quien lo llama.
// ============================================================
import { collection, deleteDoc, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db, isFirebaseAvailable } from '../lib/firebase';
import type { StoreProduct } from '../types/store';

/** Colección de nivel superior. El id del documento es el `id` del producto. */
export const PRODUCTS_COLLECTION = 'products';

/** Firestore acepta 500 escrituras por batch; el catálogo es pequeño, pero se
    trocea para que un catálogo grande no reviente el commit. */
const BATCH_LIMIT = 400;

const canRead = (): boolean => isFirebaseAvailable() && !!db;

/** Hay sesión con la que intentar escribir. Las reglas exigen, además, admin. */
const canWrite = (): boolean => canRead() && !!auth?.currentUser;

/**
 * Lee el catálogo de Firestore.
 *
 * Devuelve `null` —no `[]`— cuando la colección está vacía: la diferencia
 * importa, porque "vacío" significa "todavía no hay nadie que lo haya sembrado"
 * y la hidratación decide entonces si sube la caché local. Un `[]` se
 * interpretaría como "el catálogo se vació a propósito".
 */
export async function pullProductsFromFirestore(): Promise<StoreProduct[] | null> {
  if (!canRead()) return null;
  const snap = await getDocs(collection(db!, PRODUCTS_COLLECTION));
  const list = snap.docs
    .map((d) => d.data() as StoreProduct)
    .filter((p): p is StoreProduct => Boolean(p) && typeof p.id === 'string' && p.id.length > 0);
  return list.length > 0 ? list : null;
}

/** Sube/actualiza los productos indicados. Los ids que no llegan no se tocan. */
export async function pushProductsToFirestore(products: StoreProduct[]): Promise<number> {
  if (!canWrite()) {
    console.warn(
      '[PRODUCTS SYNC] Sin sesión, no se sube el catálogo a Firestore (se queda solo en la caché local).'
    );
    return 0;
  }
  const validos = products.filter((p) => p && typeof p.id === 'string' && p.id.length > 0);
  if (validos.length === 0) return 0;

  for (let i = 0; i < validos.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db!);
    for (const p of validos.slice(i, i + BATCH_LIMIT)) {
      // `merge: true` para no pisar campos que un doc tuviera de más.
      batch.set(doc(db!, PRODUCTS_COLLECTION, p.id), { ...p, updatedAt: serverTimestamp() }, { merge: true });
    }
    await batch.commit();
  }
  return validos.length;
}

/** Borra un producto del catálogo remoto (para que no reaparezca al rehidratar). */
export async function deleteProductFromFirestore(id: string): Promise<void> {
  if (!canWrite() || !id) return;
  await deleteDoc(doc(db!, PRODUCTS_COLLECTION, id));
}

/** Borra del catálogo remoto los ids que ya no están en la lista dada. */
export async function pruneProductsFromFirestore(currentIds: string[]): Promise<number> {
  if (!canWrite()) return 0;
  const snap = await getDocs(collection(db!, PRODUCTS_COLLECTION));
  const keep = new Set(currentIds);
  const sobrantes = snap.docs.map((d) => d.id).filter((id) => !keep.has(id));
  for (let i = 0; i < sobrantes.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db!);
    for (const id of sobrantes.slice(i, i + BATCH_LIMIT)) {
      batch.delete(doc(db!, PRODUCTS_COLLECTION, id));
    }
    await batch.commit();
  }
  return sobrantes.length;
}

/** URLs de Cloudinary (res.cloudinary.com) o vacías. Filtro defensivo para la
    migración: no deja subir a Firestore una URL rota o de un host externo. */
export function esImagenProductoValida(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const u = url.trim();
  if (u === '' || u.startsWith('data:')) return true;
  return /^https?:\/\/res\.cloudinary\.com\//i.test(u);
}