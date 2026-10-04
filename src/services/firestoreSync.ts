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
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, isFirebaseAvailable } from '../lib/firebase';
import {
  setSyncHandler,
  SYNC_ENTITIES,
  StoreSyncEvent,
  loadApiaries,
  saveApiaries,
  loadHives,
  saveHives,
  loadNuclei,
  saveNuclei,
  loadInspections,
  saveInspections,
  loadTasks,
  saveTasks,
  loadHarvests,
  saveHarvests,
  loadBreedingLots,
  saveBreedingLots,
  loadQueens,
  saveQueens,
  loadQueenHistory,
  saveQueenHistory,
  loadFecundadores,
  saveFecundadores,
  loadCuadernoEntries,
  saveCuadernoEntries,
  loadEvents,
  saveEvents,
  loadEventTemplates,
  saveEventTemplates,
  loadRecurringTasks,
  saveRecurringTasks,
  loadFloweringEntries,
  saveFloweringEntries,
  loadInventory,
  saveInventory,
  loadData,
  saveData,
} from '../utils/storage';

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
  'events',
  'recurringTasks',
  'flowering',
  'eventTemplates',
] as const;

type ApiaryEntity = (typeof APIARY_ENTITIES)[number];

const suffixFor = (userId: string, apiaryId: string): string => `_${userId}_${apiaryId}`;

// Guardas de sesión (evita escribir con uid 'anonymous' o sin Firebase)
const canSync = (userId?: string): boolean => {
  if (!isFirebaseAvailable() || !db) return false;
  if (!auth?.currentUser) return false;
  return !!(userId && userId !== 'anonymous');
};

const entityDoc = (apiaryId: string, entity: ApiaryEntity) =>
  doc(db!, APIARIO_DATA_COLLECTION, `${apiaryId}_${entity}`);

