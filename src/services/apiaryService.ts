// ============================================
// SERVICIOS DE APIARIOS Y COLMENAS EN LOCALSTORAGE
// ============================================

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

const getApiariesKey = (userId: string): string => {
  return `apiarios_${userId}`;
};

const getHivesKey = (userId: string, apiaryId: string): string => {
  return `hives_${userId}_${apiaryId}`;
};

const getInspectionsKey = (userId: string, apiaryId: string): string => {
  return `inspections_${userId}_${apiaryId}`;
};

const getHarvestsKey = (userId: string, apiaryId: string): string => {
  return `harvests_${userId}_${apiaryId}`;
};

const getTasksKey = (userId: string, apiaryId: string): string => {
  return `tasks_${userId}_${apiaryId}`;
};

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
  coordinates?: { lat: number; lng: number }
): Promise<string> {
  console.log('🔍 [LOCALSTORAGE] === INICIO createApiary ===');
  console.log('🔍 [LOCALSTORAGE] Parámetros recibidos:', { userId, name, location, coordinates });
  
  try {
    // Validar parámetros
    if (!userId) {
      throw new Error('userId es requerido');
    }
    if (!name || name.trim() === '') {
      throw new Error('name es requerido y no puede estar vacío');
    }
    
    // Construir datos del apiario
    const apiaryData: Apiary = {
      id: generateId(),
      userId: userId,
      name: name.trim(),
      location: location ? location.trim() : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Agregar coordenadas si están disponibles
    if (coordinates && coordinates.lat !== undefined && coordinates.lng !== undefined) {
      apiaryData.coordinates = {
        lat: Number(coordinates.lat),
        lng: Number(coordinates.lng)
      };
    }

    console.log('📝 [LOCALSTORAGE] Datos a guardar:', JSON.stringify(apiaryData, null, 2));
    
    // Obtener apiarios existentes
    const apiariesKey = getApiariesKey(userId);
    const existingApiariesJson = localStorage.getItem(apiariesKey);
    const existingApiaries: Apiary[] = existingApiariesJson ? JSON.parse(existingApiariesJson) : [];
    
    // Agregar nuevo apiario
    existingApiaries.push(apiaryData);
    
    // Guardar en localStorage
    localStorage.setItem(apiariesKey, JSON.stringify(existingApiaries));
    
    console.log('✅ [LOCALSTORAGE] Apiario creado exitosamente');
    console.log('✅ [LOCALSTORAGE] ID del apiario:', apiaryData.id);
    console.log('🔍 [LOCALSTORAGE] === FIN createApiary (EXITOSO) ===');
    
    return apiaryData.id;
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] === ERROR EN createApiary ===');
    console.error('❌ [LOCALSTORAGE] Error completo:', error);
    console.error('❌ [LOCALSTORAGE] Error message:', error.message);
    throw new Error(`Error al crear el apiario: ${error.message || 'Error desconocido'}`);
  }
}

/**
 * Obtener todos los apiarios del usuario
 */
