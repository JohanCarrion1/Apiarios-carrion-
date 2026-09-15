// ============================================================
// CAPA ÚNICA DE ALMACENAMIENTO (Blindaje de persistencia)
// ============================================================
//
// REGLA DE ORO: ninguna actualización de código puede borrar,
// sobrescribir ni dejar inaccesibles los datos del usuario.
//
// Claves ESTABLES y versionadas con prefijo de usuario:
//   panal_v1_user_${userId}_hives
//   panal_v1_user_${userId}_nuclei
//   panal_v1_user_${userId}_inspections
//   panal_v1_user_${userId}_breeding
//   panal_v1_user_${userId}_inventory
//   panal_v1_user_${userId}_harvests
//   panal_v1_user_${userId}_tasks
//   panal_v1_user_${userId}_queens
//   panal_v1_user_${userId}_settings
// Para datos por apiario se añade el sufijo: ..._hives_${apiaryId}
//
// PROHIBIDO usar claves sin prefijo de usuario o sin versión.
// PROHIBIDO localStorage.removeItem sobre datos de usuario, salvo
// clearUserData() ("Borrar todos mis datos" en Ajustes).
//
// Backups rotativos ANTES de cada escritura (3 versiones fechadas).
// Si al cargar el JSON está corrupto se restaura desde el backup.
// ============================================================
import { auth } from '../lib/firebase';

export const STORAGE_VERSION = 'panal_v1';

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

// Claves ya leídas en esta sesión (si una clave no se ha leído aún y se
// intenta sobrescribir con un array vacío, se bloquea la escritura para
// evitar que un useEffect de montaje borre datos existentes).
const sessionReadKeys = new Set<string>();

// ------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------

export const getCurrentUserId = (): string => {
  if (auth && auth.currentUser) {
    return auth.currentUser.uid;
  }
  return 'anonymous';
};

const safeParse = (raw: string | null): unknown => {
  if (raw == null || raw === '') return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const isEmptyValue = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.length === 0;
  if (value && typeof value === 'object') return Object.keys(value as object).length === 0;
  return value === null || value === undefined || value === '';
};

const countRecords = (value: unknown): number => {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value as object).length;
  return 1;
};

const stampNow = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
};

const stampToLabel = (stamp: string): string => {
  const [datePart, timePart] = stamp.split('_');
  const d = (datePart || '').split('-');
  const t = (timePart || '').split('-');
  if (d.length !== 3) return stamp;
  const date = `${d[2]}/${d[1]}/${d[0]}`;
  const time = t.length === 3 ? `${t[0]}:${t[1]}:${t[2]}` : '';
  return time ? `${date} ${time}` : date;
};

// ------------------------------------------------------------
// Construcción de claves versionadas
// ------------------------------------------------------------

export const getUserKey = (key: string, userId?: string): string => {
  const uid = userId || getCurrentUserId();
  return `${STORAGE_VERSION}_user_${uid}_${key}`;
};

/**
 * Construye la clave versionada para una entidad.
 * @param entity  nombre de entidad (hives, nuclei, inspections, breeding, ...)
 * @param scope   sufijo: puede ser '_uid_apiaryId', '_apiaryId' o ''
 * @param userId  uid del usuario (por defecto el actual)
 */
export const buildEntityKey = (entity: string, scope = '', userId?: string): string => {
  const uid = userId || getCurrentUserId();
  let scoped = scope || '';
  // Dedupe: el sufijo heredado puede incluir el uid duplicado: '_uid_apiaryId'
  if (scoped.startsWith(`_${uid}`)) {
    scoped = scoped.slice(`_${uid}`.length);
  }
  if (scoped && !scoped.startsWith('_')) {
    scoped = `_${scoped}`;
  }
  return `${STORAGE_VERSION}_user_${uid}_${entity}${scoped}`;
};

export interface EntityKeyOpts {
  userId?: string;
  apiaryId?: string;
  suffix?: string;
}

/** Clave versionada de una entidad (para helpers y servicios). */
export const entityKey = (entity: string, opts: EntityKeyOpts = {}): string => {
  const uid = opts.userId || getCurrentUserId();
  const scope = opts.apiaryId ? `_${opts.apiaryId}` : (opts.suffix || '');
  return buildEntityKey(entity, scope, uid);
};

// ------------------------------------------------------------
// Backups rotativos (3 versiones fechadas)
// ------------------------------------------------------------

const backupPrefixFor = (storageKey: string): string => {
  const uid = storageKey.split('_user_')[1]?.split('_')[0] || '?';
  // storageKey: panal_v1_user_${uid}_<entity><scope>
  const afterUser = storageKey.slice(`${STORAGE_VERSION}_user_${uid}_`.length);
  return `${STORAGE_VERSION}_user_${uid}_backup_${afterUser}`;
};

