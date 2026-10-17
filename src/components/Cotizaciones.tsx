// ============================================================
// COTIZACIONES — POS exclusivo para administradores
// ============================================================
// Ruta: /admin/cotizaciones
// - Grid de productos (productsService) con buscar/filtros.
// - Sidebar / drawer de cotización con cantidades y totales.
// - Modal "Generar cotización": WhatsApp, PDF (jspdf) y guardado
//   en Firestore (colección `cotizaciones`).
// - Pestaña "Historial": ver, reenviar, cambiar estado y eliminar.
// Acceso: SOLO usuarios presentes en la lista de admins del panel
// (config/admins). Ver firestore.rules.

import { PanalBackdrop } from './StoreFx';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useScrollToTopOnMount } from '../hooks/useScrollToTopOnMount';
import { BRANDING } from '../lib/branding';
import { useAdminList, isEmailAdmin } from '../lib/adminAccess';
import { saveUltimaVista } from '../utils/lastView';
import * as productsService from '../lib/productsService';
import { useCotizaciones, saveCotizacion, deleteCotizacion, updateCotizacionEstado, nextCotizacionNumero } from '../lib/cotizacionesService';
import { downloadQuotePdf } from '../lib/quotesPdf';
import { openWhatsAppCotizacion } from '../lib/quotesWhatsApp';
import { WHATSAPP_NUMBER } from '../config';
import { catEmoji, formatSoles, precioTexto, sortProducts, type StoreProduct } from '../types/store';
import { STORE_MACROS } from '../types/store';
import {
  COTIZACION_ESTADOS,
  cotizacionSubtotal,
  cotizacionTotal,
  formatearFechaCorta,
  type Cotizacion,
  type CotizacionEstado,
  type CotizacionProducto,
} from '../types/cotizaciones';
import { modalVariants, backdropVariants } from '../lib/motion';
import { uid, type Toast } from '../data';
import { ArrowLeft, FileDown, History, Loader2, MessageCircle, Plus, Save, Search, Trash2, X } from 'lucide-react';
import QuantityInput from './QuantityInput';
import LoadingScreen from './LoadingScreen';

const inputCls =
  'w-full rounded-xl border border-line bg-ink px-4 py-2.5 text-sm text-cream placeholder:text-husk/50 focus:border-honey/70 focus:outline-none';

