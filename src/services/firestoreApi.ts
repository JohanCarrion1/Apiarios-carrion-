import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy
} from 'firebase/firestore';
import type { Hive } from '../types/hive';

// ============================================
// SERVICIOS DE APIARIOS Y COLMENAS EN FIRESTORE
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
export interface HiveWithApiary extends Hive {
  apiaryId: string;
}

// Función helper para verificar que db esté inicializado
function getDb() {
  if (!db) {
    throw new Error('Firestore no está inicializado');
  }
  return db;
}

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
  console.log('🔍 [FIRESTORE] === INICIO createApiary ===');
  console.log('🔍 [FIRESTORE] Parámetros recibidos:', { userId, name, location, coordinates });
  
  try {
    // Verificar que db esté inicializado
    const database = getDb();
    console.log('✅ [FIRESTORE] Base de datos obtenida:', database ? 'OK' : 'NULL');
    
    // Validar parámetros
    if (!userId) {
      throw new Error('userId es requerido');
    }
    if (!name || name.trim() === '') {
      throw new Error('name es requerido y no puede estar vacío');
    }
    
    // Construir datos del apiario (asegurarse de que no haya undefined)
    const apiaryData: any = {
      userId: userId,
      name: name.trim(),
      location: location ? location.trim() : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Agregar coordenadas solo si están definidas y son válidas
    if (coordinates && coordinates.lat !== undefined && coordinates.lng !== undefined) {
      apiaryData.coordinates = {
        lat: Number(coordinates.lat),
        lng: Number(coordinates.lng)
      };
    }

    console.log('📝 [FIRESTORE] Datos a guardar:', JSON.stringify(apiaryData, null, 2));
    console.log('📝 [FIRESTORE] Verificando tipos de datos:');
    console.log('  - userId:', typeof apiaryData.userId, apiaryData.userId);
    console.log('  - name:', typeof apiaryData.name, apiaryData.name);
    console.log('  - location:', typeof apiaryData.location, apiaryData.location);
    console.log('  - createdAt:', typeof apiaryData.createdAt, apiaryData.createdAt);
    console.log('  - updatedAt:', typeof apiaryData.updatedAt, apiaryData.updatedAt);
    if (apiaryData.coordinates) {
      console.log('  - coordinates.lat:', typeof apiaryData.coordinates.lat, apiaryData.coordinates.lat);
      console.log('  - coordinates.lng:', typeof apiaryData.coordinates.lng, apiaryData.coordinates.lng);
    }
    
    console.log('📝 [FIRESTORE] Llamando a addDoc...');
    const startTime = Date.now();
    
    // Crear promesa con timeout de 10 segundos
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('TIMEOUT: La operación tardó más de 10 segundos. Verifica tu conexión a internet y la configuración de Firebase.'));
      }, 10000);
    });
    
    // Race entre addDoc y timeout
    const docRef = await Promise.race([
      addDoc(collection(database, 'apiarios'), apiaryData),
      timeoutPromise
    ]);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ [FIRESTORE] Apiario creado exitosamente');
    console.log('✅ [FIRESTORE] ID del documento:', docRef.id);
    console.log('✅ [FIRESTORE] Tiempo de ejecución:', duration, 'ms');
    console.log('🔍 [FIRESTORE] === FIN createApiary (EXITOSO) ===');
    
    return docRef.id;
  } catch (error: any) {
    console.error('❌ [FIRESTORE] === ERROR EN createApiary ===');
    console.error('❌ [FIRESTORE] Error completo:', error);
    console.error('❌ [FIRESTORE] Error message:', error.message);
    console.error('❌ [FIRESTORE] Error code:', error.code);
    console.error('❌ [FIRESTORE] Error name:', error.name);
    console.error('❌ [FIRESTORE] Error stack:', error.stack);
    
    // Proporcionar mensajes de error específicos basados en el código de error de Firebase
    if (error.code) {
      switch (error.code) {
        case 'permission-denied':
          console.error('❌ [FIRESTORE] PERMISO DENEGADO - Verifica las reglas de seguridad de Firestore');
          throw new Error('Permiso denegado. Verifica que las reglas de seguridad de Firestore permitan escritura en la colección "apiarios".');
        
        case 'unavailable':
          console.error('❌ [FIRESTORE] SERVICIO NO DISPONIBLE - Posible problema de red o configuración');
          throw new Error('Firestore no está disponible. Verifica tu conexión a internet y la configuración de Firebase.');
        
        case 'invalid-argument':
          console.error('❌ [FIRESTORE] ARGUMENTO INVÁLIDO - Revisa los datos enviados');
          throw new Error(`Datos inválidos: ${error.message}. Verifica que todos los campos tengan valores válidos.`);
        
        case 'not-found':
          console.error('❌ [FIRESTORE] RECURSO NO ENCONTRADO - La colección o documento no existe');
          throw new Error('Recurso no encontrado. Verifica que la colección "apiarios" exista en Firestore.');
        
        case 'already-exists':
          console.error('❌ [FIRESTORE] DOCUMENTO YA EXISTE');
          throw new Error('El documento ya existe.');
        
        case 'resource-exhausted':
          console.error('❌ [FIRESTORE] LÍMITE DE RECURSOS EXCEDIDO - Cuota de Firestore excedida');
          throw new Error('Límite de recursos excedido. Verifica tu plan de Firebase.');
        
        case 'failed-precondition':
          console.error('❌ [FIRESTORE] PRECONDICIÓN FALLIDA - Índice o configuración faltante');
          throw new Error(`Precondición fallida: ${error.message}. Puede que necesites crear un índice en Firestore.`);
        
        case 'aborted':
          console.error('❌ [FIRESTORE] OPERACIÓN ABORTADA');
          throw new Error('La operación fue abortada.');
        
        case 'deadline-exceeded':
          console.error('❌ [FIRESTORE] TIEMPO LÍMITE EXCEDIDO - La operación tardó demasiado');
          throw new Error('Tiempo límite excedido. La operación tardó demasiado en completarse.');
        
        case 'TIMEOUT':
          console.error('❌ [FIRESTORE] TIMEOUT - La operación fue cancelada por timeout');
          throw new Error(error.message || 'La operación tardó demasiado. Verifica tu conexión a internet.');
        
        default:
          console.error('❌ [FIRESTORE] ERROR DESCONOCIDO con código:', error.code);
          throw new Error(`Error de Firestore [${error.code}]: ${error.message || 'Error desconocido'}`);
      }
    } else {
      // Error sin código (posible error de JavaScript o de red)
      console.error('❌ [FIRESTORE] ERROR SIN CÓDIGO:', error.message);
      throw new Error(`Error al crear el apiario: ${error.message || 'Error desconocido'}`);
    }
  }
}

