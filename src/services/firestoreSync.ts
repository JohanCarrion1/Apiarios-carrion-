// ============================================================
// FIRESTORE COMO FUENTE DE DATOS (caché local en lectura síncrona)
// ============================================================
// La app sigue leyendo/escribiendo de forma SÍNCRONA a través de
// `utils/storage.ts` (caché local), pero `storage` reenvía cada escritura de
// una entidad autorizada a este módulo, que replica el dato en Firestore.
//
// Modelo de datos (colecciones de nivel superior con userId por documento):
//   apiarios/{apiaryId}            → documento por apiario (id = apiary.id)
//   apiarioData/{apiaryId}_{ent}   → items de una entidad por usuario+apiario
//                                      (hives, nuclei, inspections, tasks,
//                                      harvests, breeding, queens,
//                                      queenHistory, fecundadores, cuadernoEntries)
//   userData/{userId}              → inventory + transferHistory del usuario
//
// Reglas: cada doc lleva userId y solo su propietario puede leer/escribirlo;
// los admins pueden leer/escribir todo (supervisión).
//
// Hidratación: al iniciar sesión (AuthContext) y antes de montar el dashboard
// (DataHydrationGate) se trae Firestore → caché local. Si el usuario aún no
// tiene datos en Firestore pero tiene datos previos en localStorage, se
// migran a Firestore (no se pierde nada).
// ============================================================
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, isFirebaseAvailable } from '../lib/firebase';
import {
  setSyncHandler,
  SYNC_ENTITIES,
  StoreSyncEvent,
  setHydrationInProgress,
  wasWrittenDuringHydration,
  loadApiaries,
  saveApiaries,
  loadHives,
  loadNuclei,
  loadInspections,
  loadTasks,
  loadHarvests,
  loadBreedingLots,
  loadQueens,
  loadQueenHistory,
  loadFecundadores,
  loadCuadernoEntries,
  loadCuadernoInspections,
  loadEvents,
  loadEventTemplates,
  loadRecurringTasks,
  loadFloweringEntries,
  loadTreatments,
  loadInventory,
  loadNotifications,
  loadSettings,
  loadData,
  saveData,
  loadHydratedAt,
  saveHydratedAt,
  HYDRATION_TTL_MS,
} from '../utils/storage';
import { getAll as getLocalProducts, saveAll as saveLocalProducts, hasUnsyncedChanges, refreshFromCloud } from '../lib/productsService';
import { pullProductsFromFirestore, pushProductsToFirestore } from './productsSync';
import { STORE_SEED_PRODUCTS } from '../utils/storeSeed';
import { normalizeStoreProduct } from '../types/store';

const APIARIOS_COLLECTION = 'apiarios';
const APIARIO_DATA_COLLECTION = 'apiarioData';
const USER_DATA_COLLECTION = 'userData';

/** Entidades por usuario y apiario (id de documento = `${apiaryId}_${entity}`). */
const APIARY_ENTITIES = [
  'hives',
  'nuclei',
  'inspections',
  'tasks',
  'harvests',
  'breeding',
  'queens',
  'queenHistory',
  'fecundadores',
  'cuadernoEntries',
  'cuadernoInspections',
  'events',
  'recurringTasks',
  'flowering',
  'eventTemplates',
  'treatments',
] as const;

type ApiaryEntity = (typeof APIARY_ENTITIES)[number];

/** Campos de ARRAY en el documento userData/{uid} (se guardan tal cual). */
const USER_ARRAY_ENTITIES = new Set(['inventory', 'transferHistory', 'notifications']);
/** Campos OBJETO/ESCALAR en userData/{uid} (llegan envueltos en [valor]). */
const USER_DOC_ENTITIES = new Set(['settings', 'harvestUnit', 'annualGoal', 'basePrice', 'conversacionesIA']);

const suffixFor = (userId: string, apiaryId: string): string => `_${userId}_${apiaryId}`;

// ------------------------------------------------------------
// ÍNDICES DE FIRESTORE (por qué NO hay índices compuestos que crear)
// ------------------------------------------------------------
// Índices usados hoy (todos son de UN SOLO campo, que Firestore crea solo):
//
//   apiarios            where('userId', '==', uid)            → índice simple userId
//   apiarioData/{id}    getDoc por id (aa_{apiaryId}_{entity}) → no usa índice
//   userData/{uid}      getDoc por id                          → no usa índice
//   users/{uid}         getDoc por id                          → no usa índice
//   products            getDocs colección completa             → no usa índice
//
// El modelo guarda las entidades de cada apiario como un ARRAY dentro de un
// único documento (`apiarioData/{apiaryId}_{entity}` → `items: [...]`), no como
// colección con un documento por colmena. Por eso NO se puede consultar
// `where('status','==','healthy').orderBy(...)` a nivel de colmena: no existe
// una colección `hives` con esos campos, y crear un índice compuesto sobre
// `apiarioData` no aporta nada porque la lectura es por id, no por consulta.
//
// Si en el futuro se migrara a una colección plana `hives/{hiveId}` (cambio de
// ARQUITECTURA, fuera del alcance actual) para permitir paginación real con
// `limit()`/`startAfter()`, entonces sí harían falta estos compuestos:
//   hives    userId ASC, status ASC, lastInspection DESC
//   hives    userId ASC, apiaryId ASC, updatedAt DESC
//   nuclei   userId ASC, status ASC, updatedAt DESC
//   fecundadores userId ASC, queenState ASC, updatedAt DESC
// Mientras el modelo siga siendo el array-en-documento, la paginación es de
// render (ver `ShowMoreButton`) y no requiere ningún índice nuevo.

// Guardas de sesión (evita escribir con uid 'anonymous' o sin Firebase)
const canSync = (userId?: string): boolean => {
  if (!isFirebaseAvailable() || !db) return false;
  if (!auth?.currentUser) return false;
  return !!(userId && userId !== 'anonymous');
};

