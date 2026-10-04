import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  PackagePlus,
  Pencil,
  Trash2,
  Minus,
  ShoppingBag,
  Upload,
  Settings,
  Check,
  Store as StoreIcon,
  ShoppingCart,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Camera,
  Crown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uid, type Toast } from '../data';
import {
  modalVariants,
  backdropVariants,
  toastVariants,
} from '../lib/motion';
import { useScrollLock } from '../hooks/useScrollLock';
import { useScrollToTopOnMount } from '../hooks/useScrollToTopOnMount';
import { sanitizeText, sanitizeUrl } from '../utils/sanitize';
import FondoVivo from './FondoVivo';
import Logo from './Logo';
import StoreImage from './StoreImage';
import ProductImageUploader from './ProductImageUploader';
import QuantityInput from './QuantityInput';
import {
  STORE_MACROS,
  catEmoji,
  esMaterialBiologico,
  formatSoles,
  subcategoriasDe,
  ORDER_STATES,
  type OrderEstado,
  type StoreOrder,
  type StoreProduct,
  type StoreCategory,
} from '../types/store';
import { loadAdminOrders, saveAdminOrders } from '../utils/storage';
import * as productsService from '../lib/productsService';
import {
  clearAdminSession,
  hasValidAdminSession,
  setAdminSession,
} from '../lib/adminSession';
import {
  useAdminList,
  isEmailAdmin,
  addAdminEmail,
  removeAdminEmail,
  validateAdminEmail,
  isAdminOwner,
} from '../lib/adminAccess';
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_PRODUCTS_UPLOAD_PRESET,
  CLOUDINARY_PRODUCTS_FOLDER,
} from '../lib/cloudinary';

/* ============================================================
   Panel de administración de la tienda — /tienda/admin
   ============================================================ */

type AdmTab = 'productos' | 'pedidos' | 'ajustes';

const TABS: { id: AdmTab; label: string; icon: typeof Package }[] = [
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag },
  { id: 'ajustes', label: 'Configuración', icon: Settings },
];

const STOCK_BAJO = 3;

