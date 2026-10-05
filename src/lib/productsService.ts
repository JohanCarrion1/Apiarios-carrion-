// ============================================================
// productsService.ts — FUENTE ÚNICA DE VERDAD del catálogo.
// Tanto el panel admin (/tienda/admin) como la tienda pública
// (/tienda) leen y escriben SIEMPRE desde aquí, bajo la MISMA
// clave de localStorage. Cada guardado dispara el CustomEvent
// 'products-changed' para que la tienda se actualice al instante
// (y 'storage' cubre los cambios en otras pestañas).
// ============================================================
import type { StoreProduct } from '../types/store';
import { mergeStoreSeeds, normalizeStoreProduct } from '../types/store';
import { STORE_SEED_PRODUCTS } from '../utils/storeSeed';
import { getCurrentUserId } from '../utils/storage';
import { normalizeProductImageUrl } from './cloudinary';

/**
 * Sube el catálogo a Firestore en segundo plano.
 *
 * Se importa dinámicamente a propósito: `firestoreSync` importa este módulo
 * para hidratar el catálogo, así que una importación estática cerraría un ciclo.
 * Al ser una escritura, además no debe bloquear ni tirar abajo la UI: si falla
 * (sin sesión, sin permisos, offline) el catálogo sigue guardado en local y se
 * avisa por consola. El error NO se propaga al llamador.
 */
const pushToCloud = (products: StoreProduct[]): void => {
  // Barrera: si el catálogo es EXACTAMENTE el semilla, no se sube. Significa que
  // el admin no ha cambiado nada, y que en realidad lo que se tiene delante es el
  // catálogo de arranque (con las 4 imágenes viejas hardcodeadas) en lugar del
  // de Firestore: subirlo pisaría el catálogo real. La comparación es por
  // id + imageUrl, que es lo único que distingue una semilla de su versión
  // editada de forma relevante para este riesgo.
  const esSemilla =
    products.length === STORE_SEED_PRODUCTS.length &&
    products.every((p, i) => {
      const seed = STORE_SEED_PRODUCTS[i];
      return seed && p.id === seed.id && (p.imageUrl || '') === (seed.imageUrl || '');
    });
  if (esSemilla) {
    console.warn(
      '[PRODUCTS] Catálogo idéntico al semilla: no se sube (evita pisar el catálogo de Firestore).'
    );
    return;
  }
  void import('../services/productsSync')
    .then((m) => m.pushProductsToFirestore(products))
    .catch((error) => {
      console.error('[PRODUCTS] No se pudo subir el catálogo a Firestore:', error);
    });
};

/** Clave única del catálogo: compatida por admin y tienda. */
export const STORAGE_KEY = 'apiarios_carrion_products_v1';

/** Evento lanzado cada vez que se guarda el catálogo (admin → tienda). */
export const PRODUCTS_CHANGED_EVENT = 'products-changed';

/** Evento lanzado cuando el catálogo excedió el tamaño y hubo que limpiar
    imágenes base64 (la tienda muestra el botón "Limpiar caché"). */
export const PRODUCTS_QUOTA_EVENT = 'products-quota-warning';

/** Clave legada del catálogo global del panel admin (migración one-shot). */
const LEGACY_ADMIN_KEY = 'panal_v1_admin_products';

/** Los 22 productos iniciales con sus imágenes por defecto. */
export const SEED_PRODUCTS: StoreProduct[] = STORE_SEED_PRODUCTS.map((p) => ({ ...p }));

/** Emoji de reemplazo si la imagen falla (fallback en las tarjetas). */
export const FALLBACK_EMOJI = '🛠️';

/** Umbral del catálogo en localStorage: si se supera se limpian los base64. */
export const MAX_STORAGE_MB = 4;

/** Tamaño máximo de una imagen base64 comprimida (500KB). */
export const MAX_BASE64_KB = 500;
const MAX_BASE64_BYTES = MAX_BASE64_KB * 1024;

/* Sin imágenes por defecto externas: las fotos de producto viven en Cloudinary.
   Un producto sin imagen devuelve '' y StoreImage muestra el emoji/placeholder
   local de su categoría. NUNCA una URL de un host de terceros. */

/** True si la imagen es base64 (ocupa ~4/3 de sus caracteres en localStorage). */
export const isBase64Image = (url: string | null | undefined): boolean =>
  typeof url === 'string' && /^data:image\//i.test(url.trim());

/** Imagen por defecto: siempre '' → placeholder local de la categoría.
    Las imágenes reales se suben a Cloudinary desde el panel admin. */
export const defaultImageFor = (_categoria?: string): string => '';

