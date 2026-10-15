import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { uid, type Toast } from '../data';
import {
  EASE,
  backdropVariants,
  modalVariants,
  drawerVariants,
  toastVariants,
  tIn,
  tOut,
} from '../lib/motion';
import { useScrollLock } from '../hooks/useScrollLock';
import AnimatedTabs from './AnimatedTabs';
import { useScrollToTopOnMount } from '../hooks/useScrollToTopOnMount';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import StoreImage from './StoreImage';
import { normalizeProductImageUrl } from '../lib/cloudinary';
import Logo from './Logo';
import QuantityInput from './QuantityInput';
import { HeroAmbient, HoneyDrips } from './StoreFx';
import LivingHive from './LivingHive';
import { IconPlus } from '../ui';
import {
  STORE_MACROS,
  catEmoji,
  esMaterialBiologico,
  esPrecioConsultar,
  formatSoles,
  mergeStoreSeeds,
  normalizeStoreProduct,
  POR_ENCARGO_NOTA,
  precioTexto,
  sortProducts,
  subcategoriasDe,
  type CartItem,
  type CartLine,
  type OrderLine,
  type StoreCategory,
  type StoreOrder,
  type StoreProduct,
  type Subcategoria,
} from '../types/store';
import { STORE_SEED_PRODUCTS } from '../utils/storeSeed';
import {
  loadStoreCart,
  saveStoreCart,
  loadStoreSeedVersion,
  saveStoreSeedVersion,
  loadAdminOrders,
  saveAdminOrders,
  PRODUCTS_UPDATED_EVENT,
  saveLastView,
  LAST_VIEW_STORE,
} from '../utils/storage';
import { saveTiendaUltimaVista, loadTiendaUltimaVista, saveUltimaVista } from '../utils/lastView';
import * as productsService from '../lib/productsService';
import { isEmailAdmin } from '../lib/adminAccess';
import { CONTACT_EMAIL, WHATSAPP_NUMBER, WHATSAPP_LABEL } from '../config';
import { sanitizeText, sanitizeUrl } from '../utils/sanitize';
import StoreFooter from './StoreFooter';
import {
  CifrasApiario,
  SabiasQue,
  Testimonios,
  Garantias,
  PreguntasFrecuentes,
} from './store/StoreExtras';
import PagoYapeModal from './PagoYapeModal';

/* Versión del catálogo semilla (3 macro-categorías + material biológico).
   Solo se mezclan las semillas nuevas la primera vez por usuario. */
const SEED_VERSION_V4 = 'v4-naturales-5';
const SEED_VERSION = 'v5-herramientas-13';
const SEED_VERSION_V7 = 'v7-bio-4';

// Orden de las migraciones aplicadas: '' (sin migrar) → v4 → v5 → v7.
const seedVersionIndex = (v: string): number =>
  v === SEED_VERSION_V7 ? 3 : v === SEED_VERSION ? 2 : v === SEED_VERSION_V4 ? 1 : 0;

/* Migración v4 — "Productos naturales" queda con los 5 productos exactos
   (Miel multifloral, Miel en panal, Polen, Propóleo, Jalea real). Elimina los
   antiguos de la semilla y cualquier producto natural fuera de estos 5, y deja
   los nuevos con ids propios. Los items del carrito que apunten a productos
   eliminados se descartan. Se aplica una sola vez por usuario (flag seedVersion). */
const NATURAL_MACRO = 'Productos naturales' as StoreCategory;

const migrateNaturalesV4 = (list: StoreProduct[], userId: string): StoreProduct[] => {
  if (seedVersionIndex(loadStoreSeedVersion(userId)) >= 1) return list;
  const nuevosNaturales = new Set(
    STORE_SEED_PRODUCTS.filter((p) => p.categoria === NATURAL_MACRO).map((p) => p.id)
  );
  const sinAntiguos = list.filter((p) => p.categoria !== NATURAL_MACRO || nuevosNaturales.has(p.id));
  return mergeStoreSeeds(sinAntiguos, STORE_SEED_PRODUCTS);
};

/* Migración v5 — "Herramientas para apicultura" queda con los 13 productos
   exactos (9 Herramientas + 4 Equipos, sin libros semilla): elimina los
   antiguos de la semilla, crea los nuevos con ids propios y rellena los que
   falten. Los items del carrito que apunten a productos eliminados se
   descartan al cargar (ver init de cart). Se aplica una sola vez por usuario. */
const HERRAMIENTAS_MACRO = 'Herramientas para apicultura' as StoreCategory;

const migrateHerramientasV5 = (list: StoreProduct[], userId: string): StoreProduct[] => {
  if (seedVersionIndex(loadStoreSeedVersion(userId)) >= 2) return list;
  const nuevos = new Set(
    STORE_SEED_PRODUCTS.filter((p) => p.categoria === HERRAMIENTAS_MACRO).map((p) => p.id)
  );
  const sinAntiguos = list.filter((p) => p.categoria !== HERRAMIENTAS_MACRO || nuevos.has(p.id));
  return mergeStoreSeeds(sinAntiguos, STORE_SEED_PRODUCTS);
};

/* Migración v7 — "Material biológico" queda con los 4 productos exactos
   (Reina fecundada 2026, Cámara de cría, Núcleo 5 bastidores, Núcleo 4
   bastidores). Elimina los antiguos de la semilla (Reina virgen, Celda real,
   Núcleo 4/5 cuadros y cualquier "Colmena completa" legada) y deja los nuevos
   con ids propios y sus imágenes reales. Los items del carrito que apunten a
   productos eliminados se descartan al cargar (ver init de cart). Se aplica
   una sola vez por usuario. */
const BIO_MACRO = 'Material biológico' as StoreCategory;

const migrateBioV7 = (list: StoreProduct[], userId: string): StoreProduct[] => {
  if (seedVersionIndex(loadStoreSeedVersion(userId)) >= 3) return list;
  const nuevos = new Set(
    STORE_SEED_PRODUCTS.filter((p) => p.categoria === BIO_MACRO).map((p) => p.id)
  );
  const sinAntiguos = list.filter((p) => p.categoria !== BIO_MACRO || nuevos.has(p.id));
  return mergeStoreSeeds(sinAntiguos, STORE_SEED_PRODUCTS);
};

/* Las imágenes de producto que quedaban en hosts externos (unsplash,
   qwenlm.ai, imgur, ladrondemiel.com...) ya no se usan: las de "Material
   biológico" viven en Cloudinary (carpeta productos) y el resto muestra el
   placeholder local. productsService limpia las URLs externas al leer el
   catálogo guardado, así que no hace falta ninguna migración por producto:
   normalizeProductImageUrl en productsService.getAll/saveAll y en las
   tarjetas de la tienda se encarga de todo. */

/* ---------------------------------------------------------------------------
   Configuración de la tienda
   - NÚMERO de WhatsApp del pedido (código país + número, sin '+')
   - Email de contacto público.
   Ambos vienen de variables de entorno (src/config.ts): el código fuente
   NO contiene emails ni teléfonos hardcodeados.
   --------------------------------------------------------------------------- */