const estadosCls: Record<CotizacionEstado, string> = {
  pendiente: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  enviada: 'bg-honey/20 text-honey border-honey/40',
  aprobada: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

interface LineaCart {
  product: StoreProduct;
  cantidad: number;
}

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/* ============================================================
   Toasts locales
   ============================================================ */
function CotizToasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-24 right-5 z-[90] flex w-72 flex-col gap-2 lg:bottom-5">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className="card flex items-start gap-3 border-honey/40 p-4 shadow-[0_16px_40px_rgba(0,0,0,.5)]"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-honey text-ink">
              {t.type === 'error' ? '✕' : '✓'}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-cream">{t.title}</p>
              {t.desc && <p className="mt-0.5 whitespace-normal break-words font-mono text-[11px] text-husk">{t.desc}</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   Selector de productos (modal) — se arma la cotización completa
   y de una sola vez: cantidades + resumen + "Generar cotización".
   ============================================================ */
function PickerModal({
  open,
  products,
  initialLines,
  onClose,
  onApply,
}: {
  open: boolean;
  products: StoreProduct[];
  initialLines: LineaCart[];
  onClose: () => void;
  onApply: (cantidades: Record<string, number>) => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<'all' | string>('all');
  const [qty, setQty] = useState<Record<string, number>>({});

  // Al abrir, precargar las cantidades ya elegidas en la cotización actual.
  useEffect(() => {
    if (!open) return;
    setBusqueda('');
    setCategoria('all');
    const map: Record<string, number> = {};
    initialLines.forEach((l) => {
      map[l.product.id] = l.cantidad;
    });
    setQty(map);
  }, [open, initialLines]);

  const q = normalize(busqueda.trim());
  const lista = useMemo(() => {
    let list = products.filter((p) => p.activo !== false);
    if (categoria !== 'all') list = list.filter((p) => p.categoria === categoria);
    if (q)
      list = list.filter(
        (p) => normalize(p.nombre).includes(q) || normalize(p.descripcion || '').includes(q)
      );
    return sortProducts(list);
  }, [products, categoria, q]);

  const total = useMemo(() => {
    const seleccion = Object.entries(qty)
      .filter(([, cantidad]) => cantidad > 0)
      .map(([id, cantidad]) => {
        const p = products.find((x) => x.id === id);
        return p ? { precio: p.precio, consultarPrecio: p.consultarPrecio, cantidad } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    return cotizacionTotal(seleccion);
  }, [products, qty]);

  const distinct = Object.values(qty).filter((c) => c > 0).length;

  // Escritura directa de la cantidad (input editable del selector).
  const setCantidad = (id: string, valor: number) =>
    setQty((prev) => ({ ...prev, [id]: Math.max(0, valor) }));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={backdropVariants}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
          >
            <div className="card flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden sm:h-[85vh]">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-bold text-cream">Seleccionar productos</h3>
                  <p className="truncate text-xs text-husk">
                    Define las cantidades y genera la cotización de una sola vez
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="rounded-lg p-2 text-husk transition-colors hover:bg-coral/10 hover:text-coral"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 border-b border-line px-5 py-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-husk/60" />
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar producto por nombre o descripción…"
                    className={`${inputCls} pl-10`}
                  />
                </div>
                <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setCategoria('all')}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      categoria === 'all'
                        ? 'border-honey bg-honey font-bold text-ink'
                        : 'border-line bg-pane text-husk hover:border-honey/50 hover:text-cream'
                    }`}
                  >
                    Todas
                  </button>
                  {STORE_MACROS.map((m) => (
                    <button
                      key={m.nombre}
                      onClick={() => setCategoria(m.nombre)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        categoria === m.nombre
                          ? 'border-honey bg-honey font-bold text-ink'
                          : 'border-line bg-pane text-husk hover:border-honey/50 hover:text-cream'
                      }`}
                    >
                      {m.emoji} {m.nombre}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-cuerpo flex-1 overflow-y-auto p-5">
                {lista.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 p-10 text-center">
                    <span className="text-3xl">🔍</span>
                    <p className="font-medium text-cream">Sin resultados</p>
                    <p className="text-sm text-husk/70">Prueba con otro término o categoría</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {lista.map((p) => {
                      const cantidad = qty[p.id] || 0;
                      return (
                        <li
                          key={p.id}
                          className="flex items-center gap-3 rounded-xl border border-line bg-ink/40 p-2.5"
                        >
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-pane text-2xl">
                            {p.imageUrl && p.imageUrl !== 'data:,' ? (
                              <img src={p.imageUrl} alt={p.nombre} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                            ) : (
                              catEmoji(p.categoria)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-cream">{p.nombre}</p>
                            <p className="text-[11px] text-husk">
                              {catEmoji(p.categoria)} {p.categoria}
                              {p.stock > 0 ? ` · Stock ${p.stock}` : ''} · {precioTexto(p)}
                            </p>
                          </div>
                          <QuantityInput
                            value={cantidad}
                            onChange={(next) => setCantidad(p.id, next)}
                            min={0}
                            size="sm"
                            ariaLabel={p.nombre}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="border-t border-line px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="tick-label text-[11px] uppercase tracking-wider text-husk">
                      {distinct} producto{distinct === 1 ? '' : 's'} seleccionado{distinct === 1 ? '' : 's'}
                    </p>
                    <p className="font-display text-2xl font-black text-honey">{formatSoles(total)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty({})}
                      className="flex items-center gap-1.5 rounded-xl border border-coral/40 px-4 py-2.5 text-sm font-bold text-coral transition-colors hover:bg-coral/10"
                    >
                      <Trash2 className="h-4 w-4" /> Limpiar
                    </button>
                    <button
                      onClick={() => onApply(qty)}
                      disabled={distinct === 0}
                      className="flex items-center gap-2 rounded-xl bg-honey px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-honeysoft disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FileDown className="h-4 w-4" /> Generar cotización
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   Componente principal
   ============================================================ */
export default function Cotizaciones() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { status: adminStatus } = useAdminList();
  const isAdmin = isEmailAdmin(user?.email);

  // Guardia: solo admins. Los no-admins van a /seleccionar con aviso de
  // acceso denegado (multiusuario).
  useEffect(() => {
    if (adminStatus === 'loading') return;
    if (!isAdmin) {
      navigate('/seleccionar', {
        replace: true,
        state: { accessDenied: 'Las cotizaciones son exclusivas de los administradores.' },
      });
    }
  }, [isAdmin, adminStatus, navigate]);

  /* Al entrar en /cotizaciones la vista arranca SIEMPRE en el tope, con la
     cabecera (volver, "Cotizaciones", pestañas), el buscador y los filtros a la
     vista. Sin esto se heredaba el scroll de la página anterior y el usuario
     caía dentro de la lista de productos.

     Lógica compartida en `useScrollToTopOnMount` (Catálogo, Pedidos, Tienda y
     esta vista): anula `scroll-behavior: smooth`, desactiva el
     `scrollRestoration` del navegador y reafirma el tope en el frame siguiente
     porque las imágenes de producto y la fila del historial ajustan la altura
     al cargar. */
  useScrollToTopOnMount();

  const [tab, setTab] = useState<'nueva' | 'historial'>('nueva');

  // Cambiar de pestaña también vuelve al tope: "Historial" es mucho más corta
  // que la rejilla de productos, así que sin esto se volvía a "nueva" a media
  // lista y el encabezado se quedaba arriba, fuera de pantalla.
  useLayoutEffect(() => {
    const html = document.documentElement;
    const previo = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    html.style.scrollBehavior = previo;
  }, [tab]);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (title: string, desc?: string, type: 'success' | 'error' = 'success') => {
    const t = { id: uid(), title, desc, type };
    setToasts((prev) => [...prev, t]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3200);
  };

  // Catálogo (productsService = fuente única de verdad, mismo store).
  const [products, setProducts] = useState<StoreProduct[]>(() => productsService.getAll());
  useEffect(
    () => productsService.onProductsChanged(() => setProducts(productsService.getAll())),
    []
  );

  // Historial (Firestore, en tiempo real).
  const { cotizaciones, loading: loadingQuotes } = useCotizaciones();

  // Buscador y filtros.
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<'all' | string>('all');
  const q = normalize(busqueda.trim());
  const visibleProducts = useMemo(() => {
    let list = products.filter((p) => p.activo !== false);
    if (categoria !== 'all') list = list.filter((p) => p.categoria === categoria);
    if (q) list = list.filter((p) => normalize(p.nombre).includes(q) || normalize(p.descripcion || '').includes(q));
    return sortProducts(list);
  }, [products, categoria, q]);

  // Cotización en curso.
  const [lines, setLines] = useState<LineaCart[]>([]);
  const total = useMemo(() => cotizacionTotal(lines.map((l) => ({ precio: l.product.precio, consultarPrecio: l.product.consultarPrecio, cantidad: l.cantidad }))), [lines]);

  // Modal de generación.
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [notas, setNotas] = useState('');
  const [validez, setValidez] = useState(7);
  const [guardando, setGuardando] = useState(false);
  const [siguienteNumero, setSiguienteNumero] = useState('COT-001');
  // Correlativo que Firestore confirmó al guardar (puede diferir del previsto).
  const [numeroGuardado, setNumeroGuardado] = useState<string>('');
  useEffect(() => {
    if (!modalAbierto) return;
    nextCotizacionNumero()
      .then((n) => {
        setSiguienteNumero(n);
        // Cada nueva cotización arranca sin un correlativo ya confirmado.
        setNumeroGuardado('');
      })
      .catch(() => setSiguienteNumero('COT-001'));
  }, [modalAbierto]);

  // Modal selector de productos (el "+" de la cabecera).
  const [pickerOpen, setPickerOpen] = useState(false);

  // Aplica las cantidades elegidas en el selector y abre la generación del PDF.
  const handleApplyPicker = (cantidades: Record<string, number>) => {
    const next: LineaCart[] = [];
    Object.entries(cantidades).forEach(([id, cantidad]) => {
      if (cantidad <= 0) return;
      const p = products.find((x) => x.id === id);
      if (p) next.push({ product: p, cantidad });
    });
    setLines(next);
    setPickerOpen(false);
    setModalAbierto(true);
  };

  const productosCotizacion: CotizacionProducto[] = lines.map((l) => ({
    id: l.product.id,
    nombre: l.product.nombre,
    unidad: l.product.unidad || '',
    precio: l.product.precio || 0,
    consultarPrecio: l.product.consultarPrecio || false,
    cantidad: l.cantidad,
    subtotal: cotizacionSubtotal({ precio: l.product.precio, consultarPrecio: l.product.consultarPrecio, cantidad: l.cantidad }),
  }));

  const buildQuote = (): Cotizacion => ({
    // Tras guardar, el correlativo real manda sobre el previsto: si otro admin
    // ocupó el número mientras el formulario estaba abierto, el PDF y el
    // mensaje de WhatsApp deben llevar el que realmente tiene el documento.
    numero: numeroGuardado || siguienteNumero,
    fecha: new Date().toISOString(),
    validezDias: validez,
    clienteNombre: clienteNombre.trim(),
    clienteTelefono: clienteTelefono.trim(),
    notas: notas.trim(),
    productos: productosCotizacion,
    total,
    estado: 'pendiente',
    adminEmail: user?.email || '',
  });

  /** Branding fijo del cliente para el PDF (marca + colores). */
  const pdfBranding = useMemo(
    () => ({
      nombreEmpresa: BRANDING.nombreEmpresa,
      primario: BRANDING.colores.primario,
      secundario: BRANDING.colores.secundario,
      tagline: `MIEL & PRODUCTOS · ${BRANDING.ubicacion.toUpperCase()}`,
    }),
    []
  );

  const handleWhatsApp = () => {
    if (!lines.length) return;
    openWhatsAppCotizacion(buildQuote(), WHATSAPP_NUMBER);
    pushToast('Enviando por WhatsApp', siguienteNumero);
  };

  const handlePdf = async () => {
    if (!lines.length) return;
    try {
      await downloadQuotePdf(buildQuote(), pdfBranding);
      pushToast('PDF descargado', siguienteNumero);
    } catch (err) {
      pushToast('No se pudo generar el PDF', (err as Error)?.message || String(err), 'error');
    }
  };

  const handleSave = async () => {
    if (!lines.length) return;
    setGuardando(true);
    try {
      const guardada = await saveCotizacion({
        numero: siguienteNumero,
        clienteNombre: clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim(),
        notas: notas.trim(),
        validezDias: validez,
        productos: productosCotizacion,
        adminEmail: user?.email || '',
      });
      // El correlativo real puede diferir del calculado si otro admin escribió
      // una cotización con el mismo número mientras este formulario estaba abierto.
      if (guardada.numero !== siguienteNumero) {
        setNumeroGuardado(guardada.numero);
        // La cotización SÍ se guardó, solo que con otro correlativo: es un
        // aviso, no un error.
        pushToast('Cotización guardada con otro número', `${guardada.numero} (${siguienteNumero} ya estaba en uso)`);
      } else {
        setNumeroGuardado(guardada.numero);
        pushToast('Cotización guardada correctamente', guardada.numero);
      }
      // Reiniciar para la siguiente cotización.
      setLines([]);
      setClienteNombre('');
      setClienteTelefono('');
      setNotas('');
      setValidez(7);
      setModalAbierto(false);
    } catch (err) {
      pushToast('No se pudo guardar', (err as Error)?.message || String(err), 'error');
    } finally {
      setGuardando(false);
    }
  };

  // Detalle de una cotización del historial.
  const [detalle, setDetalle] = useState<Cotizacion | null>(null);

  // `detalle` guardaba una copia congelada del documento: el historial de
  // estados (y cualquier cambio hecho por otro admin en otra pestaña) no se
  // reflejaba nunca. Se rehidrata desde el listener cuando llega la versión real.
  useEffect(() => {
    if (!detalle) return;
    const actual = cotizaciones.find((c) => c.numero === detalle.numero);
    if (!actual) return;
    if (actual.estado !== detalle.estado || actual.historial !== detalle.historial) {
      setDetalle(actual);
    }
  }, [cotizaciones, detalle]);

  const historial = useMemo(() => {
    const num = (s: string) => {
      const m = /^COT-(\d+)$/.exec(s);
      return m ? Number(m[1]) : 0;
    };
    return [...cotizaciones].sort((a, b) => num(b.numero) - num(a.numero));
  }, [cotizaciones]);

  const handleDelete = async (c: Cotizacion) => {
    if (!window.confirm(`¿Eliminar la cotización ${c.numero}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteCotizacion(c.numero);
      pushToast('Cotización eliminada', c.numero);
      setDetalle(null);
    } catch (err) {
      pushToast('No se pudo eliminar', (err as Error)?.message || String(err), 'error');
    }
  };

  const handleEstado = async (c: Cotizacion, estado: CotizacionEstado) => {
    const anterior = c.estado;
    // Optimista para que la lista responda al instante…
    setDetalle((d) => (d && d.numero === c.numero ? { ...d, estado } : d));
    try {
      await updateCotizacionEstado(c.numero, estado, user?.email || '');
      pushToast('Estado actualizado', `${c.numero} → ${estado}`);
    } catch (err) {
      // …pero con reversión: antes se dejaba un estado mentiroso en pantalla
      // aunque Firestore lo hubiera rechazado.
      setDetalle((d) => (d && d.numero === c.numero ? { ...d, estado: anterior } : d));
      pushToast('No se pudo actualizar', (err as Error)?.message || String(err), 'error');
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
            <h1 className="flex items-center gap-2 font-display text-2xl font-black tracking-tight text-cream sm:text-3xl">
              <span>📋</span> Cotizaciones
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setTab(tab === 'historial' ? 'nueva' : 'historial')}
              aria-label={tab === 'historial' ? 'Volver a nueva cotización' : 'Ver historial'}
              className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                tab === 'historial'
                  ? 'border-honey bg-honey text-ink'
                  : 'border-line bg-ink text-husk hover:border-honey/60 hover:text-honey'
              }`}
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Historial</span>
            </button>
            <button
              onClick={() => setPickerOpen(true)}
              aria-label="Seleccionar productos"
              className="flex items-center gap-1.5 rounded-xl bg-honey px-3.5 py-2.5 text-sm font-bold text-ink shadow-lg shadow-honey/20 transition-colors hover:bg-honeysoft"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Agregar</span>
            </button>
          </div>
        </header>

        {tab === 'nueva' ? (
          <div className="flex flex-col gap-5 lg:flex-row">
            {/* ---- Grid de productos ---- */}
            <section className="min-w-0 flex-1">
              <div className="mb-4 space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-husk/60" />
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar producto por nombre o descripción…"
                    className={`${inputCls} pl-10`}
                  />
                </div>
                <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setCategoria('all')}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      categoria === 'all'
                        ? 'border-honey bg-honey font-bold text-ink'
                        : 'border-line bg-pane text-husk hover:border-honey/50 hover:text-cream'
                    }`}
                  >
                    Todas
                  </button>
                  {STORE_MACROS.map((m) => (
                    <button
                      key={m.nombre}
                      onClick={() => setCategoria(m.nombre)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        categoria === m.nombre
                          ? 'border-honey bg-honey font-bold text-ink'
                          : 'border-line bg-pane text-husk hover:border-honey/50 hover:text-cream'
                      }`}
                    >
                      {m.emoji} {m.nombre}
                    </button>
                  ))}
                </div>
              </div>

              {visibleProducts.length === 0 ? (
                <div className="card flex flex-col items-center gap-2 p-12 text-center">
                  <span className="text-3xl">🔍</span>
                  <p className="font-medium text-cream">Sin resultados</p>
                  <p className="text-sm text-husk/70">Prueba con otro término o categoría</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                  {visibleProducts.map((p) => (
                    <div
                      key={p.id}
                      className="card group flex flex-col overflow-hidden transition-colors hover:border-honey/50"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-pane">
                        {p.imageUrl && p.imageUrl !== 'data:,' ? (
                          <img
                            src={p.imageUrl}
                            alt={p.nombre}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-5xl">
                            {catEmoji(p.categoria)}
                          </div>
                        )}
                        {p.badge && (
                          <span className="absolute left-2 top-2 rounded-full bg-honey px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-ink">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1 p-3">
                        <p className="tick-label text-[9px] uppercase tracking-wider text-husk">
                          {catEmoji(p.categoria)} {p.categoria}
                          {p.stock > 0 ? ` · Stock ${p.stock}` : ''}
                        </p>
                        <p className="line-clamp-2 min-h-[2.4em] text-sm font-semibold leading-tight text-cream">
                          {p.nombre}
                        </p>
                        <p className="mt-auto pt-1 font-display text-base font-bold text-honey">
                          {precioTexto(p)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* ---- Historial ---- */
          <section>
            {loadingQuotes ? (
              <LoadingScreen size="md" label="Cargando historial…" className="card p-12" />
            ) : historial.length === 0 ? (
              <div className="card flex flex-col items-center gap-2 p-12 text-center">
                <span className="text-3xl">🗂️</span>
                <p className="font-medium text-cream">Sin cotizaciones guardadas</p>
                <p className="text-sm text-husk/70">Toca «+ Agregar» para crear la primera cotización</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {historial.map((c) => (
                  <div key={c.numero} className="card flex flex-col p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs font-bold uppercase tracking-wider text-honey">
                          {c.numero}
                        </p>
                        <p className="text-sm text-husk">{formatearFechaCorta(c.fecha)}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${estadosCls[c.estado]}`}>
                        {c.estado}
                      </span>
                    </div>
                    <p className="truncate text-sm font-semibold text-cream">
                      {c.clienteNombre || 'Cliente sin nombre'}
                    </p>
                    <p className="text-xs text-husk">
                      {c.productos.reduce((s, pp) => s + pp.cantidad, 0)} producto
                      {c.productos.reduce((s, pp) => s + pp.cantidad, 0) === 1 ? '' : 's'} ·{' '}
                      {c.productos.length} línea{c.productos.length === 1 ? '' : 's'}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                      <span className="font-display text-lg font-bold text-honey">{formatSoles(c.total)}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openWhatsAppCotizacion(c, WHATSAPP_NUMBER)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-honey/40 text-honey transition-colors hover:bg-honey/10"
                          title="Reenviar por WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => void downloadQuotePdf(c, pdfBranding)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-husk transition-colors hover:border-honey/60 hover:text-honey"
                          title="Descargar PDF"
                        >
                          <FileDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDetalle(c)}
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-husk transition-colors hover:border-honey/60 hover:text-honey"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => void handleDelete(c)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-coral/40 text-coral transition-colors hover:bg-coral/10"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Toasts */}
      <CotizToasts toasts={toasts} />

      {/* ---- Selector de productos (el "+" de la cabecera) ---- */}
      <PickerModal
        open={pickerOpen}
        products={products}
        initialLines={lines}
        onClose={() => setPickerOpen(false)}
        onApply={handleApplyPicker}
      />

      {/* ---- Modal: Generar cotización ---- */}
      <AnimatePresence>
        {modalAbierto && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={backdropVariants}
              onClick={() => setModalAbierto(false)}
            />
            <motion.div
              className="fixed inset-0 z-[70] flex items-center justify-center p-4"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={modalVariants}
            >
              <div className="card w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <div>
                    <h3 className="font-display text-xl font-bold text-cream">Generar cotización</h3>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-honey">{siguienteNumero}</p>
                  </div>
                  <button
                    onClick={() => setModalAbierto(false)}
                    className="rounded-lg p-2 text-husk transition-colors hover:bg-coral/10 hover:text-coral"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="modal-cuerpo space-y-4 p-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-husk">
                        Cliente (opcional)
                      </label>
                      <input
                        value={clienteNombre}
                        onChange={(e) => setClienteNombre(e.target.value)}
                        placeholder="Nombre del cliente"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-husk">
                        Teléfono / WhatsApp (opcional)
                      </label>
                      <input
                        value={clienteTelefono}
                        onChange={(e) => setClienteTelefono(e.target.value)}
                        placeholder="+51 9XX XXX XXX"
                        inputMode="tel"
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-husk">
                      Validez en días
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={validez}
                      onChange={(e) => setValidez(Math.max(1, Number(e.target.value) || 7))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-husk">
                      Notas (opcional)
                    </label>
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      rows={2}
                      placeholder="Condiciones, fechas de entrega, etc."
                      className={`${inputCls} resize-none`}
                    />
                  </div>

                  <div className="rounded-xl border border-line bg-ink/50 p-3">
                    <p className="mb-2 tick-label text-[10px] uppercase tracking-wider text-husk">
                      Resumen · {productosCotizacion.length} producto{productosCotizacion.length === 1 ? '' : 's'}
                    </p>
                    <ul className="max-h-32 space-y-1 overflow-y-auto pr-1 text-sm">
                      {productosCotizacion.map((p) => (
                        <li key={p.id} className="flex justify-between gap-2 text-cream">
                          <span className="truncate">
                            {p.nombre} × {p.cantidad}
                          </span>
                          <span className="shrink-0 text-husk">
                            {p.consultarPrecio ? '—' : formatSoles(p.subtotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                      <span className="tick-label text-[11px] uppercase tracking-wider text-husk">Total</span>
                      <span className="font-display text-xl font-black text-honey">{formatSoles(total)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 border-t border-line p-4 sm:grid-cols-3">
                  <button
                    onClick={handleWhatsApp}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-emerald-500"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </button>
                  <button
                    onClick={() => void handlePdf()}
                    className="flex items-center justify-center gap-2 rounded-xl border border-honey/50 py-2.5 text-sm font-bold text-honey transition-colors hover:bg-honey/10"
                  >
                    <FileDown className="h-4 w-4" /> PDF
                  </button>
                  <button
                    onClick={() => void handleSave()}
                    disabled={guardando}
                    className="flex items-center justify-center gap-2 rounded-xl bg-honey py-2.5 text-sm font-bold text-ink transition-colors hover:bg-honeysoft disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---- Modal: detalle del historial ---- */}
      <AnimatePresence>
        {detalle && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={backdropVariants}
              onClick={() => setDetalle(null)}
            />
            <motion.div
              className="fixed inset-0 z-[70] flex items-center justify-center p-4"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={modalVariants}
            >
              <div className="card max-h-[85vh] w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <div>
                    <h3 className="font-display text-xl font-bold text-cream">{detalle.numero}</h3>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-husk">
                      {formatearFechaCorta(detalle.fecha)} · por {detalle.adminEmail}
                    </p>
                  </div>
                  <button
                    onClick={() => setDetalle(null)}
                    className="rounded-lg p-2 text-husk transition-colors hover:bg-coral/10 hover:text-coral"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="modal-cuerpo max-h-[55vh] space-y-4 overflow-y-auto p-5">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="tick-label text-[10px] uppercase tracking-wider text-husk">Cliente</p>
                      <p className="text-cream">{detalle.clienteNombre || '—'}</p>
                      <p className="text-husk">{detalle.clienteTelefono || ''}</p>
                    </div>
                    <div>
                      <p className="tick-label text-[10px] uppercase tracking-wider text-husk">Validez</p>
                      <p className="text-cream">
                        {detalle.validezDias} día{detalle.validezDias === 1 ? '' : 's'}
                      </p>
                      <select
                        value={detalle.estado}
                        onChange={(e) => void handleEstado(detalle, e.target.value as CotizacionEstado)}
                        className="mt-1 rounded-lg border border-line bg-ink px-2 py-1 text-xs font-semibold text-cream focus:border-honey/70"
                      >
                        {COTIZACION_ESTADOS.map((s) => (
                          <option key={s} value={s} className="bg-pane">
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {detalle.productos.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-ink/40 px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-cream">{p.nombre}</span>
                        <span className="shrink-0 text-xs text-husk">× {p.cantidad}</span>
                        <span className="shrink-0 text-sm font-semibold text-cream">
                          {p.consultarPrecio ? '—' : formatSoles(p.subtotal)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between rounded-xl border border-honey/40 bg-honey/10 px-4 py-3">
                    <span className="font-bold text-cream">Total</span>
                    <span className="font-display text-xl font-black text-honey">{formatSoles(detalle.total)}</span>
                  </div>

                  {detalle.notas && (
                    <p className="rounded-xl border border-line bg-ink/40 px-3 py-2 text-xs text-husk">
                      <span className="font-semibold text-cream">Notas:</span> {detalle.notas}
                    </p>
                  )}

                  {/* Bitácora de estados: quién pasó la cotización a qué estado y cuándo. */}
                  {(() => {
                    const hs = Array.isArray(detalle.historial) ? detalle.historial : [];
                    if (hs.length === 0) return null;
                    return (
                      <div className="rounded-xl border border-line bg-ink/40 px-3 py-2">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-husk">
                          Historial de estados
                        </p>
                        <ol className="space-y-1.5">
                          {hs.map((h, i) => (
                            <li key={`${h.ts}-${i}`} className="flex items-start gap-2 text-[11px] text-husk">
                              <span className="mt-0.5 font-mono text-honey/80">
                                {h.ts ? new Date(h.ts).toLocaleString('es-PE') : '—'}
                              </span>
                              <span className="font-semibold text-cream">{h.estado}</span>
                              <span className="truncate">{h.adminEmail || 'sistema'}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-line p-4">
                  <button
                    onClick={() => void handleDelete(detalle)}
                    className="flex items-center gap-2 rounded-xl border border-coral/40 px-4 py-2.5 text-sm font-bold text-coral transition-colors hover:bg-coral/10"
                  >
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openWhatsAppCotizacion(detalle, WHATSAPP_NUMBER)}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-emerald-500"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </button>
                    <button
                      onClick={() => void downloadQuotePdf(detalle, pdfBranding)}
                      className="flex items-center gap-2 rounded-xl border border-honey/50 px-4 py-2.5 text-sm font-bold text-honey transition-colors hover:bg-honey/10"
                    >
                      <FileDown className="h-4 w-4" /> PDF
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}