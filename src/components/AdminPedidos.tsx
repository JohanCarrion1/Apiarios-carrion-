// ============================================================
// ADMIN PEDIDOS — gestión de pedidos pagados con Yape
// ============================================================
// Ruta: /admin/pedidos
// - Lista en tiempo real (usePedidos) con filtros por estado.
// - Badge de color por estado y modal de detalle (cliente,
//   productos, total, historial y comprobante en lightbox).
// - Acciones: aprobar (pagado), rechazar (con motivo) y completar.
// Acceso: SOLO admins del panel (config/admins). El aislamiento
// por rol lo aplica `usePedidos` + firestore.rules.
// ============================================================

import { PanalBackdrop } from './StoreFx';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useScrollToTopOnMount } from '../hooks/useScrollToTopOnMount';
import { useAdminList, isEmailAdmin } from '../lib/adminAccess';
import { saveUltimaVista } from '../utils/lastView';
import { usePedidos, actualizarEstadoPedido, ESTADOS_ADMIN } from '../lib/pedidosService';
import {
  PEDIDO_ESTADO_LABEL,
  type Pedido,
  type PedidoEstado,
} from '../types/pedidos';
import { formatSoles } from '../types/store';
import { formatearFechaCorta } from '../types/cotizaciones';
import { modalVariants, backdropVariants, lightboxVariants } from '../lib/motion';
import { uid, type Toast } from '../data';
import LoadingScreen from './LoadingScreen';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ThumbsUp,
  X,
  XCircle,
  Zap,
} from 'lucide-react';

/** Colores de la insignia de cada estado. */
const BADGE: Record<PedidoEstado, string> = {
  pendiente_pago: 'bg-amber-400 text-amber-950',
  pagado: 'bg-emerald-400 text-emerald-950',
  rechazado: 'bg-coral text-ink',
  completado: 'bg-honey text-ink',
};