const entityDoc = (apiaryId: string, entity: ApiaryEntity) =>
  doc(db!, APIARIO_DATA_COLLECTION, `${apiaryId}_${entity}`);

// ------------------------------------------------------------
// Escritura en caché local (Firestore → local, SIN eco al servidor)
// ------------------------------------------------------------
/**
 * Vuelca en la caché local lo que acaba de llegar de Firestore.
 *
 * Una sola `saveData` para las 16 entidades en lugar de un switch con su
 * wrapper: `entityKey` acepta tanto el sufijo heredado (`_uid_apiaryId`) como
 * el par `userId + apiaryId` —`buildEntityKey` dedupe el uid—, así que ambas
 * formas resuelven la misma clave y un punto de entrada basta.
 *
 * `sync: false` es imprescindible y es la mitad del motivo de este helper.
 * Esto es una LECTURA remota → local: notificarla reescribiría en Firestore el
 * dato que acabamos de descargar. En el primer arranque de un dispositivo
 * nuevo eso son 16 subidas pegadas a las 16 bajadas, duplicando el tráfico
 * justo en la fase que más bandwidth necesita (móvil / 3G) y ensuciando la
 * cola de reintentos con escrituras que no cambian nada.
 *
 * La migración local → servidor no se toca: la sigue haciendo `hydrateEntity`
 * con `upsertApiaryEntity` cuando lo remoto está vacío y lo local tiene datos.
 */
const saveToLocal = (
  entity: ApiaryEntity,
  items: unknown[],
  userId: string,
  apiaryId?: string
): void => {
  void saveData(entity, items, { userId, apiaryId, sync: false });
};

const loadFromLocal = (
  entity: ApiaryEntity,
  userId: string,
  apiaryId: string
): unknown[] => {
  const suffix = suffixFor(userId, apiaryId);
  switch (entity) {
    case 'hives':
      return loadHives(suffix);
    case 'nuclei':
      return loadNuclei(suffix);
    case 'inspections':
      return loadInspections(suffix);
    case 'tasks':
      return loadTasks(suffix);
    case 'harvests':
      return loadHarvests(suffix);
    case 'breeding':
      return loadBreedingLots(userId, apiaryId);
    case 'queens':
      return loadQueens(userId, apiaryId);
    case 'queenHistory':
      return loadQueenHistory(userId, apiaryId);
    case 'fecundadores':
      return loadFecundadores(userId, apiaryId);
    case 'cuadernoEntries':
      return loadCuadernoEntries(userId, apiaryId);
    case 'cuadernoInspections':
      return loadCuadernoInspections(suffix);
    case 'events':
      return loadEvents(suffix);
    case 'recurringTasks':
      return loadRecurringTasks(suffix);
    case 'flowering':
      return loadFloweringEntries(suffix);
    case 'eventTemplates':
      return loadEventTemplates(suffix);
    case 'treatments':
      return loadTreatments(userId, apiaryId);
  }
};

// ------------------------------------------------------------
// Escritura en Firestore
// ------------------------------------------------------------

