// ============================================
// SERVICIOS DE APIARIOS Y COLMENAS EN LOCALSTORAGE
// ============================================
// Toda lectura/escritura pasa por la capa central de almacenamiento
// versionada (utils/storage.ts) con backups rotativos y migración.
import type { PhotoData } from './photos';
import {
  loadApiaries,
  saveApiaries,
  loadHives,
  saveHives,
  loadInspections,
  saveInspections,
  loadHarvests,
  saveHarvests,
  loadTasks,
  saveTasks,
  removeApiaryData,
} from '../utils/storage';

// Interfaz para Apiario
export interface Apiary {
  id: string;
  userId: string;
  name: string;
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  altitud?: number;
  fotos?: PhotoData[];
  createdAt: string;
  updatedAt: string;
}

// Interfaz para Hive con apiaryId
export interface HiveWithApiary {
  id: string;
  apiaryId: string;
  code: string;
  name?: string;
  status?: string;
  queenYear?: number;
  queenMarkedColor?: string;
  location?: string;
  notes?: string;
  lastInspectionDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

const generateId = (): string => {
  return `apiary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getSuffix = (userId: string, apiaryId: string): string => `_${userId}_${apiaryId}`;

// ============================================
// SERVICIOS DE APIARIOS
// ============================================

/**
 * Crear un nuevo apiario
 */
export async function createApiary(
  userId: string, 
  name: string, 
  location: string,
  coordinates?: { lat: number; lng: number },
  fotos?: PhotoData[],
  altitud?: number
): Promise<string> {
  console.log('🔍 [LOCALSTORAGE] === INICIO createApiary ===');
  
  try {
    if (!userId) {
      throw new Error('userId es requerido');
    }
    if (!name || name.trim() === '') {
      throw new Error('name es requerido y no puede estar vacío');
    }
    
    const apiaryData: Apiary = {
      id: generateId(),
      userId: userId,
      name: name.trim(),
      location: location ? location.trim() : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (coordinates && coordinates.lat !== undefined && coordinates.lng !== undefined) {
      apiaryData.coordinates = {
        lat: Number(coordinates.lat),
        lng: Number(coordinates.lng)
      };
    }

    if (typeof altitud === 'number' && !Number.isNaN(altitud)) {
      apiaryData.altitud = altitud;
    }

    if (fotos && fotos.length > 0) {
      apiaryData.fotos = fotos;
    }

    const existingApiaries = loadApiaries(userId);
    existingApiaries.push(apiaryData);
    saveApiaries(existingApiaries, userId);

    console.log('✅ [LOCALSTORAGE] Apiario creado exitosamente');
    console.log('✅ [LOCALSTORAGE] ID del apiario:', apiaryData.id);
    
    return apiaryData.id;
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al crear apiario:', error?.message || error);
    throw new Error(`Error al crear el apiario: ${error?.message || 'Error desconocido'}`);
  }
}

/**
 * Obtener todos los apiarios del usuario
 */
export async function getUserApiaries(userId: string): Promise<Apiary[]> {
  try {
    const apiaries = loadApiaries(userId);
    apiaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return apiaries;
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al obtener apiarios:', error);
    return [];
  }
}

/**
 * Obtener un apiario específico
 */
export async function getApiary(userId: string, apiaryId: string): Promise<Apiary | null> {
  try {
    const apiaries = await getUserApiaries(userId);
    return apiaries.find(a => a.id === apiaryId) || null;
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al obtener apiario:', error);
    return null;
  }
}

/**
 * Actualizar un apiario
 */
export async function updateApiary(userId: string, apiaryId: string, updates: Partial<Apiary>): Promise<void> {
  try {
    const apiaries = loadApiaries(userId);
    const index = apiaries.findIndex(a => a.id === apiaryId);
    if (index === -1) {
      throw new Error('Apiario no encontrado');
    }
    apiaries[index] = {
      ...apiaries[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveApiaries(apiaries, userId);
    console.log('✅ [LOCALSTORAGE] Apiario actualizado:', apiaryId);
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al actualizar apiario:', error);
    throw error;
  }
}

/**
 * Eliminar un apiario
 */
export async function deleteApiary(userId: string, apiaryId: string): Promise<void> {
  try {
    const apiaries = loadApiaries(userId);
    const filteredApiaries = apiaries.filter(a => a.id !== apiaryId);
    saveApiaries(filteredApiaries, userId);

    // Eliminar datos asociados al apiario (acción explícita del usuario)
    removeApiaryData(userId, apiaryId);

    console.log('✅ [LOCALSTORAGE] Apiario eliminado:', apiaryId);
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al eliminar apiario:', error);
    throw error;
  }
}

// ============================================
// SERVICIOS DE COLMENAS
// ============================================

/**
 * Crear una nueva colmena en un apiario
 */
export async function createHive(
  userId: string,
  apiaryId: string,
  hiveData: Omit<HiveWithApiary, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const hiveId = `hive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newHive: HiveWithApiary = {
      ...hiveData,
      id: hiveId,
      apiaryId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const suffix = getSuffix(userId, apiaryId);
    const existingHives = loadHives(suffix);
    existingHives.push(newHive);
    saveHives(existingHives, suffix);

    console.log('✅ [LOCALSTORAGE] Colmena creada:', hiveId);
    return hiveId;
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al crear colmena:', error);
    throw error;
  }
}

/**
 * Obtener todas las colmenas de un apiario
 */
export async function getApiaryHives(userId: string, apiaryId: string): Promise<HiveWithApiary[]> {
  try {
    const suffix = getSuffix(userId, apiaryId);
    const hives = loadHives(suffix) as HiveWithApiary[];
    hives.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return hives;
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al obtener colmenas:', error);
    return [];
  }
}

/**
 * Obtener una colmena específica
 */
export async function getHive(userId: string, apiaryId: string, hiveId: string): Promise<HiveWithApiary | null> {
  try {
    const hives = await getApiaryHives(userId, apiaryId);
    return hives.find(h => h.id === hiveId) || null;
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al obtener colmena:', error);
    return null;
  }
}

/**
 * Actualizar una colmena
 */
export async function updateHive(userId: string, apiaryId: string, hiveId: string, updates: Partial<HiveWithApiary>): Promise<void> {
  try {
    const suffix = getSuffix(userId, apiaryId);
    const hives = loadHives(suffix) as HiveWithApiary[];
    const index = hives.findIndex(h => h.id === hiveId);
    if (index === -1) {
      throw new Error('Colmena no encontrada');
    }
    hives[index] = {
      ...hives[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveHives(hives, suffix);
    console.log('✅ [LOCALSTORAGE] Colmena actualizada:', hiveId);
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al actualizar colmena:', error);
    throw error;
  }
}

/**
 * Eliminar una colmena
 */
export async function deleteHive(userId: string, apiaryId: string, hiveId: string): Promise<void> {
  try {
    const suffix = getSuffix(userId, apiaryId);
    const hives = loadHives(suffix) as HiveWithApiary[];
    const filteredHives = hives.filter(h => h.id !== hiveId);
    saveHives(filteredHives, suffix);
    console.log('✅ [LOCALSTORAGE] Colmena eliminada:', hiveId);
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al eliminar colmena:', error);
    throw error;
  }
}

// ============================================
// SERVICIOS DE INSPECCIONES
// ============================================

/**
 * Crear una nueva inspección
 */
export async function createInspection(userId: string, apiaryId: string, inspectionData: any): Promise<string> {
  try {
    const inspectionId = `inspection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newInspection = {
      ...inspectionData,
      id: inspectionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const suffix = getSuffix(userId, apiaryId);
    const existingInspections = loadInspections(suffix);
    existingInspections.push(newInspection);
    saveInspections(existingInspections, suffix);
    
    console.log('✅ [LOCALSTORAGE] Inspección creada:', inspectionId);
    return inspectionId;
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al crear inspección:', error);
    throw error;
  }
}

/**
 * Obtener todas las inspecciones de un apiario
 */
export async function getApiaryInspections(userId: string, apiaryId: string): Promise<any[]> {
  try {
    const suffix = getSuffix(userId, apiaryId);
    const inspections = loadInspections(suffix);
    inspections.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return inspections;
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al obtener inspecciones:', error);
    return [];
  }
}

/**
 * Actualizar una inspección
 */
export async function updateInspection(userId: string, apiaryId: string, inspectionId: string, updates: any): Promise<void> {
  try {
    const suffix = getSuffix(userId, apiaryId);
    const inspections = loadInspections(suffix);
    const index = inspections.findIndex(i => i.id === inspectionId);
    if (index === -1) {
      throw new Error('Inspección no encontrada');
    }
    inspections[index] = {
      ...inspections[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveInspections(inspections, suffix);
    console.log('✅ [LOCALSTORAGE] Inspección actualizada:', inspectionId);
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al actualizar inspección:', error);
    throw error;
  }
}

/**
 * Eliminar una inspección
 */
export async function deleteInspection(userId: string, apiaryId: string, inspectionId: string): Promise<void> {
  try {
    const suffix = getSuffix(userId, apiaryId);
    const inspections = loadInspections(suffix);
    const filteredInspections = inspections.filter(i => i.id !== inspectionId);
    saveInspections(filteredInspections, suffix);
    console.log('✅ [LOCALSTORAGE] Inspección eliminada:', inspectionId);
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al eliminar inspección:', error);
    throw error;
  }
}

// ============================================
// SERVICIOS DE COSECHAS
// ============================================

/**
 * Crear una nueva cosecha
 */
export async function createHarvest(userId: string, apiaryId: string, harvestData: any): Promise<string> {
  try {
    const harvestId = `harvest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newHarvest = {
      ...harvestData,
      id: harvestId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const suffix = getSuffix(userId, apiaryId);
    const existingHarvests = loadHarvests(suffix);
    existingHarvests.push(newHarvest);
    saveHarvests(existingHarvests, suffix);

    console.log('✅ [LOCALSTORAGE] Cosecha creada:', harvestId);
    return harvestId;
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al crear cosecha:', error);
    throw error;
  }
}

/**
 * Obtener todas las cosechas de un apiario
 */
export async function getApiaryHarvests(userId: string, apiaryId: string): Promise<any[]> {
  try {
    const suffix = getSuffix(userId, apiaryId);
    const harvests = loadHarvests(suffix);
    harvests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return harvests;
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al obtener cosechas:', error);
    return [];
  }
}

/**
 * Actualizar una cosecha
 */
export async function updateHarvest(userId: string, apiaryId: string, harvestId: string, updates: any): Promise<void> {
  try {
    const suffix = getSuffix(userId, apiaryId);
    const harvests = loadHarvests(suffix);
    const index = harvests.findIndex(h => h.id === harvestId);
    if (index === -1) {
      throw new Error('Cosecha no encontrada');
    }
    harvests[index] = {
      ...harvests[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveHarvests(harvests, suffix);
    console.log('✅ [LOCALSTORAGE] Cosecha actualizada:', harvestId);
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al actualizar cosecha:', error);
    throw error;
  }
}

/**
 * Eliminar una cosecha
 */
export async function deleteHarvest(userId: string, apiaryId: string, harvestId: string): Promise<void> {
  try {
    const suffix = getSuffix(userId, apiaryId);
    const harvests = loadHarvests(suffix);
    const filteredHarvests = harvests.filter(h => h.id !== harvestId);
    saveHarvests(filteredHarvests, suffix);
    console.log('✅ [LOCALSTORAGE] Cosecha eliminada:', harvestId);
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al eliminar cosecha:', error);
    throw error;
  }
}

// ============================================
// SERVICIOS DE TAREAS
// ============================================

/**
 * Crear una nueva tarea
 */
export async function createTask(userId: string, apiaryId: string, taskData: any): Promise<string> {
  try {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTask = {
      ...taskData,
      id: taskId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const suffix = getSuffix(userId, apiaryId);
    const existingTasks = loadTasks(suffix);
    existingTasks.push(newTask);
    saveTasks(existingTasks, suffix);

    console.log('✅ [LOCALSTORAGE] Tarea creada:', taskId);
    return taskId;
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al crear tarea:', error);
    throw error;
  }
}

/**
 * Obtener todas las tareas de un apiario
 */
export async function getApiaryTasks(userId: string, apiaryId: string): Promise<any[]> {
  try {
    const suffix = getSuffix(userId, apiaryId);
    const tasks = loadTasks(suffix);
    tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return tasks;
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al obtener tareas:', error);
    return [];
  }
}

/**
 * Actualizar una tarea
 */
export async function updateTask(userId: string, apiaryId: string, taskId: string, updates: any): Promise<void> {
  try {
    const suffix = getSuffix(userId, apiaryId);
    const tasks = loadTasks(suffix);
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) {
      throw new Error('Tarea no encontrada');
    }
    tasks[index] = {
      ...tasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveTasks(tasks, suffix);
    console.log('✅ [LOCALSTORAGE] Tarea actualizada:', taskId);
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al actualizar tarea:', error);
    throw error;
  }
}

/**
 * Eliminar una tarea
 */
export async function deleteTask(userId: string, apiaryId: string, taskId: string): Promise<void> {
  try {
    const suffix = getSuffix(userId, apiaryId);
    const tasks = loadTasks(suffix);
    const filteredTasks = tasks.filter(t => t.id !== taskId);
    saveTasks(filteredTasks, suffix);
    console.log('✅ [LOCALSTORAGE] Tarea eliminada:', taskId);
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al eliminar tarea:', error);
    throw error;
  }
}