function EstadoBadge({ estado }: { estado: PedidoEstado }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${BADGE[estado]}`}
    >
      {PEDIDO_ESTADO_LABEL[estado]}
    </span>
  );
}

export default function AdminPedidos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { status: adminStatus } = useAdminList();
  const isAdmin = isEmailAdmin(user?.email);

  const { pedidos, loading, error: pedidosError } = usePedidos();

  // Al entrar en /admin/pedidos la vista arranca en el título "Pedidos" y los
  // filtros de estado, no scrolleada dentro de la lista. Sin esto heredaba el
  // scroll de la página anterior.
  useScrollToTopOnMount();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (title: string, desc?: string, type: 'success' | 'error' = 'success') => {
    const t = { id: uid(), title, desc, type };
    setToasts((prev) => [...prev, t]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3200);
  };

  // Guardia: solo admins.
  useEffect(() => {
    if (adminStatus === 'loading') return;
    if (!isAdmin) {
      navigate('/seleccionar', {
        replace: true,
        state: { accessDenied: 'Los pedidos son exclusivos de los administradores.' },
      });
    }
  }, [isAdmin, adminStatus, navigate]);

  const [filtro, setFiltro] = useState<'todos' | PedidoEstado>('todos');
  const [detalle, setDetalle] = useState<Pedido | null>(null);
  const [comprobanteAbierto, setComprobanteAbierto] = useState(false);
  const [rechazo, setRechazo] = useState<Pedido | null>(null);
  const [motivo, setMotivo] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  // Orden: más recientes primero (PED-NNN descendente).
  const visibles = useMemo(() => {
    const num = (s: string) => {
      const m = /^PED-(\d+)$/.exec(s);
      return m ? Number(m[1]) : 0;
    };
    const list = [...pedidos].sort((a, b) => num(b.numero) - num(a.numero));
    return filtro === 'todos' ? list : list.filter((p) => p.estado === filtro);
  }, [pedidos, filtro]);

  const conteos = useMemo(() => {
    const c: Record<string, number> = { todos: pedidos.length };
    pedidos.forEach((p) => {
      c[p.estado] = (c[p.estado] || 0) + 1;
    });
    return c;
  }, [pedidos]);

  const cambiarEstado = async (p: Pedido, estado: PedidoEstado, descripcion?: string) => {
    setTrabajando(true);
    try {
      await actualizarEstadoPedido(p.numero, {
        estado,
        descripcion: descripcion || (estado === 'rechazado' ? motivo : undefined),
        actor: user?.email || user?.uid || 'admin',
      });
      pushToast(
        // Antes solo contemplaba tres casos y cualquier otro (reabrir) decía
        // "Pedido completado", que era directamente falso.
        'Estado actualizado',
        `${p.numero} → ${PEDIDO_ESTADO_LABEL[estado] || estado}`
      );
      setDetalle(null);
      setRechazo(null);
      setMotivo('');
    } catch (err) {
      pushToast('No se pudo actualizar', (err as Error)?.message || String(err), 'error');
    } finally {
      setTrabajando(false);
    }
  };

  if (adminStatus === 'loading') {
    return <LoadingScreen size="lg" label="Verificando acceso…" fullScreen />;
  }

  return (
    <div className="relative min-h-screen">
      <PanalBackdrop />
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 xl:px-16 pb-28 pt-6">
        {/* Cabecera */}
        <header className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              saveUltimaVista('/seleccionar', user?.uid);
              navigate('/seleccionar');
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-ink text-husk transition-colors hover:border-honey/60 hover:text-honey"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-black tracking-tight text-cream sm:text-3xl">
              🧾 Pedidos
            </h1>
            <p className="mt-0.5 text-sm text-husk">Pagos con Yape por confirmar y gestionar.</p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-300">
              <Zap className="h-4 w-4" />
              {(conteos.pendiente_pago || 0)} pendientes
            </div>
          )}
        </header>

        {/* Filtros */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {(['todos', ...ESTADOS_ADMIN] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                filtro === f ? 'bg-honey text-ink' : 'border border-line bg-ink text-husk hover:border-honey/50 hover:text-honey'
              }`}
            >
              {f === 'todos' ? 'Todos' : PEDIDO_ESTADO_LABEL[f as PedidoEstado]}
              <span className="ml-1 opacity-70">({conteos[f] || 0})</span>
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-husk">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-honey" /> Cargando pedidos…
          </div>
        ) : pedidosError ? (
          // Antes el error del listener se ignoraba y se pintaba el mismo
          // "No hay pedidos aún": un fallo de permisos o de red era
          // indistingüible de una tienda sin pedidos.
          <div className="rounded-2xl border border-coral/30 bg-coral/10 p-8 text-center">
            <p className="text-3xl">📡</p>
            <p className="mt-2 font-semibold text-coral">No se pudieron cargar los pedidos</p>
            <p className="mt-1 text-sm text-husk">{pedidosError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl border border-coral/40 px-4 py-2 text-xs font-semibold text-coral transition-colors hover:bg-coral/20"
            >
              Reintentar
            </button>
          </div>
        ) : visibles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-ink/30 p-12 text-center text-husk">
            <p className="text-4xl">🧺</p>
            <p className="mt-3 font-semibold">No hay pedidos {filtro !== 'todos' ? 'con ese estado' : 'aún'}.</p>
            <p className="mt-1 text-sm text-husk/60">Cuando un cliente pague con Yape aparecerá aquí en tiempo real.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visibles.map((p) => (
              <li key={p.numero}>
                <div className="card flex flex-wrap items-center gap-3 p-4">
                  <button
                    onClick={() => setDetalle(p)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-honey">{p.numero}</span>
                        <EstadoBadge estado={p.estado} />
                      </div>
                      <p className="mt-1 truncate text-sm text-cream">
                        {p.cliente?.nombre || 'Cliente sin nombre'}
                      </p>
                      <p className="text-xs text-husk">
                        {p.cliente?.telefono} · {formatearFechaCorta(p.fechaCreacion)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-lg font-black text-cream">{formatSoles(p.total)}</p>
                      <p className="font-mono text-[10px] text-husk">{p.productos.length} ítems</p>
                    </div>
                  </button>

                  {/* Acciones rápidas */}
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => {
                        setDetalle(p);
                        setComprobanteAbierto(true);
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-husk transition-colors hover:border-honey/50 hover:text-honey"
                      aria-label={`Ver comprobante de ${p.numero}`}
                      title="Ver comprobante"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {p.estado === 'pendiente_pago' && (
                      <>
                        <button
                          onClick={() => cambiarEstado(p, 'pagado')}
                          disabled={trabajando}
                          className="flex h-10 items-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-xs font-bold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
                        >
                          <ThumbsUp className="h-4 w-4" /> Aprobar
                        </button>
                        <button
                          onClick={() => {
                            setRechazo(p);
                            setMotivo('');
                          }}
                          disabled={trabajando}
                          className="flex h-10 items-center gap-1.5 rounded-xl border border-coral/50 px-3 text-xs font-bold text-coral transition-colors hover:bg-coral/10 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" /> Rechazar
                        </button>
                      </>
                    )}
                    {p.estado === 'pagado' && (
                      <button
                        onClick={() => cambiarEstado(p, 'completado')}
                        disabled={trabajando}
                        className="flex h-10 items-center gap-1.5 rounded-xl bg-honey px-3 text-xs font-bold text-ink transition-colors hover:bg-honeysoft disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Completar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal de detalle */}
      <AnimatePresence>
        {detalle && (
          <>
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm"
              onClick={() => setDetalle(null)}
            />
            <div className="fixed inset-0 z-[71] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="card relative my-auto w-full max-w-xl overflow-hidden rounded-2xl border-line"
                role="dialog"
                aria-modal="true"
              >
                <div className="flex items-center justify-between border-b border-line bg-ink/40 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-honey">{detalle.numero}</span>
                    <EstadoBadge estado={detalle.estado} />
                  </div>
                  <button
                    onClick={() => setDetalle(null)}
                    aria-label="Cerrar detalle"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-husk transition-colors hover:border-honey/60 hover:text-cream"
                  >
                    ✕
                  </button>
                </div>

                <div className="modal-cuerpo max-h-[calc(100vh-10rem)] overflow-y-auto p-5">
                  {/* Cliente */}
                  <div className="rounded-xl border border-line bg-ink/30 p-4 text-sm">
                    <h3 className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-husk">
                      {detalle.metodoPago === 'yape' ? 'Cliente (pago Yape)' : 'Cliente'}
                    </h3>
                    <p className="font-semibold text-cream">{detalle.cliente.nombre}</p>
                    <div className="mt-1.5 space-y-1 text-xs text-husk">
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> {detalle.cliente.telefono}
                      </p>
                      {detalle.cliente.correo && (
                        <p className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" /> {detalle.cliente.correo}
                        </p>
                      )}
                      <p className="flex items-start gap-1.5">
                        <MapPin className="mt-0.5 h-3.5 w-3.5" /> {detalle.cliente.direccion}
                      </p>
                      {detalle.clienteEmail && (
                        <p className="flex items-center gap-1.5">
                          <span className="font-mono">👤</span> {detalle.clienteEmail}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Productos */}
                  <div className="mt-4 rounded-xl border border-line bg-ink/30 p-4">
                    <h3 className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-husk">Productos</h3>
                    <ul className="space-y-1.5 text-sm">
                      {detalle.productos.map((prod) => (
                        <li key={prod.id} className="flex items-center justify-between gap-3">
                          <span className="min-w-0 flex-1 truncate text-cream">
                            {prod.nombre} <span className="text-husk">× {prod.cantidad}</span>
                            {prod.unidad ? <span className="text-husk"> ({prod.unidad})</span> : null}
                          </span>
                          <span className="shrink-0 font-mono text-husk">
                            {prod.consultarPrecio ? 'Por consultar' : formatSoles(prod.subtotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-husk">Total</span>
                      <span className="font-display text-xl font-black text-honey">{formatSoles(detalle.total)}</span>
                    </div>
                  </div>

                  {/* Comprobante */}
                  <div className="mt-4 rounded-xl border border-line bg-ink/30 p-4">
                    <h3 className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-husk">
                      Comprobante de pago
                    </h3>
                    <button
                      onClick={() => setComprobanteAbierto(true)}
                      className="group relative w-full overflow-hidden rounded-xl border border-line bg-ink/60"
                    >
                      <img
                        src={detalle.comprobantePago?.url || ''}
                        alt="Comprobante de pago"
                        loading="lazy"
                        decoding="async"
                        className="h-44 w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="flex items-center gap-2 rounded-full bg-honey px-4 py-2 text-xs font-bold text-ink">
                          <Eye className="h-4 w-4" /> Ver comprobante
                        </span>
                      </span>
                    </button>
                    {detalle.comprobantePago?.nombre && (
                      <p className="mt-1.5 truncate font-mono text-[11px] text-husk">
                        {detalle.comprobantePago.nombre} ·{' '}
                        {(detalle.comprobantePago.tamaño / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                    {detalle.estado === 'rechazado' && detalle.motivoRechazo && (
                      <p className="mt-2 rounded-lg border border-coral/30 bg-coral/10 p-2 text-xs text-coral">
                        <strong>Motivo del rechazo:</strong> {detalle.motivoRechazo}
                      </p>
                    )}
                  </div>

                  {/* Historial */}
                  <div className="mt-4 rounded-xl border border-line bg-ink/30 p-4">
                    <h3 className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-husk">Historial</h3>
                    <ol className="space-y-1.5 text-xs text-husk">
                      {[...detalle.historial]
                        .reverse()
                        .map((h, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-honey" />
                            <span>
                              <span className="font-semibold text-cream">{PEDIDO_ESTADO_LABEL[h.estado]}</span>
                              <span className="text-husk/70"> · {formatearFechaCorta(h.at)}</span>
                              {h.descripcion ? <span className="block text-husk">{h.descripcion}</span> : null}
                            </span>
                          </li>
                        ))}
                    </ol>
                  </div>

                  {/* Acciones en detalle */}
                  {detalle.estado === 'pendiente_pago' && (
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => cambiarEstado(detalle, 'pagado')}
                        disabled={trabajando}
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" /> Aprobar pago
                      </button>
                      <button
                        onClick={() => setRechazo(detalle)}
                        disabled={trabajando}
                        className="flex items-center justify-center gap-2 rounded-xl border border-coral/50 py-3 text-sm font-bold text-coral transition-colors hover:bg-coral/10 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" /> Rechazar pago
                      </button>
                    </div>
                  )}
                  {detalle.estado === 'pagado' && (
                    <button
                      onClick={() => cambiarEstado(detalle, 'completado')}
                      disabled={trabajando}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-honey py-3 text-sm font-bold text-ink transition-colors hover:bg-honeysoft disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Marcar como completado
                    </button>
                  )}
                  {detalle.estado === 'rechazado' && (
                    // Salida del estado terminal: un rechazo por error (captura
                    // mal leída, o el pago sí entró) dejaba el pedido
                    // encerrado sin ninguna acción posible.
                    <button
                      onClick={() => cambiarEstado(detalle, 'pendiente_pago', 'Reabierta para revisión')}
                      disabled={trabajando}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-honey/50 py-3 text-sm font-bold text-honey transition-colors hover:bg-honey/10 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" /> Reabrir para revisión
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox del comprobante */}
      <AnimatePresence>
        {comprobanteAbierto && detalle && (
          <>
            <motion.div
              variants={lightboxVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
              onClick={() => setComprobanteAbierto(false)}
            >
              <button
                onClick={() => setComprobanteAbierto(false)}
                aria-label="Cerrar comprobante"
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-ink/70 text-cream transition-colors hover:bg-ink"
              >
                ✕
              </button>
              <motion.img
                variants={lightboxVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                src={detalle.comprobantePago?.url || ''}
                alt={`Comprobante de ${detalle.numero}`}
                className="max-h-[90vh] max-w-full rounded-xl border border-line shadow-2xl"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de rechazo con motivo */}
      <AnimatePresence>
        {rechazo && (
          <>
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-[85] bg-black/70 backdrop-blur-sm"
              onClick={() => setRechazo(null)}
            />
            <div className="fixed inset-0 z-[86] flex items-center justify-center p-4">
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="card w-full max-w-md overflow-hidden rounded-2xl border-line"
                role="dialog"
                aria-modal="true"
              >
                <div className="flex items-center justify-between border-b border-line bg-ink/40 px-5 py-4">
                  <h2 className="font-display text-lg font-bold text-coral">Rechazar pago</h2>
                  <button
                    onClick={() => setRechazo(null)}
                    aria-label="Cerrar"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-husk transition-colors hover:border-coral/50 hover:text-cream"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-5">
                  <p className="text-sm text-husk">
                    Indicar el motivo del rechazo para <span className="font-mono text-honey">{rechazo.numero}</span>:
                  </p>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej: la captura no muestra el monto completo…"
                    rows={3}
                    maxLength={200}
                    className="mt-3 w-full rounded-xl border border-line bg-ink/60 px-4 py-3 text-sm text-cream placeholder:text-husk/50 focus:border-coral focus:outline-none"
                  />
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setRechazo(null)}
                      className="rounded-xl border border-line py-3 text-sm font-semibold text-husk transition-colors hover:text-cream"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => cambiarEstado(rechazo, 'rechazado', motivo)}
                      disabled={!motivo.trim() || trabajando}
                      className="rounded-xl bg-coral py-3 text-sm font-bold text-ink transition-colors hover:bg-coral/80 disabled:opacity-50"
                    >
                      Rechazar pago
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-24 right-5 z-[90] flex w-72 flex-col gap-2 lg:bottom-5">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className="card pointer-events-auto flex items-start gap-3 border-honey/40 p-4 shadow-[0_16px_40px_rgba(0,0,0,.5)]"
              variants={{ hidden: { opacity: 0, y: 24, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 8, scale: 0.97 } }}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  t.type === 'error' ? 'bg-coral text-ink' : 'bg-honey text-ink'
                }`}
              >
                {t.type === 'error' ? '✕' : '✓'}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-cream">{t.title}</p>
                {t.desc && <p className="mt-0.5 truncate font-mono text-[11px] text-husk">{t.desc}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}