// ============================================
// SERVICIO DE TRANSFERENCIAS DE NÚCLEOS Y COLMENAS
// ============================================
//
// FIX-TRANSFERENCIAS:
// - Implementa getNextHiveCode, getNextNucleoCode, convertNucleoToColmena,
//   transferHiveToApiary y transferNucleoToApiary con manejo de errores completo.
// - Todas las lecturas/escrituras usan los mismos helpers de storage que el resto
//   de la app (utils/storage.ts) para que las claves SIEMPRE coincidan.
//
import type { TransferRecord, TransferType } from '../types/transfer';
import { uid } from '../data';
import {
  loadHives,
  saveHives,
  loadNuclei,
  saveNuclei,
  loadInspections,
  saveInspections,
  loadQueens,
  saveQueens,
  loadQueenHistory,
  saveQueenHistory,
  loadFecundadores,
  saveFecundadores,
  loadCuadernoEntries,
  saveCuadernoEntries,
  getTransferHistoryKey,
} from '../utils/storage';
import { sortByEntityCode } from '../utils/entityCode';

const registerId = (): string => uid();

// ------------------------------------------------------------
// HISTORIAL DE TRANSFERENCIAS (por usuario)
// Clave: panal_v1_user_${userId}_transferHistory
// ------------------------------------------------------------

export const loadTransferHistory = (userId: string): TransferRecord[] => {
  try {
    const item = localStorage.getItem(getTransferHistoryKey(userId));
    const records = item ? (JSON.parse(item) as TransferRecord[]) : [];
    return [...records].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  } catch (error) {
    console.error('[TRANSFERS] Error al leer historial de transferencias:', error);
    return [];
  }
};

export const saveTransferHistory = (userId: string, records: TransferRecord[]): void => {
  try {
    const sorted = [...records].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    const key = getTransferHistoryKey(userId);
    const previousRaw = localStorage.getItem(key);
    if (previousRaw != null && previousRaw !== JSON.stringify(sorted)) {
      localStorage.setItem(`${key}__backup_${new Date().toISOString().replace(/[:.]/g, '-')}`, previousRaw);
      localStorage.setItem(`${key}__backup_latest`, previousRaw);
    }
    localStorage.setItem(key, JSON.stringify(sorted));
  } catch (error) {
    console.error('[TRANSFERS] Error al guardar historial de transferencias:', error);
    throw error;
  }
};

export const addTransferRecord = (
  userId: string,
  record: Omit<TransferRecord, 'id' | 'fecha' | 'registradaPor'> & Partial<Pick<TransferRecord, 'fecha' | 'registradaPor'>>
): TransferRecord => {
  const full: TransferRecord = {
    ...record,
    id: registerId(),
    fecha: record.fecha || new Date().toISOString(),
    registradaPor: record.registradaPor || userId,
  };
  const records = loadTransferHistory(userId);

  // Anti-duplicado: misma entidad + mismo tipo + mismo día
  const day = full.fecha.slice(0, 10);
  const exists = records.some(r =>
    r.entidadCodigo === full.entidadCodigo &&
    r.tipo === full.tipo &&
    r.fecha.slice(0, 10) === day
  );
  if (exists) {
    console.log('⏭️ [TRANSFERS] Registro duplicado omitido:', full.entidadCodigo, full.tipo, full.fecha);
    return full;
  }

  saveTransferHistory(userId, [full, ...records]);
  return full;
};

// ------------------------------------------------------------
// 1b. Limpiar historial de transferencias (vacía el array)
// ------------------------------------------------------------

export const clearTransferHistory = (userId: string): void => {
  try {
    saveTransferHistory(userId, []);
  } catch (error) {
    console.error('[TRANSFERS] Error al limpiar historial de transferencias:', error);
    throw error;
  }
};

// ------------------------------------------------------------
// 1. Siguiente código de colmena disponible (C-XX)
// ------------------------------------------------------------

