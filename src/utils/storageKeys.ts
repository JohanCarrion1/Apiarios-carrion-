import { useAuth } from '../context/AuthContext';
import { useActiveApiary } from '../context/ActiveApiaryContext';
import { entityKey, loadData, saveData } from '../utils/storage';

/**
 * Hook para obtener claves de almacenamiento separadas por usuario y apiario
 * (claves versionadas panal_v1_user_...).
 */
export function useStorageKeys() {
  const { user } = useAuth();
  const { activeApiaryId } = useActiveApiary();

  const userId = user?.uid || null;

  // Claves globales del usuario (independientes del apiario)
  const getUserKey = (key: string): string => {
    if (!userId) return entityKey(key);
    return entityKey(key, { userId });
  };

  // Claves específicas del apiario activo
  const getApiaryKey = (key: string): string => {
    if (!userId) return entityKey(key);
    if (!activeApiaryId) return entityKey(key);
    return entityKey(key, { userId, apiaryId: activeApiaryId });
  };

  // Verificar si hay un apiario activo
  const hasActiveApiary = (): boolean => {
    return userId !== null && activeApiaryId !== null;
  };

  return {
    userId,
    activeApiaryId,
    getUserKey,
    getApiaryKey,
    hasActiveApiary,
  };
}

/**
 * Funciones de almacenamiento para datos del usuario (independientes del apiario)
 */
export const userStorage = {
  save: <T>(key: string, userId: string, data: T): void => {
    saveData(key, data, { userId, force: true });
  },

  load: <T>(key: string, userId: string, defaultValue: T): T => {
    return loadData(key, defaultValue, { userId });
  },

  remove: (key: string, userId: string): void => {
    localStorage.removeItem(entityKey(key, { userId }));
  },
};

/**
 * Funciones de almacenamiento para datos del apiario (dependientes del apiario activo)
 */
export const apiaryStorage = {
  save: <T>(key: string, userId: string, apiaryId: string, data: T): void => {
    saveData(key, data, { userId, apiaryId, force: true });
  },

  load: <T>(key: string, userId: string, apiaryId: string, defaultValue: T): T => {
    return loadData(key, defaultValue, { userId, apiaryId });
  },

  remove: (key: string, userId: string, apiaryId: string): void => {
    localStorage.removeItem(entityKey(key, { userId, apiaryId }));
  },
};

/**
 * Esquema de claves de almacenamiento versionadas:
 *   panal_v1_user_${userId}_<entidad>            → datos del usuario
 *   panal_v1_user_${userId}_<entidad>_${apiaryId} → datos del apiario
 *   panal_v1_user_${userId}_backup_<entidad>     → backups rotativos (3)
 */