import { useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uid } from "../data";
import {
  SectionHead,
  IconPackage,
  IconPlus,
  IconEdit,
  IconTrash,
  IconX,
  IconSearch,
  IconAlert,
} from "../ui";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_PRESETS,
  INVENTORY_UNITS,
  allowsDecimals,
  formatInventoryQuantity,
  inventoryDisponible,
  inventoryLevelColor,
  isStockBajo,
  type InventoryCategory,
  type InventoryItem,
  type InventoryMovement,
  type InventoryMovementType,
} from "../types/inventory";
import { useScrollLock } from "../hooks/useScrollLock";
import { backdropVariants, modalVariants } from "../lib/motion";

interface Props {
  items: InventoryItem[];
  onChange: (items: InventoryItem[]) => void;
  onShowToast: (title: string, desc?: string) => void;
}

const CATEGORY_ORDER: (InventoryCategory | 'todas')[] = ['todas', ...INVENTORY_CATEGORIES];

const MOVEMENT_LABEL: Record<InventoryMovementType, string> = {
  entrada: 'Entrada (compra)',
  salida: 'Salida (uso)',
  transferencia: 'Transferencia',
};

const MOVEMENT_COLOR: Record<InventoryMovementType, string> = {
  entrada: '#93cc68',
  salida: '#ffa90a',
  transferencia: '#c987c3',
};

const INPUT_CLS =
  'w-full rounded-xl border border-line bg-ink/60 px-4 py-3 text-sm text-cream placeholder:text-husk/60 transition-colors focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(255,169,10,.12)]';

type FormDraft = {
  nombre: string;
  categoria: InventoryCategory;
  cantidadTotal: string;
  cantidadEnUso: string;
  unidad: string;
  umbralAlerta: string;
  proveedor: string;
  fechaVencimiento: string;
  notas: string;
};

const emptyDraft = (categoria: InventoryCategory = 'material'): FormDraft => ({
  nombre: '',
  categoria,
  cantidadTotal: '0',
  cantidadEnUso: '0',
  unidad: 'unidades',
  umbralAlerta: '10',
  proveedor: '',
  fechaVencimiento: '',
  notas: '',
});