const truncateImage = (url?: string | null): string => {
  const img = (url || '').trim();
  if (!img) return '❌ Sin imagen';
  return img.startsWith('data:') ? `${img.substring(0, 60)}…` : `${img.substring(0, 60)}…`;
};

/** Valida que imageUrl no sea null/undefined antes de guardar. */
export const isValidImageUrl = (url: string | null | undefined): boolean =>
  typeof url === 'string' && url.trim().length > 0;

/** Tamaño en MB que ocuparía el catálogo en localStorage (debugging). */
export const getProductsStorageSizeMB = (products: StoreProduct[]): number => {
  try {
    return new Blob([JSON.stringify(products)]).size / (1024 * 1024);
  } catch {
    return 0;
  }
};

/** Tamaño en MB del catálogo ACTUALMENTE guardado en localStorage. */
export const getStoredCatalogSizeMB = (): number => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    return new Blob([raw]).size / (1024 * 1024);
  } catch {
    return 0;
  }
};

const notifyQuotaWarning = (): void => {
  try {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(PRODUCTS_QUOTA_EVENT));
  } catch (error) {
    console.error('❌ [PRODUCTS] Error al dispatchear products-quota-warning:', error);
  }
};

const notifyChanged = (products: StoreProduct[]): void => {
  try {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent<{ products: StoreProduct[] }>(PRODUCTS_CHANGED_EVENT, {
        detail: { products },
      })
    );
  } catch (error) {
    console.error('❌ [PRODUCTS] Error al dispatchear products-changed:', error);
  }
};

/** Reemplaza TODAS las imágenes base64 del catálogo por URLs externas (o '' →
    emoji de la categoría). Devuelve el catálogo ya ligero. */
export const clearBase64Images = (products: StoreProduct[]): StoreProduct[] => {
  const removed = products.reduce((n, p) => n + (isBase64Image(p.imageUrl) ? 1 : 0), 0);
  if (removed === 0) return products;
  const cleaned = products.map((p) =>
    isBase64Image(p.imageUrl) ? { ...p, imageUrl: defaultImageFor(p.categoria) } : p
  );
  console.warn(
    `🧹 [PRODUCTS] Limpiadas ${removed} imágenes base64 (se usan URLs/emojis por defecto).`
  );
  return cleaned;
};

/**
 * Guarda el catálogo completo bajo STORAGE_KEY, valida imageUrl y notifica
 * con 'products-changed'.
 *  - Si el catálogo supera MAX_STORAGE_MB (4MB) se limpian los base64 ANTES
 *    de guardar (preventivo).
 *  - Si localStorage aún lanza quota exceeded, se limpian TODOS los base64 y
 *    se guarda la versión ligera. NUNCA deja la app rota.
 * Devuelve el catálogo finalmente guardado.
 */
export const saveAll = (products: StoreProduct[]): StoreProduct[] => {
  let clean = products.map((p) => ({
    ...p,
    imageUrl: isValidImageUrl(p.imageUrl)
      ? normalizeProductImageUrl(p.imageUrl.trim())
      : '',
  }));

  // (6) Validación de tamaño antes de guardar (máx 4MB).
  let sizeMB = getProductsStorageSizeMB(clean);
  if (sizeMB > MAX_STORAGE_MB) {
    console.warn(`🧹 localStorage excede ${MAX_STORAGE_MB}MB, limpiando...`);
    clean = clearBase64Images(clean);
    sizeMB = getProductsStorageSizeMB(clean);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    if (import.meta.env.DEV) {
      console.log(`💾 Productos guardados: ${clean.length}`);
      console.log(`📊 Tamaño de localStorage: ${sizeMB.toFixed(2)} MB`);
    }
    notifyChanged(clean);
    return clean;
  } catch (error) {
    // (1) Quota exceeded: limpiar TODAS las imágenes base64 y re-guardar.
    console.warn('⚠️ localStorage lleno, limpiando imágenes base64...');
    const cleaned = clearBase64Images(clean);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    console.log(`💾 Productos guardados (versión limpia): ${cleaned.length}`);
    console.log(`📊 Tamaño de localStorage: ${getProductsStorageSizeMB(cleaned).toFixed(2)} MB`);
    notifyQuotaWarning();
    notifyChanged(cleaned);
    return cleaned;
  }
};

/**
 * Migración one-shot desde el catálogo previo:
 *   1) panal_v1_admin_products (catálogo global del admin)
 *   2) panal_v1_user_<uid>_products (catálogo por usuario)
 * Se completan los 22 productos semilla que falten.
 */