const pruneBackups = (storageKey: string): void => {
  const prefix = backupPrefixFor(storageKey);
  const keys = Object.keys(localStorage)
    .filter((k) => k.startsWith(`${prefix}_`))
    .sort()
    .reverse();
  keys.slice(3).forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  });
};

const createBackup = (storageKey: string, previousRaw: string): void => {
  const prefix = backupPrefixFor(storageKey);
  try {
    localStorage.setItem(`${prefix}_${stampNow()}`, previousRaw);
  } catch {
    /* almacenamiento lleno: no se puede backup */
  }
  try {
    localStorage.setItem(`${prefix}`, previousRaw);
  } catch {
    /* ignore */
  }
  pruneBackups(storageKey);
};

const listBackups = (storageKey: string): { key: string; stamp: string; raw: string }[] => {
  const prefix = backupPrefixFor(storageKey);
  return Object.keys(localStorage)
    .filter((k) => k.startsWith(`${prefix}_`))
    .sort()
    .reverse()
    .map((k) => ({ key: k, stamp: k.slice(prefix.length + 1), raw: localStorage.getItem(k) || '' }))
    .filter((b) => b.raw !== '');
};

const latestValidBackup = (
  storageKey: string
): { key: string; stamp: string; raw: string } | null => {
  for (const backup of listBackups(storageKey)) {
    if (safeParse(backup.raw) !== undefined) {
      return backup;
    }
  }
  return null;
};

// ------------------------------------------------------------
// Evento para avisar con toast de una restauración desde backup
// ------------------------------------------------------------

export const DATA_RESTORED_EVENT = 'panal:data-restored';

export interface DataRestoredInfo {
  entity: string;
  storageKey: string;
  date: string;
}

const notifyRestored = (info: DataRestoredInfo): void => {
  try {
    const evt = typeof window !== 'undefined'
      ? new CustomEvent<DataRestoredInfo>(DATA_RESTORED_EVENT, { detail: info })
      : null;
    if (evt) window.dispatchEvent(evt);
  } catch {
    /* ignore */
  }
};

/** Suscribirse a restauraciones desde backup. Devuelve unsubscribe. */
export const onDataRestored = (listener: (info: DataRestoredInfo) => void): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (e: Event) => listener((e as CustomEvent<DataRestoredInfo>).detail);
  window.addEventListener(DATA_RESTORED_EVENT, handler);
  return () => window.removeEventListener(DATA_RESTORED_EVENT, handler);
};

// ------------------------------------------------------------
// NÚCLEO: loadData / saveData (TODO pasa por aquí)
// ------------------------------------------------------------

const readFromKey = <T>(storageKey: string, fallback: T, entity: string): T => {
  const raw = localStorage.getItem(storageKey);
  if (raw == null) {
    return fallback;
  }
  const parsed = safeParse(raw);
  if (parsed !== undefined) {
    sessionReadKeys.add(storageKey);
    return parsed as T;
  }
  // Datos corruptos → restaurar desde el backup más reciente
  const backup = latestValidBackup(storageKey);
  if (backup) {
    const restored = safeParse(backup.raw);
    if (restored !== undefined) {
      try {
        localStorage.setItem(storageKey, backup.raw);
      } catch {
        /* ignore */
      }
      sessionReadKeys.add(storageKey);
      console.warn(
        `[STORAGE] ⚠️ Datos corruptos en '${storageKey}' restaurados desde backup '${backup.stamp}'`
      );
      notifyRestored({ entity, storageKey, date: stampToLabel(backup.stamp) });
      return restored as T;
    }
  }
  sessionReadKeys.add(storageKey);
  return fallback;
};

export interface DataOpts {
  suffix?: string;
  userId?: string;
  apiaryId?: string;
  force?: boolean;
}

/**
 * Lee datos versionados de una entidad del usuario actual.
 */
export const loadData = <T>(key: string, fallback: T, opts: DataOpts = {}): T => {
  const storageKey = entityKey(key, {
    userId: opts.userId,
    apiaryId: opts.apiaryId,
    suffix: opts.suffix,
  });
  return readFromKey<T>(storageKey, fallback, key);
};