const upsertApiaryEntity = async (
  userId: string,
  apiaryId: string,
  entity: ApiaryEntity,
  items: unknown[]
): Promise<void> => {
  if (!canSync(userId)) return;
  await setDoc(entityDoc(apiaryId, entity), {
    userId,
    apiaryId,
    entity,
    items,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

const deleteApiaryEntities = async (apiaryId: string): Promise<void> => {
  if (!db) return;
  // Batch: las 16 entidades de un apiario se borran en UN commit en vez de 16
  // viajes secuenciales. Reduce operaciones de escritura y cuesta de red.
  const batch = writeBatch(db);
  for (const entity of APIARY_ENTITIES) {
    batch.delete(entityDoc(apiaryId, entity));
  }
  try {
    await batch.commit();
  } catch {
    /* ignore */
  }
};

// ------------------------------------------------------------
// Escritura directa del ESTADO de una colmena/núcleo/fecundador
// ------------------------------------------------------------
// El estado calculado (status de colmenas/núcleos, queenState de fecundadores)
// se persiste en el ÍTEM dentro del documento padre de la entidad:
//   apiarioData/{apiaryId}_hives         → items[i].status
//   apiarioData/{apiaryId}_nuclei        → items[i].status
//   apiarioData/{apiaryId}_fecundadores → items[i].queenState
// Ese documento es la ÚNICA fuente que la app lee (la hidratación solo consulta
// apiarioData), por lo que parchear el ítem es lo que hace que el estado sobreviva
// a una recarga. Antes se escribían documentos raíz colmenas/nucleos/fecundadores
// que ninguna lectura del app consumía: una escritura muerta.
//
// Se usa `updateDoc` con rutas `items.{i}.{campo}` en lugar de `setDoc` del array
// completo para no pisar el resto de los ítems ni el userId (que exigen las
// reglas), y para no degradar la escritura a un replace completo.
export const updateColonyStatus = async (
  userId: string,
  apiaryId: string,
  entity: 'hives' | 'nuclei' | 'fecundadores',
  hiveId: string,
  status: string,
  hasQueen?: boolean,
  field: string = 'status'
): Promise<void> => {
  if (!canSync(userId) || !db) return;
  const ref = entityDoc(apiaryId, entity);
  const snap = await getDoc(ref);
  const items = snap.exists() ? (snap.data()?.items as any[] | undefined) : undefined;
  if (!Array.isArray(items)) {
    // Sin documento en Firestore todavía: el próximo volcado de la lista
    // (saveHives/saveNuclei/saveFecundadores) lo creará con el estado correcto.
    console.warn(`[FIRESTORE] Sin documento ${entity} para ${apiaryId}; el estado de ${hiveId} viajará en el próximo volcado.`);
    return;
  }
  const index = items.findIndex((it) => it && it.id === hiveId);
  if (index === -1) {
    console.warn(`[FIRESTORE] ${hiveId} no está en ${entity} de ${apiaryId}; no se parchea el estado.`);
    return;
  }
  const patch: Record<string, unknown> = {
    [`items.${index}.${field}`]: status,
    [`items.${index}.updatedAt`]: new Date().toISOString(),
  };
  if (hasQueen !== undefined) patch[`items.${index}.hasQueen`] = hasQueen;
  await updateDoc(ref, patch);
};

/** Reconcilia la lista de apiarios del usuario con Firestore. */
const reconcileUserApiaries = async (userId: string, list: any[]): Promise<void> => {
  if (!canSync(userId)) return;
  const items = Array.isArray(list) ? list : [];
  // Upsert de los apiarios actuales en UN batch (antes: un setDoc por apiario,
  // en serie). `merge: true` no pisa campos extra de documentos existentes.
  const batch = writeBatch(db!);
  let pending = 0;
  for (const apiary of items) {
    if (!apiary || !apiary.id) continue;
    const { userId: _owner, ...fields } = apiary;
    batch.set(
      doc(db!, APIARIOS_COLLECTION, apiary.id),
      { userId, ...fields, updatedAt: serverTimestamp() },
      { merge: true }
    );
    pending += 1;
  }
  if (pending > 0) await batch.commit();
  // Eliminar apiarios que ya no existen en la lista (y sus datos ligados)
  const snap = await getDocs(query(collection(db!, APIARIOS_COLLECTION), where('userId', '==', userId)));
  const existingIds = items.map((a) => a && a.id).filter(Boolean);
  await Promise.all(
    snap.docs
      .map((d) => d.id)
      .filter((id) => !existingIds.includes(id))
      .map(async (removedId) => {
        try {
          await deleteDoc(doc(db!, APIARIOS_COLLECTION, removedId));
        } catch {
          /* ignore */
        }
        await deleteApiaryEntities(removedId);
      })
  );
};

const updateUserDataDoc = async (
  userId: string,
  partial: Record<string, unknown>
): Promise<void> => {
  if (!canSync(userId)) return;
  await setDoc(
    doc(db!, USER_DATA_COLLECTION, userId),
    { userId, ...partial, updatedAt: serverTimestamp() },
    { merge: true }
  );
};

const upsertApiariosLocal = (list: any[], userId: string): void => {
  saveApiaries(list, userId);
};

// ------------------------------------------------------------
// Handler de escrituras (registrado desde storage.ts)
// ------------------------------------------------------------
export const handleSyncEvent = async (evt: StoreSyncEvent): Promise<void> => {
  if (!canSync(evt.userId)) return;
  const { entity, userId, apiaryId, items, removed } = evt;

  if (entity === 'apiaries') {
    await reconcileUserApiaries(userId, items as any[]);
    return;
  }

  if (USER_ARRAY_ENTITIES.has(entity)) {
    await updateUserDataDoc(userId, { [entity]: removed ? [] : items });
    return;
  }

  // Campos objeto/escalar de userData: notifySync normaliza a array, así que
  // el valor real viaja en items[0] (o llega vacío al borrar la clave).
  if (USER_DOC_ENTITIES.has(entity)) {
    await updateUserDataDoc(userId, { [entity]: removed ? null : (items[0] ?? null) });
    return;
  }

  if (!apiaryId) return;
  const ent = entity as ApiaryEntity;
  if ((APIARY_ENTITIES as readonly string[]).includes(ent)) {
    if (removed) {
      try {
        await deleteDoc(entityDoc(apiaryId, ent));
      } catch {
        /* ignore */
      }
    } else {
      await upsertApiaryEntity(userId, apiaryId, ent, items);
    }
  }
};

// ------------------------------------------------------------
// Hidratación: Firestore → caché local (y migración local → Firestore)
// ------------------------------------------------------------

/**
 * Hidrata UNA entidad de UN apiario.
 *
 * Se exporta por entidad a propósito: cada sección pide solo lo que necesita
 * (el menú de selección no pide nada; Control de Colmenas pide hives/nuclei;
 * el cuaderno pide cuadernoEntries/events...). Así la app no descarga las 14
 * entidades de todos los apiarios solo para mostrar un menú.
 */
export const hydrateEntity = async (
  userId: string,
  apiaryId: string,
  entity: ApiaryEntity
): Promise<void> => {
  const snap = await getDoc(entityDoc(apiaryId, entity));
  const remote = snap.data();
  if (remote && Array.isArray(remote.items)) {
    // Si la app escribió esta clave mientras nuestra petición estaba en vuelo,
    // el valor local es del usuario y más nuevo que esta instantánea: no se
    // pisa. La ventana existe desde que el gate dejó de bloquear el montaje
    // con caché local; sin esta comprobación, un cambio hecho en los primeros
    // segundos desaparecería en cuanto bajara lo remoto.
    if (!wasWrittenDuringHydration(entity, { userId, apiaryId })) {
      saveToLocal(entity, remote.items as unknown[], userId, apiaryId);
    }
  } else {
    const local = loadFromLocal(entity, userId, apiaryId);
    if (Array.isArray(local) && local.length > 0) {
      await upsertApiaryEntity(userId, apiaryId, entity, local);
    }
  }
};

/**
 * Hidratación por entidad, memoizada en memoria durante la sesión.
 *
 * Antes cada visita a una sección re-leía sus documentos. Con esta tabla, la
 * segunda entrada reutiliza la promesa ya resuelta: coste cero y sin
 * esperas. La clave incluye usuario, apiario y entidad, así que al cambiar de
 * sesión no se sirve nada cacheado de otra cuenta.
 */
const entityPromises = new Map<string, Promise<void>>();

/** Descarta la caché de hidratación (cambio de sesión o "sincronizar ahora"). */
export const clearHydrationCache = (): void => {
  entityPromises.clear();
  hydrationPromises.clear();
};

export const getEntityHydrationPromise = (
  userId: string,
  apiaryId: string,
  entity: ApiaryEntity
): Promise<void> => {
  // Purga automática: si la sesión activa es otra, la caché de la anterior ya
  // no sirve para nada. Se hace aquí y no en el logout para no tocar el
  // sistema de autenticación. Además acota la memoria en sesiones largas.
  const prefijoActivo = `${userId}|`;
  for (const key of Array.from(entityPromises.keys())) {
    if (!key.startsWith(prefijoActivo)) entityPromises.delete(key);
  }
  const key = `${userId}|${apiaryId}|${entity}`;
  let p = entityPromises.get(key);
  if (!p) {
    p = hydrateEntity(userId, apiaryId, entity).catch((error) => {
      // Se usa la caché local: la hidratación no debe tumbar la pantalla.
      console.warn(`[FIRESTORE] Hidratación incompleta de ${entity}/${apiaryId}:`, error);
    });
    entityPromises.set(key, p);
  }
  return p;
};

/**
 * Hidrata un conjunto de entidades de un apiario, EN PARALELO.
 *
 * Antes era un `for` con `await`: 16 entidades x N apiarios salían como
 * 15N viajes de ida y vuelta en serie. Con 3 apiarios son 45 round-trips
 * encadenados, y eso es justo el "Sincronizando datos…" que bloqueaba la app.
 * Ahora es una sola profundidad de red: 15N peticiones simultáneas.
 */
const hydrateApiaryEntities = async (userId: string, apiaryId: string): Promise<void> => {
  await Promise.all(APIARY_ENTITIES.map((entity) => getEntityHydrationPromise(userId, apiaryId, entity)));
};

/**
 * Aplica a la caché local los campos del documento userData/{uid} — ajustes,
 * notificaciones, inventario, historial de transferencias y config de cosecha
 * — y, si el servidor todavía no tiene un campo, sube el valor local
 * (migración one-shot por campo).
 *
 * El vuelco remoto → local se hace con `sync: false`: es una lectura, no un
 * cambio del usuario, y notificar de vuelta solo reescribiría en el servidor
 * el valor que acabamos de leer de él.
 */
const hydrateUserFields = async (
  userId: string,
  data: Record<string, unknown> | undefined
): Promise<void> => {
  const push: Record<string, unknown> = {};
  const remote = (key: string): unknown => data?.[key];

  const settings = remote('settings');
  if (
    settings &&
    typeof settings === 'object' &&
    !Array.isArray(settings) &&
    Object.keys(settings as object).length > 0
  ) {
    saveData('settings', settings, { userId, sync: false });
  } else {
    const local = loadSettings();
    if (local && Object.keys(local).length > 0) push.settings = local;
  }

  const notifications = remote('notifications');
  if (Array.isArray(notifications)) {
    saveData('notifications', notifications, { userId, sync: false });
  } else {
    const local = loadNotifications();
    if (local.length > 0) push.notifications = local;
  }

  const inventory = remote('inventory');
  if (Array.isArray(inventory)) {
    saveData('inventory', inventory, { userId, sync: false });
  } else {
    const local = loadInventory(userId);
    if (local.length > 0) push.inventory = local;
  }

  const transferHistory = remote('transferHistory');
  if (Array.isArray(transferHistory)) {
    saveData('transferHistory', transferHistory, { userId, sync: false });
  } else {
    const local = loadData('transferHistory', [] as unknown[], { userId });
    if (local.length > 0) push.transferHistory = local;
  }

  const unit = remote('harvestUnit');
  if (typeof unit === 'string' && unit.length > 0) {
    saveData('harvestUnit', unit, { userId, sync: false });
  } else {
    const local = loadData<string | null>('harvestUnit', null, { userId });
    if (local) push.harvestUnit = local;
  }

  const goal = remote('annualGoal');
  if (typeof goal === 'number' && isFinite(goal)) {
    saveData('annualGoal', goal, { userId, sync: false });
  } else {
    const local = loadData<number | null>('annualGoal', null, { userId });
    if (typeof local === 'number' && isFinite(local)) push.annualGoal = local;
  }

  const price = remote('basePrice');
  if (typeof price === 'number' && isFinite(price)) {
    saveData('basePrice', price, { userId, sync: false });
  } else {
    const local = loadData<number | null>('basePrice', null, { userId });
    if (typeof local === 'number' && isFinite(local)) push.basePrice = local;
  }

  // Historial del Asistente IA: objeto `{ conversaciones, activaId }`. Como el
  // resto de campos de userData, si la app ya lo escribió durante esta
  // hidratación no se pisa (el valor local es más nuevo que la instantánea).
  const chat = remote('conversacionesIA');
  if (
    chat &&
    typeof chat === 'object' &&
    !Array.isArray(chat) &&
    Array.isArray((chat as { conversaciones?: unknown }).conversaciones)
  ) {
    if (!wasWrittenDuringHydration('conversacionesIA', { userId })) {
      saveData('conversacionesIA', chat, { userId, sync: false });
    }
  } else {
    const local = loadData<{ conversaciones?: unknown[] } | null>('conversacionesIA', null, { userId });
    if (local && Array.isArray(local.conversaciones) && local.conversaciones.length > 0) {
      push.conversacionesIA = local;
    }
  }

  if (Object.keys(push).length > 0) {
    await updateUserDataDoc(userId, push);
    console.log(`🛰️ [FIRESTORE] Campos de usuario migrados al servidor: ${Object.keys(push).join(', ')}`);
  }
};

/**
 * Paso 1 de la hidratación: documento `userData` → local (ajustes,
 * notificaciones, inventario, transferencias, unidad de cosecha…) y, en el
 * sentido inverso, los campos locales que el servidor aún no tiene.
 *
 * Está separado y memoizado de forma independiente porque es lo único que la
 * app necesita ANTES de montar el dashboard: los efectos de montaje (que
 * persisten notificaciones, inventario y ajustes) pueden correr mientras la
 * hidratación sigue; si lo remoto se aplicara al final, esos efectos ya
 * habrían subido antes su estado local viejo y pisarían los datos buenos del
 * servidor. Aplicar lo remoto primero cierra esa carrera.
 *
 * El resto de la hidratación (apiarios y sus 16 entidades) NO depende de
 * esto, así que sale en paralelo: una sola lectura aquí no puede ser la que
 * retrase el arranque.
 */
const userFieldsPromises = new Map<string, Promise<void>>();

const applyUserFields = (userId: string): Promise<void> => {
  const cached = userFieldsPromises.get(userId);
  if (cached) return cached;
  const p = (async () => {
    // PERF: es el único viaje que bloquea el dashboard en modo `progressive`.
    const etiquetaPerf = `[PERF] userData (${userId})`;
    console.time(etiquetaPerf);
    try {
      const snap = await getDoc(doc(db!, USER_DATA_COLLECTION, userId));
      await hydrateUserFields(
        userId,
        snap.exists() ? (snap.data() as Record<string, unknown>) : undefined
      );
    } finally {
      console.timeEnd(etiquetaPerf);
    }
  })().catch((error) => {
    // No se memoriza el fallo: si la red falló al arrancar, el siguiente
    // intento (una nueva visita o `rehydrateUserData`) vuelve a pedirlo.
    userFieldsPromises.delete(userId);
    throw error;
  });
  userFieldsPromises.set(userId, p);
  return p;
};

/**
 * Promesa solo de los campos de usuario, para la puerta de datos.
 *
 * Con caché local de apiarios + este paso resuelto, el dashboard puede
 * montar ya: lo que queda (apiarios y entidades) sigue bajando por detrás y
 * `onFirestoreHydrated` refresca el estado en memoria cuando termina. Es la
 * diferencia entre esperar 1 viaje y esperar 1 + 16 x N.
 */
export const getUserFieldsPromise = (userId: string): Promise<void> => {
  if (!canSync(userId)) return Promise.resolve();
  return applyUserFields(userId).catch(() => undefined);
};

/**
 * ¿Hay caché local "de verdad" (al menos un apiario con colmenas)?
 *
 * Es la condición para que el TTL tenga sentido: saltarse Firestore solo es
 * seguro si en local hay datos completos de una hidratación previa. Sin
 * colmenas, se hidrata siempre (dispositivo nuevo, o el usuario aún no ha
 * creado nada).
 */
const hasLocalData = (userId: string): boolean => {
  const apiaries = (loadApiaries(userId) as any[]).filter((a) => a && a.id);
  if (apiaries.length === 0) return false;
  return apiaries.some(
    (a) => (loadData('hives', [] as any[], { userId, apiaryId: String(a.id) }) as any[]).length > 0
  );
};

const hydrateUserData = async (userId: string, opts: { force?: boolean } = {}): Promise<void> => {
  if (!canSync(userId)) return;

  // TTL (ver HYDRATION_TTL_MS): caché local fresca → no se toca la red. Es la
  // optimización de consultas del arranque: en recargas seguidas dentro de la
  // ventana de 5 min, cero getDocs. `rehydrateUserData` fuerza con `force`.
  if (!opts.force && hasLocalData(userId) && Date.now() - loadHydratedAt(userId) < HYDRATION_TTL_MS) {
    console.log('[FIRESTORE] Hidratación omitida: caché local fresca (<5 min)');
    return;
  }

  // PERF: medición del arranque de datos. `console.timeEnd` imprime en consola
  // cuánto tarda la hidratación completa (oleadas incluidas) para poder
  // comparar antes/después y detectar regresiones en móvil/3G.
  const etiquetaPerf = `[PERF] Hidratación de datos (${userId})`;
  console.time(etiquetaPerf);
  // Marca la caché como "aún no fiable": mientras dure, `writeToKey` no deja
  // que un arranque con caché parcial vacíe claves que Firestore todavía no ha
  // entregado. Se pone ANTES del primer `await` para que el valor esté puesto
  // de forma síncrona, en la misma tarea que llama a `getHydrationPromise`.
  setHydrationInProgress(true);
  try {
    const localApiaries = (loadApiaries(userId) as any[]).filter((a) => a && a.id);
    const localIds = Array.from(new Set(localApiaries.map((a) => String(a.id))));

    // --- oleada 1: todo lo que no depende de nada más, a la vez ---
    //
    // Antes eran TRES round-trips en serie antes de poder leer una sola
    // entidad: (1) documento userData + catálogo, (2) campos de usuario,
    // (3) consulta de apiarios — y solo después (4) las 16 entidades por
    // apiario. En 3G eso son 3-4 s de pantalla de espera contados al inicio
    // del arranque, que es exactamente lo que se veía como "carga lenta".
    //
    // Ahora los cuatro pasos salen juntos. El matiz importante: los apiarios
    // que YA están en local arrancan sus entidades sin esperar a la lista
    // remota. Son los mismos ids que va a devolver la consulta y
    // `entityPromises` memoiza por (usuario, apiario, entidad), así que la
    // pasada final no repite ni una petición.
    const [, , remoteSnap] = await Promise.all([
      // Ya captura sus propios errores: si el documento de usuario no llega,
      // el resto de la hidratación debe seguir igual (la caché local sirve).
      getUserFieldsPromise(userId),
      // El catálogo es secundario para el arranque: un fallo suyo no debe
      // costarle a la app los apiarios y las entidades.
      hydrateProducts().catch(() => undefined),
      getDocs(query(collection(db!, APIARIOS_COLLECTION), where('userId', '==', userId))),
      Promise.all(localIds.map((apiaryId) => hydrateApiaryEntities(userId, apiaryId))),
    ]);

    const remoteApiaries = remoteSnap.docs
      .map((d) => d.data() as any)
      .filter((a) => a && a.id);
    const remoteIds = new Set(remoteApiaries.map((a: any) => a.id));
    const onlyLocal = localApiaries.filter((a: any) => !remoteIds.has(a.id));
    // Apiarios que solo están en el servidor (p. ej. creados en otro equipo):
    // sus entidades no se pudieron pedir en la oleada 1.
    const newIds = remoteApiaries
      .map((a: any) => String(a.id))
      .filter((id) => !localIds.includes(id));

    // --- oleada 2: lo único que sí depende de la oleada 1, también en paralelo ---
    await Promise.all([
      remoteApiaries.length > 0
        ? Promise.resolve(upsertApiariosLocal(remoteApiaries, userId))
        : onlyLocal.length > 0
          ? // Migración: el usuario ya tenía apiarios en localStorage que aún no
            // existen en Firestore → subirlos (no se pierde nada).
            reconcileUserApiaries(userId, onlyLocal).then(() => {
              console.log(`🛰️ [FIRESTORE] Migrados ${onlyLocal.length} apiarios del usuario ${userId}`);
            })
          : Promise.resolve(),
      Promise.all(newIds.map((apiaryId) => hydrateApiaryEntities(userId, apiaryId))),
    ]);

    // Hidratación completa → marca de frescura para el TTL.
    saveHydratedAt(userId);
  } finally {
    setHydrationInProgress(false);
    console.timeEnd(etiquetaPerf);
  }
};

/**
 * Hidrata el catálogo de la tienda: Firestore -> caché local.
 *
 * Tres casos:
 *  1. Firestore tiene catálogo -> es la fuente de verdad y se vuelca en la caché
 *     local. Solo si cambia de verdad, para no reescribir localStorage (y no
 *     disparar 'products-changed') en cada arranque.
 *  2. Firestore vacío pero el local tiene catálogo -> se sube el local. Es la
 *     migración: la primera vez que se abre la app con la colección recién
 *     creada.
 *  3. Local intacto (solo semillas) -> NO se sube nada. Sin este caso, el
 *     primer usuario que abriera la app en producción sembraría 22 productos de
 *     los que 18 no tienen imagen, pisando el catálogo que el admin hubiera
 *     configurado. Las semillas no son un catálogo; son un placeholder.
 */
const hydrateProducts = async (): Promise<void> => {
  // Si hay un cambio de catálogo hecho en este equipo que aún no llegó a la
  // nube (p. ej. un precio editado sin permisos/conexión), NO se pisa con lo
  // remoto: se reintenta subirlo. Así el precio nuevo no "vuelve" al viejo.
  if (hasUnsyncedChanges()) {
    await refreshFromCloud();
    return;
  }
  const remoto = await pullProductsFromFirestore();

  if (remoto) {
    const local = getLocalProducts();
    const mismo =
      local.length === remoto.length &&
      local.every((p, i) => JSON.stringify(p) === JSON.stringify(remoto[i]));
    if (!mismo) {
      saveLocalProducts(remoto.map(normalizeStoreProduct));
      console.log(`🛰️ [FIRESTORE] Catálogo hidratado: ${remoto.length} productos`);
    }
    return;
  }

  const local = getLocalProducts();
  if (local.length === 0) return;

  // ¿Es el catálogo real o solo las semillas sin tocar?
  const esSoloSemilla =
    local.length === STORE_SEED_PRODUCTS.length &&
    local.every((p, i) => p.id === STORE_SEED_PRODUCTS[i].id);
  if (esSoloSemilla) {
    console.log(
      '🌱 [FIRESTORE] Catálogo vacío en Firestore y local sin editar: no se siembran las semillas.'
    );
    return;
  }

  const subidos = await pushProductsToFirestore(local);
  if (subidos > 0) {
    console.log(`🛰️ [FIRESTORE] Catálogo local subido a Firestore: ${subidos} productos`);
  }
};

// Promesa de hidratación por usuario (evita re-hidratar en cada render).
const hydrationPromises = new Map<string, Promise<void>>();

// Aviso de hidratación completada. `hydrateApiaryEntities` sobrescribe la caché
// local sin pasar por React, así que sin este aviso el estado en memoria puede
// quedar viejo con `loadedScope` ya activo; el siguiente cambio del usuario
// entonces subiría ese array obsoleto a Firestore y pisaría el dato bueno.
const hydratedListeners = new Set<(userId: string) => void>();

export const onFirestoreHydrated = (listener: (userId: string) => void): (() => void) => {
  hydratedListeners.add(listener);
  return () => {
    hydratedListeners.delete(listener);
  };
};

const notifyHydrated = (userId: string): void => {
  hydratedListeners.forEach((listener) => {
    try {
      listener(userId);
    } catch {
      /* noop */
    }
  });
};

export const getHydrationPromise = (userId: string, force = false): Promise<void> => {
  // `force` (rehidratación manual) descarta tanto la promesa cacheada como el
  // TTL: se vuelve a leer Firestore aunque la caché local sea reciente.
  if (force) hydrationPromises.delete(userId);
  if (!hydrationPromises.has(userId)) {
    const p = hydrateUserData(userId, { force })
      .catch((error) => {
        console.warn('[FIRESTORE] Hidratación incompleta (se usa caché local):', error);
      })
      .finally(() => {
        notifyHydrated(userId);
      });
    // La promesa se queda cacheada durante toda la sesión. Antes se borraba a
    // los 60 s, lo que hacía que volver a una sección rehidratara TODO el
    // usuario (16 entidades x todos sus apiarios) aunque la caché local ya
    // estuviera al día. Para forzar la relectura está `rehydrateUserData`.
    hydrationPromises.set(userId, p);
  }
  return hydrationPromises.get(userId)!;
};

export const rehydrateUserData = (userId: string): void => {
  hydrationPromises.delete(userId);
  userFieldsPromises.delete(userId);
  // También cae la caché por entidad de ese usuario, o el re-hidratado no
  // volvería a pedir los documentos que ya están memorizados.
  const prefijo = `${userId}|`;
  for (const key of Array.from(entityPromises.keys())) {
    if (key.startsWith(prefijo)) entityPromises.delete(key);
  }
  void getHydrationPromise(userId, true);
};

// ------------------------------------------------------------
// Resumen global para supervisión de admins ("Todas las colmenas")
// ------------------------------------------------------------
export interface ColonySummary {
  hives: number;
  nuclei: number;
  inspections: number;
  fecundadores: number;
  tasks: number;
}

export interface AdminUserSummary {
  userId: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  apiaries: {
    id: string;
    name: string;
    location?: string;
    summary: ColonySummary;
  }[];
  totals: ColonySummary;
}

export const fetchAllColoniesSummary = async (): Promise<AdminUserSummary[]> => {
  if (!canSync(auth?.currentUser?.uid)) return [];
  const apiariesSnap = await getDocs(collection(db!, APIARIOS_COLLECTION));
  const apiaries = apiariesSnap.docs.map((d) => d.data() as any).filter((a) => a && a.id);

  const byUser = new Map<string, any[]>();
  for (const apiary of apiaries) {
    const list = byUser.get(apiary.userId) || [];
    list.push(apiary);
    byUser.set(apiary.userId, list);
  }

  const zero = (): ColonySummary => ({ hives: 0, nuclei: 0, inspections: 0, fecundadores: 0, tasks: 0 });
  const addTo = (a: ColonySummary, b: ColonySummary): ColonySummary => ({
    hives: a.hives + b.hives,
    nuclei: a.nuclei + b.nuclei,
    inspections: a.inspections + b.inspections,
    fecundadores: a.fecundadores + b.fecundadores,
    tasks: a.tasks + b.tasks,
  });

  const result: AdminUserSummary[] = [];
  for (const [userId, userApiaries] of byUser.entries()) {
    const profileSnap = await getDoc(doc(db!, 'users', userId));
    const profile = profileSnap.exists() ? (profileSnap.data() as any) : null;
    let totals = zero();
    const apiaryList: AdminUserSummary['apiaries'] = [];
    for (const apiary of userApiaries) {
      const summary = zero();
      const batches: Promise<void>[] = [];
      for (const entity of ['hives', 'nuclei', 'inspections', 'fecundadores', 'tasks'] as const) {
        const d = entityDoc(apiary.id, entity);
        batches.push(
          getDoc(d).then((snap) => {
            const items = snap.data()?.items;
            if (Array.isArray(items)) summary[entity] = items.length;
          })
        );
      }
      await Promise.all(batches);
      totals = addTo(totals, summary);
      apiaryList.push({
        id: apiary.id,
        name: apiary.name || 'Sin nombre',
        location: apiary.location || '',
        summary,
      });
    }
    result.push({
      userId,
      email: profile?.email || userId,
      displayName: profile?.displayName || '',
      photoURL: profile?.photoURL || '',
      apiaries: apiaryList,
      totals,
    });
  }

  // Mostrar los admins aunque no tengan apiarios todavía (login previo).
  return result.sort((a, b) => a.email.localeCompare(b.email));
};

// ------------------------------------------------------------
// Fotos de inspecciones recientes (para el selector del Asistente IA)
// ------------------------------------------------------------
// El Asistente IA permite adjuntar fotos de inspecciones ya registradas SIN
// elegir colmena manualmente. Esta función recorre TODOS los apiarios del
// usuario en la caché local (ya hidratada desde Firestore) y devuelve las
// últimas inspecciones con fotos, tanto de colmenas/núcleos (`inspection.photos`
// con URLs de Cloudinary y `inspection.fotos` en base64) como de fecundadores
// (`fecundador.historial[].photos`).
//
// Se lee de la caché local y no de Firestore a propósito: la app ya hidrata
// todas las entidades al arrancar, así que hacer otra ronda de red solo añadiría
// latencia y coste. Las URLs se devuelven tal cual (sin convertir a base64) para
// que el componente las envíe a la IA como `file_data`.

export type UnidadFotoTipo = 'colmena' | 'nucleo' | 'fecundador';

export interface InspectionPhotoItem {
  /** Id de la inspección (o de la entrada de historial del fecundador). */
  id: string;
  /** Fecha ISO de la inspección. */
  fecha: string;
  unidadId: string;
  unidadTipo: UnidadFotoTipo;
  unidadNombre: string;
  photoUrl: string;
  /** true si es una URL (Cloudinary/Storage); false si es base64. */
  esUrl: boolean;
}

interface FotoCruda {
  id: string;
  fecha: string;
  unidadId: string;
  unidadTipo: UnidadFotoTipo;
  unidadNombre: string;
  fotos: Array<{ url: string; esUrl: boolean }>;
}

const extraerFotosInspeccion = (ins: any): Array<{ url: string; esUrl: boolean }> => {
  const out: Array<{ url: string; esUrl: boolean }> = [];
  for (const url of (ins?.photos as unknown[]) ?? []) {
    if (typeof url === 'string' && url) out.push({ url, esUrl: true });
  }
  for (const foto of (ins?.fotos as unknown[]) ?? []) {
    const data = typeof foto === 'string' ? foto : (foto as any)?.data;
    if (typeof data === 'string' && data) {
      out.push({ url: data, esUrl: !data.startsWith('data:') });
    }
  }
  return out;
};

/**
 * Últimas `limite` inspecciones con fotos de cualquier apiario del usuario.
 * Devuelve un objeto por FOTO, listo para el grid del modal de selección.
 */
export async function getRecentInspectionPhotos(
  userId: string,
  limite = 15
): Promise<InspectionPhotoItem[]> {
  if (!userId) return [];
  const apiaries = (loadApiaries(userId) as any[]).filter((a) => a && a.id);
  const crudas: FotoCruda[] = [];

  for (const apiary of apiaries) {
    const apiaryId = String(apiary.id);
    const suffix = suffixFor(userId, apiaryId);
    const hives = loadHives(suffix) as any[];
    const nuclei = loadNuclei(suffix) as any[];
    const fecundadores = loadFecundadores(userId, apiaryId) as any[];

    const porId = new Map<string, { code: string; tipo: UnidadFotoTipo }>();
    hives.forEach((h) => porId.set(h.id, { code: h.code, tipo: 'colmena' }));
    nuclei.forEach((h) => porId.set(h.id, { code: h.code, tipo: 'nucleo' }));

    for (const ins of loadInspections(suffix) as any[]) {
      const fotos = extraerFotosInspeccion(ins);
      if (fotos.length === 0) continue;
      const info = porId.get(ins.hiveId);
      const tipo: UnidadFotoTipo = info?.tipo ?? (ins.entityType === 'nucleo' ? 'nucleo' : 'colmena');
      crudas.push({
        id: String(ins.id ?? `${apiaryId}-${ins.hiveId}-${ins.date}`),
        fecha: String(ins.date ?? ''),
        unidadId: String(ins.hiveId ?? ''),
        unidadTipo: tipo,
        unidadNombre: info?.code ?? String(ins.hiveId ?? ''),
        fotos,
      });
    }

    for (const f of fecundadores) {
      for (const entrada of (f?.historial as any[]) ?? []) {
        const urls = ((entrada?.photos as unknown[]) ?? []).filter(
          (u): u is string => typeof u === 'string' && !!u
        );
        if (urls.length === 0) continue;
        crudas.push({
          id: String(entrada.id ?? `${apiaryId}-${f.id}-${entrada.fecha}`),
          fecha: String(entrada.fecha ?? ''),
          unidadId: String(f.id ?? ''),
          unidadTipo: 'fecundador',
          unidadNombre: f.code ?? '',
          fotos: urls.map((url) => ({ url, esUrl: true })),
        });
      }
    }
  }

  const ordenadas = crudas
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
    .slice(0, limite);

  return ordenadas.flatMap((insp) =>
    insp.fotos.map((foto) => ({
      id: insp.id,
      fecha: insp.fecha,
      unidadId: insp.unidadId,
      unidadTipo: insp.unidadTipo,
      unidadNombre: insp.unidadNombre,
      photoUrl: foto.url,
      esUrl: foto.esUrl,
    }))
  );
}

// ------------------------------------------------------------
// Registro del puente de sincronización + reintentos
// ------------------------------------------------------------
let registered = false;

// Cola de reintentos: si una escritura se rechaza (un corte de red de un
// instante, cuota temporal…), se vuelve a intentar con backoff exponencial
// en vez de perder el evento. Solo se encola UN evento por (entidad, usuario,
// apiario): al llegar otro del mismo tipo lo sustituye, porque el array que
// lleva ya es el estado completo más reciente, no un delta. Con la caché
// persistente de Firestore activa, las escrituras que llegan a quedar en
// vuelo sobreviven a una recarga; esto cubre las que se llegaron a rechazar.
const retryQueue = new Map<string, { evt: StoreSyncEvent; attempt: number }>();
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_RETRIES = 4;

const retryKey = (evt: StoreSyncEvent): string => `${evt.entity}|${evt.userId}|${evt.apiaryId || ''}`;

const attemptSync = async (evt: StoreSyncEvent, attempt: number): Promise<void> => {
  try {
    await handleSyncEvent(evt);
    retryQueue.delete(retryKey(evt));
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      retryQueue.delete(retryKey(evt));
      console.error(
        `[FIRESTORE] Sin reintentos pendientes: "${evt.entity}" no llega al servidor (se agotaron ${MAX_RETRIES}).`,
        error
      );
      return;
    }
    const delay = Math.min(30_000, 1_000 * 2 ** attempt);
    retryQueue.set(retryKey(evt), { evt, attempt: attempt + 1 });
    if (!retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void flushRetries();
      }, delay);
    }
    console.warn(
      `[FIRESTORE] Falló "${evt.entity}" (intento ${attempt + 1}/${MAX_RETRIES + 1}); se reintenta en ${delay} ms`,
      error
    );
  }
};