const migrateLegacy = (): StoreProduct[] | null => {
  let source: StoreProduct[] | null = null;

  try {
    const adminRaw = localStorage.getItem(LEGACY_ADMIN_KEY);
    if (adminRaw) {
      const parsed = JSON.parse(adminRaw) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) source = parsed as StoreProduct[];
    }
  } catch (error) {
    console.error('❌ [PRODUCTS] Error leyendo catálogo admin previo:', error);
  }

  if (!source) {
    try {
      const uid = getCurrentUserId();
      const ownRaw = localStorage.getItem(`panal_v1_user_${uid}_products`);
      if (ownRaw) {
        const parsed = JSON.parse(ownRaw) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) source = parsed as StoreProduct[];
      }
      if (!source) {
        const keys = Object.keys(localStorage).filter(
          (k) => k.startsWith('panal_v1_user_') && k.endsWith('_products')
        );
        for (const key of keys) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key) || '[]') as unknown;
            if (Array.isArray(parsed) && parsed.length > 0) {
              source = parsed as StoreProduct[];
              break;
            }
          } catch {
            /* probar la siguiente clave */
          }
        }
      }
    } catch (error) {
      console.error('❌ [PRODUCTS] Error migrando catálogo por usuario:', error);
    }
  }

  if (!source) return null;

  const normalized = source.map(normalizeStoreProduct);
  const merged = mergeStoreSeeds(normalized, SEED_PRODUCTS);
  console.log(`✅ [PRODUCTS] Migrados ${merged.length} productos desde catálogo anterior`);
  return merged;
};

/**
 * Lee el catálogo (getAll). Si la clave nueva tiene datos los usa; si el
 * JSON está corrupto resetea a semilla; si está vacía migra desde legado o
 * siembra los 22 productos iniciales.
 */
export const getAll = (): StoreProduct[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw != null && raw !== '') {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const list = parsed.length > 0
          ? (parsed as StoreProduct[]).map(normalizeStoreProduct)
          : SEED_PRODUCTS.map((p) => ({ ...p }));

        // Catálogos guardados antes de la migración a Cloudinary: sus imageUrl
        // apuntan a hosts externos (unsplash, qwenlm.ai, imgur...). Se limpian
        // al leer para que la tienda nunca renderice una URL de terceros y los
        // productos afectados caigan al placeholder local.
        const sanitized = list.map((p) => {
          const next = normalizeProductImageUrl(p.imageUrl);
          return next === (p.imageUrl || '').trim() ? p : { ...p, imageUrl: next };
        });
        if (sanitized.some((p, i) => p !== list[i])) {
          console.warn(
            '🧹 [PRODUCTS] URLs de imagen externas retiradas del catálogo guardado (ahora placeholder local).'
          );
          saveAll(sanitized);
          return sanitized;
        }
        // (2) Limpieza preventiva al iniciar si el catálogo guardado excede 4MB.
        const storedMB = getStoredCatalogSizeMB();
        if (storedMB > MAX_STORAGE_MB) {
          console.warn(`🧹 localStorage excede ${MAX_STORAGE_MB}MB, limpiando...`);
          const cleaned = clearBase64Images(list);
          saveAll(cleaned);
          notifyQuotaWarning();
          return cleaned;
        }
        console.log(`✅ [PRODUCTS] getAll: ${list.length} productos`);
        return list;
      }
      console.warn('❌ [PRODUCTS] JSON inválido en storage, reseteando a semilla');
      return reset();
    }
  } catch (error) {
    console.error('❌ [PRODUCTS] Error al leer el catálogo, reseteando a semilla:', error);
    return reset();
  }

  const migrated = migrateLegacy();
  if (migrated) {
    saveAll(migrated);
    return migrated;
  }

  console.log(`✅ [PRODUCTS] Sin catálogo guardado, sembrando ${SEED_PRODUCTS.length} productos`);
  const seeded = SEED_PRODUCTS.map((p) => ({ ...p }));
  saveAll(seeded);
  return seeded;
};

/** Busca un producto por id. */
export const findById = (id: string): StoreProduct | undefined =>
  getAll().find((p) => p.id === id);

/** Actualiza un producto existente y persiste (dispara 'products-changed').
    Devuelve el producto tal y como quedó GUARDADO (si la cuota de storage
    limpió su base64, devuelve la versión persistida, no la de memoria). */
export const update = (id: string, updates: Partial<StoreProduct>): StoreProduct | null => {
  const all = getAll();
  const index = all.findIndex((p) => p.id === id);
  if (index === -1) {
    console.error(`❌ [PRODUCTS] update: no existe el producto '${id}'`);
    return null;
  }
  const updated: StoreProduct = { ...all[index], ...updates, id };
  console.log(
    `🔍 Antes de guardar: ID: ${id}, Producto: ${updated.nombre}, Imagen: ${truncateImage(updated.imageUrl)}`
  );
  all[index] = updated;
  const saved = saveAll(all);
  const persisted = saved.find((p) => p.id === id) ?? updated;
  console.log(`✅ Después de guardar: Imagen guardada: ${truncateImage(persisted.imageUrl)}`);
  pushToCloud(saved);
  return persisted;
};

