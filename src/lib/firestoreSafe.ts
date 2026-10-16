// Utilidades para escribir en Firestore sin perder datos en silencio.
//
// 1) `sinUndefined`: Firestore RECHAZA el documento entero si algún campo vale
//    `undefined` ("Unsupported field value: undefined"). Es habitual en la app
//    (p. ej. una inspección sin fotos lleva `photos: undefined`). En
//    localStorage no molesta porque JSON.stringify los descarta, así que el
//    cambio parecía guardado en el dispositivo, pero la nube conservaba lo
//    anterior y al reabrir la hidratación devolvía el estado viejo.
// 2) Pendientes de sincronizar: si una escritura falla (sin red, permisos…),
//    se marca la entidad como pendiente para que la próxima hidratación NO
//    pise con lo viejo de la nube el cambio local, sino que lo reintente.

/** Copia profunda sin `undefined` (los NaN/Infinity pasan a null). */
export function sinUndefined<T>(valor: T): T {
  if (valor === undefined || valor === null) return valor;
  return JSON.parse(JSON.stringify(valor)) as T;
}

const claveStorage = (userId: string) => `sync_pendiente_v1_${userId}`;
const idEntidad = (apiaryId: string, entity: string) => `${apiaryId}|${entity}`;

const leer = (userId: string): string[] => {
  try {
    const raw = window.localStorage.getItem(claveStorage(userId));
    const lista = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(lista) ? (lista as string[]) : [];
  } catch {
    return [];
  }
};

const guardar = (userId: string, lista: string[]): void => {
  try {
    if (lista.length) window.localStorage.setItem(claveStorage(userId), JSON.stringify(lista));
    else window.localStorage.removeItem(claveStorage(userId));
  } catch {
    /* sin localStorage no hay marca: se comporta como antes */
  }
};

export function marcarPendiente(userId: string, apiaryId: string, entity: string): void {
  const id = idEntidad(apiaryId, entity);
  const lista = leer(userId);
  if (!lista.includes(id)) guardar(userId, [...lista, id]);
}

export function limpiarPendiente(userId: string, apiaryId: string, entity: string): void {
  const id = idEntidad(apiaryId, entity);
  const lista = leer(userId);
  if (lista.includes(id)) guardar(userId, lista.filter((x) => x !== id));
}

export function hayPendiente(userId: string, apiaryId: string, entity: string): boolean {
  return leer(userId).includes(idEntidad(apiaryId, entity));
}