export async function getUserApiaries(userId: string): Promise<Apiary[]> {
  try {
    const apiariesKey = getApiariesKey(userId);
    const apiariesJson = localStorage.getItem(apiariesKey);
    const apiaries: Apiary[] = apiariesJson ? JSON.parse(apiariesJson) : [];
    
    // Ordenar por fecha de creación (más reciente primero)
    apiaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log('✅ [LOCALSTORAGE] Apiarios obtenidos:', apiaries.length);
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
    const apiary = apiaries.find(a => a.id === apiaryId);
    return apiary || null;
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
    const apiariesKey = getApiariesKey(userId);
    const apiariesJson = localStorage.getItem(apiariesKey);
    const apiaries: Apiary[] = apiariesJson ? JSON.parse(apiariesJson) : [];
    
    const index = apiaries.findIndex(a => a.id === apiaryId);
    if (index === -1) {
      throw new Error('Apiario no encontrado');
    }
    
    apiaries[index] = {
      ...apiaries[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(apiariesKey, JSON.stringify(apiaries));
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
    const apiariesKey = getApiariesKey(userId);
    const apiariesJson = localStorage.getItem(apiariesKey);
    const apiaries: Apiary[] = apiariesJson ? JSON.parse(apiariesJson) : [];
    
    const filteredApiaries = apiaries.filter(a => a.id !== apiaryId);
    localStorage.setItem(apiariesKey, JSON.stringify(filteredApiaries));
    
    // También eliminar datos asociados al apiario
    localStorage.removeItem(getHivesKey(userId, apiaryId));
    localStorage.removeItem(getInspectionsKey(userId, apiaryId));
    localStorage.removeItem(getHarvestsKey(userId, apiaryId));
    localStorage.removeItem(getTasksKey(userId, apiaryId));
    
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

    const hivesKey = getHivesKey(userId, apiaryId);
    const existingHivesJson = localStorage.getItem(hivesKey);
    const existingHives: HiveWithApiary[] = existingHivesJson ? JSON.parse(existingHivesJson) : [];
    
    existingHives.push(newHive);
    localStorage.setItem(hivesKey, JSON.stringify(existingHives));
    
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
    const hivesKey = getHivesKey(userId, apiaryId);
    const hivesJson = localStorage.getItem(hivesKey);
    const hives: HiveWithApiary[] = hivesJson ? JSON.parse(hivesJson) : [];
    
    // Ordenar por fecha de creación
    hives.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    console.log('✅ [LOCALSTORAGE] Colmenas obtenidas:', hives.length);
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
    const hive = hives.find(h => h.id === hiveId);
    return hive || null;
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
    const hivesKey = getHivesKey(userId, apiaryId);
    const hivesJson = localStorage.getItem(hivesKey);
    const hives: HiveWithApiary[] = hivesJson ? JSON.parse(hivesJson) : [];
    
    const index = hives.findIndex(h => h.id === hiveId);
    if (index === -1) {
      throw new Error('Colmena no encontrada');
    }
    
    hives[index] = {
      ...hives[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(hivesKey, JSON.stringify(hives));
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
    const hivesKey = getHivesKey(userId, apiaryId);
    const hivesJson = localStorage.getItem(hivesKey);
    const hives: HiveWithApiary[] = hivesJson ? JSON.parse(hivesJson) : [];
    
    const filteredHives = hives.filter(h => h.id !== hiveId);
    localStorage.setItem(hivesKey, JSON.stringify(filteredHives));
    
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

    const inspectionsKey = getInspectionsKey(userId, apiaryId);
    const existingInspectionsJson = localStorage.getItem(inspectionsKey);
    const existingInspections: any[] = existingInspectionsJson ? JSON.parse(existingInspectionsJson) : [];
    
    existingInspections.push(newInspection);
    localStorage.setItem(inspectionsKey, JSON.stringify(existingInspections));
    
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
    const inspectionsKey = getInspectionsKey(userId, apiaryId);
    const inspectionsJson = localStorage.getItem(inspectionsKey);
    const inspections: any[] = inspectionsJson ? JSON.parse(inspectionsJson) : [];
    
    // Ordenar por fecha de creación (más reciente primero)
    inspections.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log('✅ [LOCALSTORAGE] Inspecciones obtenidas:', inspections.length);
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
    const inspectionsKey = getInspectionsKey(userId, apiaryId);
    const inspectionsJson = localStorage.getItem(inspectionsKey);
    const inspections: any[] = inspectionsJson ? JSON.parse(inspectionsJson) : [];
    
    const index = inspections.findIndex(i => i.id === inspectionId);
    if (index === -1) {
      throw new Error('Inspección no encontrada');
    }
    
    inspections[index] = {
      ...inspections[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(inspectionsKey, JSON.stringify(inspections));
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
    const inspectionsKey = getInspectionsKey(userId, apiaryId);
    const inspectionsJson = localStorage.getItem(inspectionsKey);
    const inspections: any[] = inspectionsJson ? JSON.parse(inspectionsJson) : [];
    
    const filteredInspections = inspections.filter(i => i.id !== inspectionId);
    localStorage.setItem(inspectionsKey, JSON.stringify(filteredInspections));
    
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

    const harvestsKey = getHarvestsKey(userId, apiaryId);
    const existingHarvestsJson = localStorage.getItem(harvestsKey);
    const existingHarvests: any[] = existingHarvestsJson ? JSON.parse(existingHarvestsJson) : [];
    
    existingHarvests.push(newHarvest);
    localStorage.setItem(harvestsKey, JSON.stringify(existingHarvests));
    
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
    const harvestsKey = getHarvestsKey(userId, apiaryId);
    const harvestsJson = localStorage.getItem(harvestsKey);
    const harvests: any[] = harvestsJson ? JSON.parse(harvestsJson) : [];
    
    // Ordenar por fecha de creación (más reciente primero)
    harvests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log('✅ [LOCALSTORAGE] Cosechas obtenidas:', harvests.length);
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
    const harvestsKey = getHarvestsKey(userId, apiaryId);
    const harvestsJson = localStorage.getItem(harvestsKey);
    const harvests: any[] = harvestsJson ? JSON.parse(harvestsJson) : [];
    
    const index = harvests.findIndex(h => h.id === harvestId);
    if (index === -1) {
      throw new Error('Cosecha no encontrada');
    }
    
    harvests[index] = {
      ...harvests[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(harvestsKey, JSON.stringify(harvests));
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
    const harvestsKey = getHarvestsKey(userId, apiaryId);
    const harvestsJson = localStorage.getItem(harvestsKey);
    const harvests: any[] = harvestsJson ? JSON.parse(harvestsJson) : [];
    
    const filteredHarvests = harvests.filter(h => h.id !== harvestId);
    localStorage.setItem(harvestsKey, JSON.stringify(filteredHarvests));
    
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

    const tasksKey = getTasksKey(userId, apiaryId);
    const existingTasksJson = localStorage.getItem(tasksKey);
    const existingTasks: any[] = existingTasksJson ? JSON.parse(existingTasksJson) : [];
    
    existingTasks.push(newTask);
    localStorage.setItem(tasksKey, JSON.stringify(existingTasks));
    
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
    const tasksKey = getTasksKey(userId, apiaryId);
    const tasksJson = localStorage.getItem(tasksKey);
    const tasks: any[] = tasksJson ? JSON.parse(tasksJson) : [];
    
    // Ordenar por fecha de creación (más reciente primero)
    tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log('✅ [LOCALSTORAGE] Tareas obtenidas:', tasks.length);
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
    const tasksKey = getTasksKey(userId, apiaryId);
    const tasksJson = localStorage.getItem(tasksKey);
    const tasks: any[] = tasksJson ? JSON.parse(tasksJson) : [];
    
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) {
      throw new Error('Tarea no encontrada');
    }
    
    tasks[index] = {
      ...tasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(tasksKey, JSON.stringify(tasks));
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
    const tasksKey = getTasksKey(userId, apiaryId);
    const tasksJson = localStorage.getItem(tasksKey);
    const tasks: any[] = tasksJson ? JSON.parse(tasksJson) : [];
    
    const filteredTasks = tasks.filter(t => t.id !== taskId);
    localStorage.setItem(tasksKey, JSON.stringify(filteredTasks));
    
    console.log('✅ [LOCALSTORAGE] Tarea eliminada:', taskId);
  } catch (error: any) {
    console.error('❌ [LOCALSTORAGE] Error al eliminar tarea:', error);
    throw error;
  }
}