const writeToKey = <T>(storageKey: string, data: T, entity: string, force = false): void => {
  const newRaw = JSON.stringify(data);

  // Guardia anti-borrado: si esta clave NO se ha leído aún en esta sesión y
  // ya existe contenido no vacío, NO permitir escribir un valor vacío
  // (protege contra useEffects de inicialización que reinician con []).
  if (!force && !sessionReadKeys.has(storageKey)) {
    const existingRaw = localStorage.getItem(storageKey);
    const existing = safeParse(existingRaw);
    if (existing !== undefined && !isEmptyValue(existing) && isEmptyValue(data)) {
      console.warn(
        `[STORAGE] ⛔ Escritura vacía bloqueada sobre datos existentes en '${storageKey}' (se preservan los datos del usuario)`
      );
      return;
    }
  }

  // Backup rotativo de la versión anterior ANTES de sobrescribir
  const previousRaw = localStorage.getItem(storageKey);
  if (previousRaw != null && previousRaw !== newRaw) {
    createBackup(storageKey, previousRaw);
  }

  try {
    localStorage.setItem(storageKey, newRaw);
    sessionReadKeys.add(storageKey);
    if (isDev) {
      console.log(`[STORAGE] save ${entity}${storageKey.includes(`_backup_`) ? '' : ''}: ${countRecords(data)} registros`);
    } else {
      console.log(`[STORAGE] save ${entity}: ${countRecords(data)} registros`);
    }
  } catch (error) {
    console.error(`❌ [STORAGE] Error al guardar ${entity}:`, error);
  }
};

/**
 * Guarda datos versionados de una entidad del usuario actual (con backup
 * rotativo de la versión anterior).
 */
export const saveData = <T>(key: string, data: T, opts: DataOpts = {}): void => {
  const storageKey = entityKey(key, {
    userId: opts.userId,
    apiaryId: opts.apiaryId,
    suffix: opts.suffix,
  });
  writeToKey(storageKey, data, key, opts.force);
};

// ------------------------------------------------------------
// API heredada (mantiene compatibilidad con el resto de la app)
// ------------------------------------------------------------

export const saveToStorage = <T>(key: string, data: T, suffix: string = ''): void =>
  saveData(key, data, { suffix });

export const loadFromStorage = <T>(key: string, defaultValue: T, suffix: string = ''): T =>
  loadData(key, defaultValue, { suffix });

/** Elimina la clave versionada de una entidad (uso interno/explicito). */
export const removeFromStorage = (key: string, suffix: string = ''): void => {
  const storageKey = entityKey(key, { suffix });
  const keys = [storageKey, ...listBackups(storageKey).map((b) => b.key)];
  keys.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  });
};

// ------------------------------------------------------------
// Entidades de datos (wrappers sobre loadData/saveData)
// ------------------------------------------------------------

// Colmenas (por apiario)
export const saveHives = (hives: any[], suffix: string = '') => saveData('hives', hives, { suffix });
export const loadHives = (suffix: string = '') => loadData('hives', [] as any[], { suffix });

// Núcleos (por apiario)
export const saveNuclei = (nuclei: any[], suffix: string = '') => saveData('nuclei', nuclei, { suffix });
export const loadNuclei = (suffix: string = '') => loadData('nuclei', [] as any[], { suffix });

// Inspecciones (por apiario)
export const saveInspections = (inspections: any[], suffix: string = '') => saveData('inspections', inspections, { suffix });
export const loadInspections = (suffix: string = '') => loadData('inspections', [] as any[], { suffix });

// Tareas (por apiario)
export const saveTasks = (tasks: any[], suffix: string = '') => saveData('tasks', tasks, { suffix });
export const loadTasks = (suffix: string = '') => loadData('tasks', [] as any[], { suffix });

// Cosechas (por apiario)
export const saveHarvests = (harvests: any[], suffix: string = '') => saveData('harvests', harvests, { suffix });
export const loadHarvests = (suffix: string = '') => loadData('harvests', [] as any[], { suffix });

// Eventos del calendario (por usuario)
export const saveEvents = (events: any[]) => saveData('events', events);
export const loadEvents = () => loadData('events', [] as any[]);

// Plantillas de eventos (por usuario)
export const saveEventTemplates = (templates: any[]) => saveData('eventTemplates', templates);
export const loadEventTemplates = () => loadData('eventTemplates', [] as any[]);

// Tareas recurrentes (por usuario)
export const saveRecurringTasks = (tasks: any[]) => saveData('recurringTasks', tasks);
export const loadRecurringTasks = () => loadData('recurringTasks', [] as any[]);

// Calendario de floración (por usuario)
export const saveFloweringEntries = (entries: any[]) => saveData('flowering', entries);
export const loadFloweringEntries = () => loadData('flowering', [] as any[]);

// Recordatorios calculados (por usuario)
export const saveReminders = (reminders: any[]) => saveData('reminders', reminders);
export const loadReminders = () => loadData('reminders', [] as any[]);

// Notificaciones (por usuario)
export const saveNotifications = (notifications: any[]) => saveData('notifications', notifications);
export const loadNotifications = () => loadData('notifications', [] as any[]);