export default function InventorySection({ items, onChange, onShowToast }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | 'todas'>('todas');
  const [query, setQuery] = useState('');
  const [soloBajo, setSoloBajo] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [draft, setDraft] = useState<FormDraft>(emptyDraft());

  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);

  const lowStockCount = useMemo(() => items.filter(isStockBajo).length, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== 'todas' && item.categoria !== categoryFilter) return false;
      if (soloBajo && !isStockBajo(item)) return false;
      if (q && !item.nombre.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, categoryFilter, query, soloBajo]);

  const grouped = useMemo(() => {
    const map = new Map<InventoryCategory, InventoryItem[]>();
    for (const cat of INVENTORY_CATEGORIES) map.set(cat, []);
    for (const item of filtered) map.get(item.categoria)?.push(item);
    return INVENTORY_CATEGORIES.filter((cat) => (map.get(cat)?.length ?? 0) > 0).map((cat) => ({
      cat,
      list: map.get(cat)!,
    }));
  }, [filtered]);

  const openNew = () => {
    setEditingItem(null);
    setDraft(emptyDraft(categoryFilter === 'todas' ? 'material' : categoryFilter));
    setShowForm(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setDraft({
      nombre: item.nombre,
      categoria: item.categoria,
      cantidadTotal: String(item.cantidadTotal),
      cantidadEnUso: String(item.cantidadEnUso),
      unidad: item.unidad,
      umbralAlerta: String(item.umbralAlerta),
      proveedor: item.proveedor || '',
      fechaVencimiento: item.fechaVencimiento || '',
      notas: item.notas || '',
    });
    setDetailItem(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const applyPreset = (nombre: string, unidad?: string) => {
    setDraft((d) => ({ ...d, nombre, unidad: unidad || d.unidad }));
  };

  const submitForm = (e: FormEvent) => {
    e.preventDefault();
    const nombre = draft.nombre.trim();
    if (!nombre) return;
    const cantidadTotal = Math.max(0, Number(draft.cantidadTotal) || 0);
    const cantidadEnUso = Math.min(cantidadTotal, Math.max(0, Number(draft.cantidadEnUso) || 0));
    const umbralAlerta = Math.max(0, Number(draft.umbralAlerta) || 0);

    if (editingItem) {
      const updated: InventoryItem = {
        ...editingItem,
        nombre,
        categoria: draft.categoria,
        cantidadTotal,
        cantidadEnUso,
        unidad: draft.unidad,
        umbralAlerta,
        proveedor: draft.proveedor.trim() || undefined,
        fechaVencimiento: draft.fechaVencimiento || undefined,
        notas: draft.notas.trim() || undefined,
      };
      onChange(items.map((i) => (i.id === editingItem.id ? updated : i)));
      onShowToast('Ítem actualizado', nombre);
    } else {
      const nuevo: InventoryItem = {
        id: uid(),
        nombre,
        categoria: draft.categoria,
        cantidadTotal,
        cantidadEnUso,
        unidad: draft.unidad,
        umbralAlerta,
        proveedor: draft.proveedor.trim() || undefined,
        fechaVencimiento: draft.fechaVencimiento || undefined,
        notas: draft.notas.trim() || undefined,
        movimientos: [],
      };
      onChange([nuevo, ...items]);
      onShowToast('Ítem agregado', nombre);
    }
    closeForm();
  };

  const deleteItem = (item: InventoryItem) => {
    if (!window.confirm(`¿Eliminar "${item.nombre}" del inventario?`)) return;
    onChange(items.filter((i) => i.id !== item.id));
    setDetailItem(null);
    onShowToast('Ítem eliminado', item.nombre);
  };

  const submitMovement = (
    e: FormEvent,
    form: { tipo: InventoryMovementType; cantidad: string; fecha: string; nota: string; proveedor: string }
  ) => {
    e.preventDefault();
    if (!movementItem) return;
    const cantidad = Number(form.cantidad) || 0;
    if (cantidad <= 0) {
      onShowToast('Cantidad inválida', 'La cantidad debe ser mayor a 0');
      return;
    }
    const disp = inventoryDisponible(movementItem);
    if ((form.tipo === 'salida' || form.tipo === 'transferencia') && cantidad > disp) {
      onShowToast('Stock insuficiente', `Solo hay ${formatInventoryQuantity(disp, movementItem.unidad)} ${movementItem.unidad} disponibles`);
      return;
    }

    const movimiento: InventoryMovement = {
      id: uid(),
      fecha: form.fecha ? new Date(form.fecha).toISOString() : new Date().toISOString(),
      tipo: form.tipo,
      cantidad,
      nota: form.nota.trim() || undefined,
      proveedor: form.tipo === 'entrada' && form.proveedor.trim() ? form.proveedor.trim() : undefined,
    };

    const updated: InventoryItem = {
      ...movementItem,
      cantidadTotal:
        form.tipo === 'entrada'
          ? movementItem.cantidadTotal + cantidad
          : form.tipo === 'transferencia'
          ? movementItem.cantidadTotal - cantidad
          : movementItem.cantidadTotal,
      cantidadEnUso: form.tipo === 'salida' ? movementItem.cantidadEnUso + cantidad : movementItem.cantidadEnUso,
      movimientos: [movimiento, ...movementItem.movimientos],
    };

    onChange(items.map((i) => (i.id === movementItem.id ? updated : i)));
    setMovementItem(null);
    onShowToast('Movimiento registrado', `${MOVEMENT_LABEL[form.tipo]} · ${cantidad}`);
  };

  const deleteMovement = (item: InventoryItem, mov: InventoryMovement) => {
    let total = item.cantidadTotal;
    let enUso = item.cantidadEnUso;
    if (mov.tipo === 'entrada') total = Math.max(0, total - mov.cantidad);
    if (mov.tipo === 'salida') enUso = Math.max(0, enUso - mov.cantidad);
    if (mov.tipo === 'transferencia') total = total + mov.cantidad;
    if (total - enUso < 0) {
      onShowToast('No se puede eliminar', 'El saldo resultante sería negativo');
      return;
    }
    const updated: InventoryItem = {
      ...item,
      cantidadTotal: total,
      cantidadEnUso: enUso,
      movimientos: item.movimientos.filter((m) => m.id !== mov.id),
    };
    onChange(items.map((i) => (i.id === item.id ? updated : i)));
    onShowToast('Movimiento eliminado');
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      <SectionHead
        kicker="Material, herramientas e insumos"
        title="Inventario"
        right={
          <p className="text-right font-mono text-xs leading-relaxed text-husk">
            {items.length} ítems · {lowStockCount} con stock bajo
          </p>
        }
      />

      {/* Filtros */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_ORDER.map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-honey text-ink'
                    : 'bg-ink/50 border border-line text-husk hover:text-cream hover:border-honey/50'
                }`}
              >
                {cat === 'todas' ? 'Todas' : INVENTORY_CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-husk" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre…"
              className="w-full rounded-xl border border-line bg-ink/50 py-3 pl-10 pr-4 text-sm text-cream placeholder:text-husk/60 transition-colors focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(255,169,10,.12)]"
            />
          </div>
          <button
            onClick={() => setSoloBajo((v) => !v)}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              soloBajo
                ? 'bg-coral/20 text-coral border border-coral/40'
                : 'bg-ink/50 text-husk border border-line hover:text-cream hover:border-honey/50'
            }`}
          >
            <IconAlert className="h-4 w-4" />
            Solo stock bajo
          </button>
        </div>
      </div>

      {/* Lista agrupada por categoría */}
      {grouped.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pane2 text-honey">
            <IconPackage className="h-8 w-8" />
          </div>
          <p className="text-husk">No hay ítems que coincidan con la búsqueda</p>
          <p className="mt-1 text-xs text-husk/70">
            {items.length === 0
              ? 'Agrega tu primer ítem de inventario con el botón +'
              : 'Ajusta los filtros o la búsqueda'}
          </p>
        </div>
      ) : (
        grouped.map(({ cat, list }) => (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-3">
              <p className="tick-label">{INVENTORY_CATEGORY_LABELS[cat]}</p>
              <div className="h-px flex-1 bg-line" />
              <p className="font-mono text-[10px] text-husk">{list.length}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {list.map((item) => {
                const disp = inventoryDisponible(item);
                const bajo = isStockBajo(item);
                const color = inventoryLevelColor(item);
                const ratio = item.cantidadTotal > 0 ? Math.min(1, Math.max(0, disp / item.cantidadTotal)) : 0;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => setDetailItem(item)}
                    className={`card p-4 text-left transition-all hover:border-honey/50 ${bajo ? 'border-coral/40' : ''}`}
                    whileHover={{ y: -3 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold ${bajo ? 'text-coral' : 'text-cream'}`}>
                          {item.nombre}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-husk">{item.unidad}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-display text-lg font-black leading-none" style={{ color: bajo ? '#f4552b' : '#ffa90a' }}>
                          {formatInventoryQuantity(disp, item.unidad)} <span className="font-mono text-[10px] font-medium text-husk">{item.unidad}</span>
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-husk">/ {formatInventoryQuantity(item.cantidadTotal, item.unidad)}</p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${ratio * 100}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {bajo && (
                        <span className="rounded-full bg-coral/15 px-2 py-0.5 text-[10px] font-semibold text-coral">
                          Stock bajo
                        </span>
                      )}
                      {item.proveedor && (
                        <span className="rounded-full bg-pane3 px-2 py-0.5 font-mono text-[10px] text-husk">
                          {item.proveedor}
                        </span>
                      )}
                      {item.fechaVencimiento && (
                        <span className="rounded-full bg-pane3 px-2 py-0.5 font-mono text-[10px] text-husk">
                          Vence: {formatDate(item.fechaVencimiento)}
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Botón flotante "+" */}
      <motion.button
        onClick={openNew}
        className="fixed right-5 bottom-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-honey text-ink shadow-[0_10px_30px_rgba(255,169,10,.45)] transition-all hover:bg-honeysoft active:scale-95 lg:bottom-5"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        aria-label="Agregar ítem"
        title="Agregar ítem"
      >
        <IconPlus className="h-6 w-6" />
      </motion.button>

      {/* ---------- Modal: nuevo / editar ítem ---------- */}
      <AnimatePresence>
        {showForm && (
          <ModalShell onClose={closeForm} title={editingItem ? 'Editar ítem' : 'Nuevo ítem'}>
            <form onSubmit={submitForm} className="space-y-4">
              <Field label="Nombre">
                <input
                  value={draft.nombre}
                  onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))}
                  placeholder="Ej: Cuadros con cera"
                  className={INPUT_CLS}
                  autoFocus
                />
              </Field>

              {!editingItem && (
                <div>
                  <p className="tick-label mb-2">Presets de {INVENTORY_CATEGORY_LABELS[draft.categoria]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {INVENTORY_PRESETS[draft.categoria].map((p) => (
                      <button
                        type="button"
                        key={p.nombre}
                        onClick={() => applyPreset(p.nombre, p.unidad)}
                        className="rounded-full border border-line bg-ink/50 px-2.5 py-1 text-[11px] font-medium text-husk transition-colors hover:border-honey/60 hover:text-honey"
                      >
                        {p.label ?? p.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Field label="Categoría">
                <select
                  value={draft.categoria}
                  onChange={(e) => setDraft((d) => ({ ...d, categoria: e.target.value as InventoryCategory }))}
                  className={INPUT_CLS}
                >
                  {INVENTORY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {INVENTORY_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Cantidad total">
                  <input
                    type="number"
                    min={0}
                    step={allowsDecimals(draft.unidad) ? '0.01' : '1'}
                    inputMode={allowsDecimals(draft.unidad) ? 'decimal' : 'numeric'}
                    value={draft.cantidadTotal}
                    onChange={(e) => setDraft((d) => ({ ...d, cantidadTotal: e.target.value }))}
                    className={INPUT_CLS}
                  />
                </Field>
                <Field label="Cantidad en uso">
                  <input
                    type="number"
                    min={0}
                    step={allowsDecimals(draft.unidad) ? '0.01' : '1'}
                    inputMode={allowsDecimals(draft.unidad) ? 'decimal' : 'numeric'}
                    value={draft.cantidadEnUso}
                    onChange={(e) => setDraft((d) => ({ ...d, cantidadEnUso: e.target.value }))}
                    className={INPUT_CLS}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Unidad">
                  <select
                    value={draft.unidad}
                    onChange={(e) => setDraft((d) => ({ ...d, unidad: e.target.value }))}
                    className={INPUT_CLS}
                  >
                    {INVENTORY_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Umbral de alerta">
                  <input
                    type="number"
                    min={0}
                    step={allowsDecimals(draft.unidad) ? '0.01' : '1'}
                    inputMode={allowsDecimals(draft.unidad) ? 'decimal' : 'numeric'}
                    value={draft.umbralAlerta}
                    onChange={(e) => setDraft((d) => ({ ...d, umbralAlerta: e.target.value }))}
                    className={INPUT_CLS}
                  />
                </Field>
              </div>

              <Field label="Proveedor">
                <input
                  value={draft.proveedor}
                  onChange={(e) => setDraft((d) => ({ ...d, proveedor: e.target.value }))}
                  placeholder="Opcional"
                  className={INPUT_CLS}
                />
              </Field>

              <Field label="Fecha de vencimiento">
                <input
                  type="date"
                  value={draft.fechaVencimiento}
                  onChange={(e) => setDraft((d) => ({ ...d, fechaVencimiento: e.target.value }))}
                  className={INPUT_CLS}
                />
              </Field>

              <Field label="Notas">
                <textarea
                  value={draft.notas}
                  onChange={(e) => setDraft((d) => ({ ...d, notas: e.target.value }))}
                  rows={2}
                  placeholder="Opcional"
                  className={`${INPUT_CLS} resize-none`}
                />
              </Field>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 rounded-xl border border-line py-3 text-sm font-medium text-husk transition-colors hover:bg-pane2 hover:text-cream"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-honey py-3 text-sm font-semibold text-ink transition-colors hover:bg-honeysoft"
                >
                  {editingItem ? 'Guardar cambios' : 'Agregar ítem'}
                </button>
              </div>
            </form>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ---------- Modal: detalle del ítem ---------- */}
      <AnimatePresence>
        {detailItem && (
          <DetailView
            item={detailItem}
            onEdit={openEdit}
            onDelete={deleteItem}
            onDeleteMovement={(mov) => deleteMovement(detailItem, mov)}
            onRegisterMovement={() => setMovementItem(detailItem)}
            onClose={() => setDetailItem(null)}
            formatDate={formatDate}
          />
        )}
      </AnimatePresence>

      {/* ---------- Modal: registrar movimiento ---------- */}
      <AnimatePresence>
        {movementItem && (
          <MovementModal
            item={movementItem}
            onSubmit={submitMovement}
            onClose={() => setMovementItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Shell de modal reutilizable ---------- */

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useScrollLock(true);
  return (
    <>
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm touch-none"
        onClick={onClose}
      />
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-6 touch-none"
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="card flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden touch-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5 sm:px-7">
            <div>
              <p className="tick-label mb-1">Inventario</p>
              <h3 className="font-display text-2xl font-bold text-cream">{title}</h3>
            </div>
            <motion.button
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-husk transition-colors hover:text-cream"
              whileHover={{ rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Cerrar"
              title="Cerrar (Esc)"
            >
              <IconX className="h-5 w-5" />
            </motion.button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 sm:p-7">{children}</div>
        </motion.div>
      </motion.div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-husk">{label}</span>
      {children}
    </label>
  );
}

/* ---------- Modal: detalle del ítem ---------- */

function DetailView({
  item,
  onEdit,
  onDelete,
  onDeleteMovement,
  onRegisterMovement,
  onClose,
  formatDate,
}: {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onDeleteMovement: (mov: InventoryMovement) => void;
  onRegisterMovement: () => void;
  onClose: () => void;
  formatDate: (iso: string) => string;
}) {
  const disp = inventoryDisponible(item);
  const bajo = isStockBajo(item);
  const color = inventoryLevelColor(item);
  const ratio = item.cantidadTotal > 0 ? Math.min(1, Math.max(0, disp / item.cantidadTotal)) : 0;

  return (
    <ModalShell onClose={onClose} title={item.nombre}>
      <div className="space-y-5">
        {/* Resumen */}
        <div className="rounded-xl border border-line bg-ink/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-husk">{item.unidad}</p>
              <p className="mt-0.5 text-husk">
                <span className="font-display text-3xl font-black" style={{ color: bajo ? '#f4552b' : '#ffa90a' }}>
                  {formatInventoryQuantity(disp, item.unidad)}
                </span>
                {' '}{item.unidad} disponibles
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs text-husk">Total: {formatInventoryQuantity(item.cantidadTotal, item.unidad)} {item.unidad}</p>
              <p className="font-mono text-xs text-husk">En uso: {formatInventoryQuantity(item.cantidadEnUso, item.unidad)} {item.unidad}</p>
              <p className="font-mono text-xs text-husk">Umbral: {formatInventoryQuantity(item.umbralAlerta, item.unidad)} {item.unidad}</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${ratio * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-2 text-xs text-husk">
            Categoría: <b className="text-cream">{INVENTORY_CATEGORY_LABELS[item.categoria]}</b>
            {item.proveedor && <> · Proveedor: <b className="text-cream">{item.proveedor}</b></>}
            {item.fechaVencimiento && <> · Vence: <b className="text-cream">{formatDate(item.fechaVencimiento)}</b></>}
          </p>
          {item.notas && <p className="mt-2 text-xs text-husk">📝 {item.notas}</p>}
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onRegisterMovement}
            className="col-span-3 rounded-xl bg-honey py-3 text-sm font-semibold text-ink transition-colors hover:bg-honeysoft"
          >
            Registrar movimiento
          </button>
          <button
            onClick={() => onEdit(item)}
            className="flex items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-medium text-husk transition-colors hover:bg-pane2 hover:text-cream"
          >
            <IconEdit className="h-4 w-4" /> Editar
          </button>
          <button
            onClick={() => onDelete(item)}
            className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-coral/40 py-2.5 text-sm font-medium text-coral transition-colors hover:bg-coral/10"
          >
            <IconTrash className="h-4 w-4" /> Eliminar
          </button>
        </div>

        {/* Historial de movimientos */}
        <div>
          <p className="tick-label mb-3">Historial de movimientos</p>
          {item.movimientos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line py-6 text-center text-xs text-husk">
              Aún no hay movimientos registrados
            </p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {item.movimientos.map((m) => (
                <li key={m.id} className="rounded-xl border border-line bg-ink/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: `${MOVEMENT_COLOR[m.tipo]}1c`, color: MOVEMENT_COLOR[m.tipo] }}
                    >
                      {MOVEMENT_LABEL[m.tipo]}
                    </span>
                    <span className="font-mono text-xs text-cream">
                      +{m.cantidad} {item.unidad}
                    </span>
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-husk">
                    {formatDate(m.fecha)}
                  </p>
                  {(m.nota || m.proveedor) && (
                    <p className="mt-1 text-xs text-husk">
                      {m.nota}
                      {m.proveedor && (m.nota ? ' · ' : '') + `Proveedor: ${m.proveedor}`}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm('¿Eliminar este movimiento y revertir su efecto?')) {
                        onDeleteMovement(m);
                      }
                    }}
                    className="mt-1.5 text-[10px] font-medium text-husk underline-offset-2 hover:text-coral hover:underline"
                  >
                    Eliminar movimiento
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------- Modal: registro de movimiento ---------- */

function MovementModal({
  item,
  onSubmit,
  onClose,
}: {
  item: InventoryItem;
  onSubmit: (
    e: FormEvent,
    form: { tipo: InventoryMovementType; cantidad: string; fecha: string; nota: string; proveedor: string }
  ) => void;
  onClose: () => void;
}) {
  const [tipo, setTipo] = useState<InventoryMovementType>('entrada');
  const [cantidad, setCantidad] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [nota, setNota] = useState('');
  const [proveedor, setProveedor] = useState('');
  const disp = inventoryDisponible(item);

  return (
    <ModalShell onClose={onClose} title="Registrar movimiento">
      <form
        onSubmit={(e) => onSubmit(e, { tipo, cantidad, fecha, nota, proveedor })}
        className="space-y-4"
      >
        <div className="rounded-xl border border-line bg-ink/40 px-4 py-3">
          <p className="text-sm font-semibold text-cream">{item.nombre}</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-husk">
            {formatInventoryQuantity(disp, item.unidad)} disponibles de {formatInventoryQuantity(item.cantidadTotal, item.unidad)} {item.unidad}
          </p>
        </div>

        <Field label="Tipo de movimiento">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as InventoryMovementType)} className={INPUT_CLS}>
            <option value="entrada">Entrada (compra)</option>
            <option value="salida">Salida (uso)</option>
            <option value="transferencia">Transferencia (entre apiarios)</option>
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cantidad">
            <input
              type="number"
              min={0}
              step={allowsDecimals(item.unidad) ? '0.01' : '1'}
              inputMode={allowsDecimals(item.unidad) ? 'decimal' : 'numeric'}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="0"
              className={INPUT_CLS}
              autoFocus
            />
          </Field>
          <Field label="Fecha">
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT_CLS} />
          </Field>
        </div>

        {tipo === 'entrada' && (
          <Field label="Proveedor">
            <input
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              placeholder="Opcional"
              className={INPUT_CLS}
            />
          </Field>
        )}

        <Field label="Nota">
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Opcional"
            className={INPUT_CLS}
          />
        </Field>

        {tipo === 'entrada' && (
          <p className="text-xs text-husk">↗️ Aumenta la cantidad total del ítem.</p>
        )}
        {tipo === 'salida' && (
          <p className="text-xs text-husk">➡️ Aumenta la cantidad en uso; baja el stock disponible.</p>
        )}
        {tipo === 'transferencia' && (
          <p className="text-xs text-husk">🔄 Resta de la cantidad total (se envía a otro apiario).</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-line py-3 text-sm font-medium text-husk transition-colors hover:bg-pane2 hover:text-cream"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-honey py-3 text-sm font-semibold text-ink transition-colors hover:bg-honeysoft"
          >
            Guardar movimiento
          </button>
        </div>
      </form>
    </ModalShell>
  );
}