// ------------------------------------------------------------
// Escritura en caché local (cada entidad con su wrapper real)
// ------------------------------------------------------------
const saveToLocal = (
  entity: ApiaryEntity,
  items: unknown[],
  userId: string,
  apiaryId?: string
): void => {
  const suffix = apiaryId ? suffixFor(userId, apiaryId) : undefined;
  switch (entity) {
    case 'hives':
      return void saveHives(items, suffix || '');
    case 'nuclei':
      return void saveNuclei(items, suffix || '');
    case 'inspections':
      return void saveInspections(items, suffix || '');
    case 'tasks':
      return void saveTasks(items, suffix || '');
    case 'harvests':
      return void saveHarvests(items, suffix || '');
    case 'breeding':
      return void saveBreedingLots(items, userId, apiaryId || '');
    case 'queens':
      return void saveQueens(items, userId, apiaryId || '');
    case 'queenHistory':
      return void saveQueenHistory(items, userId, apiaryId || '');
    case 'fecundadores':
      return void saveFecundadores(items, userId, apiaryId || '');
    case 'cuadernoEntries':
      return void saveCuadernoEntries(items, userId, apiaryId || '');
    case 'events':
      return void saveEvents(items, suffix || '');
    case 'recurringTasks':
      return void saveRecurringTasks(items, suffix || '');
    case 'flowering':
      return void saveFloweringEntries(items, suffix || '');
    case 'eventTemplates':
      return void saveEventTemplates(items, suffix || '');
  }
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
    case 'events':
      return loadEvents(suffix);
    case 'recurringTasks':
      return loadRecurringTasks(suffix);
    case 'flowering':
      return loadFloweringEntries(suffix);
    case 'eventTemplates':
      return loadEventTemplates(suffix);
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
  for (const entity of APIARY_ENTITIES) {
    try {
      await deleteDoc(entityDoc(apiaryId, entity));
    } catch {
      /* ignore */
    }
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

const upsertApiary = async (apiary: any): Promise<void> => {
  if (!canSync(apiary?.userId)) return;
  const { userId, ...fields } = apiary;
  await setDoc(doc(db!, APIARIOS_COLLECTION, apiary.id), {
    userId,
    ...fields,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

/** Reconcilia la lista de apiarios del usuario con Firestore. */
const reconcileUserApiaries = async (userId: string, list: any[]): Promise<void> => {
  if (!canSync(userId)) return;
  const items = Array.isArray(list) ? list : [];
  // Upsert de los apiarios actuales
  for (const apiary of items) {
    if (!apiary || !apiary.id) continue;
    await upsertApiary({ ...apiary, userId });
  }
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
  partial: { inventory?: unknown[]; transferHistory?: unknown[] }
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

  if (entity === 'inventory' || entity === 'transferHistory') {
    const partial =
      entity === 'inventory'
        ? { inventory: removed ? [] : (items as unknown[]) }
        : { transferHistory: removed ? [] : (items as unknown[]) };
    await updateUserDataDoc(userId, partial);
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
    saveToLocal(entity, remote.items as unknown[], userId, apiaryId);
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
 * Antes era un `for` con `await`: 14 entidades x N apiarios salían como
 * 14N viajes de ida y vuelta en serie. Con 3 apiarios son 42 round-trips
 * encadenados, y eso es justo el "Sincronizando datos…" que bloqueaba la app.
 * Ahora es una sola profundidad de red: 14N peticiones simultáneas.
 */
const hydrateApiaryEntities = async (userId: string, apiaryId: string): Promise<void> => {
  await Promise.all(APIARY_ENTITIES.map((entity) => getEntityHydrationPromise(userId, apiaryId, entity)));
};

const hydrateUserData = async (userId: string): Promise<void> => {
  if (!canSync(userId)) return;

  // --- apiarios ---
  const remoteSnap = await getDocs(
    query(collection(db!, APIARIOS_COLLECTION), where('userId', '==', userId))
  );
  const remoteApiaries = remoteSnap.docs
    .map((d) => d.data() as any)
    .filter((a) => a && a.id);
  const localApiaries = loadApiaries(userId) as any[];
  const remoteIds = new Set(remoteApiaries.map((a) => a.id));
  const onlyLocal = localApiaries.filter((a) => a && a.id && !remoteIds.has(a.id));

  if (remoteApiaries.length > 0) {
    upsertApiariosLocal(remoteApiaries, userId);
  } else if (onlyLocal.length > 0) {
    // Migración: el usuario ya tenía apiarios en localStorage que aún no
    // existen en Firestore → subirlos (no se pierde nada).
    await reconcileUserApiaries(userId, onlyLocal);
    console.log(`🛰️ [FIRESTORE] Migrados ${onlyLocal.length} apiarios del usuario ${userId}`);
  }

  // --- entidades por apiario (unión de remotos y locales) ---
  const allApiaryIds = Array.from(
    new Set([...remoteApiaries.map((a) => a.id), ...onlyLocal.map((a) => a.id)])
  );
  // En paralelo: cada apiario ya hidrata sus 14 entidades a la vez, y ahora
  // además los apiarios no se esperan entre sí. Antes eran dos bucles `await`
  // anidados, o sea 14 x N viajes en serie.
  await Promise.all(allApiaryIds.map((apiaryId) => hydrateApiaryEntities(userId, apiaryId)));

  // --- userData (inventory / transferHistory) ---
  const userDoc = await getDoc(doc(db!, USER_DATA_COLLECTION, userId));
  if (userDoc.exists()) {
    const data = userDoc.data();
    if (data && Array.isArray(data.inventory)) saveInventory(data.inventory, userId);
    if (data && Array.isArray(data.transferHistory)) {
      saveData('transferHistory', data.transferHistory, { userId });
    }
  } else {
    const inv = loadInventory(userId);
    const th = loadData('transferHistory', [] as unknown[], { userId }) as unknown[];
    if (Array.isArray(inv) && inv.length) {
      await updateUserDataDoc(userId, { inventory: inv });
    }
    if (Array.isArray(th) && th.length) {
      await updateUserDataDoc(userId, { transferHistory: th });
    }
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

export const getHydrationPromise = (userId: string): Promise<void> => {
  if (!hydrationPromises.has(userId)) {
    const p = hydrateUserData(userId)
      .catch((error) => {
        console.warn('[FIRESTORE] Hidratación incompleta (se usa caché local):', error);
      })
      .finally(() => {
        notifyHydrated(userId);
      });
    // La promesa se queda cacheada durante toda la sesión. Antes se borraba a
    // los 60 s, lo que hacía que volver a una sección rehidratara TODO el
    // usuario (14 entidades x todos sus apiarios) aunque la caché local ya
    // estuviera al día. Para forzar la relectura está `rehydrateUserData`.
    hydrationPromises.set(userId, p);
  }
  return hydrationPromises.get(userId)!;
};

export const rehydrateUserData = (userId: string): void => {
  hydrationPromises.delete(userId);
  // También cae la caché por entidad de ese usuario, o el re-hidratado no
  // volvería a pedir los documentos que ya están memorizados.
  const prefijo = `${userId}|`;
  for (const key of Array.from(entityPromises.keys())) {
    if (key.startsWith(prefijo)) entityPromises.delete(key);
  }
  void getHydrationPromise(userId);
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
// Registro del puente de sincronización
// ------------------------------------------------------------
let registered = false;

export const enableFirestoreSync = (): void => {
  if (registered) return;
  registered = true;
  setSyncHandler((evt) => handleSyncEvent(evt));
};

// Inicialización por defecto (módulo importado → handler disponible).
enableFirestoreSync();