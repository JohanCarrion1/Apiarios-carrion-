// Sistema centralizado de almacenamiento con separación por usuario
import { auth } from '../lib/firebase';

// Obtener el UID del usuario actual
export const getCurrentUserId = (): string => {
  // Si hay usuario autenticado de Firebase, usar su UID
  if (auth && auth.currentUser) {
    return auth.currentUser.uid;
  }
  
  // Si no hay usuario, retornar 'anonymous'
  return 'anonymous';
};

// Generar clave con prefijo de usuario
export const getUserKey = (key: string): string => {
  const userId = getCurrentUserId();
  return `${key}_${userId}`;
};

// Funciones genéricas de almacenamiento
export const saveToStorage = <T>(key: string, data: T, suffix: string = ''): void => {
  try {
    const userKey = getUserKey(key) + suffix;
    localStorage.setItem(userKey, JSON.stringify(data));
    console.log(`💾 [STORAGE] Guardado: ${userKey}`);
  } catch (error) {
    console.error('❌ [STORAGE] Error al guardar:', error);
  }
};

export const loadFromStorage = <T>(key: string, defaultValue: T, suffix: string = ''): T => {
  try {
    const userKey = getUserKey(key) + suffix;
    const item = localStorage.getItem(userKey);
    const data = item ? JSON.parse(item) : defaultValue;
    console.log(`📂 [STORAGE] Cargado: ${userKey}`, data);
    return data;
  } catch (error) {
    console.error('❌ [STORAGE] Error al cargar:', error);
    return defaultValue;
  }
};

export const removeFromStorage = (key: string, suffix: string = ''): void => {
  try {
    const userKey = getUserKey(key) + suffix;
    localStorage.removeItem(userKey);
    console.log(`🗑️ [STORAGE] Eliminado: ${userKey}`);
  } catch (error) {
    console.error('❌ [STORAGE] Error al eliminar:', error);
  }
};

// Funciones específicas para cada tipo de dato

// Colmenas
export const saveHives = (hives: any[], suffix: string = '') => saveToStorage('hives', hives, suffix);
export const loadHives = (suffix: string = '') => loadFromStorage('hives', [], suffix);

// Núcleos
export const saveNuclei = (nuclei: any[], suffix: string = '') => saveToStorage('nuclei', nuclei, suffix);
export const loadNuclei = (suffix: string = '') => loadFromStorage('nuclei', [], suffix);

// Inspecciones
export const saveInspections = (inspections: any[], suffix: string = '') => saveToStorage('inspections', inspections, suffix);
export const loadInspections = (suffix: string = '') => loadFromStorage('inspections', [], suffix);

// Tareas
export const saveTasks = (tasks: any[], suffix: string = '') => saveToStorage('tasks', tasks, suffix);
export const loadTasks = (suffix: string = '') => loadFromStorage('tasks', [], suffix);

// Eventos del calendario
export const saveEvents = (events: any[]) => saveToStorage('panal_events', events);
export const loadEvents = () => loadFromStorage('panal_events', []);

// Plantillas de eventos
export const saveEventTemplates = (templates: any[]) => saveToStorage('panal_event_templates', templates);
export const loadEventTemplates = () => loadFromStorage('panal_event_templates', []);

// Tareas recurrentes
export const saveRecurringTasks = (tasks: any[]) => saveToStorage('panal_recurring_tasks', tasks);
export const loadRecurringTasks = () => loadFromStorage('panal_recurring_tasks', []);

// Calendario de floración
export const saveFloweringEntries = (entries: any[]) => saveToStorage('panal_flowering', entries);
export const loadFloweringEntries = () => loadFromStorage('panal_flowering', []);

// Recordatorios calculados
export const saveReminders = (reminders: any[]) => saveToStorage('panal_reminders', reminders);
export const loadReminders = () => loadFromStorage('panal_reminders', []);

// Notificaciones
export const saveNotifications = (notifications: any[]) => saveToStorage('panal_notifications', notifications);
export const loadNotifications = () => loadFromStorage('panal_notifications', []);

