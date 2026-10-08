import { useLayoutEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { getHydrationPromise, getUserFieldsPromise } from '../services/firestoreSync';
import { loadApiaries, loadData } from '../utils/storage';
import LoadingHint from './LoadingHint';

interface DataHydrationGateProps {
  children: ReactNode;
  /**
   * `block` (por defecto) espera la hidratación COMPLETA antes de montar los
   * hijos. Es lo que usan la tienda y el panel de admin: leer el catálogo de
   * localStorage antes de que llegue de Firestore enseñaría las semillas un
   * instante (o, peor, las subiría pisando el catálogo real).
   *
   * `progressive` espera solo lo crítico —el documento `userData`— si el
   * dispositivo ya tiene caché local de apiarios; sin caché se comporta como
   * `block`. Es el modo del dashboard: pinta en cuanto hay datos locales del
   * que servir y deja que apiarios y entidades sigan bajando por detrás.
   *
   * `idle` monta los hijos de inmediato y espera en segundo plano: secciones
   * que leen la caché local y toleran pintar con lo que ya haya.
   */
  mode?: 'block' | 'progressive' | 'idle';
}

/**
 * ¿Tiene este dispositivo caché local de la que pintar?
 *
 * Solo mira si hay apiarios con colmenas guardadas: es la señal de que la app
 * ya hidrató alguna vez aquí. Si NO hay caché, el modo `progressive` cae en
 * `block` y espera la hidratación completa: no hay nada que mostrar y montar
 * la app solo serviría para que los efectos de montaje intentaran escribir `[]`
 * en claves que Firestore todavía no ha entregado.
 *
 * Si SÍ hay caché, el dashboard puede montar ya: `hydrateEntity` sobrescribe
 * esa caché con lo remoto sin pasar por React y, si el contenido coincide,
 * `writeToKey` ni siquiera notifica (sin cambios → sin escritura). El aviso
 * `onFirestoreHydrated` refresca el estado en memoria cuando termina.
 */
const hasLocalCache = (userId: string): boolean => {
  const apiaries = loadApiaries(userId) as any[];
  const ids = apiaries.filter((a) => a && a.id).map((a) => String(a.id));
  if (ids.length === 0) return false;
  // Se pide por `userId + apiaryId` explícitos (la misma forma con la que
  // `hydrateEntity` escribe) en lugar del sufijo con `getCurrentUserId()`:
  // esta comprobación decide si se abre o no el gate, así que no debe depender
  // de que `auth.currentUser` esté ya asignado en ese instante.
  return ids.some((id) => loadData<any[]>('hives', [], { userId, apiaryId: id }).length > 0);
};

/**
 * Espera a que los datos del usuario estén hidratados (Firestore → caché
 * local) antes de montar las pantallas que leen storage de forma síncrona.
 * Si Firestore no está disponible o la hidratación falla, se continúa con la
 * caché local (comportamiento previo) para no bloquear la app.
 *
 * NOTA: desde la optimización de arranque, la ruta /seleccionar NO usa este
 * gate. El menú de selección no lee ningún dato de apiario (solo localStorage
 * síncrono y el perfil), así que hacerlo esperar era la causa directa del
 * "Sincronizando datos…" largo.
 *
 * CUÁNDO ESPERA (la optimización de arranque), según `mode`:
 *  * `block` → hidratación completa, igual que siempre. Es lo que usan la
 *    tienda y el admin de la tienda: necesitan el catálogo ya hidratado.
 *  * `progressive` (dashboard) → si hay caché local, solo espera el documento
 *    `userData` (un viaje) y deja que apiarios y sus 16 entidades sigan
 *    bajando por detrás. Antes eran 3 round-trips en serie antes de empezar
 *    siquiera a leer entidades, o sea 3-4 s de pantalla de carga en 3G; con lo
 *    crítico aparte, el dashboard pinta en cuanto hay datos locales + ese
 *    documento. Sin caché local se comporta como `block` (no hay nada que
 *    pintar y montar solo serviría para subir `[]`). Durante esa ventana
 *    `setHydrationInProgress(true)` (puesto en `hydrateUserData`, de forma
 *    síncrona) impide que la app vacíe claves aún no entregadas, y
 *    `onFirestoreHydrated` refresca el estado en memoria al terminar.
 *  * `idle` → no espera nada: hidrata en segundo plano.
 *
 * El efecto es un `useLayoutEffect` y no un `useEffect` a propósito: la promesa
 * de hidratación se cachea por usuario durante toda la sesión, así que al
 * volver al dashboard normalmente YA está resuelta. Con `useEffect`, React
 * pintaba primero el loader a pantalla completa y solo en el frame siguiente
 * lo sustituía por el contenido: un parpadeo de loader en CADA entrada. Con
 * `useLayoutEffect` el `setReady(true)` ocurre como microtask antes de que el
 * navegador pinte, de modo que la espera no llega a verse cuando no hay nada
 * que esperar. Si la hidratación sigue en curso, el indicador sí se muestra.
 *
 * Lo que se pinta mientras espera es el mismo loader que la pantalla de
 * arranque (logo + rótulo) — ver `LoadingHint` —, así que boot completo es
 * una sola experiencia visual y no logo → spinner → contenido.
 */
export default function DataHydrationGate({
  children,
  mode = 'block',
}: DataHydrationGateProps) {
  const { user } = useAuth();
  const [ready, setReady] = useState(!user);

  useLayoutEffect(() => {
    let alive = true;
    if (!user) {
      setReady(true);
      return;
    }
    if (mode === 'idle') {
      // No bloquea: hidrata por detrás, la sección ya puede pintar.
      void getHydrationPromise(user.uid).catch(() => undefined);
      setReady(true);
      return;
    }

    // Se lanza SIEMPRE la hidratación completa, antes de decidir qué esperar:
    // hace falta que `setHydrationInProgress(true)` esté puesto de forma
    // síncrona en el mismo task que llama aquí, ANTES de que `setReady(true)`
    // permita montar la app y que sus efectos escriban en localStorage.
    const hidratacionCompleta = getHydrationPromise(user.uid).catch(() => undefined);

    const puedePintarConCaché = mode === 'progressive' && hasLocalCache(user.uid);
    setReady(false);
    const espera = puedePintarConCaché
      ? getUserFieldsPromise(user.uid).catch(() => undefined)
      : hidratacionCompleta;
    void espera.then(() => {
      if (alive) setReady(true);
    });

    return () => {
      alive = false;
    };
  }, [user?.uid, mode]);

  if (!ready) {
    return <LoadingHint />;
  }
  return <>{children}</>;
}