// El botón DEBUG solo aparece en desarrollo (no en build de producción).
const IS_DEV = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const estadoStyles: Record<OrderEstado, string> = {
  Pendiente: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  Confirmado: 'bg-honey/20 text-honey border-honey/40',
  Entregado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

/* ---------- Toasts ---------- */
function AdmToasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-24 right-5 z-[90] flex w-72 flex-col gap-2 lg:bottom-5">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className="card flex items-start gap-3 border-honey/40 p-4 shadow-[0_16px_40px_rgba(0,0,0,.5)]"
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-honey text-ink">✓</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-cream">{t.title}</p>
              {t.desc && <p className="mt-0.5 truncate font-mono text-[11px] text-husk">{t.desc}</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Modal crear / editar producto ---------- */
const emptyForm = () => ({
  nombre: '',
  categoria: 'Productos naturales' as StoreCategory,
  subcategoria: 'Mieles' as string,
  precio: 0,
  unidad: '',
  stock: 0,
  descripcion: '',
  badge: '',
  imageUrl: '',
});

type ProductForm = ReturnType<typeof emptyForm>;

const BADGE_SUGGESTIONS = ['Nuevo', 'Más vendido', 'Oferta', 'Por encargo'];

function ProductFormModal({
  product,
  onClose,
  onSave,
}: {
  product: StoreProduct | null;
  onClose: () => void;
  onSave: (data: Omit<StoreProduct, 'id' | 'activo'> & { id?: string; badge?: string }, isNew: boolean) => void;
}) {
  const [form, setForm] = useState<ProductForm>(() =>
    product
      ? {
          nombre: product.nombre,
          categoria: product.categoria,
          subcategoria: product.subcategoria ?? subcategoriasDe(product.categoria)[0],
          precio: product.precio,
          unidad: product.unidad,
          stock: product.stock,
          descripcion: product.descripcion,
          badge: product.badge || '',
          imageUrl: product.imageUrl,
        }
      : emptyForm()
  );
  const [error, setError] = useState('');

  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleMacro = (v: StoreCategory) => {
    setForm((f) => ({ ...f, categoria: v, subcategoria: subcategoriasDe(v)[0] }));
  };

  const handleSave = () => {
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!(form.precio > 0)) {
      setError('El precio debe ser mayor a 0');
      return;
    }
    onSave(
      {
        id: product?.id,
        nombre: sanitizeText(form.nombre, 120),
        categoria: form.categoria,
        subcategoria: form.subcategoria,
        precio: Number(form.precio),
        unidad: sanitizeText(form.unidad, 60) || 'Unidad',
        stock: Math.max(0, Number(form.stock) || 0),
        descripcion: sanitizeText(form.descripcion, 600),
        badge: sanitizeText(form.badge, 60) || undefined,
        imageUrl: sanitizeUrl(form.imageUrl),
      },
      !product
    );
  };

  const inputCls =
    'w-full rounded-xl border border-line bg-ink px-4 py-2.5 text-sm text-cream placeholder:text-husk/50 focus:border-honey/70';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm touch-none"
        onClick={onClose}
      />
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="card relative my-4 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold text-cream">
            {product ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-husk transition-colors hover:border-honey/60 hover:text-cream"
          >
            ✕
          </button>
        </div>

        <div className="modal-cuerpo flex-1 space-y-4 p-5">
          {product && (
            <p className="font-mono text-[10px] tracking-wide text-husk">ID: {product.id}</p>
          )}

          <ProductImageUploader
            value={form.imageUrl}
            onChange={(u) => set('imageUrl', u)}
            emoji={catEmoji(form.categoria)}
          />

          <label className="block">
            <span className="mb-1.5 block text-xs text-husk">Nombre*</span>
            <input type="text" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} className={inputCls} placeholder="Ej: Miel de café" />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs text-husk">Macro-categoría</span>
              <select value={form.categoria} onChange={(e) => handleMacro(e.target.value as StoreCategory)} className={inputCls}>
                {STORE_MACROS.map((m) => (
                  <option key={m.nombre} value={m.nombre}>
                    {m.emoji} {m.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-husk">Subcategoría</span>
              <select value={form.subcategoria} onChange={(e) => set('subcategoria', e.target.value)} className={inputCls}>
                {subcategoriasDe(form.categoria).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs text-husk">Precio (S/)*</span>
              <input type="number" min={0} step="0.5" value={form.precio} onChange={(e) => set('precio', parseFloat(e.target.value) || 0)} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-husk">Unidad de venta</span>
              <input type="text" list="unidades-sugeridas" value={form.unidad} onChange={(e) => set('unidad', e.target.value)} className={inputCls} placeholder="kg" />
            </label>
          </div>
          <datalist id="unidades-sugeridas">
            {['Unidad', 'kg', '100g', '1/2 kg', 'Frasco 500g', 'Frasco 1kg', 'Bolsa 250g', 'millar', 'par', 'Panera'].map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>

          <label className="block">
            <span className="mb-1.5 block text-xs text-husk">Stock</span>
            <input type="number" min={0} value={form.stock} onChange={(e) => set('stock', parseInt(e.target.value) || 0)} className={inputCls} />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-husk">Badge (opcional)</span>
            <input type="text" value={form.badge} onChange={(e) => set('badge', e.target.value)} className={inputCls} placeholder="Ej: Más vendido" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {BADGE_SUGGESTIONS.filter((b) => b !== form.badge).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => set('badge', b)}
                  className="rounded-full border border-honey/30 px-2.5 py-1 text-[11px] font-medium text-honey transition-colors hover:bg-honey/10"
                >
                  + {b}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-husk">Descripción</span>
            <textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={2} className={inputCls} />
          </label>

          {error && <p className="text-sm text-coral">{error}</p>}
        </div>

        <div className="flex gap-3 border-t border-line p-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-line py-3 text-sm font-medium text-cream transition-colors hover:bg-pane2"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-honey py-3 text-sm font-bold text-ink transition-colors hover:bg-honeysoft"
          >
            {product ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- Gestor de productos ---------- */
function ProductsTab({
  products,
  onNew,
  onEdit,
  onDelete,
  onStock,
  onStockSet,
}: {
  products: StoreProduct[];
  onNew: () => void;
  onEdit: (p: StoreProduct) => void;
  onDelete: (id: string) => void;
  onStock: (id: string, delta: number) => void;
  onStockSet: (id: string, value: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string>('Todas');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== 'Todas' && p.categoria !== cat) return false;
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.subcategoria || '').toLowerCase().includes(q) ||
        (p.badge || '').toLowerCase().includes(q)
      );
    });
  }, [products, query, cat]);

  return (
    <div className="space-y-4">
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos…"
            className="w-full rounded-xl border border-line bg-ink py-2.5 pl-9 pr-4 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
          />
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-husk" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {['Todas', ...STORE_MACROS.map((m) => m.nombre)].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
                cat === c
                  ? 'border-honey bg-honey font-bold text-ink'
                  : 'border-line bg-pane text-husk hover:border-honey/50 hover:text-cream'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
          <Package className="h-10 w-10 text-husk" />
          <p className="font-display text-lg font-bold text-cream">Sin productos</p>
          <button onClick={onNew} className="rounded-xl bg-honey px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-honeysoft">
            + Crear el primero
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const bio = esMaterialBiologico(p);
            const bajo = !bio && p.stock < STOCK_BAJO;
            return (
              <div key={p.id} className="card flex flex-col overflow-hidden">
                <div className="relative">
                  <StoreImage src={p.imageUrl} alt={p.nombre} emoji={catEmoji(p.categoria)} className="aspect-[16/9] w-full" />
                  <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                    {p.badge && (
                      <span className="rounded-full bg-honey px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-ink shadow-lg">
                        {p.badge}
                      </span>
                    )}
                    {bajo && (
                      <span className="rounded-full bg-coral px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow-lg">
                        Stock bajo
                      </span>
                    )}
                    {!p.activo && (
                      <span className="rounded-full bg-ink/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-husk shadow-lg">
                        Oculto
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-3.5">
                  <span className="tick-label mb-1">{p.categoria}{p.subcategoria ? ` · ${p.subcategoria}` : ''}</span>
                  <h3 className="font-display text-sm font-bold leading-snug text-cream">{p.nombre}</h3>
                  <p className="mt-0.5 truncate text-xs text-husk">{p.descripcion || '—'}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-black text-honey">
                      {p.consultarPrecio ? 'Precio por consultar' : formatSoles(p.precio)}
                      <span className="ml-1 font-mono text-[10px] font-normal text-husk">{p.unidad}</span>
                    </span>
                  </div>

                  {bio ? (
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="inline-flex rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold text-amber-300">Por encargo</span>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-line bg-ink/50 px-2 py-1">
                      <span className="text-[11px] text-husk">Stock</span>
                      <QuantityInput
                        value={p.stock}
                        onChange={(next) => onStockSet(p.id, next)}
                        min={0}
                        size="sm"
                        disabled={bio}
                        ariaLabel={`Stock de ${p.nombre}`}
                      />
                    </div>
                  )}

                  <div className="mt-3 flex gap-2 border-t border-line pt-3">
                    <button
                      onClick={() => onEdit(p)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-xs font-semibold text-cream transition-colors hover:border-honey/50 hover:text-honey"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => onDelete(p.id)}
                      aria-label={`Eliminar ${p.nombre}`}
                      className="flex h-9 w-14 items-center justify-center rounded-xl border border-line text-coral transition-colors hover:border-coral/60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Pedidos ---------- */
function OrdersTab({
  orders,
  onStatus,
}: {
  orders: StoreOrder[];
  onStatus: (id: string, estado: OrderEstado) => void;
}) {
  const sorted = useMemo(() => [...orders].sort((a, b) => (a.date < b.date ? 1 : -1)), [orders]);
  const [filtro, setFiltro] = useState<OrderEstado | 'Todas'>('Todas');

  const filtered = filtro === 'Todas' ? sorted : sorted.filter((o) => o.estado === filtro);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {(['Todas', ...ORDER_STATES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFiltro(s)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              filtro === s
                ? 'border-honey bg-honey font-bold text-ink'
                : 'border-line bg-pane text-husk hover:border-honey/50 hover:text-cream'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
          <ShoppingBag className="h-10 w-10 text-husk" />
          <p className="font-display text-lg font-bold text-cream">Sin pedidos</p>
          <p className="max-w-xs text-sm text-husk">Los pedidos hechos desde el carrito de la tienda aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <div key={o.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[10px] tracking-wide text-husk">{fmtDate(o.date)} · #{o.id.slice(-6).toUpperCase()}</p>
                  <p className="mt-1 text-sm font-semibold text-cream">
                    {o.cliente ? `Cliente: ${o.cliente}` : 'Cliente: —'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-black text-honey">{formatSoles(o.total)}</span>
                </div>
              </div>

              <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                {o.lineas.map((l, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-cream">
                      {l.nombre} <span className="text-husk">× {l.cantidad}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-husk">
                      {l.consultarPrecio ? 'Consultar' : formatSoles(l.precio * l.cantidad)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <select
                  value={o.estado}
                  onChange={(e) => onStatus(o.id, e.target.value as OrderEstado)}
                  className={`rounded-xl border bg-transparent px-3 py-2 text-xs font-bold ${estadoStyles[o.estado]}`}
                >
                  {ORDER_STATES.map((s) => (
                    <option key={s} value={s} className="bg-pane text-cream">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Gestión de administradores (Firestore config/admins) ---------- */
function AdminsManager({ onToast }: { onToast: (title: string, desc?: string) => void }) {
  const { user } = useAuth();
  const { emails, ownerEmail, status, error } = useAdminList();
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  const myEmail = (user?.email || '').toLowerCase();
  const actor = user ? { uid: user.uid, email: user.email } : null;

  // Dos niveles de permiso. Solo la cuenta predeterminada (ownerEmail)
  // administra la lista; un admin añadido únicamente accede al panel.
  // OJO: esto es lo que se MUESTRA. El veto real está en firestore.rules.
  const iAmOwner = isAdminOwner(myEmail);
  const owner = (ownerEmail || '').toLowerCase();

  const handleAdd = async () => {
    if (!actor) return;
    if (!iAmOwner) {
      onToast('Sin permiso', 'Solo la cuenta predeterminada puede agregar administradores.');
      return;
    }
    const invalid = validateAdminEmail(newEmail);
    if (invalid) {
      onToast('No se pudo agregar', invalid);
      return;
    }
    setAdding(true);
    try {
      await addAdminEmail(newEmail, actor);
      onToast('Admin agregado', newEmail.trim().toLowerCase());
      setNewEmail('');
    } catch (err) {
      onToast('No se pudo agregar', (err as Error)?.message || String(err));
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (email: string) => {
    if (!actor) return;
    if (!iAmOwner) {
      onToast('Sin permiso', 'Solo la cuenta predeterminada puede quitar administradores.');
      return;
    }
    const target = email.toLowerCase();
    if (target === owner) {
      onToast('No se puede eliminar', 'La cuenta predeterminada no se puede quitar.');
      return;
    }
    if (target === myEmail) {
      onToast('No puedes quitarte', 'Debe quedar al menos un administrador');
      return;
    }
    setBusyEmail(email);
    try {
      await removeAdminEmail(email, actor);
      onToast('Admin quitado', email);
    } catch (err) {
      onToast('No se pudo quitar', (err as Error)?.message || String(err));
    } finally {
      setBusyEmail(null);
    }
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {emails.map((a) => {
          const mail = a.toLowerCase();
          const active = myEmail === mail;
          const isOwner = mail === owner;
          const busy = busyEmail === a;
          // El botón solo aparece en la fila de la cuenta predeterminada
          // (activo + propietario). Antes se mostraba en todas, y por eso la
          // cuenta predeterminada tenía un "-" para borrarse a sí misma.
          const canRemoveThis = iAmOwner && !isOwner;
          return (
            <li
              key={a}
              className="flex items-center justify-between gap-2 rounded-xl border border-line bg-ink/50 px-4 py-2.5"
            >
              <span className="truncate text-sm text-cream">{a}</span>
              <div className="flex shrink-0 items-center gap-2">
                {isOwner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-pane px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-husk">
                    <Crown className="h-3 w-3" /> Predeterminada
                  </span>
                )}
                {active && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-honey/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-honey">
                    <Check className="h-3 w-3" /> Sesión actual
                  </span>
                )}
                {canRemoveThis && (
                  <button
                    onClick={() => void handleRemove(a)}
                    disabled={busy}
                    aria-label={`Quitar a ${a}`}
                    title={`Quitar a ${a}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-coral/30 text-coral transition-colors hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Minus className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {status === 'offline' && (
        <p className="rounded-lg border border-coral/30 bg-coral/10 px-3 py-2 text-xs text-coral">
          Tu cuenta ya no está en la lista de administradores. Los cambios de acceso se aplicaron
          desde otro panel.
        </p>
      )}

      {iAmOwner ? (
        <div className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAdd();
            }}
            placeholder="nuevo@admin.com"
            className="w-full rounded-xl border border-line bg-ink px-4 py-2.5 text-sm text-cream placeholder:text-husk/50 focus:border-honey/70 focus:outline-none"
          />
          <button
            onClick={() => void handleAdd()}
            disabled={adding}
            className="shrink-0 rounded-xl bg-honey px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-honeysoft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? 'Agregando...' : 'Agregar'}
          </button>
        </div>
      ) : (
        <p className="rounded-lg border border-line bg-ink/40 px-3 py-2.5 text-xs text-husk">
          Tienes acceso al panel, pero no a la gestión de administradores: agregar o quitar cuentas
          solo lo puede hacer la cuenta predeterminada.
        </p>
      )}
      {error && status !== 'offline' && (
        <p className="text-xs text-husk">⚠️ {error}</p>
      )}
      <p className="text-xs text-husk/70">
        La lista se guarda en Firestore y se sincroniza en tiempo real con otros paneles abiertos.
      </p>
    </div>
  );
}

/* ---------- Configuración ---------- */
function SettingsTab({
  onToast,
}: {
  onToast: (title: string, desc?: string) => void;
}) {
  const { user } = useAuth();

  const inputCls =
    'w-full rounded-xl border border-line bg-ink px-4 py-2.5 text-sm text-cream placeholder:text-husk/50 focus:border-honey/70';

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="card space-y-4 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-honey" />
          <h2 className="font-display text-base font-bold text-cream">Acceso exclusivo</h2>
        </div>
        <p className="text-sm leading-relaxed text-husk">
          Solo los correos de esta lista pueden gestionar la tienda. Cualquier otra cuenta es
          redirigida a /seleccionar con aviso de acceso denegado (sin cerrarle la sesión).
        </p>
        <AdminsManager onToast={onToast} />
      </div>

      <div className="card space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-honey" />
          <h2 className="font-display text-base font-bold text-cream">Imágenes de productos (Cloudinary)</h2>
        </div>
        <p className="text-sm leading-relaxed text-husk">
          Las imágenes de los productos se suben a Cloudinary con un{' '}
          <strong className="text-cream">unsigned upload preset</strong>, sin API Key ni API Secret en el
          navegador. No hay modo Base64: si Cloudinary falla, la imagen no se guarda.
        </p>
        <dl className="space-y-2 font-mono text-[11px] text-husk">
          <li className="flex flex-wrap gap-1.5">
            <span className="text-cream">●</span> Cloud name → <code className="rounded bg-ink px-1.5 py-0.5 text-honey">{CLOUDINARY_CLOUD_NAME || '(sin configurar)'}</code>
          </li>
          <li className="flex flex-wrap gap-1.5">
            <span className="text-cream">●</span> Imágenes de productos →{' '}
            <code className="rounded bg-ink px-1.5 py-0.5 text-honey">{CLOUDINARY_PRODUCTS_UPLOAD_PRESET || '(sin configurar)'}</code>
          </li>
          <li className="flex flex-wrap gap-1.5">
            <span className="text-cream">●</span> Carpeta de productos → <code className="rounded bg-ink px-1.5 py-0.5 text-honey">{CLOUDINARY_PRODUCTS_FOLDER}</code>
          </li>
        </dl>
        <p className="text-xs text-husk">
          Si falta el cloud name o el preset, revisa las variables{' '}
          <code className="rounded bg-ink px-1 py-0.5 font-mono text-honey">VITE_CLOUDINARY_CLOUD_NAME</code> y{' '}
          <code className="rounded bg-ink px-1 py-0.5 font-mono text-honey">VITE_CLOUDINARY_PRODUCTS_UPLOAD_PRESET</code>{' '}
          en <code className="rounded bg-ink px-1 py-0.5 font-mono text-honey">.env</code>.
        </p>
      </div>

      <div className="card space-y-3 p-5">
        <div className="flex items-center gap-2">
          <StoreIcon className="h-5 w-5 text-honey" />
          <h2 className="font-display text-base font-bold text-cream">Datos & persistencia</h2>
        </div>
        <ul className="space-y-2 font-mono text-[11px] text-husk">
          <li className="flex flex-wrap gap-1.5">
            <span className="text-cream">●</span> Productos → <code className="rounded bg-ink px-1.5 py-0.5 text-honey">panal_v1_admin_products</code>
          </li>
          <li className="flex flex-wrap gap-1.5">
            <span className="text-cream">●</span> Pedidos → <code className="rounded bg-ink px-1.5 py-0.5 text-honey">panal_v1_admin_orders</code>
          </li>
          <li className="flex flex-wrap gap-1.5">
            <span className="text-cream">●</span> Sesión → <code className="rounded bg-ink px-1.5 py-0.5 text-honey">panal_v1_admin_session</code> (expira en 7 días)
          </li>
        </ul>
        <p className="text-xs text-husk">La tienda pública lee este catálogo: los cambios del admin aparecen al instante en /tienda.</p>
      </div>
    </div>
  );
}

/* ============================================================
   Panel principal
   ============================================================ */
export default function AdminStore() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Al entrar en /tienda/admin la vista arranca en su título y filtros, no
  // scrolleada dentro de la tabla de productos. Mismo criterio que Tienda,
  // Catálogo, Pedidos y Cotizaciones.
  useScrollToTopOnMount();

  const [products, setProducts] = useState<StoreProduct[]>(() => {
    // Fuente única de verdad: productsService.getAll(). NUNCA lanza: si algo
    // falla se usa la semilla para que el panel cargue SIN errores.
    try {
      return productsService.getAll();
    } catch (error) {
      console.error('❌ [ADMIN] Error al cargar catálogo, usando semilla:', error);
      return productsService.SEED_PRODUCTS.map((p) => ({ ...p }));
    }
  });
  const [orders, setOrders] = useState<StoreOrder[]>(() => loadAdminOrders() as StoreOrder[]);
  const [tab, setTab] = useState<AdmTab>('productos');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StoreProduct | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastStockToastId = useRef<string | null>(null);

  useScrollLock(formOpen);

  const pushToast = (title: string, desc?: string) => {
    const t: Toast = { id: uid(), title, desc };
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3000);
  };

  // Para el ajuste rápido de stock: reemplaza el toast anterior en vez de
  // apilar y spam de "+1/+1/+1".
  const pushStockToast = (title: string) => {
    setToasts((prev) => {
      const prevId = lastStockToastId.current;
      const rest = prevId ? prev.filter((x) => x.id !== prevId) : prev;
      const t: Toast = { id: uid(), title };
      lastStockToastId.current = t.id;
      setTimeout(() => {
        setToasts((prev2) => prev2.filter((x) => x.id !== t.id));
        if (lastStockToastId.current === t.id) lastStockToastId.current = null;
      }, 1500);
      return [...rest, t];
    });
  };

  // Almacenamiento del catálogo global: cada mutación persiste a través de
  // productsService (fuente única de verdad) que dispara 'products-changed'.
  // Almacenamiento de pedidos global
  useEffect(() => {
    saveAdminOrders(orders);
  }, [orders]);

  // Si productsService tuvo que limpiar imágenes base64 (localStorage lleno o
  // >4MB), avisar al admin para que sepa que se usaron imágenes por defecto.
  useEffect(() => {
    const onQuota = () =>
      pushToast('Imágenes muy pesadas', 'Se usaron imágenes por defecto (caché liberada)');
    window.addEventListener(productsService.PRODUCTS_QUOTA_EVENT, onQuota);
    return () => window.removeEventListener(productsService.PRODUCTS_QUOTA_EVENT, onQuota);
  }, []);

  // Guardia de acceso exclusivo (revalida en cada visita/recarga y en cada
  // cambio de la lista de admins en Firestore):
  //  - Usuario Firebase NO admin → denegar y cerrar su sesión.
  //  - Usuario Firebase admin sin/vigencia caducada → se renueva la sesión.
  //  - Durante la carga inicial de Firestore no se niega (evita cerrar la
  //    sesión a un admin recién agregado antes de que se confirme su acceso).
  //  - Estado 'offline' (permission-denied) → el correo ya no es admin.
  const { emails: adminEmails, status: adminStatus } = useAdminList();
  useEffect(() => {
    if (!user) return;
    if (adminStatus === 'loading') return;
    const myEmail = (user.email || '').toLowerCase();
    const isAdmin = isEmailAdmin(myEmail);
    if (!isAdmin) {
      // Multiusuario: el no-admin nunca entra al panel, se le redirige a
      // /seleccionar con aviso de acceso denegado.
      clearAdminSession();
      navigate('/seleccionar', {
        replace: true,
        state: { accessDenied: 'Solo personal autorizado puede gestionar el panel de la tienda.' },
      });
      return;
    }
    if (!hasValidAdminSession()) setAdminSession(user.email!);
  }, [user, adminEmails, adminStatus, navigate, logout]);

  const stats = useMemo(
    () => ({
      total: products.length,
      pendientes: orders.filter((o) => o.estado === 'Pendiente').length,
      stockBajo: products.filter((p) => !esMaterialBiologico(p) && p.stock < STOCK_BAJO).length,
    }),
    [products, orders]
  );

  // Log de debugging: cuenta de productos, imagen del producto editado y
  // tamaño del catálogo. Advierte con toast si supera 4MB (Base64 pesado).
  const logCatalogSave = (next: StoreProduct[]) => {
    console.log(`💾 Guardando productos: ${next.length}`);
    const sizeMB = productsService.getProductsStorageSizeMB(next);
    console.log(`📊 Tamaño de localStorage: ${sizeMB.toFixed(2)} MB`);
    if (sizeMB > productsService.MAX_STORAGE_MB) {
      pushToast(
        'Advertencia',
        `El catálogo ocupa ${sizeMB.toFixed(2)} MB (>${productsService.MAX_STORAGE_MB}MB). Usa URLs externas o imágenes más pequeñas.`
      );
    }
  };

  const handleSave = (
    data: Omit<StoreProduct, 'id' | 'activo'> & { id?: string; badge?: string },
    isNew: boolean
  ) => {
    let guardado: StoreProduct | null = null;
    try {
      if (isNew) {
        const nuevo: StoreProduct = {
          ...data,
          id: `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          activo: true,
        };
        guardado = productsService.add(nuevo);
      } else if (data.id) {
        guardado = productsService.update(data.id, { ...data } as Partial<StoreProduct>);
      }
    } catch {
      pushToast('Almacenamiento lleno', 'Usa imágenes más pequeñas');
    }

    // El estado SIEMPRE refleja lo que quedó persistido (si la cuota de
    // storage limpió una imagen base64, la tarjeta muestra la versión real,
    // no un fantasma que desaparece al recargar).
    if (guardado) {
      setProducts((prev) =>
        isNew
          ? prev.some((p) => p.id === guardado!.id)
            ? prev.map((p) => (p.id === guardado!.id ? guardado! : p))
            : [...prev, guardado!]
          : prev.map((p) => (p.id === guardado!.id ? guardado! : p))
      );
      logCatalogSave(productsService.getAll());
      pushToast(isNew ? 'Producto guardado' : 'Producto actualizado', guardado.nombre);
    }
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    const target = products.find((p) => p.id === id);
    if (
      target &&
      !window.confirm(`¿Estás seguro de eliminar "${target.nombre}"? Esta acción no se puede deshacer.`)
    ) {
      return;
    }
    try {
      const next = productsService.deleteProduct(id);
      setProducts(next);
      pushToast('Producto eliminado correctamente', target?.nombre || '');
    } catch {
      pushToast('Error al eliminar', 'No se pudo borrar el producto. Inténtalo de nuevo.');
    }
  };

  const handleStock = (id: string, delta: number) => {
    const target = products.find((p) => p.id === id);
    if (!target || esMaterialBiologico(target)) return;
    const updated = { ...target, stock: Math.max(0, target.stock + delta) };
    try {
      productsService.update(id, { stock: updated.stock });
    } catch {
      pushToast('Almacenamiento lleno', 'Usa imágenes más pequeñas');
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    pushStockToast(delta > 0 ? 'Stock +1' : 'Stock −1');
  };

  // Escritura directa del stock desde el control editable (evita guardar si
  // el valor no cambió, para no encadenar toasts ni writes innecesarios).
  const handleStockSet = (id: string, value: number) => {
    const target = products.find((p) => p.id === id);
    if (!target || esMaterialBiologico(target)) return;
    if (target.stock === value) return;
    const updated = { ...target, stock: Math.max(0, value) };
    try {
      productsService.update(id, { stock: updated.stock });
    } catch {
      pushToast('Almacenamiento lleno', 'Usa imágenes más pequeñas');
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  // Sistema de debugging temporal (solo en desarrollo)
  const handleDebug = () => {
    const list = productsService.getAll();
    const total = list.length;
    const sizeMB = productsService.getProductsStorageSizeMB(list);
    const withImg = list.filter((p) => (p.imageUrl || '').trim().length > 0).length;
    const withoutImg = total - withImg;
    console.log('🐞 [DEBUG] Breakdown completo:', {
      total,
      sizeMB: Number(sizeMB.toFixed(2)),
      withImg,
      withoutImg,
    });
    list.forEach((p) =>
      console.log(
        `🐞 [DEBUG] ${p.nombre} (${p.id}):`,
        (p.imageUrl || '').trim() ? `✅ ${p.imageUrl.substring(0, 50)}…` : '❌ Sin imagen'
      )
    );
    const nicot = list.find((p) => p.nombre.toLowerCase().includes('nicot'));
    if (nicot) console.log('🐞 [DEBUG] Producto específico "Jaula Nicot":', nicot);
    alert(`Productos: ${total} — Tamaño: ${sizeMB.toFixed(2)} MB — Con imagen: ${withImg} — Sin imagen: ${withoutImg}`);
  };

  // Botón de reseteo del catálogo a los 22 productos semilla
  const handleReset = () => {
    if (!window.confirm('¿Resetear todos los productos a la versión semilla? Se perderán tus cambios.')) return;
    try {
      const seeded = productsService.reset();
      setProducts(seeded);
      pushToast('Catálogo reseteado', `${seeded.length} productos semilla`);
    } catch {
      pushToast('Almacenamiento lleno', 'Usa imágenes más pequeñas');
    }
  };

  const handleStatus = (id: string, estado: OrderEstado) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, estado } : o)));
    pushToast('Pedido actualizado', estado);
  };

  return (
    <div className="relative min-h-screen bg-[#1A140D]">
      <FondoVivo />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-28">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <Logo variant="compact" className="h-10 w-10 flex-shrink-0 sm:h-12 sm:w-12" />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold text-cream sm:text-xl">
                Panel de administración
              </p>
              <p className="tick-label mt-0.5">TIENDA · APIARIOS CARRIÓN</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {IS_DEV && (
              <button
                onClick={handleDebug}
                title="Sistema de debugging (solo desarrollo)"
                className="flex h-11 items-center gap-1.5 rounded-xl border border-dashed border-coral/60 px-3 text-xs font-black tracking-wide text-coral transition-colors hover:border-coral hover:bg-coral/10"
              >
                🐞 DEBUG
              </button>
            )}
            {IS_DEV && (
              <button
                onClick={handleReset}
                title="Resetear productos a semilla (solo desarrollo)"
                className="flex h-11 items-center rounded-xl border border-line px-3 text-xs font-semibold text-husk transition-colors hover:border-coral/60 hover:text-coral"
              >
                Reset
              </button>
            )}
            <button
              onClick={() => navigate('/tienda', { state: { tab: 'tienda' } })}
              title="Volver a la tienda"
              className="flex h-11 items-center gap-2 rounded-xl bg-honey px-4 text-sm font-semibold text-ink shadow-[0_4px_20px_rgba(240,164,28,.3)] transition-colors hover:bg-honeysoft"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Volver a tienda</span>
            </button>
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Avatar"
                className="h-10 w-10 rounded-full border-2 border-honey/50 object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-honey/50 bg-honey/15 font-display text-base font-black text-honey">
                {(user?.email || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden max-w-[220px] lg:block">
              <p className="truncate text-sm font-semibold text-cream">{user?.email}</p>
              <p className="text-[10px] uppercase tracking-widest text-honey">Administrador</p>
            </div>
          </div>
        </header>

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: 'Productos', value: stats.total, icon: Package, color: 'text-honey' },
            { label: 'Pedidos pendientes', value: stats.pendientes, icon: ShoppingBag, color: 'text-amber-300' },
            { label: 'Stock bajo (<3)', value: stats.stockBajo, icon: AlertTriangle, color: 'text-coral' },
          ].map((s) => (
            <div key={s.label} className="card p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <s.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${s.color}`} />
                <span className={`font-display text-2xl sm:text-3xl font-black ${s.color}`}>{s.value}</span>
              </div>
              <p className="mt-1.5 text-[10px] uppercase tracking-widest text-husk sm:text-[11px]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto scrollbar-hide border-b border-line pb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-t-xl border-x border-t px-4 py-2.5 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'border-honey/40 bg-pane text-honey'
                  : 'border-transparent text-husk hover:text-cream'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.id === 'productos' && (
                <span className="rounded-full bg-honey/15 px-2 py-0.5 text-[10px] font-black text-honey">{stats.total}</span>
              )}
            </button>
          ))}
        </div>

        {/* Contenido de la pestaña */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="pt-5"
          >
            {tab === 'productos' && (
              <ProductsTab
                products={products}
                onNew={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                onEdit={(p) => {
                  setEditing(p);
                  setFormOpen(true);
                }}
                onDelete={handleDelete}
                onStock={handleStock}
                onStockSet={handleStockSet}
              />
            )}
            {tab === 'pedidos' && <OrdersTab orders={orders} onStatus={handleStatus} />}
            {tab === 'ajustes' && <SettingsTab onToast={pushToast} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Botón flotante "+ Nuevo producto" */}
      {tab === 'productos' && (
        <motion.button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Nuevo producto"
          className="fixed bottom-6 right-5 z-40 flex items-center gap-2 rounded-full bg-honey px-5 py-3.5 text-sm font-bold text-ink shadow-[0_10px_30px_rgba(0,0,0,.5)] transition-colors hover:bg-honeysoft"
        >
          <PackagePlus className="h-5 w-5" />
          <span className="hidden sm:inline">Nuevo producto</span>
        </motion.button>
      )}

      {/* Modal de producto */}
      <AnimatePresence>
        {formOpen && (
          <ProductFormModal
            product={editing}
            onClose={() => {
              setFormOpen(false);
              setEditing(null);
            }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      <AdmToasts toasts={toasts} />
    </div>
  );
}