// Cosechas
export const saveHarvests = (harvests: any[], suffix: string = '') => saveToStorage('panal_harvests', harvests, suffix);
export const loadHarvests = (suffix: string = '') => loadFromStorage('panal_harvests', [], suffix);

// Favoritos de colmenas
export const saveFavorites = (favorites: string[]) => saveToStorage('hive_favorites', favorites);
export const loadFavorites = () => loadFromStorage('hive_favorites', []);

// Etiquetas de colmenas
export const saveTags = (tags: Record<string, string[]>) => saveToStorage('hive_tags', tags);
export const loadTags = () => loadFromStorage('hive_tags', {});

// Configuración de cosechas
export const saveHarvestUnit = (unit: string) => saveToStorage('panal_harvest_unit', unit);
export const loadHarvestUnit = () => loadFromStorage('panal_harvest_unit', 'kg');

export const saveAnnualGoal = (goal: number) => saveToStorage('panal_annual_goal', goal);
export const loadAnnualGoal = () => loadFromStorage('panal_annual_goal', 100);

export const saveBasePrice = (price: number) => saveToStorage('panal_base_price', price);
export const loadBasePrice = () => loadFromStorage('panal_base_price', 25);

// Última selección (Tienda/Colmenas)
export const saveLastSelection = (selection: string) => saveToStorage('lastSelection', selection);
export const loadLastSelection = () => loadFromStorage('lastSelection', '');

// Caché de clima
export const saveWeatherCache = (cache: any) => saveToStorage('weather_cache', cache);
export const loadWeatherCache = () => loadFromStorage('weather_cache', null);

// Idioma (compartido entre usuarios)
export const saveLanguage = (language: string) => {
  localStorage.setItem('language', language);
  console.log(`💾 [STORAGE] Guardado: language (compartido)`);
};

export const loadLanguage = (): string => {
  const item = localStorage.getItem('language');
  console.log(`📂 [STORAGE] Cargado: language (compartido)`, item);
  return item || 'es';
};

// Configuración general (compartida entre usuarios)
export const saveSettings = (settings: any) => {
  localStorage.setItem('settings', JSON.stringify(settings));
  console.log(`💾 [STORAGE] Guardado: settings (compartido)`);
};

export const loadSettings = () => {
  const item = localStorage.getItem('settings');
  const data = item ? JSON.parse(item) : {};
  console.log(`📂 [STORAGE] Cargado: settings (compartido)`, data);
  return data;
};

// Migración de datos antiguos (una sola vez)
export const migrateOldData = (): void => {
  const userId = getCurrentUserId();
  const migrationKey = `migration_completed_${userId}`;
  
  // Verificar si ya se migró para este usuario
  if (localStorage.getItem(migrationKey)) {
    console.log('✅ [MIGRATION] Migración ya completada para este usuario');
    return;
  }
  
  console.log('🔄 [MIGRATION] Iniciando migración de datos antiguos...');
  
  // Lista de claves antiguas que deben migrarse
  const oldKeys = [
    'hives',
    'inspections',
    'tasks',
    'panal_events',
    'panal_event_templates',
    'panal_harvests',
    'hive_favorites',
    'hive_tags',
    'panal_harvest_unit',
    'panal_annual_goal',
    'panal_base_price',
    'lastSelection',
    'weather_cache'
  ];
  
  let migratedCount = 0;
  
  oldKeys.forEach(oldKey => {
    const oldValue = localStorage.getItem(oldKey);
    if (oldValue) {
      const newKey = getUserKey(oldKey);
      localStorage.setItem(newKey, oldValue);
      localStorage.removeItem(oldKey);
      console.log(`✅ [MIGRATION] Migrado: ${oldKey} → ${newKey}`);
      migratedCount++;
    }
  });
  
  // Marcar migración como completada
  localStorage.setItem(migrationKey, 'true');
  
  console.log(`✅ [MIGRATION] Migración completada: ${migratedCount} claves migradas`);
};

