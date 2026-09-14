import { useAuth } from '../context/AuthContext';
import { useActiveApiary } from '../context/ActiveApiaryContext';

/**
 * Hook para obtener claves de almacenamiento separadas por usuario y apiario
 */
export function useStorageKeys() {
  const { user } = useAuth();
  const { activeApiaryId } = useActiveApiary();

  const userId = user?.uid || null;

  // Claves globales del usuario (independientes del apiario)
  const getUserKey = (key: string): string => {
    if (!userId) throw new Error('Usuario no autenticado');
    return `${key}_${userId}`;
  };

  // Claves específicas del apiario activo
  const getApiaryKey = (key: string): string => {
    if (!userId) throw new Error('Usuario no autenticado');
    if (!activeApiaryId) throw new Error('No hay apiario activo seleccionado');
    return `${key}_${userId}_${activeApiaryId}`;
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
    try {
      const storageKey = `${key}_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  load: <T>(key: string, userId: string, defaultValue: T): T => {
    try {
      const storageKey = `${key}_${userId}`;
      const item = localStorage.getItem(storageKey);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return defaultValue;
    }
  },

  remove: (key: string, userId: string): void => {
    try {
      const storageKey = `${key}_${userId}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },
};

/**
 * Funciones de almacenamiento para datos del apiario (dependientes del apiario activo)
 */
export const apiaryStorage = {
  save: <T>(key: string, userId: string, apiaryId: string, data: T): void => {
    try {
      const storageKey = `${key}_${userId}_${apiaryId}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  load: <T>(key: string, userId: string, apiaryId: string, defaultValue: T): T => {
    try {
      const storageKey = `${key}_${userId}_${apiaryId}`;
      const item = localStorage.getItem(storageKey);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return defaultValue;
    }
  },

  remove: (key: string, userId: string, apiaryId: string): void => {
    try {
      const storageKey = `${key}_${userId}_${apiaryId}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },
};

/**
 * Esquema de claves de almacenamiento:
 * 
 * Datos del usuario (independientes del apiario):
 * - activeApiary_{userId} → ID del apiario activo
 * 
 * Datos del apiario (dependientes del apiario activo):
 * - hives_{userId}_{apiaryId} → Colmenas del apiario
 * - inspections_{userId}_{apiaryId} → Inspecciones del apiario
 * - harvests_{userId}_{apiaryId} → Cosechas del apiario
 * - tasks_{userId}_{apiaryId} → Tareas del apiario
 * - events_{userId}_{apiaryId} → Eventos del apiario
 * - favorites_{userId}_{apiaryId} → Favoritos del apiario
 * - tags_{userId}_{apiaryId} → Etiquetas del apiario
 */