export const getNextHiveCode = (colmenas: { code: string }[]): string => {
  const numeros = colmenas
    .map(c => {
      const match = c.code.match(/C-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);
  const maxNum = numeros.length > 0 ? Math.max(...numeros) : 0;
  return `C-${(maxNum + 1).toString().padStart(2, '0')}`;
};

// ------------------------------------------------------------
// 2. Siguiente código de núcleo disponible (N-XX)
// ------------------------------------------------------------

export const getNextNucleoCode = (nucleos: { code: string }[]): string => {
  const numeros = nucleos
    .map(n => {
      const match = n.code.match(/N-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);
  const maxNum = numeros.length > 0 ? Math.max(...numeros) : 0;
  return `N-${(maxNum + 1).toString().padStart(2, '0')}`;
};

// ------------------------------------------------------------
// 2b. Siguiente código de fecundador disponible (F-XX)
// ------------------------------------------------------------

export const getNextFecundadorCode = (fecundadores: { code: string }[]): string => {
  const numeros = fecundadores
    .map(f => {
      const match = f.code.match(/F-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);
  const maxNum = numeros.length > 0 ? Math.max(...numeros) : 0;
  return `F-${(maxNum + 1).toString().padStart(2, '0')}`;
};

// ------------------------------------------------------------
// 3. FUNCIONALIDAD: Convertir núcleo en colmena
// ------------------------------------------------------------

export function convertNucleoToColmena(opts: {
  userId: string;
  apiaryId: string;
  apiaryName: string;
  nucleusId: string;
  fecha?: string;
}): {
  nucleusCode: string;
  newHiveCode: string;
  newHive: any;
  hasQueen: boolean;
  cuadernoEntry: { id: string; date: string; text: string; type: 'general' };
} {
  try {
    const { userId, apiaryId, apiaryName, nucleusId, fecha } = opts;
    const now = new Date().toISOString();
    const apiarySuffix = `_${userId}_${apiaryId}`;

    // 1. Obtener núcleo
    const nucleos = loadNuclei(apiarySuffix) as any[];
    const nucleus = nucleos.find((n: any) => n.id === nucleusId);
    if (!nucleus) throw new Error('Núcleo no encontrado');

    // 2. Obtener colmenas del apiario
    const colmenas = loadHives(apiarySuffix) as any[];

    // 3. Calcular siguiente código
    const nuevoCodigo = getNextHiveCode(colmenas);

    // 4. Crear nueva colmena con todos los datos del núcleo
    const nuevaColmena: any = {
      ...nucleus,
      id: registerId(),
      code: nuevoCodigo,
      apiaryId,
      entityType: 'colmena',
      status: nucleus.status || 'saludable',
      createdAt: nucleus.createdAt || now,
      updatedAt: now,
    };

    // 5. Actualizar hiveId en inspecciones
    const inspecciones = loadInspections(apiarySuffix) as any[];
    const inspeccionesCount = inspecciones.filter((i: any) => i.hiveId === nucleusId).length;
    const nuevasInspecciones = inspecciones.map((i: any) =>
      i.hiveId === nucleusId ? { ...i, hiveId: nuevaColmena.id, entityType: 'colmena' } : i
    );

    // 6. Transferir reina registrada e historial
    const reinas = loadQueens(userId, apiaryId) as any[];
    const hasQueen = reinas.some((q: any) => q.hiveId === nucleusId);
    const nuevasReinas = reinas.map((q: any) => (q.hiveId === nucleusId ? { ...q, hiveId: nuevaColmena.id } : q));

    const historialReinas = loadQueenHistory(userId, apiaryId) as any[];
    const nuevoHistorial = historialReinas.map((h: any) =>
      h.hiveId === nucleusId ? { ...h, hiveId: nuevaColmena.id } : h
    );

    // 7. Agregar colmena y eliminar núcleo
    const nuevasColmenas = [...colmenas, nuevaColmena];
    const nuevosNucleos = nucleos.filter((n: any) => n.id !== nucleusId);

    // 8. Guardar
    saveHives(nuevasColmenas, apiarySuffix);
    saveNuclei(nuevosNucleos, apiarySuffix);
    saveInspections(nuevasInspecciones, apiarySuffix);
    saveQueens(nuevasReinas, userId, apiaryId);
    saveQueenHistory(nuevoHistorial, userId, apiaryId);

    // 9. Registrar en cuaderno
    const fotosCount = nucleus.fotos?.length || 0;
    const cuadernoText = `Núcleo ${nucleus.code} convertido en colmena ${nuevoCodigo}. Se transfirieron ${inspeccionesCount} inspecciones, ${fotosCount} fotos${hasQueen ? ' y reina registrada' : ''}.`;
    const cuadernoEntry = { id: registerId(), date: now, text: cuadernoText, type: 'general' as const };
    const cuaderno = loadCuadernoEntries(userId, apiaryId) as any[];
    saveCuadernoEntries([cuadernoEntry, ...cuaderno], userId, apiaryId);

    // 10. Registrar en historial de transferencias
    addTransferRecord(userId, {
      tipo: 'nucleo_a_colmena',
      entidadCodigo: nucleus.code,
      desdeApiarioId: apiaryId,
      hastaApiarioId: apiaryId,
      desdeApiarioNombre: apiaryName,
      hastaApiarioNombre: apiaryName,
      fecha: fecha || now,
    });

    console.log('✅ [CONVERT] Núcleo convertido en colmena:', nucleus.code, '→', nuevoCodigo);
    return { nucleusCode: nucleus.code, newHiveCode: nuevoCodigo, newHive: nuevaColmena, hasQueen, cuadernoEntry };
  } catch (error) {
    console.error('[CONVERT] Error al convertir el núcleo:', error);
    throw error;
  }
}

// ------------------------------------------------------------
// Núcleo común de transferencia a otro apiario
// ------------------------------------------------------------

function transferirAOtroApiario(opts: {
  userId: string;
  sourceApiaryId: string;
  sourceApiaryName: string;
  destApiaryId: string;
  destApiaryName: string;
  entityId: string;
  kind: 'hive' | 'nucleus';
  motivo?: string;
  fecha?: string;
}): {
  entity: any;
  kind: 'hive' | 'nucleus';
  code: string;
  fromName: string;
  toName: string;
  cuadernoEntry: { id: string; date: string; text: string; type: 'general' };
} {
  try {
    const {
      userId,
      sourceApiaryId,
      sourceApiaryName,
      destApiaryId,
      destApiaryName,
      entityId,
      kind,
      motivo,
      fecha,
    } = opts;
    const now = new Date().toISOString();

    if (sourceApiaryId === destApiaryId) {
      throw new Error('El apiario destino debe ser diferente al actual');
    }
    if (!destApiaryId) {
      throw new Error('No se seleccionó un apiario de destino');
    }

    const isHive = kind === 'hive';
    const sourceSuffix = `_${userId}_${sourceApiaryId}`;
    const destSuffix = `_${userId}_${destApiaryId}`;

    // 1. Obtener entidad del apiario origen
    const sourceList = (isHive ? loadHives(sourceSuffix) : loadNuclei(sourceSuffix)) as any[];
    const entity = sourceList.find((e: any) => e.id === entityId);
    if (!entity) {
      throw new Error(isHive ? 'Colmena no encontrada' : 'Núcleo no encontrado');
    }

    // 2. Obtener entidades del apiario destino
    const destList = (isHive ? loadHives(destSuffix) : loadNuclei(destSuffix)) as any[];

    // 3. La colmena se transfiere manteniendo su código original (ej: C-25)
    const nuevoCodigo = entity.code;

    // 4. Crear entidad en destino con el mismo código pero mismos datos
    const entityTransferida = {
      ...entity,
      id: registerId(),
      code: nuevoCodigo,
      apiaryId: destApiaryId,
      apiario: destApiaryName,
      apiario_original: sourceApiaryName,
      transferida: true,
      fecha_transferencia: fecha || now,
      motivo_transferencia: motivo || 'Sin motivo especificado',
      updatedAt: now,
    };

    // 5. Eliminar del origen y agregar al destino
    const nextSource = sourceList.filter((e: any) => e.id !== entityId);
    // Se ordena por código numérico: si no, el honeycomb de destino mostraría
    // la entidad transferida siempre al final (C-2 después de C-10).
    const nextDest = sortByEntityCode([...destList, entityTransferida]);

    if (isHive) {
      saveHives(nextSource, sourceSuffix);
      saveHives(nextDest, destSuffix);
    } else {
      saveNuclei(nextSource, sourceSuffix);
      saveNuclei(nextDest, destSuffix);
    }

    // 6. Transferir inspecciones actualizando hiveId
    const sourceInspecciones = loadInspections(sourceSuffix) as any[];
    const destInspecciones = loadInspections(destSuffix) as any[];
    const movidas = sourceInspecciones
      .filter((i: any) => i.hiveId === entityId)
      .map((i: any) => ({ ...i, hiveId: entityTransferida.id }));
    saveInspections(sourceInspecciones.filter((i: any) => i.hiveId !== entityId), sourceSuffix);
    saveInspections([...destInspecciones, ...movidas], destSuffix);

    // 7. Transferir reina registrada e historial actualizando hiveId
    const sourceReinas = loadQueens(userId, sourceApiaryId) as any[];
    const destReinas = loadQueens(userId, destApiaryId) as any[];
    const reinasMovidas = sourceReinas
      .filter((q: any) => q.hiveId === entityId)
      .map((q: any) => ({ ...q, hiveId: entityTransferida.id }));
    saveQueens(sourceReinas.filter((q: any) => q.hiveId !== entityId), userId, sourceApiaryId);
    saveQueens([...destReinas, ...reinasMovidas], userId, destApiaryId);

    const sourceHistorial = loadQueenHistory(userId, sourceApiaryId) as any[];
    const destHistorial = loadQueenHistory(userId, destApiaryId) as any[];
    const historialMovido = sourceHistorial
      .filter((h: any) => h.hiveId === entityId)
      .map((h: any) => ({ ...h, hiveId: entityTransferida.id }));
    saveQueenHistory(sourceHistorial.filter((h: any) => h.hiveId !== entityId), userId, sourceApiaryId);
    saveQueenHistory([...destHistorial, ...historialMovido], userId, destApiaryId);

    // 8. Registrar en cuaderno (origen y destino)
    const entityWord = isHive ? 'Colmena' : 'Núcleo';
    const verb = isHive ? 'transferida' : 'transferido';
    const cuadernoText = motivo
      ? `${entityWord} ${entity.code} ${verb} de ${sourceApiaryName} a ${destApiaryName} - Motivo: ${motivo}`
      : `${entityWord} ${entity.code} ${verb} de ${sourceApiaryName} a ${destApiaryName}`;
    const cuadernoEntry = { id: registerId(), date: now, text: cuadernoText, type: 'general' as const };

    const sourceCuaderno = loadCuadernoEntries(userId, sourceApiaryId) as any[];
    const destCuaderno = loadCuadernoEntries(userId, destApiaryId) as any[];
    saveCuadernoEntries([cuadernoEntry, ...sourceCuaderno], userId, sourceApiaryId);
    saveCuadernoEntries([cuadernoEntry, ...destCuaderno], userId, destApiaryId);

    // 9. Registrar en historial de transferencias
    addTransferRecord(userId, {
      tipo: isHive ? 'colmena_apiario' : 'nucleo_apiario',
      entidadCodigo: entity.code,
      desdeApiarioId: sourceApiaryId,
      hastaApiarioId: destApiaryId,
      desdeApiarioNombre: sourceApiaryName,
      hastaApiarioNombre: destApiaryName,
      motivo: motivo || undefined,
      fecha: fecha || now,
    });

    console.log('✅ [TRANSFER] Transferencia completada:', entity.code, sourceApiaryName, '→', destApiaryName, 'como', nuevoCodigo);
    return { entity: entityTransferida, kind, code: nuevoCodigo, fromName: sourceApiaryName, toName: destApiaryName, cuadernoEntry };
  } catch (error) {
    console.error('[TRANSFER] Error al transferir:', error);
    throw error;
  }
}

// ------------------------------------------------------------
// 4. FUNCIONALIDAD: Transferir colmena a otro apiario
// ------------------------------------------------------------

export function transferHiveToApiary(opts: {
  userId: string;
  sourceApiaryId: string;
  sourceApiaryName: string;
  destApiaryId: string;
  destApiaryName: string;
  entityId: string;
  motivo?: string;
  fecha?: string;
}) {
  return transferirAOtroApiario({ ...opts, kind: 'hive' });
}

// ------------------------------------------------------------
// 5. FUNCIONALIDAD: Transferir núcleo a otro apiario
// ------------------------------------------------------------

export function transferNucleoToApiary(opts: {
  userId: string;
  sourceApiaryId: string;
  sourceApiaryName: string;
  destApiaryId: string;
  destApiaryName: string;
  entityId: string;
  motivo?: string;
  fecha?: string;
}) {
  return transferirAOtroApiario({ ...opts, kind: 'nucleus' });
}

// ------------------------------------------------------------
// 6. FUNCIONALIDAD: Transferir fecundador (baby nuc) a otro apiario
// ------------------------------------------------------------

export function transferFecundadorToApiary(opts: {
  userId: string;
  sourceApiaryId: string;
  sourceApiaryName: string;
  destApiaryId: string;
  destApiaryName: string;
  entityId: string;
  motivo?: string;
  fecha?: string;
}): {
  fecundador: any;
  code: string;
  fromName: string;
  toName: string;
  cuadernoEntry: { id: string; date: string; text: string; type: 'general' };
} {
  try {
    const {
      userId,
      sourceApiaryId,
      sourceApiaryName,
      destApiaryId,
      destApiaryName,
      entityId,
      motivo,
      fecha,
    } = opts;
    const now = new Date().toISOString();

    if (sourceApiaryId === destApiaryId) {
      throw new Error('El apiario destino debe ser diferente al actual');
    }
    if (!destApiaryId) {
      throw new Error('No se seleccionó un apiario de destino');
    }

    const sourceSuffix = `_${userId}_${sourceApiaryId}`;
    const destSuffix = `_${userId}_${destApiaryId}`;

    // 1. Obtener fecundador del apiario origen
    const sourceList = loadFecundadores(userId, sourceApiaryId) as any[];
    const fecundador = sourceList.find((e: any) => e.id === entityId);
    if (!fecundador) {
      throw new Error('Fecundador no encontrado');
    }

    // 2. Obtener fecundadores del apiario destino
    const destList = loadFecundadores(userId, destApiaryId) as any[];

    // 3. Calcular nuevo código en destino
    const nuevoCodigo = getNextFecundadorCode(destList);

    // 4. Crear entidad en destino con nuevo código pero mismos datos
    const fecundadorTransferido = {
      ...fecundador,
      id: registerId(),
      code: nuevoCodigo,
      apiaryId: destApiaryId,
      apiario: destApiaryName,
      apiario_original: sourceApiaryName,
      transferida: true,
      fecha_transferencia: fecha || now,
      motivo_transferencia: motivo || 'Sin motivo especificado',
      updatedAt: now,
    };

    // 5. Eliminar del origen y agregar al destino
    const nextSource = sourceList.filter((e: any) => e.id !== entityId);
    const nextDest = sortByEntityCode([...destList, fecundadorTransferido]);
    saveFecundadores(nextSource, userId, sourceApiaryId);
    saveFecundadores(nextDest, userId, destApiaryId);

    // 6. Registrar en cuaderno (origen y destino)
    const cuadernoText = motivo
      ? `Fecundador ${fecundador.code} transferido de ${sourceApiaryName} a ${destApiaryName} como ${nuevoCodigo} - Motivo: ${motivo}`
      : `Fecundador ${fecundador.code} transferido de ${sourceApiaryName} a ${destApiaryName} como ${nuevoCodigo}`;
    const cuadernoEntry = { id: registerId(), date: now, text: cuadernoText, type: 'general' as const };

    const sourceCuaderno = loadCuadernoEntries(userId, sourceApiaryId) as any[];
    const destCuaderno = loadCuadernoEntries(userId, destApiaryId) as any[];
    saveCuadernoEntries([cuadernoEntry, ...sourceCuaderno], userId, sourceApiaryId);
    saveCuadernoEntries([cuadernoEntry, ...destCuaderno], userId, destApiaryId);

    // 7. Registrar en historial de transferencias
    addTransferRecord(userId, {
      tipo: 'fecundador_apiario',
      entidadCodigo: fecundador.code,
      desdeApiarioId: sourceApiaryId,
      hastaApiarioId: destApiaryId,
      desdeApiarioNombre: sourceApiaryName,
      hastaApiarioNombre: destApiaryName,
      motivo: motivo || undefined,
      fecha: fecha || now,
    });

    console.log('✅ [TRANSFER] Fecundador transferido:', fecundador.code, sourceApiaryName, '→', destApiaryName, 'como', nuevoCodigo);
    return { fecundador: fecundadorTransferido, code: nuevoCodigo, fromName: sourceApiaryName, toName: destApiaryName, cuadernoEntry };
  } catch (error) {
    console.error('[TRANSFER] Error al transferir fecundador:', error);
    throw error;
  }
}

export type { TransferRecord, TransferType };