// Favoritos de colmenas (por usuario)
export const saveFavorites = (favorites: string[]) => saveData('favorites', favorites);
export const loadFavorites = () => loadData('favorites', [] as string[]);

// Etiquetas de colmenas (por usuario)
export const saveTags = (tags: Record<string, string[]>) => saveData('tags', tags);
export const loadTags = () => loadData('tags', {} as Record<string, string[]>);

// Configuración de cosechas (por usuario)
export const saveHarvestUnit = (unit: string) => saveData('harvestUnit', unit);
export const loadHarvestUnit = () => loadData('harvestUnit', 'kg' as string);

export const saveAnnualGoal = (goal: number) => saveData('annualGoal', goal);
export const loadAnnualGoal = () => loadData('annualGoal', 100 as number);

export const saveBasePrice = (price: number) => saveData('basePrice', price);
export const loadBasePrice = () => loadData('basePrice', 25 as number);

// Última selección (Tienda/Colmenas) (por usuario)
export const saveLastSelection = (selection: string) => saveData('lastSelection', selection);
export const loadLastSelection = () => loadData('lastSelection', '' as string);

// Caché de clima (por usuario)
export const saveWeatherCache = (cache: any, userId?: string) =>
  saveData('weatherCache', cache, { userId: userId || getCurrentUserId() });
export const loadWeatherCache = (userId?: string): any =>
  loadData('weatherCache', null, { userId: userId || getCurrentUserId() });

// Apiarios (por usuario) — entidad 'apiaries'
export const getApiariesKey = (userId: string): string => entityKey('apiaries', { userId });
export const loadApiaries = (userId?: string): any[] =>
  loadData('apiaries', [] as any[], { userId: userId || getCurrentUserId() });
export const saveApiaries = (apiaries: any[], userId?: string): void =>
  saveData('apiaries', apiaries, { userId: userId || getCurrentUserId() });

// Apiario activo persistido (por usuario)
export const loadActiveApiaryId = (userId?: string): string | null => {
  const uid = userId || getCurrentUserId();
  const raw = localStorage.getItem(`${STORAGE_VERSION}_activeApiary_${uid}`);
  if (raw != null) return safeParse(raw) as string | null;
  const legacy = localStorage.getItem('lastActiveApiarioId');
  return legacy || null;
};
export const saveActiveApiaryId = (apiaryId: string | null, userId?: string): void => {
  const uid = userId || getCurrentUserId();
  const key = `${STORAGE_VERSION}_activeApiary_${uid}`;
  try {
    const previousRaw = localStorage.getItem(key);
    if (previousRaw != null && previousRaw !== JSON.stringify(apiaryId)) {
      createBackup(key, previousRaw);
    }
    localStorage.setItem(key, JSON.stringify(apiaryId));
  } catch (error) {
    console.error('[STORAGE] Error guardando apiario activo:', error);
  }
};
// Alias compatibles con el flujo actual (navegación)
export const saveLastActiveApiarioId = saveActiveApiaryId;

// Último apiario activo (clave documentada en FLUJO-INICIO.md):
//   panal_v1_user_${userId}_lastActiveApiaryId
// Se actualiza cada vez que el usuario entra/cambia de apiario. Si la
// clave es corrupta o está vacía, se resuelve desde el apiario activo
// legado y, en último término, al primer apiario de la lista.
export const getLastActiveApiaryKey = (userId: string): string =>
  `${STORAGE_VERSION}_user_${userId}_lastActiveApiaryId`;

export const loadLastActiveApiaryId = (userId?: string): string | null => {
  const uid = userId || getCurrentUserId();
  const raw = localStorage.getItem(getLastActiveApiaryKey(uid));
  if (raw != null) {
    const parsed = safeParse(raw);
    if (typeof parsed === 'string' && parsed) return parsed;
  }
  // Fallback de migración: respeta el último apiario activo previo
  return loadActiveApiaryId(uid);
};

export const saveLastActiveApiaryId = (apiaryId: string | null, userId?: string): void => {
  const uid = userId || getCurrentUserId();
  const key = getLastActiveApiaryKey(uid);
  try {
    const previousRaw = localStorage.getItem(key);
    if (previousRaw != null && previousRaw !== JSON.stringify(apiaryId)) {
      createBackup(key, previousRaw);
    }
    localStorage.setItem(key, JSON.stringify(apiaryId));
  } catch (error) {
    console.error('[STORAGE] Error guardando apiario activo:', error);
  }
};

// Idioma (compartido entre usuarios, no es dato registrado)
export const saveLanguage = (language: string): void => {
  localStorage.setItem('language', language);
  console.log(`💾 [STORAGE] Guardado: language (compartido)`);
};
export const loadLanguage = (): string => {
  const item = localStorage.getItem('language');
  return item || 'es';
};

