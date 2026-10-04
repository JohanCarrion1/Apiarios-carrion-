import { useLayoutEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { getHydrationPromise } from '../services/firestoreSync';
import LoadingHint from './LoadingHint';

interface DataHydrationGateProps {
  children: ReactNode;
  /**
   * `block` (por defecto) espera la hidratación completa antes de montar los
   * hijos. `idle` monta los hijos de inmediato y espera en segundo plano: es
   * lo que se usa en secciones que leen de la caché local y toleran pintar
   * con los datos que ya haya, sin encerrar al usuario en un estado de carga.
   */
  mode?: 'block' | 'idle';
}

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
 * El efecto es un `useLayoutEffect` y no un `useEffect` a propósito: la promesa
 * de hidratación se cachea por usuario durante toda la sesión, así que al
 * volver al dashboard normalmente YA está resuelta. Con `useEffect`, React
 * pintaba primero el skeleton a pantalla completa y solo en el frame siguiente
 * lo sustituía por el contenido: un parpadeo de loader en CADA entrada. Con
 * `useLayoutEffect` el `setReady(true)` ocurre como microtask antes de que el
 * navegador pinte, de modo que la espera no llega a verse cuando no hay nada
 * que esperar. Si la hidratación sigue en curso, el indicador sí se muestra.
 *
 * Lo que se muestra mientras espera es `LoadingHint` (un spinner pequeño) y ya
 * no el skeleton de bloques grises. La espera en sí no se ha tocado: el gate
 * sigue bloqueando exactamente igual, solo cambia lo que se pinta mientras
 * tanto. La prop `skeleton` se eliminó al dejar de usarse en ninguna ruta.
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
    setReady(false);
    getHydrationPromise(user.uid)
      .catch(() => undefined)
      .finally(() => {
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