/** Agrega un producto nuevo (genera id si falta) y persiste.
    Devuelve el producto tal y como quedó GUARDADO (mismos criterios que
    update: la versión persistida manda sobre la de memoria). */
export const add = (product: StoreProduct): StoreProduct => {
  const all = getAll();
  const nuevo: StoreProduct = {
    ...product,
    id: product.id || `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  };
  console.log(
    `🔍 Antes de guardar: ID: ${nuevo.id}, Producto: ${nuevo.nombre}, Imagen: ${truncateImage(nuevo.imageUrl)}`
  );
  const next = all.some((p) => p.id === nuevo.id) ? all : [...all, nuevo];
  const saved = saveAll(next);
  const persisted = saved.find((p) => p.id === nuevo.id) ?? nuevo;
  console.log(`✅ Después de guardar: Imagen guardada: ${truncateImage(persisted.imageUrl)}`);
  pushToCloud(saved);
  return persisted;
};

/** Elimina un producto por id y persiste. Devuelve el catálogo guardado. */
export const deleteProduct = (id: string): StoreProduct[] => {
  const all = getAll().filter((p) => p.id !== id);
  console.log(`🗑️ [PRODUCTS] Eliminado producto: ${id} → quedan ${all.length}`);
  const saved = saveAll(all);
  // El borrado va explícito: si solo se subiera la lista restante, el producto
  // se quedaría en Firestore y reaparecería en el próximo arranque.
  void import('../services/productsSync')
    .then((m) => m.deleteProductFromFirestore(id))
    .catch((error) => console.error('[PRODUCTS] No se pudo borrar en Firestore:', error));
  return saved;
};

/** Resetea el catálogo a los 22 productos semilla (con confirmación del llamador). */
export const reset = (): StoreProduct[] => {
  const seeded = SEED_PRODUCTS.map((p) => ({ ...p }));
  console.log(`♻️ [PRODUCTS] Reset a semilla: ${seeded.length} productos`);
  const saved = saveAll(seeded);
  pushToCloud(saved);
  return saved;
};

/** Suscribirse a cambios del catálogo ('products-changed'). Devuelve unsubscribe. */
export const onProductsChanged = (listener: (products: StoreProduct[]) => void): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ products?: StoreProduct[] }>).detail;
    if (Array.isArray(detail?.products)) listener(detail.products as StoreProduct[]);
  };
  window.addEventListener(PRODUCTS_CHANGED_EVENT, handler);
  return () => window.removeEventListener(PRODUCTS_CHANGED_EVENT, handler);
};

/* ---------------------------------------------------------------------------
   Compresión de imágenes (Canvas API).
   Redimensiona a maxWidth (por defecto 400px) y exporta JPEG con calidad 50%.
   Si el base64 resultante supera 500KB se rechaza con un error claro.
   Devuelve un base64 comprimido listo para guardar en localStorage.
   --------------------------------------------------------------------------- */
export const compressImage = (file: File, maxWidth = 400, quality = 0.5): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const originalDataUrl = reader.result as string;

      // Ya cabe: se conserva tal cual sin degradar calidad.
      if (originalDataUrl.length * 0.75 <= MAX_BASE64_BYTES) {
        resolve(originalDataUrl);
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Imagen no válida'));
      img.onload = () => {
        try {
          const ratio = Math.min(1, maxWidth / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * ratio));
          canvas.height = Math.max(1, Math.round(img.height * ratio));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo comprimir la imagen'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          const compressedBytes = compressed.length * 0.75;
          const originalBytes = originalDataUrl.length * 0.75;
          const useOriginal = originalBytes <= compressedBytes && originalBytes <= MAX_BASE64_BYTES;
          const finalDataUrl = useOriginal ? originalDataUrl : compressed;
          const finalBytes = Math.min(compressedBytes, originalBytes);
          if (finalBytes > MAX_BASE64_BYTES) {
            reject(new Error(`Imagen muy pesada (máx ${MAX_BASE64_KB}KB)`));
            return;
          }
          console.log(
            `🖼️ [COMPRESS] ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(finalBytes / 1024).toFixed(0)}KB (${canvas.width}×${canvas.height}, q${Math.round(quality * 100)})`
          );
          resolve(finalDataUrl);
        } catch (error) {
          reject(error instanceof Error ? error : new Error('No se pudo comprimir la imagen'));
        }
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  });