// Configuración general (por usuario, con respaldo legado global)
export const saveSettings = (settings: any): void => {
  saveData('settings', settings);
};
export const loadSettings = (): any => {
  const uid = getCurrentUserId();
  const versionedRaw = localStorage.getItem(entityKey('settings', { userId: uid }));
  if (versionedRaw != null) {
    const parsed = safeParse(versionedRaw);
    if (parsed !== undefined) return parsed;
  }
  const legacyRaw = localStorage.getItem('settings');
  if (legacyRaw != null) {
    const parsed = safeParse(legacyRaw);
    if (parsed !== undefined) return parsed;
  }
  return {};
};

// Lotes de cría de reinas (por usuario y apiario)
export const getBreedingLotsKey = (userId: string, apiaryId: string): string =>
  entityKey('breeding', { userId, apiaryId });
export const loadBreedingLots = (userId: string, apiaryId: string): any[] =>
  loadData('breeding', [] as any[], { userId, apiaryId });
export const saveBreedingLots = (lots: any[], userId: string, apiaryId: string): void =>
  saveData('breeding', lots, { userId, apiaryId });

// Reinas (por usuario y apiario)
export const getQueensKey = (userId: string, apiaryId: string): string =>
  entityKey('queens', { userId, apiaryId });
export const loadQueens = (userId: string, apiaryId: string): any[] =>
  loadData('queens', [] as any[], { userId, apiaryId });
export const saveQueens = (queens: any[], userId: string, apiaryId: string): void =>
  saveData('queens', queens, { userId, apiaryId });

// Historial de cambios de reina (por usuario y apiario)
export const getQueenHistoryKey = (userId: string, apiaryId: string): string =>
  entityKey('queenHistory', { userId, apiaryId });
export const loadQueenHistory = (userId: string, apiaryId: string): any[] =>
  loadData('queenHistory', [] as any[], { userId, apiaryId });
export const saveQueenHistory = (entries: any[], userId: string, apiaryId: string): void =>
  saveData('queenHistory', entries, { userId, apiaryId });

// Entradas del cuaderno (por usuario y apiario)
export const getCuadernoEntriesKey = (userId: string, apiaryId: string): string =>
  entityKey('cuadernoEntries', { userId, apiaryId });
export const loadCuadernoEntries = (userId: string, apiaryId: string): any[] =>
  loadData('cuadernoEntries', [] as any[], { userId, apiaryId });
export const saveCuadernoEntries = (entries: any[], userId: string, apiaryId: string): void =>
  saveData('cuadernoEntries', entries, { userId, apiaryId });

// Inventario de material, herramientas e insumos (por usuario)
export const getInventoryKey = (userId: string): string => entityKey('inventory', { userId });
export const loadInventory = (userId: string): any[] =>
  loadData('inventory', [] as any[], { userId });
export const saveInventory = (items: any[], userId: string): void =>
  saveData('inventory', items, { userId });

// Historial de transferencias (por usuario)
export const getTransferHistoryKey = (userId: string): string =>
  entityKey('transferHistory', { userId });

// ------------------------------------------------------------
// MIGRACIÓN AUTOMÁTICA
// ------------------------------------------------------------

const LEGACY_ENTITY_MAP: Record<string, string> = {
  hives: 'hives',
  colmenas: 'hives',
  nuclei: 'nuclei',
  nucleos: 'nuclei',
  inspections: 'inspections',
  inspecciones: 'inspections',
  tasks: 'tasks',
  tareas: 'tasks',
  harvests: 'harvests',
  cosechas: 'harvests',
  queens: 'queens',
  reinas: 'queens',
  breeding: 'breeding',
  breedingLots: 'breeding',
  queenHistory: 'queenHistory',
  cuadernoEntries: 'cuadernoEntries',
  inventory: 'inventory',
  apiarios: 'apiaries',
  apiaries: 'apiaries',
  activeApiary: 'activeApiary',
  events: 'events',
  eventTemplates: 'eventTemplates',
  event_templates: 'eventTemplates',
  recurringTasks: 'recurringTasks',
  recurring_tasks: 'recurringTasks',
  flowering: 'flowering',
  notifications: 'notifications',
  reminders: 'reminders',
  favorites: 'favorites',
  tags: 'tags',
  harvestUnit: 'harvestUnit',
  harvest_unit: 'harvestUnit',
  annualGoal: 'annualGoal',
  annual_goal: 'annualGoal',
  basePrice: 'basePrice',
  base_price: 'basePrice',
  lastSelection: 'lastSelection',
  weatherCache: 'weatherCache',
  weather_cache: 'weatherCache',
  settings: 'settings',
  transferHistory: 'transferHistory',
};

