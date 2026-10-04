import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePedidos } from '../lib/pedidosService';
import { emitGlobalToast } from '../lib/toastBus';
import type { PedidoEstado } from '../types/pedidos';

/* ============================================================
   Notificador de pedidos
   ============================================================
   - Sin sesión → no hace nada.
   - ADMIN: emite un toast cuando aparece un pedido NUEVO pendiente de pago
     (la suscripción de usePedidos ya aplica el aislamiento por rol).
   - CLIENTE: emite toasts cuando su pedido cambia de estado (pagado /
     rechazado / completado), usando la suscripción por clienteUid.

   Antes se montaba en TODAS las rutas (incluso /login y /seleccionar) y por
   tanto abría un onSnapshot de la colección de pedidos nada más entrar a la
   app, incluido el menú de selección. Ahora la suscripción se abre solo en
   las secciones donde tiene sentido oír un cambio de estado; en /login y
   /seleccionar no se abre ningún listener.

   Se conserva la suscripción en el resto de secciones (dashboard, tienda,
   panel) porque el aviso de "tu pago fue aprobado" en vivo es justo el valor
   de este componente. */
export default function PedidoNotifier() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Rutas sin pedidos detrás: no hay nada que notificar y la suscripción solo
  // costaría una lectura de la colección en cada arranque en frío.
  const activo = pathname !== '/login' && pathname !== '/seleccionar';

  const { pedidos, loading } = usePedidos({ enabled: activo });

  // Baseline: la primera snapshot por usuario establece los pedidos
  // "ya conocidos"; se reinicia si cambia la sesión.
  const userIdRef = useRef<string | null>(null);
  const baselineHecho = useRef(false);
  const visto = useRef<Set<string>>(new Set());
  const estadoPrev = useRef<Map<string, PedidoEstado>>(new Map());

  useEffect(() => {
    const uid = user?.uid ?? null;
    if (userIdRef.current !== uid) {
      userIdRef.current = uid;
      baselineHecho.current = false;
      visto.current = new Set();
      estadoPrev.current = new Map();
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user || loading) return;

    if (!baselineHecho.current) {
      pedidos.forEach((p) => visto.current.add(p.numero));
      pedidos.forEach((p) => estadoPrev.current.set(p.numero, p.estado));
      baselineHecho.current = true;
      return;
    }

    pedidos.forEach((p) => {
      // Cambio de estado (para el cliente / para el admin al aprobar).
      const prev = estadoPrev.current.get(p.numero);
      if (prev && prev !== p.estado) {
        if (p.estado === 'pagado') {
          emitGlobalToast('Pago confirmado', `${p.numero} fue aprobado. ¡Gracias por tu compra!`, 'success');
        } else if (p.estado === 'rechazado') {
          emitGlobalToast(
            'Pago rechazado',
            `${p.numero}: ${p.motivoRechazo || 'motivo no indicado'}`,
            'error'
          );
        } else if (p.estado === 'completado') {
          emitGlobalToast('Pedido completado', `${p.numero} fue marcado como entregado.`, 'success');
        }
      }
      estadoPrev.current.set(p.numero, p.estado);

      // Pedido NUEVO (para el admin de la tienda).
      if (!visto.current.has(p.numero) && p.estado === 'pendiente_pago') {
        emitGlobalToast(
          'Nuevo pedido por confirmar',
          `${p.numero} · ${p.cliente?.nombre || 'Cliente'} — revisa el comprobante.`,
          'pending'
        );
      }
      visto.current.add(p.numero);
    });
  }, [pedidos, loading, user]);

  return null;
}