const flushRetries = async (): Promise<void> => {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  for (const { evt, attempt } of Array.from(retryQueue.values())) {
    retryQueue.delete(retryKey(evt));
    await attemptSync(evt, attempt);
  }
};

export const enableFirestoreSync = (): void => {
  if (registered) return;
  registered = true;
  setSyncHandler((evt) => attemptSync(evt, 0));
  if (typeof window !== 'undefined') {
    // Vuelve a vaciar la cola en cuanto hay red: los timers de backoff pueden
    // haberse disparado con el navegador todavía desconectado.
    window.addEventListener('online', () => void flushRetries());
  }
};

// Inicialización por defecto (módulo importado → handler disponible).
enableFirestoreSync();

// ============================================================
// CAJAS TRAMPA (colección `trapBoxes`) — integración con el dashboard
// ============================================================
// La lógica (CRUD + listener en tiempo real + hook) vive en
// `lib/trapBoxService.ts`. Se reexporta aquí, junto al resto de la integración
// con Firestore, para que el dashboard la consuma desde un único punto.
export {
  TRAPBOXES_COLLECTION,
  addTrapBox,
  updateTrapBox,
  deleteTrapBox,
  getTrapBoxesByApiary,
  renewTrapBait,
  nextTrapBoxId,
  useTrapBoxes,
} from '../lib/trapBoxService';