// Entidades por-apiario soportadas en los esquemas heredados
const APIARY_ENTITIES = new Set([
  'hives', 'colmenas', 'nuclei', 'nucleos', 'inspections', 'inspecciones',
  'tasks', 'tareas', 'harvests', 'cosechas', 'queens', 'reinas',
  'breedingLots', 'queenHistory', 'cuadernoEntries',
]);

const URL_SAFE_WORDS = new Set([
  'hives', 'nuclei', 'inspections', 'tasks', 'harvests', 'queens',
  'apiarios', 'apiaries', 'activeApiary', 'inventory', 'transferHistory',
  'weatherCache', 'settings',
]);

// Entidades "panal_*" heredadas globales (sin uid → usuario actual/anónimo)
const BARE_GLOBAL_KEYS: { legacy: string; entity: string }[] = [
  { legacy: 'hives', entity: 'hives' },
  { legacy: 'nuclei', entity: 'nuclei' },
  { legacy: 'inspections', entity: 'inspections' },
  { legacy: 'tasks', entity: 'tasks' },
  { legacy: 'harvests', entity: 'harvests' },
  { legacy: 'colmenas', entity: 'hives' },
  { legacy: 'nucleos', entity: 'nuclei' },
  { legacy: 'inspecciones', entity: 'inspections' },
  { legacy: 'tareas', entity: 'tasks' },
  { legacy: 'cosechas', entity: 'harvests' },
  { legacy: 'reinas', entity: 'queens' },
  { legacy: 'settings', entity: 'settings' },
  { legacy: 'lastSelection', entity: 'lastSelection' },
  { legacy: 'weather_cache', entity: 'weatherCache' },
  { legacy: 'panal_events', entity: 'events' },
  { legacy: 'panal_event_templates', entity: 'eventTemplates' },
  { legacy: 'panal_recurring_tasks', entity: 'recurringTasks' },
  { legacy: 'panal_flowering', entity: 'flowering' },
  { legacy: 'panal_notifications', entity: 'notifications' },
  { legacy: 'panal_reminders', entity: 'reminders' },
  { legacy: 'panal_harvests', entity: 'harvests' },
  { legacy: 'panal_harvest_unit', entity: 'harvestUnit' },
  { legacy: 'panal_annual_goal', entity: 'annualGoal' },
  { legacy: 'panal_base_price', entity: 'basePrice' },
  { legacy: 'hive_favorites', entity: 'favorites' },
  { legacy: 'hive_tags', entity: 'tags' },
];

const parseLegacyKey = (
  key: string,
  fallbackUserId: string
): { userId: string; entity: string; apiaryId?: string } | null => {
  // user_${uid}_apiary_${apiaryId}_${entity}
  const mApiary = key.match(/^user_([^_]+)_apiary_(.+)_([A-Za-z]+)$/);
  if (mApiary && LEGACY_ENTITY_MAP[mApiary[3]]) {
    if (!APIARY_ENTITIES.has(mApiary[3]) && mApiary[3] !== 'queens') {
      // aceptamos cualquier entidad conocida; sólo aplica apiaryId a las relevantes
    }
    const apiaryId = APIARY_ENTITIES.has(mApiary[3]) ? mApiary[2] : undefined;
    return { userId: mApiary[1], entity: LEGACY_ENTITY_MAP[mApiary[3]], apiaryId };
  }

  // user_${uid}_${entity}
  const mUserEntity = key.match(/^user_([^_]+)_([A-Za-z]+)$/);
  if (mUserEntity && LEGACY_ENTITY_MAP[mUserEntity[2]]) {
    return { userId: mUserEntity[1], entity: LEGACY_ENTITY_MAP[mUserEntity[2]] };
  }

  // ${entity}_${uid}_${apiaryId}
  const mEntityApiary = key.match(/^([A-Za-z]+)_([^_]+)_([^_]+)$/);
  if (mEntityApiary && URL_SAFE_WORDS.has(mEntityApiary[1]) && APIARY_ENTITIES.has(mEntityApiary[1])) {
    return { userId: mEntityApiary[2], entity: LEGACY_ENTITY_MAP[mEntityApiary[1]], apiaryId: mEntityApiary[3] };
  }

  // ${entity}_${uid}
  const mEntityUid = key.match(/^([A-Za-z]+)_([^_]+)$/);
  if (mEntityUid && URL_SAFE_WORDS.has(mEntityUid[1])) {
    return { userId: mEntityUid[2], entity: LEGACY_ENTITY_MAP[mEntityUid[1]] };
  }

  // panal_${entity}_${uid} | panal_${entity}
  const mPanal = key.match(/^panal_([a-z_]+)(?:_([^_]+))?$/);
  if (mPanal && LEGACY_ENTITY_MAP[mPanal[1]]) {
    return { userId: mPanal[2] || fallbackUserId, entity: LEGACY_ENTITY_MAP[mPanal[1]] };
  }

  // Claves sueltas globales/anónimas
  const bare = BARE_GLOBAL_KEYS.find((b) => b.legacy === key);
  if (bare) {
    return { userId: fallbackUserId, entity: bare.entity };
  }

  return null;
};