// Lotes de cría de reinas (key independiente: user_${userId}_apiary_${apiaryId}_breedingLots)
export const getBreedingLotsKey = (userId: string, apiaryId: string): string =>
  `user_${userId}_apiary_${apiaryId}_breedingLots`;

export const loadBreedingLots = (userId: string, apiaryId: string): any[] => {
  try {
    const key = getBreedingLotsKey(userId, apiaryId);
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch {
    return [];
  }
};

export const saveBreedingLots = (lots: any[], userId: string, apiaryId: string): void => {
  try {
    const key = getBreedingLotsKey(userId, apiaryId);
    localStorage.setItem(key, JSON.stringify(lots));
  } catch (error) {
    console.error('Error saving breeding lots:', error);
  }
};

// Reinas (key independiente: user_${userId}_apiary_${apiaryId}_queens)
export const getQueensKey = (userId: string, apiaryId: string): string =>
  `user_${userId}_apiary_${apiaryId}_queens`;

export const loadQueens = (userId: string, apiaryId: string): any[] => {
  try {
    const key = getQueensKey(userId, apiaryId);
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch {
    return [];
  }
};

export const saveQueens = (queens: any[], userId: string, apiaryId: string): void => {
  try {
    const key = getQueensKey(userId, apiaryId);
    localStorage.setItem(key, JSON.stringify(queens));
  } catch (error) {
    console.error('Error saving queens:', error);
  }
};

// Historial de cambios de reina (key independiente: user_${userId}_apiary_${apiaryId}_queenHistory)
export const getQueenHistoryKey = (userId: string, apiaryId: string): string =>
  `user_${userId}_apiary_${apiaryId}_queenHistory`;

export const loadQueenHistory = (userId: string, apiaryId: string): any[] => {
  try {
    const key = getQueenHistoryKey(userId, apiaryId);
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch {
    return [];
  }
};

export const saveQueenHistory = (entries: any[], userId: string, apiaryId: string): void => {
  try {
    const key = getQueenHistoryKey(userId, apiaryId);
    localStorage.setItem(key, JSON.stringify(entries));
  } catch (error) {
    console.error('Error saving queen history:', error);
  }
};

// Entradas del cuaderno
export const getCuadernoEntriesKey = (userId: string, apiaryId: string): string =>
  `user_${userId}_apiary_${apiaryId}_cuadernoEntries`;

export const loadCuadernoEntries = (userId: string, apiaryId: string): any[] => {
  try {
    const key = getCuadernoEntriesKey(userId, apiaryId);
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch {
    return [];
  }
};

export const saveCuadernoEntries = (entries: any[], userId: string, apiaryId: string): void => {
  try {
    const key = getCuadernoEntriesKey(userId, apiaryId);
    localStorage.setItem(key, JSON.stringify(entries));
  } catch (error) {
    console.error('Error saving cuaderno entries:', error);
  }
};

// Inventario de material, herramientas e insumos
// Key: user_${userId}_inventory (compartido entre apiarios, es material del apicultor)
export const getInventoryKey = (userId: string): string => `user_${userId}_inventory`;

export const loadInventory = (userId: string): any[] => {
  try {
    const key = getInventoryKey(userId);
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch {
    return [];
  }
};

export const saveInventory = (items: any[], userId: string): void => {
  try {
    const key = getInventoryKey(userId);
    localStorage.setItem(key, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving inventory:', error);
  }
};

// Limpiar todos los datos del usuario actual
export const clearUserData = (): void => {
  const userId = getCurrentUserId();
  console.log(`🗑️ [STORAGE] Limpiando todos los datos del usuario: ${userId}`);
  
  const keysToClear = [
    'hives',
    'inspections',
    'tasks',
    'panal_events',
    'panal_event_templates',
    'panal_harvests',
    'hive_favorites',
    'hive_tags',
    'panal_harvest_unit',
    'panal_annual_goal',
    'panal_base_price',
    'lastSelection',
    'weather_cache'
  ];
  
  keysToClear.forEach(key => {
    removeFromStorage(key);
  });
  
  console.log(`✅ [STORAGE] Datos del usuario limpiados`);
};