/**
 * Obtener todos los apiarios del usuario
 */
export async function getUserApiaries(userId: string): Promise<Apiary[]> {
  try {
    const database = getDb();
    const q = query(
      collection(database, 'apiarios'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const apiaries: Apiary[] = [];

    querySnapshot.forEach((doc) => {
      apiaries.push({ id: doc.id, ...doc.data() } as Apiary);
    });

    console.log('✅ [FIRESTORE] Apiarios obtenidos:', apiaries.length);
    return apiaries;
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al obtener apiarios:', error);
    throw error;
  }
}

/**
 * Obtener un apiario específico
 */
export async function getApiary(apiaryId: string): Promise<Apiary | null> {
  try {
    const database = getDb();
    const docRef = doc(database, 'apiarios', apiaryId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Apiary;
    }

    return null;
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al obtener apiario:', error);
    throw error;
  }
}

/**
 * Actualizar un apiario
 */
export async function updateApiary(apiaryId: string, updates: Partial<Apiary>): Promise<void> {
  try {
    const database = getDb();
    const docRef = doc(database, 'apiarios', apiaryId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ [FIRESTORE] Apiario actualizado:', apiaryId);
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al actualizar apiario:', error);
    throw error;
  }
}

/**
 * Eliminar un apiario
 */
export async function deleteApiary(apiaryId: string): Promise<void> {
  try {
    const database = getDb();
    const docRef = doc(database, 'apiarios', apiaryId);
    await deleteDoc(docRef);
    console.log('✅ [FIRESTORE] Apiario eliminado:', apiaryId);
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al eliminar apiario:', error);
    throw error;
  }
}

// ============================================
// SERVICIOS DE COLMENAS
// ============================================

/**
 * Crear una nueva colmena en un apiario
 */
export async function createHive(apiaryId: string, hiveData: Omit<Hive, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const database = getDb();
    const hiveDataWithApiary = {
      ...hiveData,
      apiaryId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(database, 'colmenas'), hiveDataWithApiary);
    console.log('✅ [FIRESTORE] Colmena creada:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al crear colmena:', error);
    throw error;
  }
}

/**
 * Obtener todas las colmenas de un apiario
 */
export async function getApiaryHives(apiaryId: string): Promise<HiveWithApiary[]> {
  try {
    const database = getDb();
    const q = query(
      collection(database, 'colmenas'),
      where('apiaryId', '==', apiaryId),
      orderBy('createdAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const hives: HiveWithApiary[] = [];

    querySnapshot.forEach((doc) => {
      hives.push({ id: doc.id, ...doc.data() } as HiveWithApiary);
    });

    console.log('✅ [FIRESTORE] Colmenas obtenidas:', hives.length);
    return hives;
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al obtener colmenas:', error);
    throw error;
  }
}

/**
 * Obtener una colmena específica
 */
export async function getHive(hiveId: string): Promise<HiveWithApiary | null> {
  try {
    const database = getDb();
    const docRef = doc(database, 'colmenas', hiveId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as HiveWithApiary;
    }

    return null;
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al obtener colmena:', error);
    throw error;
  }
}

/**
 * Actualizar una colmena
 */
export async function updateHive(hiveId: string, updates: Partial<Hive>): Promise<void> {
  try {
    const database = getDb();
    const docRef = doc(database, 'colmenas', hiveId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ [FIRESTORE] Colmena actualizada:', hiveId);
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al actualizar colmena:', error);
    throw error;
  }
}

/**
 * Eliminar una colmena
 */
export async function deleteHive(hiveId: string): Promise<void> {
  try {
    const database = getDb();
    const docRef = doc(database, 'colmenas', hiveId);
    await deleteDoc(docRef);
    console.log('✅ [FIRESTORE] Colmena eliminada:', hiveId);
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al eliminar colmena:', error);
    throw error;
  }
}

// ============================================
// SERVICIOS DE INSPECCIONES
// ============================================

/**
 * Crear una nueva inspección
 */
export async function createInspection(hiveId: string, inspectionData: any): Promise<string> {
  try {
    const database = getDb();
    const inspectionDataWithHive = {
      ...inspectionData,
      hiveId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(database, 'inspecciones'), inspectionDataWithHive);
    console.log('✅ [FIRESTORE] Inspección creada:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al crear inspección:', error);
    throw error;
  }
}

/**
 * Obtener todas las inspecciones de una colmena
 */
export async function getHiveInspections(hiveId: string): Promise<any[]> {
  try {
    const database = getDb();
    const q = query(
      collection(database, 'inspecciones'),
      where('hiveId', '==', hiveId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const inspections: any[] = [];

    querySnapshot.forEach((doc) => {
      inspections.push({ id: doc.id, ...doc.data() });
    });

    console.log('✅ [FIRESTORE] Inspecciones obtenidas:', inspections.length);
    return inspections;
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al obtener inspecciones:', error);
    throw error;
  }
}

/**
 * Actualizar una inspección
 */
export async function updateInspection(inspectionId: string, updates: any): Promise<void> {
  try {
    const database = getDb();
    const docRef = doc(database, 'inspecciones', inspectionId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ [FIRESTORE] Inspección actualizada:', inspectionId);
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al actualizar inspección:', error);
    throw error;
  }
}

/**
 * Eliminar una inspección
 */
export async function deleteInspection(inspectionId: string): Promise<void> {
  try {
    const database = getDb();
    const docRef = doc(database, 'inspecciones', inspectionId);
    await deleteDoc(docRef);
    console.log('✅ [FIRESTORE] Inspección eliminada:', inspectionId);
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al eliminar inspección:', error);
    throw error;
  }
}

// ============================================
// SERVICIOS DE COSECHAS
// ============================================

/**
 * Crear una nueva cosecha
 */
export async function createHarvest(hiveId: string, harvestData: any): Promise<string> {
  try {
    const database = getDb();
    const harvestDataWithHive = {
      ...harvestData,
      hiveId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(database, 'cosechas'), harvestDataWithHive);
    console.log('✅ [FIRESTORE] Cosecha creada:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al crear cosecha:', error);
    throw error;
  }
}

/**
 * Obtener todas las cosechas de una colmena
 */
export async function getHiveHarvests(hiveId: string): Promise<any[]> {
  try {
    const database = getDb();
    const q = query(
      collection(database, 'cosechas'),
      where('hiveId', '==', hiveId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const harvests: any[] = [];

    querySnapshot.forEach((doc) => {
      harvests.push({ id: doc.id, ...doc.data() });
    });

    console.log('✅ [FIRESTORE] Cosechas obtenidas:', harvests.length);
    return harvests;
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al obtener cosechas:', error);
    throw error;
  }
}

/**
 * Actualizar una cosecha
 */
export async function updateHarvest(harvestId: string, updates: any): Promise<void> {
  try {
    const database = getDb();
    const docRef = doc(database, 'cosechas', harvestId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ [FIRESTORE] Cosecha actualizada:', harvestId);
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al actualizar cosecha:', error);
    throw error;
  }
}

/**
 * Eliminar una cosecha
 */
export async function deleteHarvest(harvestId: string): Promise<void> {
  try {
    const database = getDb();
    const docRef = doc(database, 'cosechas', harvestId);
    await deleteDoc(docRef);
    console.log('✅ [FIRESTORE] Cosecha eliminada:', harvestId);
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al eliminar cosecha:', error);
    throw error;
  }
}

// ============================================
// SERVICIOS DE TAREAS
// ============================================

/**
 * Crear una nueva tarea
 */
export async function createTask(apiaryId: string, taskData: any): Promise<string> {
  try {
    const database = getDb();
    const taskDataWithApiary = {
      ...taskData,
      apiaryId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(database, 'tareas'), taskDataWithApiary);
    console.log('✅ [FIRESTORE] Tarea creada:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al crear tarea:', error);
    throw error;
  }
}

/**
 * Obtener todas las tareas de un apiario
 */
export async function getApiaryTasks(apiaryId: string): Promise<any[]> {
  try {
    const database = getDb();
    const q = query(
      collection(database, 'tareas'),
      where('apiaryId', '==', apiaryId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const tasks: any[] = [];

    querySnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });

    console.log('✅ [FIRESTORE] Tareas obtenidas:', tasks.length);
    return tasks;
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al obtener tareas:', error);
    throw error;
  }
}

/**
 * Actualizar una tarea
 */
export async function updateTask(taskId: string, updates: any): Promise<void> {
  try {
    const database = getDb();
    const docRef = doc(database, 'tareas', taskId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ [FIRESTORE] Tarea actualizada:', taskId);
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al actualizar tarea:', error);
    throw error;
  }
}

/**
 * Eliminar una tarea
 */
export async function deleteTask(taskId: string): Promise<void> {
  try {
    const database = getDb();
    const docRef = doc(database, 'tareas', taskId);
    await deleteDoc(docRef);
    console.log('✅ [FIRESTORE] Tarea eliminada:', taskId);
  } catch (error) {
    console.error('❌ [FIRESTORE] Error al eliminar tarea:', error);
    throw error;
  }
}