/**
 * Migra claves heredadas (sin versión) a las claves versionadas
 * panal_v1_user_${userId}_${entity}. NUNCA borra la clave vieja
 * (queda como respaldo). Solo copia si la nueva está vacía.
 */
export const runMigrations = (userId?: string): void => {
  const fallbackUserId = userId || getCurrentUserId();
  console.log('🔄 [MIGRATION] Iniciando migración de claves legado → versionadas...');

  const keys = Object.keys(localStorage);
  let migrated = 0;

  keys.forEach((legacyKey) => {
    if (legacyKey.startsWith(`${STORAGE_VERSION}_`)) return;
    if (legacyKey.startsWith('migration_completed_')) return;
    if (legacyKey === 'language' || legacyKey === 'lastActiveApiarioId') return;
    if (legacyKey === 'settings' && userId) {
      // se migra más abajo con fallbackUserId de forma natural
    }

    const parsed = parseLegacyKey(legacyKey, fallbackUserId);
    if (!parsed) return;

    const entity = parsed.entity;
    const targetKey = `${STORAGE_VERSION}_user_${parsed.userId}_${entity}${
      parsed.apiaryId ? `_${parsed.apiaryId}` : ''
    }`;

    const raw = localStorage.getItem(legacyKey);
    if (raw == null || raw === '') return;
    const parsedRaw = safeParse(raw);
    if (parsedRaw === undefined) return;

    const existingTarget = localStorage.getItem(targetKey);
    if (existingTarget != null && safeParse(existingTarget) !== undefined && !isEmptyValue(safeParse(existingTarget))) {
      // La clave nueva ya tiene datos: NO sobrescribir
      return;
    }

    try {
      localStorage.setItem(targetKey, raw);
      migrated++;
      const n = countRecords(parsedRaw);
      console.log(`[MIGRATION] Migrados ${n} registros de '${legacyKey}' a '${targetKey}'`);
    } catch (error) {
      console.error(`[MIGRATION] Error migrando '${legacyKey}':`, error);
    }
  });

  if (migrated > 0) {
    console.log(`✅ [MIGRATION] Migración completada: ${migrated} claves migradas`);
  } else {
    console.log('✅ [MIGRATION] Sin claves legado pendientes');
  }
};

// Compatibilidad con la llamada existente desde AuthContext
export const migrateOldData = (): void => {
  runMigrations();
};

// ------------------------------------------------------------
// LIMPIEZA DE DATOS DEL USUARIO ("Borrar todos mis datos")
// ------------------------------------------------------------

const removeKeyAndBackups = (storageKey: string): void => {
  const keys = [storageKey, ...listBackups(storageKey).map((b) => b.key)];
  keys.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  });
};

/**
 * Elimina TODOS los datos del usuario actual (incl. backups). Única
 * función autorizada a borrar datos del usuario; se invoca desde
 * "Borrar todos mis datos" en Ajustes, con doble confirmación.
 */
/**
 * Elimina los datos asociados a un APIARIO concreto (uso explícito desde
 * la eliminación de un apiario). Borra claves versionadas, backups y las
 * claves legado equivalentes, sin tocar el resto de datos del usuario.
 */
export const removeApiaryData = (userId: string, apiaryId: string): void => {
  ['hives', 'nuclei', 'inspections', 'tasks', 'harvests'].forEach((entity) => {
    removeFromStorage(entity, `_${userId}_${apiaryId}`);
    try {
      localStorage.removeItem(`${entity}_${userId}_${apiaryId}`);
    } catch { /* ignore */ }
  });
  ['breeding', 'queens', 'queenHistory', 'cuadernoEntries'].forEach((entity) => {
    const k = entityKey(entity, { userId, apiaryId });
    removeKeyAndBackups(k);
    const legacyMaps: Record<string, string> = {
      breeding: 'breedingLots', queens: 'queens', queenHistory: 'queenHistory', cuadernoEntries: 'cuadernoEntries',
    };
    try {
      localStorage.removeItem(`user_${userId}_apiary_${apiaryId}_${legacyMaps[entity]}`);
    } catch { /* ignore */ }
  });
};