const WA_MENSAJE_CONSULTA = 'Hola Apiarios Carrión, quisiera consultar por productos 🍯';

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const buildOrderMessage = (userEmail: string | null, lines: CartLine[]): string => {
  const items = lines
    .map((l) => {
      const nombre = l.product?.nombre || 'Producto';
      if (l.product?.consultarPrecio) return `${nombre} × ${l.cantidad} — Precio por consultar`;
      return `${nombre} × ${l.cantidad} — ${formatSoles((l.product?.precio || 0) * l.cantidad)}`;
    })
    .join('\n');
  const total = lines.reduce(
    (sum, l) => sum + (l.product && !l.product.consultarPrecio ? (l.product.precio || 0) * l.cantidad : 0),
    0
  );
  const linesMsg = [
    '*Pedido · Apiarios Carrión*',
    '',
    items,
    '',
    '──────────────────',
    `*Total: ${formatSoles(total)}*`,
    userEmail ? `\nCliente: ${userEmail}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return linesMsg;
};

/* ============================================================
   Toasts ligeros de la tienda
   ============================================================ */
function StoreToasts({ toasts }: { toasts: Toast[] }) {
  return (
    // Se queda en bottom-24 también en escritorio: en bottom-5 tapaba
    // exactamente al botón flotante del carrito (bottom-5 right-4).
    <div className="fixed bottom-24 right-4 z-[80] flex w-[min(18rem,calc(100vw-2rem))] flex-col gap-2 sm:right-5">
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

/* ============================================================
   Tarjeta de producto
   ============================================================ */
function ProductCard({
  product,
  onOpen,
  onAdd,
}: {
  product: StoreProduct;
  onOpen: (p: StoreProduct) => void;
  onAdd: (p: StoreProduct) => void;
}) {
  const emoji = catEmoji(product.categoria);
  const porEncargo = esMaterialBiologico(product);
  const agotado = !product.activo || (!porEncargo && product.stock <= 0);
  // En la tarjeta el precio no cabe completo: "A consultar" mantiene la
  // fila corta y el texto íntegro sigue en el modal de detalle.
  const precioCard = esPrecioConsultar(product) ? 'A consultar' : precioTexto(product);
  return (
    <motion.div
      onClick={() => onOpen(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        // Los controles internos (el "+" del pie) manejan su propia tecla.
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(product);
        }
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="card card-sheen group flex h-full min-h-[284px] flex-col overflow-hidden text-left sm:min-h-[318px]"
    >
      <div className="relative">
        <StoreImage
          src={normalizeProductImageUrl(product.imageUrl)}
          alt={product.nombre}
          emoji={emoji}
          className="h-28 w-full rounded-t-[14px] sm:h-32"
        />
        {porEncargo && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-950 shadow-lg">
            Por encargo
          </span>
        )}
        {product.badge && !porEncargo && (
          <span className="absolute left-2 top-2 rounded-full bg-honey px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-ink shadow-lg">
            {product.badge}
          </span>
        )}
        {product.subcategoria && (
          <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-semibold leading-none text-honey backdrop-blur-sm">
            {product.subcategoria}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:px-3.5 sm:pt-3.5 sm:pb-4">
        {/* Categoría al inicio del bloque, sola y sin recortes, justo encima
            del título; el pie queda para precio, medida y "+". */}
        <span className="tick-label mb-1 line-clamp-2 shrink-0" title={product.categoria}>
          {product.categoria}
        </span>
        <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug text-cream sm:text-base">
          {product.nombre}
        </h3>
        {product.descripcion && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-husk sm:text-xs">
            {product.descripcion}
          </p>
        )}
        {/* Pie compacto: precio + medida a la izquierda y el "+" anclado a la
            esquina inferior derecha, en una sola fila sin huecos. */}
        <div className="mt-auto flex items-end gap-1.5 border-t border-line/60 pt-2.5">
          <span className="flex min-w-0 shrink items-center gap-1.5">
            <span
              className={`min-w-0 shrink truncate font-black leading-none text-honey ${
                product.consultarPrecio ? 'text-xs' : 'text-base sm:text-lg'
              }`}
              title={precioTexto(product)}
            >
              {precioCard}
            </span>
            <span
              className="min-w-0 shrink truncate text-[10px] leading-none text-husk sm:text-[11px]"
              title={product.unidad}
            >
              {product.unidad}
            </span>
          </span>
          {agotado && (
            <span className="shrink-0 rounded-full bg-coral/15 px-2 py-0.5 text-[10px] font-bold leading-none text-coral">
              Agotado
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(product);
            }}
            disabled={agotado}
            aria-label={`Agregar ${product.nombre} al carrito`}
            className="-mb-1.5 -mr-1.5 ml-auto flex size-8 min-h-8 min-w-8 shrink-0 items-center justify-center self-end rounded-full bg-honey p-0 text-ink transition-all duration-150 hover:scale-105 hover:bg-honeysoft active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:-mb-1 sm:size-9 sm:min-h-9 sm:min-w-9"
          >
            <IconPlus className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================
   Modal de detalle de producto
   ============================================================ */
function ProductDetailModal({
  product,
  onClose,
  onAdd,
  onExitComplete,
}: {
  product: StoreProduct | null;
  onClose: () => void;
  onAdd: (p: StoreProduct, qty: number) => void;
  onExitComplete?: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [closing, setClosing] = useState(false);

  const porEncargo = !!product && esMaterialBiologico(product);
  const maxQty = porEncargo ? 999 : (product?.stock ?? 0);
  const agotado = !product || !product.activo || (!porEncargo && product.stock <= 0);

  useEffect(() => {
    setQty(1);
  }, [product?.id]);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 160);
  };

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm touch-none"
            onClick={handleClose}
          />
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="card relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-bold text-cream">Detalle</h2>
              <button
                onClick={handleClose}
                aria-label="Cerrar"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-husk transition-colors hover:border-honey/60 hover:text-cream"
              >
                ✕
              </button>
            </div>

            <div className="modal-cuerpo flex-1">
              {product && (
                <div className="p-5">
                  <StoreImage
                    src={normalizeProductImageUrl(product.imageUrl)}
                    alt={product.nombre}
                    emoji={catEmoji(product.categoria)}
                    className="aspect-[4/3] w-full rounded-xl border border-line"
                  />
                  <div className="mt-4">
                    <span className="tick-label">{product.categoria}</span>
                    <h3 className="mt-1 font-display text-xl font-bold text-cream">{product.nombre}</h3>
                    {product.subcategoria && (
                      <span className="mb-2 inline-flex rounded-full bg-honey/10 px-2 py-0.5 text-[11px] font-semibold text-honey">
                        {product.subcategoria}
                      </span>
                    )}
                    {product.badge && (
                      <span className="mb-2 ml-1.5 inline-flex rounded-full bg-honey px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-ink">
                        {product.badge}
                      </span>
                    )}
                    <p className="mt-2 text-sm leading-relaxed text-husk">{product.descripcion}</p>
                    {porEncargo && (
                      <p className="mt-2 inline-flex rounded-lg bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300">
                        🐝 {POR_ENCARGO_NOTA}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
                      <span
                        className={`font-black text-honey ${
                          product.consultarPrecio ? 'text-sm' : 'text-2xl'
                        }`}
                      >
                        {precioTexto(product)}
                      </span>
                      <span className="text-xs text-husk">
                        {product.unidad}
                        {porEncargo ? ' · Por encargo' : !agotado && ` · Stock: ${product.stock}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-line p-4">
              <div className="flex items-center gap-3">
                <QuantityInput
                  value={qty}
                  onChange={setQty}
                  min={1}
                  max={maxQty}
                  disabled={agotado}
                  size="lg"
                  ariaLabel={product?.nombre}
                />
                <button
                  onClick={() => product && onAdd(product, qty)}
                  disabled={agotado}
                  className="flex-1 rounded-xl bg-honey py-3 text-sm font-bold text-ink transition-colors hover:bg-honeysoft disabled:cursor-not-allowed disabled:bg-line2 disabled:text-husk"
                >
                  {agotado ? 'Agotado' : 'Agregar al carrito'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   Carrito (drawer lateral derecho)
   ============================================================ */
function CartDrawer({
  open,
  onClose,
  lines,
  onUpdateQty,
  onRemove,
  onClear,
  onOrder,
}: {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onOrder: () => void;
}) {
  const subtotal = lines.reduce(
    (sum, l) => sum + (l.product && !l.product.consultarPrecio ? (l.product.precio || 0) * l.cantidad : 0),
    0
  );
  const count = lines.reduce((sum, l) => sum + l.cantidad, 0);
  // Un carrito cuyo total es S/ 0 (todo "precio por consultar") no se puede
  // cobrar por Yape: se ofrece el contacto por WhatsApp en su lugar.
  const hayPrecioPorConsultar = lines.some((l) => l.product?.consultarPrecio);
  const puedePagarse = subtotal > 0 && !hayPrecioPorConsultar;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm touch-none"
            onClick={onClose}
          />
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-md flex-col bg-pane shadow-2xl sm:rounded-l-2xl sm:border-l sm:border-line"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-bold text-cream">
                🛒 Carrito {count > 0 && <span className="text-honey">({count})</span>}
              </h2>
              <button
                onClick={onClose}
                aria-label="Cerrar carrito"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-husk transition-colors hover:border-honey/60 hover:text-cream"
              >
                ✕
              </button>
            </div>

            <div className="modal-cuerpo flex-1 p-4">
              {lines.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <span className="text-5xl">🧺</span>
                  <p className="text-husk">Tu carrito está vacío.</p>
                  <p className="text-sm text-husk/60">Explora el catálogo y agrega tus productos.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {lines.map((l) => {
                    const p = l.product;
                    if (!p) return null;
                    return (
                      <li key={l.productId} className="flex items-center gap-3 rounded-xl border border-line bg-ink/40 p-3">
                        <StoreImage
                          src={normalizeProductImageUrl(p.imageUrl)}
                          alt={p.nombre}
                          emoji={catEmoji(p.categoria)}
                          className="h-16 w-16 flex-shrink-0 rounded-lg border border-line"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-cream">{p.nombre}</p>
                          <p className="text-xs text-husk">
                            {precioTexto(p)} · {p.unidad}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <QuantityInput
                              value={l.cantidad}
                              onChange={(next) => onUpdateQty(l.productId, next)}
                              min={1}
                              max={esMaterialBiologico(p) ? 999 : p.stock}
                              size="sm"
                              ariaLabel={p.nombre}
                            />
                            <span className="ml-auto text-sm font-bold text-honey">
                              {p.consultarPrecio ? 'Precio por consultar' : formatSoles(p.precio * l.cantidad)}
                            </span>
                            <button
                              onClick={() => onRemove(l.productId)}
                              aria-label={`Eliminar ${p.nombre}`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-coral transition-colors hover:bg-coral/10"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {lines.length > 0 && (
              <div className="border-t border-line p-4">
                <div className="mb-1 flex items-center justify-between text-sm text-husk">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatSoles(subtotal)}</span>
                </div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-display text-base font-bold text-cream">Total</span>
                  <span className="font-display text-2xl font-black text-honey">{formatSoles(subtotal)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onClear}
                    className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-husk transition-colors hover:border-coral/60 hover:text-coral"
                  >
                    Vaciar carrito
                  </button>
                  <button
                    onClick={onOrder}
                    disabled={!puedePagarse}
                    title={
                      puedePagarse
                        ? 'Pagar con Yape'
                        : 'Hay productos sin precio publicado. Confirma el monto por WhatsApp.'
                    }
                    className="flex-1 rounded-xl bg-honey py-3 text-sm font-bold text-ink transition-colors hover:bg-honeysoft disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {puedePagarse ? 'Pagar con Yape' : 'Confirmar por WhatsApp'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   Landing de marca (hero) + Nuestro oficio + menú + pie flotante
   ============================================================ */

const OFICIO_CARDS = [
  {
    titulo: 'Genética de altura',
    emoji: '🧬',
    texto:
      'Seleccionamos año tras año las colonias mejor adaptadas a la sierra: abejas tolerantes al frío y a los bruscos cambios de temperatura de la Cordillera Blanca. Cada colmena está identificada individualmente y se registra su comportamiento en el apiario.',
  },
  {
    titulo: 'Floración andina',
    emoji: '🌸',
    texto:
      'El flujo principal de néctar llega con la floración del eucalipto (marzo a mayo), y lo complementamos con tarwi, retama y las flores silvestres de montaña que rodean el apiario.',
  },
  {
    titulo: 'Cosecha responsable',
    emoji: '🍯',
    texto:
      'Miel cruda, sin mezclar ni sobrecalentar ni pasteurizar: sale de la cosecha como sale del panal. Dejamos siempre las reservas necesarias a cada colmena y trabajamos sin transgénicos ni tratamientos invasivos.',
  },
  {
    titulo: 'Apiario familiar y artesanal',
    emoji: '🏡',
    texto:
      'Una operación familiar, hecha a mano cuadro por cuadro. Atipayán, Independencia, Áncash — a unos 3,050 msnm, al pie del macizo de la Cordillera Blanca.',
  },
];

/* Calendario apícola de la zona (Atipayán, Independencia — Áncash). */
const OFICIO_CALENDARIO = [
  {
    emoji: '🌧️',
    titulo: 'Temporada activa',
    periodo: 'Oct–Abr',
    texto:
      'Las lluvias reactivan la vegetación, las colonias crecen y trabajan la floración de montaña.',
  },
  {
    emoji: '🌸',
    titulo: 'Miel de eucalipto',
    periodo: 'Mar–May',
    texto:
      'El flujo principal de néctar del apiario: la floración del eucalipto y de las flores nativas.',
  },
  {
    emoji: '🍂',
    periodo: 'Jul–Sep',
    titulo: 'Época de escasez',
    texto:
      'Los meses más secos y fríos del año: cuidamos que cada colmena conserve sus reservas hasta la nueva floración.',
  },
];

/* Bloques de marca del tab Inicio */
const VALUE_PROPS = [
  { emoji: '🏔️', titulo: 'Apiario de altura', texto: '3,052 m sobre el mar, Cordillera Blanca' },
  { emoji: '🍯', titulo: 'Miel cruda', texto: 'Sin pasteurizar ni mezclar: como sale del panal' },
  { emoji: '🐝', titulo: 'Material vivo', texto: 'Reinas y núcleos con garantía de llegada' },
  { emoji: '🤝', titulo: 'Trato directo', texto: 'Compras al apicultor, sin intermediarios' },
];

const PROCESO_STEPS = [
  {
    num: '01',
    emoji: '🐝',
    titulo: 'Cosecha a mano',
    texto: 'Cuadro por cuadro, sin apuro y sin maltratar la colonia',
  },
  {
    num: '02',
    emoji: '🫙',
    titulo: 'Envasado en frío',
    texto: 'Sin pasteurizar: la miel conserva sus enzimas y aroma',
  },
  {
    num: '03',
    emoji: '📦',
    titulo: 'Envío cuidado',
    texto: 'Empaque protegido desde Huaraz a todo el Perú',
  },
];

const BAND_IMG = `/img/band-apicultor.jpg`;

function PublicBrandHeader({
  open,
  onMenu,
  onClose,
  activeSection,
  onNavigate,
  onWhatsApp,
  onVolver,
}: {
  open: boolean;
  onMenu: () => void;
  onClose: () => void;
  activeSection: string;
  onNavigate: (id: TabId) => void;
  onWhatsApp: () => void;
  onVolver: () => void;
}) {
  // El ref cubre botón + dropdown: tocar el hamburguesa no cuenta como "afuera".
  const wrapRef = useRef<HTMLDivElement>(null);

  return (
    <header className="flex items-center justify-between gap-3 py-5 sm:py-6">
      <div className="flex min-w-0 items-center gap-3">
        <Logo variant="compact" className="h-10 w-10 flex-shrink-0 sm:h-12 sm:w-12" />
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-lg font-bold text-cream sm:text-xl">Apiarios Carrión</p>
          <p className="tick-label mt-0.5 hidden sm:block">MIEL & PRODUCTOS NATURALES · HUARAZ</p>
          <p className="tick-label mt-0.5 sm:hidden">MIEL & NATURAL · HUARAZ</p>
        </div>
      </div>
      {/* Acciones agrupadas a la derecha: "Volver al inicio" + hamburguesa.
          Antes el botón era un hijo suelto del justify-between y quedaba
          flotando en el centro de la barra. */}
      <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
        <motion.button
          onClick={onVolver}
          whileTap={{ scale: 0.92 }}
          aria-label="Volver al inicio"
          title="Volver al inicio"
          className="flex w-auto flex-shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-honey px-2.5 py-1.5 text-xs font-medium leading-none text-ink transition-all duration-200 hover:bg-honeysoft active:scale-95 md:gap-2 md:px-4 md:py-2 md:text-sm md:leading-normal md:shadow-[0_2px_10px_rgba(240,164,28,.35)]"
        >
          {/* Una sola flecha (Lucide ArrowLeft) en móvil y escritorio */}
          <svg
            className="h-3.5 w-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M11 17l-5-5m0 0l5-5m-5 5h12"
            />
          </svg>
          Volver al inicio
        </motion.button>
        <div ref={wrapRef} className="relative flex flex-col items-end">
          <button
            onClick={onMenu}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-honey/50 text-honey transition-colors hover:border-honey hover:bg-honey/10"
          >
            <span className="relative block h-4 w-5" aria-hidden="true">
              <span
                className={`absolute left-0 top-0 h-[2px] w-full rounded-full bg-current transition-all duration-200 ease-out ${
                  open ? 'translate-y-[7px] rotate-45' : ''
                }`}
              />
              <span
                className={`absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full bg-current transition-all duration-200 ${
                  open ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-current transition-all duration-200 ease-out ${
                  open ? '-translate-y-[7px] -rotate-45' : ''
                }`}
              />
            </span>
          </button>
          <BrandMenu
            open={open}
            containerRef={wrapRef}
            onClose={onClose}
            activeSection={activeSection}
            onNavigate={onNavigate}
            onWhatsApp={onWhatsApp}
          />
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   Menú hamburguesa — mini dropdown anclado al botón
   (marca, links compactos, WhatsApp verde, horario; sin backdrop)
   ============================================================ */
type TabId = 'inicio' | 'tienda' | 'oficio' | 'contacto';

const MENU_LINKS: { id: TabId; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Inicio', icon: '🏠' },
  { id: 'tienda', label: 'Tienda', icon: '🛒' },
  { id: 'oficio', label: 'Nuestro oficio', icon: '🍯' },
  { id: 'contacto', label: 'Contacto', icon: '📧' },
];

const panelHexPattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5-13-7.5v-15z' fill='none' stroke='%23f0a41c' stroke-width='0.5'/%3E%3C/svg%3E")`;

const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: tIn },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: tOut },
};

/* Transición de entrada de cada pestaña de /tienda (fade + slide 200ms) */
const tabVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: tIn },
  exit: { opacity: 0, y: -12, transition: tOut },
};

function BrandMenu({
  open,
  containerRef,
  activeSection,
  onClose,
  onNavigate,
  onWhatsApp,
}: {
  open: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  activeSection: string;
  onClose: () => void;
  onNavigate: (id: TabId) => void;
  onWhatsApp: () => void;
}) {
  // Cerrar al tocar afuera del dropdown (clickOutside; incluye el botón como zona interna)
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('touchstart', handle);
    };
  }, [open, containerRef, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={dropdownVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[232px] origin-top-right overflow-hidden rounded-xl border border-honey/40 bg-[#2A2118] p-2 shadow-[0_24px_60px_rgba(0,0,0,.55)]"
        >
          <p className="px-2 pb-2 pt-1 text-[11px] font-bold tracking-[0.16em] text-cream">
            🐝 APIARIOS CARRIÓN
          </p>

          <nav className="flex flex-col divide-y divide-honey/10">
            {MENU_LINKS.map((l) => {
              const active = activeSection === l.id;
              return (
                <button
                  key={l.id}
                  role="menuitem"
                  onClick={() => onNavigate(l.id)}
                  className={`flex w-full items-center gap-2 px-2 py-2 text-left text-sm font-medium transition-colors duration-150 ${
                    active ? 'text-honey' : 'text-cream hover:text-honey'
                  }`}
                >
                  <span className={`text-lg leading-none ${active ? 'text-honey' : 'text-husk'}`} aria-hidden="true">
                    {l.icon}
                  </span>
                  {l.label}
                </button>
              );
            })}
          </nav>

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WA_MENSAJE_CONSULTA)}`}
            target="_blank"
            rel="noreferrer"
            onClick={onWhatsApp}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1FA855' }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>

          <p className="px-2 pb-1 pt-2 text-center text-[10px] tracking-wide text-husk">
            LUN-SÁB · 8:00-18:00
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FloatingCartButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
      transition={{ delay: 0.6, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.95 }}
      aria-label="Mi pedido"
      className="fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-full bg-honey py-3 pl-4 pr-4 text-sm font-bold text-ink shadow-[0_10px_30px_rgba(0,0,0,.5)] transition-colors hover:bg-honeysoft sm:right-5"
    >
      <span>🛒 Mi Pedido</span>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 1.7 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-black text-honey"
        >
          {count}
        </motion.span>
      )}
    </motion.button>
  );
}

/* ============================================================
   Tienda principal
   ============================================================ */
export default function Store() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.uid || 'anonymous';
  // Rol admin (Firestore config/admins + semilla .env).
  const isAdminUser = !!user && isEmailAdmin(user?.email);

  const [products, setProducts] = useState<StoreProduct[]>(() => {
    // Fuente única de verdad: productsService.getAll() (misma clave que el
    // panel admin). Se encarga de migrar el catálogo previo y de sembrar los
    // 22 productos iniciales si aún no existe nada. NUNCA lanza: si algo falla
    // se siembran los productos para que la tienda cargue SIN errores.
    try {
      const loaded = productsService.getAll();
      console.log(`🛒 Tienda cargó productos: ${loaded.length}`);
      return loaded;
    } catch (error) {
      console.error('❌ [TIENDA] Error al cargar catálogo, usando semilla:', error);
      return productsService.SEED_PRODUCTS.map((p) => ({ ...p }));
    }
  });
  const [cart, setCart] = useState<CartItem[]>(() => {
    const raw = loadStoreCart(userId);
    const saved = Array.isArray(raw) ? (raw as CartItem[]) : [];
    if (!saved.length) return [];
    const valid = new Set(products.map((p) => p.id));
    return saved.filter((c) => c && typeof c.productId === 'string' && typeof c.cantidad === 'number' && valid.has(c.productId));
  });

  // Marca la migración de catálogo como aplicada (una vez por usuario).
  useEffect(() => {
    saveStoreSeedVersion(SEED_VERSION_V7, userId);
  }, [userId]);

  const [query, setQuery] = useState('');
  // Texto diferido 200 ms para el filtrado del catálogo: el input responde al
  // instante y el filtro no se re-ejecuta en cada tecla.
  const debouncedQuery = useDebouncedValue(query, 200);
  // Se guarda el ID, no el producto: así el modal de detalle refleja siempre
  // el catálogo actual (si el admin edita o desactiva el producto mientras está
  // abierto, antes seguía mostrando y cobrando un snapshot viejo).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => products.find((p) => p.id === selectedId) || null,
    [products, selectedId]
  );
  const [detailExiting, setDetailExiting] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [pagoAbierto, setPagoAbierto] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  // Restaurar la sub-vista de la Tienda donde se quedó el usuario
  // (tienda_ultima_vista). El estado de navegación (location.state) manda
  // sobre lo guardado, y si no hay nada se entra a la landing 'inicio'.
  const urlTab = (location.state as { tab?: TabId } | null)?.tab;
  // useMemo: antes se leía localStorage + JSON.parse en CADA render.
  const savedTiendaView = useMemo(() => loadTiendaUltimaVista(user?.uid), [user?.uid]);
  const savedTab = savedTiendaView?.tab;
  const isTab = (t: string | undefined): t is TabId =>
    !!t && (t === 'inicio' || t === 'tienda' || t === 'oficio' || t === 'contacto');
  const initialTab: TabId = isTab(urlTab) ? urlTab : isTab(savedTab) ? savedTab : 'inicio';
  const [tab, setTab] = useState<TabId>(initialTab);
  // Restaurar también categoría macro y subcategoría si se quedó en el catálogo.
  // Se validan contra la taxonomía: un valor guardado de una versión antigua
  // (p. ej. "Mieles" o "Herramientas", que antes eran categorías) dejaba la
  // tienda con 0 productos y NINGÚN chip marcado, sin explicación visible.
  const [macro, setMacro] = useState<string | null>(() => {
    if (initialTab !== 'tienda') return null;
    const saved = savedTiendaView?.macro;
    return typeof saved === 'string' && STORE_MACROS.some((m) => m.nombre === saved) ? saved : null;
  });
  const [sub, setSub] = useState<Subcategoria>(() => {
    if (initialTab !== 'tienda') return 'Todas' as Subcategoria;
    const savedMacro = savedTiendaView?.macro;
    const savedSub = savedTiendaView?.sub;
    if (
      typeof savedSub === 'string' &&
      savedSub !== 'Todas' &&
      typeof savedMacro === 'string' &&
      subcategoriasDe(savedMacro).includes(savedSub)
    ) {
      return savedSub as Subcategoria;
    }
    return 'Todas' as Subcategoria;
  });
  // Si localStorage está lleno (quota) se muestra el botón "Limpiar caché".
  const [storageAlert, setStorageAlert] = useState(false);

  // La tienda debe cargar SIN errores incluso con localStorage lleno:
  //  - productsService ya limpia los base64 automáticamente (PRODUCTS_QUOTA_EVENT).
  //  - Como red de seguridad, el botón "Limpiar caché" borra la caché del
  //    catálogo (claves "_products") y recarga. Antes hacía localStorage.clear(),
  //    que de paso borraba ajustes, notificaciones y datos de la app.
  useEffect(() => {
    const onQuota = () => setStorageAlert(true);
    window.addEventListener(productsService.PRODUCTS_QUOTA_EVENT, onQuota);
    return () => window.removeEventListener(productsService.PRODUCTS_QUOTA_EVENT, onQuota);
  }, []);

  const handleLimpiarCache = () => {
    try {
      productsService.clearProductsCache();
    } catch {
      /* noop */
    }
    window.location.reload();
  };

  // Gestión del scroll al montar /tienda: sin restauración automática del
  // navegador; la pestaña inicial proviene de tienda_ultima_vista (más abajo).
  useScrollToTopOnMount();

  // Registrar la visita a /tienda en la última ruta unificada de la app (mismo
  // mecanismo que Control de Colmenas: saveLastView/loadLastView). Se guarda
  // solo la sección principal, no el modal/categoría/búsqueda dentro de ella.
  useEffect(() => {
    if (user?.uid) {
      saveLastView(LAST_VIEW_STORE, user.uid);
      console.log(
        `🛒 [TIENDA] Guardada última ruta en localStorage: key=panal_v1_user_${user.uid}_lastView | valor=${LAST_VIEW_STORE}`
      );
    }
  }, [user?.uid]);

  // Persistir la sub-vista de la Tienda (pestaña + categoría/subcategoría del
  // catálogo) para restaurarla al volver a /tienda.
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    saveTiendaUltimaVista(
      { tab, macro: macro || undefined, sub: sub === 'Todas' ? undefined : sub },
      uid
    );
  }, [tab, macro, sub, user?.uid]);

  // Cambiar de tab: cierra el menú y muestra solo esa pestaña (fade del wrapper).
  const goToTab = (id: TabId) => {
    setTab(id);
    setMenuOpen(false);
  };

  // Al cambiar de pestaña siempre se sube al tope.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  useScrollLock(!!selected || detailExiting || cartOpen || pagoAbierto);

  // Persistir carrito (por usuario). El catálogo lo persiste productsService
  // (fuente única de verdad), que además notifica 'products-changed'.
  useEffect(() => {
    saveStoreCart(cart, userId);
  }, [cart, userId]);

  // Sincronización EN VIVO del catálogo con el panel admin:
  //   - 'products-changed': CustomEvent lanzado por productsService tras cada
  //     guardado desde el admin (misma pestaña / SPA).
  //   - 'products-updated': evento legado del catálogo (compatibilidad).
  //   - 'storage': cambio de la clave apiarios_carrion_products_v1 en OTRA
  //     pestaña. Sin recargar la página.
  useEffect(() => {
    const applyProducts = (next: StoreProduct[]) => {
      setProducts((prev) => {
        const normalized = next.map(normalizeStoreProduct);
        const prevJson = JSON.stringify(prev.map(normalizeStoreProduct));
        const nextJson = JSON.stringify(normalized);
        if (prevJson === nextJson) return prev;
        console.log(`🔄 Productos actualizados desde admin: ${normalized.length}`);
        return normalized;
      });
    };

    const handleProductsChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ products?: StoreProduct[] }>).detail;
      if (!Array.isArray(detail?.products) || detail.products.length === 0) return;
      console.log(`📡 [TIENDA] Recibido products-changed: ${detail.products.length}`);
      applyProducts(detail.products);
    };

    const handleProductsUpdated = (e: Event) => {
      const productsDetail = (e as CustomEvent<{ products?: StoreProduct[] }>).detail?.products;
      if (!Array.isArray(productsDetail) || productsDetail.length === 0) return;
      console.log('📡 [TIENDA] Recibido products-updated (evento legado):', productsDetail.length);
      applyProducts(productsDetail);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== productsService.STORAGE_KEY || !e.newValue) return;
      console.log('📦 [TIENDA] Storage change detectado en', e.key);
      try {
        const parsed = JSON.parse(e.newValue) as StoreProduct[];
        if (Array.isArray(parsed) && parsed.length > 0) applyProducts(parsed);
      } catch (err) {
        console.error('❌ [TIENDA] JSON inválido en storage event:', err);
      }
    };

    window.addEventListener(productsService.PRODUCTS_CHANGED_EVENT, handleProductsChanged);
    window.addEventListener(PRODUCTS_UPDATED_EVENT, handleProductsUpdated);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener(productsService.PRODUCTS_CHANGED_EVENT, handleProductsChanged);
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, handleProductsUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Debugging: estado de imagen de cada producto al cargar/actualizar.
  useEffect(() => {
    products.forEach((p) => {
      console.log(
        `📦 ${p.nombre}:`,
        p.imageUrl
          ? `✅ Tiene imagen (${p.imageUrl.startsWith('data:') ? 'base64' : p.imageUrl.substring(0, 50)})`
          : '❌ Sin imagen'
      );
    });
  }, [products]);

  const pushToast = (title: string, desc?: string) => {
    const t: Toast = { id: uid(), title, desc };
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3200);
  };

  const filtered = useMemo(() => {
    const q = normalize(debouncedQuery.trim());
    // La categoría y la subcategoría activas se aplican SIEMPRE, también con
    // texto en el buscador: antes el `return` de la búsqueda iba antes de los
    // filtros, así que buscar "miel" con "Herramientas" marcado mostraba
    // productos de las tres macros y el mensaje de "sin resultados" mentía.
    const result = products.filter((p) => {
      if (!p.activo) return false;
      if (macro && p.categoria !== macro) return false;
      if (sub !== 'Todas' && p.subcategoria !== sub) return false;
      if (q === '') return true;
      return (
        normalize(p.nombre).includes(q) ||
        normalize(p.descripcion || '').includes(q) ||
        normalize(p.subcategoria || '').includes(q) ||
        normalize(p.categoria || '').includes(q) ||
        normalize(p.unidad || '').includes(q)
      );
    });
    return sortProducts(result);
  }, [products, debouncedQuery, macro, sub]);

  // Conteos de los chips: reflejan búsqueda + subcategoría (no el filtro de
  // macro, obviously), para que el número de una tarjeta coincida con las
  // tarjetas que se ven al pulsarla.
  const macroCounts = useMemo(() => {
    const q = normalize(debouncedQuery.trim());
    return STORE_MACROS.map((m) => ({
      emoji: m.emoji,
      nombre: m.nombre,
      count: products.filter((p) => {
        if (!p.activo) return false;
        if (p.categoria !== m.nombre) return false;
        if (sub !== 'Todas' && p.subcategoria !== sub) return false;
        if (q === '') return true;
        return (
          normalize(p.nombre).includes(q) ||
          normalize(p.descripcion || '').includes(q) ||
          normalize(p.subcategoria || '').includes(q) ||
          normalize(p.categoria || '').includes(q) ||
          normalize(p.unidad || '').includes(q)
        );
      }).length,
    }));
  }, [products, debouncedQuery, sub]);

  // Subcategorías que existen de verdad en el catálogo. La taxonomía declara
  // "Libros y Manuales", pero la semilla no trae ningún producto de esa
  // subcategoría: el chip se pintaba y siempre devolvía "sin resultados", que
  // parece un fallo de la tienda. Se listan solo las que tienen productos
  // activos, conservando el orden de la taxonomía.
  const subsVisibles = (macroNombre: string): string[] => {
    const declaradas = subcategoriasDe(macroNombre);
    const conProductos = new Set(
      products.filter((p) => p.activo && p.categoria === macroNombre).map((p) => p.subcategoria || '')
    );
    return ['Todas', ...declaradas.filter((s) => conProductos.has(s))];
  };

  const cartCount = useMemo(() => cart.reduce((s, c) => s + c.cantidad, 0), [cart]);

  const cartLines: CartLine[] = useMemo(
    () =>
      cart
        .map((c) => ({ ...c, product: products.find((p) => p.id === c.productId && p.activo) }))
        .filter((l) => l.product),
    [cart, products]
  );

  // Revalida el carrito cuando cambia el catálogo o el usuario. Si el
  // administrador desactiva o borra un producto que ya estaba en el carrito,
  // sus líneas se eliminaban de la vista pero `cartCount` seguía sumando el
  // carrito crudo: el badge marcaba "(3)" sobre un carrito vacío y, como el
  // botón "Vaciar carrito" solo se pinta con líneas, no había forma de
  // limpiarlo desde la UI.
  useEffect(() => {
    setCart((prev) => {
      const siguiente = prev.filter((c) => {
        const p = products.find((x) => x.id === c.productId);
        if (!p || !p.activo) return false;
        const cap = esMaterialBiologico(p) ? Number.MAX_SAFE_INTEGER : p.stock;
        return c.cantidad > 0 && (cap === Number.MAX_SAFE_INTEGER || c.cantidad <= cap);
      });
      if (siguiente.length === prev.length) return prev;
      return siguiente.map((c) => {
        const p = products.find((x) => x.id === c.productId);
        const cap = p && esMaterialBiologico(p) ? Number.MAX_SAFE_INTEGER : p?.stock ?? 0;
        return cap === Number.MAX_SAFE_INTEGER ? c : { ...c, cantidad: Math.min(cap, c.cantidad) };
      });
    });
  }, [products, userId]);

  const addToCart = (p: StoreProduct, qty: number) => {
    const available = esMaterialBiologico(p) ? qty : Math.min(qty, p.stock);
    if (available <= 0) return;
    // Decide sobre el estado actual (no dentro del updater, que puede no
    // ejecutarse hasta después): si el producto ya estaba en el tope de
    // stock la cantidad no cambia, y antes se emitía igual el toast
    // "Agregado al carrito" aunque el contador no se moviera.
    const existente = cart.find((c) => c.productId === p.id);
    const cap = esMaterialBiologico(p) ? Number.MAX_SAFE_INTEGER : p.stock;
    const cantidadFinal = existente ? Math.min(cap, existente.cantidad + available) : available;
    const agregado = cantidadFinal > (existente?.cantidad ?? 0);

    setCart((prev) => {
      if (existente) {
        return prev.map((c) => (c.productId === p.id ? { ...c, cantidad: cantidadFinal } : c));
      }
      return [...prev, { productId: p.id, cantidad: available }];
    });
    // Solo cerrar el modal de detalle (con su animación de salida) si estaba
    // abierto. Si se agregó desde el catálogo, selected ya es null y activar
    // detailExiting congelaría el scroll: onExitComplete nunca se dispararía
    // porque no hay animación que completar.
    if (selected) {
      setSelectedId(null);
      setDetailExiting(true);
    }
    if (agregado) pushToast('Agregado al carrito', `${p.nombre} × ${available}`);
    else pushToast('No se agregó', `Stock máximo: ${p.stock} ${p.stock === 1 ? 'unidad' : 'unidades'}`);
  };

  const updateQty = (productId: string, qty: number) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((c) => c.productId !== productId)
        : prev.map((c) => (c.productId === productId ? { ...c, cantidad: qty } : c))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const clearCart = (silencioso = false) => {
    setCart([]);
    if (!silencioso) pushToast('Carrito vaciado');
  };

  const orderByWhatsApp = () => {
    if (cartLines.length === 0) return;
    const msg = buildOrderMessage(user?.email || null, cartLines);
    // Registrar el pedido en el panel admin (panal_v1_admin_orders)
    try {
      const lineas: OrderLine[] = cartLines.map((l) => ({
        productId: l.productId,
        nombre: l.product?.nombre || 'Producto',
        cantidad: l.cantidad,
        precio: l.product && !l.product.consultarPrecio ? l.product.precio : 0,
        consultarPrecio: l.product?.consultarPrecio,
        unidad: l.product?.unidad,
      }));
      const total = lineas.reduce((s, l) => s + (l.consultarPrecio ? 0 : l.precio * l.cantidad), 0);
      const nuevo: StoreOrder = {
        id: uid(),
        date: new Date().toISOString(),
        cliente: user?.email || undefined,
        lineas,
        total,
        estado: 'Pendiente',
      };
      const existentes = loadAdminOrders();
      saveAdminOrders([nuevo, ...existentes]);
    } catch (e) {
      console.error('[TIENDA] Error al registrar el pedido:', e);
    }
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    pushToast('Pedido enviado por WhatsApp', 'Quedó registrado para el administrador');
  };

  const handlePagarYape = () => {
    if (cartLines.length === 0) return;
    // Todo el carrito a "precio por consultar": el total sería S/ 0 y el
    // cliente terminaría transfiriendo 0 soles. Se deriva a WhatsApp.
    const total = cartLines.reduce(
      (sum, l) => sum + (l.product && !l.product.consultarPrecio ? (l.product.precio || 0) * l.cantidad : 0),
      0
    );
    if (!(total > 0)) {
      orderByWhatsApp();
      return;
    }
    setCartOpen(false);
    setPagoAbierto(true);
  };

  // URL de WhatsApp alternativa (mismo mensaje que antes, por si el cliente
  // prefiere el canal clásico en lugar de Yape).
  const whatsappUrl = useMemo(
    () =>
      cartLines.length > 0
        ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
            buildOrderMessage(user?.email || null, cartLines)
          )}`
        : '',
    [cartLines, user?.email]
  );

  // Enlace de WhatsApp del modal de Yape: al pulsar "O pide por WhatsApp" el
  // pedido quedaba en el aire (nadie llamaba a orderByWhatsApp), así que nunca
  // llegaba al panel del administrador. Se registra antes de abrir WhatsApp.
  const handleWhatsappPedido = () => {
    orderByWhatsApp();
  };

  const handleBack = () => {
    try {
      localStorage.removeItem('lastSelection');
    } catch {
      /* ignore */
    }
    // Volver a la selección de sección manualmente: persistir /seleccionar
    // como última vista para que, al cerrar la app ahí, se restaure la
    // pantalla de elección (no /dashboard) sin loop de auto-redirección.
    saveUltimaVista('/seleccionar', user?.uid);
    navigate('/seleccionar');
  };
  return (
    <div className="relative min-h-screen" style={{ background: '#1a1410' }}>
      {/* Fondo base de la tienda (el panal vivo va encima). */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, #2a1f15 0%, #1a1410 60%, #120e08 100%)' }}
      />
      {/* Panal vivo: hexágonos que se iluminan y abejas que persiguen el puntero. */}
      <LivingHive />

      {/* Aviso de almacenamiento lleno: permite liberar localStorage y recargar. */}
      {storageAlert && (
        <div className="fixed inset-x-0 top-0 z-[95] px-3 pt-3">
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-coral/50 bg-ink/95 p-4 shadow-[0_10px_40px_rgba(0,0,0,.6)] backdrop-blur">
            <p className="text-center text-xs leading-relaxed text-cream">
              El almacenamiento del navegador está lleno y no se pudieron guardar todas las
              imágenes. Los productos se muestran con imágenes por defecto.
            </p>
            <button
              onClick={handleLimpiarCache}
              className="rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-coral/80"
            >
              Limpiar caché
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10">
        {/* Header público (logo + hamburguesa→X), visible en todas las pestañas */}
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <PublicBrandHeader
            open={menuOpen}
            onMenu={() => setMenuOpen((o) => !o)}
            onClose={() => setMenuOpen(false)}
            activeSection={tab}
            onNavigate={goToTab}
            onWhatsApp={() => setMenuOpen(false)}
            onVolver={handleBack}
          />
        </div>

        {/* Cada pestaña muestra SOLO su contenido, con fade+slide de entrada 200ms */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} variants={tabVariants} initial="hidden" animate="visible" exit="exit">
            {tab === 'inicio' && (
              <>
                <section id="inicio" className="relative overflow-hidden pb-16">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                  <div className="relative z-10 flex flex-col items-center gap-8 py-10 text-center sm:py-16 lg:py-20">
                    <motion.p
                      className="tick-label mb-5 flex items-center justify-center gap-3"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45 }}
                    >
                      <span className="h-px w-8 bg-honey/60" />
                      APIARIO DE ALTURA — HUARAZ, ÁNCASH
                    </motion.p>

                    <motion.h1
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      className="font-display text-[2.6rem] font-black leading-[1.04] tracking-tight text-cream sm:text-6xl lg:text-6xl xl:text-7xl"
                    >
                      Abejas criadas a <em className="text-honey italic">3,052 metros,</em> miel de montaña.
                    </motion.h1>

                    <motion.p
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.24, duration: 0.5 }}
                      className="mt-6 max-w-xl text-base leading-relaxed text-husk sm:text-lg"
                    >
                      Somos Apiarios Carrión: criadores de abejas al pie de la Cordillera Blanca. Genética
                      adaptada a la altura, cosecha de floración andina y trato directo con el apicultor.
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.34, duration: 0.5 }}
                      className="mt-8 flex flex-wrap items-center justify-center gap-3"
                    >
                      <motion.button
                        onClick={() => goToTab('tienda')}
                        whileTap={{ scale: 0.96 }}
                        className="group inline-flex items-center gap-2 rounded-full bg-honey px-6 py-3.5 text-sm font-bold text-ink transition-colors hover:bg-honeysoft"
                      >
                        Entrar a la tienda
                        <span className="transition-transform group-hover:translate-x-1">→</span>
                      </motion.button>
                      <motion.button
                        onClick={() => goToTab('oficio')}
                        whileTap={{ scale: 0.96 }}
                        className="rounded-full border border-line px-6 py-3.5 text-sm font-semibold text-cream transition-colors hover:border-honey/60 hover:text-honey"
                      >
                        Nuestro oficio
                      </motion.button>
                    </motion.div>
                  </div>
                </div>

                <HeroAmbient />

                {/* Halo ámbar tenue sobre el hero (reemplaza la figura hexagonal grande) */}
                <div
                  className="pointer-events-none absolute inset-0 z-0"
                  style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(245,166,35,0.06) 0%, transparent 60%)' }}
                  aria-hidden="true"
                />
              </section>

              <HoneyDrips />

              {/* Cifras del apiario (contadores al entrar en viewport) */}
              <CifrasApiario />

              {/* 1 — Propuestas de valor */}
              <section className="w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  {VALUE_PROPS.map((v, i) => (
                    <motion.div
                      key={v.titulo}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ duration: 0.4, delay: i * 0.06, ease: EASE }}
                      className="rounded-xl border border-honey/10 bg-[#241C12] p-4 sm:p-5"
                    >
                      <span className="text-3xl sm:text-4xl" aria-hidden="true">
                        {v.emoji}
                      </span>
                      <h3 className="mt-3 font-display text-base font-bold text-cream">{v.titulo}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-husk">{v.texto}</p>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Rotativo «Sabías que» sobre la miel */}
              <SabiasQue />

              {/* 2 — Del panal a tu mesa */}
              <section className="w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
                <div className="mb-10 text-center">
                  <p className="tick-label mb-2 flex items-center justify-center gap-3">
                    <span className="h-px w-8 bg-honey/60" />
                    NUESTRO PROCESO
                  </p>
                  <h2 className="font-display text-2xl font-black tracking-tight text-cream sm:text-3xl">
                    Del panal a tu mesa
                  </h2>
                </div>

                <div className="grid gap-6 sm:grid-cols-3 sm:gap-4">
                  {PROCESO_STEPS.map((s, i) => (
                    <div key={s.num} className="relative">
                      {i < PROCESO_STEPS.length - 1 && (
                        <div
                          className="pointer-events-none absolute left-full top-9 hidden h-px w-4 bg-gradient-to-r from-honey/50 to-honey/10 sm:block"
                          aria-hidden="true"
                        />
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.4, delay: i * 0.08, ease: EASE }}
                        className="card flex h-full flex-col p-5"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-display text-3xl font-black text-honey/30">{s.num}</span>
                          <span className="text-3xl" aria-hidden="true">
                            {s.emoji}
                          </span>
                        </div>
                        <h3 className="mt-3 font-display text-lg font-bold text-cream">{s.titulo}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-husk">{s.texto}</p>
                      </motion.div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 3 — Banda de foto con cita */}
              <section className="relative h-[220px] overflow-hidden sm:h-[320px]">
                <StoreImage
                  src={BAND_IMG}
                  alt="Apicultor de Apiarios Carrión en la Cordillera Blanca"
                  emoji="🏔️"
                  className="h-full w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/25" aria-hidden="true" />
                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                  <p className="max-w-2xl font-display text-2xl font-medium italic leading-snug text-cream sm:text-4xl">
                    "La altura no se apura: se respeta."
                  </p>
                  <p className="mt-3 text-xs tracking-[0.18em] text-husk sm:mt-4 sm:text-sm">
                    — FAMILIA CARRIÓN
                  </p>
                </div>
              </section>

              {/* Testimonios de clientes (carrusel con arrastre) */}
              <Testimonios />

              {/* Franja de garantías (envío, llegada, pago…) */}
              <Garantias />

              {/* Preguntas frecuentes (acordeón) */}
              <PreguntasFrecuentes />

              {/* 4 — CTA final */}
              <section className="w-full px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
                <div className="card relative overflow-hidden rounded-2xl px-6 py-10 text-center sm:px-12 sm:py-14">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.06]"
                    style={{ backgroundImage: panelHexPattern }}
                    aria-hidden="true"
                  />
                  <div className="relative">
                    <p className="tick-label mb-4">APIARIOS CARRIÓN · HUARAZ</p>
                    <h2 className="font-display text-2xl font-black tracking-tight text-cream sm:text-4xl">
                      ¿Listo para probar la miel de montaña?
                    </h2>
                    <p className="mx-auto mt-3 max-w-md text-sm text-husk sm:text-base">
                      Mira el catálogo y arma tu pedido por WhatsApp.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                      <motion.button
                        onClick={() => goToTab('tienda')}
                        whileTap={{ scale: 0.96 }}
                        className="group inline-flex items-center gap-2 rounded-full bg-honey px-6 py-3.5 text-sm font-bold text-ink transition-colors hover:bg-honeysoft"
                      >
                        Entrar a la tienda
                        <span className="transition-transform group-hover:translate-x-1">→</span>
                      </motion.button>
                      <a
href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WA_MENSAJE_CONSULTA)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-line px-6 py-3.5 text-sm font-semibold text-cream transition-colors hover:border-honey/60 hover:text-honey"
                      >
                        Escríbenos
                      </a>
                    </div>
                  </div>
                </div>
              </section>
              </>
            )}

        {tab === 'oficio' && (
              <section id="oficio" className="w-full px-4 sm:px-6 lg:px-8 py-10 pb-28 sm:py-14">
            <div>
              <p className="tick-label mb-3 flex items-center justify-center gap-3 lg:justify-start">
                <span className="h-px w-8 bg-honey/60" />
                NUESTRO OFICIO
              </p>
            <h2 className="text-center font-display text-3xl font-black tracking-tight text-cream sm:text-4xl lg:text-left">
              El oficio del apicultor de altura
            </h2>
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-husk lg:mx-0 lg:text-left">
            Desde el pie de la Cordillera Blanca mantenemos nuestro apiario como lo hacían los primeros
            cosechadores de miel de la región: con paciencia, cariño y respeto por la abeja y su floración.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {OFICIO_CARDS.map((c, i) => (
              <motion.div
                key={c.titulo}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="card flex items-start gap-4 p-6"
              >
                <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-honey/10 text-3xl">
                  {c.emoji}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold text-cream">{c.titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-husk">{c.texto}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-10">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-honey/60" />
              <p className="tick-label">CALENDARIO APÍCOLA DE LA ZONA</p>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              {OFICIO_CALENDARIO.map((c, i) => (
                <motion.div
                  key={c.titulo}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.45, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="card p-5"
                >
                  <p className="text-2xl">{c.emoji}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <h4 className="font-display text-base font-bold text-cream">{c.titulo}</h4>
                    <span className="tick-label text-[10px] text-honey">{c.periodo}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-husk">{c.texto}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-husk/80 lg:mx-0 lg:text-left">
            Los 3,052 metros de altura no son una anécdota: la floración tardía, el aire seco y el sol de
            montaña le dan a nuestra miel un carácter único. Por eso cada cosecha se hace a mano, cuadro
            por cuadro, y se envasa sin procesos que le quiten vida.
          </p>
              </section>
            )}

            {tab === 'tienda' && (
              <div id="tienda" className="w-full px-4 sm:px-6 lg:px-8 pb-32">
          {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 py-5 sm:py-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <motion.button
                onClick={handleBack}
                whileTap={{ scale: 0.92 }}
                aria-label="Volver a selección"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-husk transition-colors hover:border-honey/50 hover:text-honey"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              <div className="min-w-0">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="font-display text-2xl sm:text-3xl font-black tracking-tight text-cream"
                >
                  Tienda
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="truncate text-sm text-husk"
                >
                  Miel, polen, cera, herramientas y material vivo del apiario
                </motion.p>
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isAdminUser && (
              <motion.button
                onClick={() => navigate('/tienda/admin')}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-xl border border-honey/30 bg-honey/10 px-3.5 py-2.5 text-sm font-semibold text-honey transition-colors hover:bg-honey/20"
              >
                ⚙️ Panel admin
              </motion.button>
            )}
            <motion.button
              onClick={() => setCartOpen(true)}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              aria-label="Abrir carrito"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-pane text-xl transition-colors hover:border-honey/50"
            >
              🛒
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-honey px-1 text-[11px] font-black text-ink shadow"
                >
                  {cartCount}
                </motion.span>
              )}
            </motion.button>
          </div>
        </header>

        {/* Botones de macro-categorías + buscador + sub-chips */}
        <div className="mb-6 space-y-3">
          {/* 3 chips de macro-categoría (Título → Subtítulo → Chips → Buscador → Sub-chips).
              Indicador deslizante: mismo componente que los filtros del Dashboard. */}
          <AnimatedTabs
            className="flex flex-row items-center justify-start gap-2 overflow-x-auto scrollbar-hide"
            ariaLabel="Categorías de la tienda"
            items={macroCounts.map((m) => ({ key: m.nombre, label: m.nombre }))}
            value={macro}
            onChange={(nombre) => {
              if (nombre === macro) {
                setMacro(null);
                setSub('Todas');
              } else {
                setMacro(nombre);
                setSub('Todas');
              }
            }}
            contentClassName="relative z-10 flex shrink-0 items-center min-h-[32px]"
            buttonClassName={(active) =>
              `relative flex shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'border-transparent text-gray-900'
                  : 'border-amber-500/30 bg-[#241C12]/80 text-cream hover:border-amber-500/60'
              }`
            }
            pillClassName="border border-[#F5A623] bg-[#F5A623]"
            renderTab={(item, isActive) => {
              const m = macroCounts.find((x) => x.nombre === item.key)!;
              return (
                <>
                  <span className="mr-1 shrink-0 text-sm">{m.emoji}</span>
                  <span className="shrink-0">{m.nombre}</span>
                  <span className={`ml-1 shrink-0 text-[10px] ${isActive ? 'text-gray-900/80' : 'text-husk'}`}>
                    {m.count}
                  </span>
                  {isActive && <span className="ml-1 shrink-0 text-[10px] font-black">✓</span>}
                </>
              );
            }}
          />

          <div className="relative">
            <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-husk" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos…"
              className="w-full rounded-xl border border-line bg-pane py-3 pl-11 pr-4 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
            />
          </div>

          {macro && (
            <div className="flex flex-wrap gap-2">
              {subsVisibles(macro).map((c) => {
                const active = sub === c;
                return (
                  <button
                    key={c}
                    onClick={() => setSub(c)}
                    className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
                      active
                        ? 'border-honey bg-honey text-ink font-bold'
                        : 'border-line bg-pane text-husk hover:border-honey/50 hover:text-cream'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Grid de productos */}
        {filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
            <span className="text-6xl">🔍</span>
            <p className="font-display text-lg font-bold text-cream">Sin resultados</p>
            <p className="max-w-xs text-sm text-husk">
              {query.trim()
                ? `No encontramos productos para "${query}"${macro ? ` en ${macro}` : ''}.`
                : `No hay productos${macro ? ` en ${macro}` : ''}${sub !== 'Todas' ? ` · ${sub}` : ''}.`}
            </p>
            <button
              onClick={() => {
                setQuery('');
                setMacro(null);
                setSub('Todas');
              }}
              className="mt-2 rounded-xl border border-honey/40 px-4 py-2 text-sm font-semibold text-honey transition-colors hover:bg-honey/10"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                layout
                className="h-full"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3), ease: [0.22, 1, 0.36, 1] }}
              >
                <ProductCard product={p} onOpen={(prod) => setSelectedId(prod.id)} onAdd={(prod) => addToCart(prod, 1)} />
              </motion.div>
            ))}
          </motion.div>
        )}
        </div>
            )}

            {tab === 'contacto' && (
              <section id="contacto" className="w-full px-4 sm:px-6 lg:px-8 py-10 pb-28 sm:py-14">
                <div>
                  <p className="tick-label mb-3 flex items-center justify-center gap-3 lg:justify-start">
                    <span className="h-px w-8 bg-honey/60" />
                    CONTACTO
                  </p>
                  <h2 className="text-center font-display text-3xl font-black tracking-tight text-cream sm:text-4xl lg:text-left">
                    Hablemos de tu pedido
                  </h2>
                </div>

                <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-husk lg:mx-0 lg:text-left">
                  Escríbenos por correo o por WhatsApp y te contamos disponibilidad, precios y opciones de
                  envío desde Huaraz, Áncash — Perú.
                </p>

                <div className="mt-10 grid gap-5 sm:grid-cols-2">
                  {CONTACT_EMAIL && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="card p-6"
                    >
                      <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-honey/10 text-2xl">✉️</span>
                        <div className="min-w-0">
                          <p className="tick-label text-[10px] text-husk">CORREO</p>
                          <h3 className="mt-1 font-display text-lg font-bold text-cream">Escríbenos</h3>
                          <a
                            href={`mailto:${CONTACT_EMAIL}`}
                            className="mt-2 inline-block break-all text-sm text-honey transition-colors hover:underline"
                          >
                            {CONTACT_EMAIL}
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {WHATSAPP_NUMBER && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                      className="card p-6"
                    >
                      <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-honey/10 text-2xl">🛒</span>
                        <div className="min-w-0">
                          <p className="tick-label text-[10px] text-husk">PEDIDOS</p>
                          <h3 className="mt-1 font-display text-lg font-bold text-cream">WhatsApp</h3>
                          <a
                            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WA_MENSAJE_CONSULTA)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block break-all text-sm text-honey transition-colors hover:underline"
                          >
                            {WHATSAPP_LABEL || 'WhatsApp'}
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.45, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="card p-6"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-honey/10 text-2xl">📍</span>
                      <div className="min-w-0">
                        <p className="tick-label text-[10px] text-husk">UBICACIÓN</p>
                        <h3 className="mt-1 font-display text-lg font-bold text-cream">Apiarios Carrión</h3>
                        <p className="mt-2 text-sm text-husk">Huaraz, Áncash — Perú</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.45, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="card p-6"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-honey/10 text-2xl">🕗</span>
                      <div className="min-w-0">
                        <p className="tick-label text-[10px] text-husk">HORARIO</p>
                        <h3 className="mt-1 font-display text-lg font-bold text-cream">Atención</h3>
                        <p className="mt-2 text-sm text-husk">Lun–Sáb · 8:00 – 18:00</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-husk/80 lg:mx-0 lg:text-left">
                  Respondemos todos los pedidos dentro del horario de atención. Si prefieres, también puedes
                  escribirnos directo desde el botón de WhatsApp que aparece junto a cada producto.
                </p>
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Botón flotante "Mi Pedido" — SOLO en la vista de catálogo (tab "tienda"),
          nunca en la landing (inicio), "Nuestro oficio" ni "Contacto". */}
      <AnimatePresence>
        {tab === 'tienda' && (
          <FloatingCartButton count={cartCount} onClick={() => setCartOpen(true)} />
        )}
      </AnimatePresence>

      {/* Modal de detalle */}
      <ProductDetailModal
        product={selected}
        onClose={() => {
          setSelectedId(null);
          setDetailExiting(true);
        }}
        onAdd={addToCart}
        onExitComplete={() => setDetailExiting(false)}
      />

      {/* Carrito */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={cartLines}
        onUpdateQty={updateQty}
        onRemove={removeFromCart}
        onClear={clearCart}
        onOrder={handlePagarYape}
      />

      {/* Modal de pago con Yape */}
      <PagoYapeModal
        open={pagoAbierto}
        onClose={() => setPagoAbierto(false)}
        lines={cartLines}
        total={cartLines.reduce(
          (sum, l) => sum + (l.product && !l.product.consultarPrecio ? (l.product.precio || 0) * l.cantidad : 0),
          0
        )}
        userEmail={user?.email || null}
        userId={userId}
        whatsappUrl={whatsappUrl}
        initialNombre={user?.displayName || undefined}
        onWhatsapp={handleWhatsappPedido}
        onCompletado={(numero) => {
          // Sin toast propio: clearCart() ya avisa, y emitir los dos a la vez
          // mostraba "Carrito vaciado" junto a "¡Pedido enviado!".
          clearCart(true);
          pushToast('¡Pedido enviado!', `${numero} quedó pendiente de pago`);
        }}
      />

      {/* Toasts */}
      <StoreToasts toasts={toasts} />

      {/* Footer con enlaces legales */}
      <StoreFooter />
    </div>
  );
}