export const clearUserData = (): void => {
  const uid = getCurrentUserId();
  console.log(`🗑️ [STORAGE] Limpiando todos los datos del usuario: ${uid}`);

  const userPrefix = `${STORAGE_VERSION}_user_${uid}`;
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(`${userPrefix}_`) || key.startsWith(`${userPrefix}`) && key.length > userPrefix.length) {
      removeKeyAndBackups(key);
    } else if (
      key.includes(`_${uid}_`) ||
      key.endsWith(`_${uid}`) ||
      key.startsWith(`user_${uid}_`) ||
      key.startsWith(`panal_events_${uid}`) ||
      key.startsWith(`panal_harvests_${uid}`) ||
      key.startsWith(`migration_completed_${uid}`)
    ) {
      removeKeyAndBackups(key);
    }
  });

  console.log('✅ [STORAGE] Datos del usuario limpiados');
};

// ------------------------------------------------------------
// EXPORTAR / IMPORTAR
// ------------------------------------------------------------

export interface ExportPayload {
  app: 'panal';
  version: 1;
  exportedAt: string;
  user: string;
  data: Record<string, string>;
}

/**
 * Genera un JSON con TODOS los datos del usuario (todas las claves
 * versionadas + claves legado relacionadas + ajustes compartidos).
 */
export const exportUserData = (): ExportPayload => {
  const uid = getCurrentUserId();
  const data: Record<string, string> = {};

  Object.keys(localStorage).forEach((key) => {
    const raw = localStorage.getItem(key);
    if (raw == null) return;
    const own =
      key.startsWith(`${STORAGE_VERSION}_user_${uid}_`) ||
      key === `${STORAGE_VERSION}_activeApiary_${uid}` ||
      key.includes(`_${uid}_`) ||
      key.endsWith(`_${uid}`) ||
      key.startsWith(`user_${uid}_`);
    const shared = key === 'settings' || key === 'language' || key === 'lastActiveApiarioId';
    if (own || shared) {
      data[key] = raw;
    }
  });

  return {
    app: 'panal',
    version: 1,
    exportedAt: new Date().toISOString(),
    user: uid,
    data,
  };
};

const isPanalBackup = (payload: unknown): payload is ExportPayload => {
  return (
    payload != null &&
    typeof payload === 'object' &&
    (payload as ExportPayload).app === 'panal' &&
    (payload as ExportPayload).data != null &&
    typeof (payload as ExportPayload).data === 'object'
  );
};

/**
 * Restaura un backup importado. Valida la estructura mínima antes de
 * aplicar. Devuelve el número de claves aplicadas.
 */
export const importUserData = (
  payload: unknown
): { applied: number; keys: string[]; errors: string[] } => {
  const errors: string[] = [];
  const applied: string[] = [];

  // Formato NUEVO (mapa de claves completas)
  if (isPanalBackup(payload)) {
    Object.entries(payload.data).forEach(([key, value]) => {
      if (typeof value !== 'string') {
        errors.push(`Clave '${key}' con valor no válido`);
        return;
      }
      try {
        const parsed = JSON.parse(value);
        writeToKey(key, parsed, key, true);
        if (!key.endsWith(`__backup`)) {
          // regenerar alias de backup del valor anterior
        }
        applied.push(key);
      } catch (error) {
        errors.push(`Clave '${key}' con JSON inválido`);
      }
    });
    return { applied: applied.length, keys: applied, errors };
  }

  // Formato LEGADO (exportación antigua de SettingsPage)
  if (payload != null && typeof payload === 'object') {
    const legacy = payload as Record<string, unknown>;
    const hasAny = ['hives', 'inspections', 'tasks', 'events', 'settings'].some((k) => legacy[k] !== undefined);
    if (hasAny) {
      if (legacy.hives !== undefined) { saveData('hives', legacy.hives, { force: true }); applied.push('hives'); }
      if (legacy.nuclei !== undefined) { saveData('nuclei', legacy.nuclei, { force: true }); applied.push('nuclei'); }
      if (legacy.inspections !== undefined) { saveData('inspections', legacy.inspections, { force: true }); applied.push('inspections'); }
      if (legacy.tasks !== undefined) { saveData('tasks', legacy.tasks, { force: true }); applied.push('tasks'); }
      if (legacy.harvests !== undefined) { saveData('harvests', legacy.harvests, { force: true }); applied.push('harvests'); }
      if (legacy.events !== undefined) { saveData('events', legacy.events, { force: true }); applied.push('events'); }
      if (legacy.settings !== undefined) { saveSettings(legacy.settings); applied.push('settings'); }
      return { applied: applied.length, keys: applied, errors };
    }
  }

  throw new Error('Estructura de backup no válida');
};