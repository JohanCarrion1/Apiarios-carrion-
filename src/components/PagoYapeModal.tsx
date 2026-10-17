import { useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalVariants, backdropVariants, tIn } from '../lib/motion';
import { WHATSAPP_LABEL } from '../config';
import { formatSoles } from '../types/store';
import type { CartLine } from '../types/store';
import type { Pedido, PedidoProducto } from '../types/pedidos';
import { pedidoSubtotal } from '../types/pedidos';
import {
  YAPE_QR_IMAGE,
  COMPROBANTE_MAX_MB,
  comprobanteValido,
  nextPedidoNumero,
  subirComprobante,
  crearPedido,
} from '../lib/pedidosService';
import { useScrollLock } from '../hooks/useScrollLock';

/* ============================================================
   Modal "Pagar con Yape"
   ============================================================
   - QR estático + número Yape configurado en el .env + pasos a seguir.
   - Datos del cliente (nombre, teléfono, dirección) con validación.
   - Subida del comprobante (JPG/PNG/WebP ≤ 2MB) con preview.
   - Botón alternativo "O pide por WhatsApp".
   - Al confirmar: sube el comprobante, crea el pedido PED-xxx y muestra
     una pantalla de éxito animada; el carrito se vacía y se vuelve a la tienda.
   ============================================================ */

interface PagoYapeModalProps {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  total: number;
  userEmail: string | null;
  userId: string;
  whatsappUrl: string;
  onCompletado: (numero: string) => void;
  /** Registra el pedido en el panel antes de abrir WhatsApp. */
  onWhatsapp?: () => void;
  /** Nombre para prellenar el formulario (displayName del usuario). */
  initialNombre?: string;
}

export default function PagoYapeModal({
  open,
  onClose,
  lines,
  total,
  userEmail,
  userId,
  whatsappUrl,
  onCompletado,
  onWhatsapp,
  initialNombre,
}: PagoYapeModalProps) {
  // Número Yape: teléfono comercial configurado en el .env.
  const yapeNumero = WHATSAPP_LABEL || '';
  const yapeNumeroLimpio = yapeNumero.replace(/\s+/g, '');

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [correo, setCorreo] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [errores, setErrores] = useState<{ nombre?: string; telefono?: string; direccion?: string; file?: string }>({});
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState<Pedido | null>(null);
  const [copiado, setCopiado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevObjectUrl = useRef<string | null>(null);

  // Prefill: datos del usuario autenticado cada vez que se abre.
  useEffect(() => {
    if (!open) return;
    setNombre((prev) => prev || initialNombre || '');
    setCorreo((prev) => prev || userEmail || '');
    setTelefono('');
    setDireccion('');
    setErrores({});
    setFile(null);
    // Libera el blob del intento anterior: antes solo se revocaba al
    // desmontar y cada reintento fugaba una URL.
    if (prevObjectUrl.current) {
      URL.revokeObjectURL(prevObjectUrl.current);
      prevObjectUrl.current = null;
    }
    setPreviewUrl(null);
    setGuardando(false);
    setExito(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Limpiar el object URL del preview al cambiar/cerrar.
  useEffect(() => {
    return () => {
      if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current);
    };
  }, []);

  const productos: PedidoProducto[] = useMemo(
    () =>
      lines.map((l) => ({
        id: l.productId,
        nombre: l.product?.nombre || 'Producto',
        unidad: l.product?.unidad || '',
        precio: l.product && !l.product.consultarPrecio ? l.product.precio || 0 : 0,
        consultarPrecio: l.product?.consultarPrecio || false,
        cantidad: l.cantidad,
        subtotal: pedidoSubtotal({
          precio: l.product?.precio || 0,
          consultarPrecio: l.product?.consultarPrecio || false,
          cantidad: l.cantidad,
        }),
      })),
    [lines]
  );

  const handleFile = (f: File | undefined | null) => {
    if (!f) return;
    const err = comprobanteValido(f);
    if (err) {
      setErrores((e) => ({ ...e, file: err }));
      return;
    }
    setErrores((e) => ({ ...e, file: undefined }));
    setFile(f);
    if (f.type.startsWith('image/')) {
      if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current);
      const url = URL.createObjectURL(f);
      prevObjectUrl.current = url;
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const validar = (): boolean => {
    const next: typeof errores = {};
    if (!nombre.trim()) next.nombre = 'Escribe tu nombre.';
    if (!telefono.trim()) next.telefono = 'Escribe tu teléfono.';
    else if (!/^\+?[\d\s()-]{7,20}$/.test(telefono.trim())) next.telefono = 'El teléfono no parece válido.';
    if (!direccion.trim()) next.direccion = 'Escribe tu dirección.';
    if (!totalValido) next.file = 'El total del pedido es S/ 0. Escríbenos por WhatsApp para cotizarlo.';
    if (!file) next.file = next.file || 'Sube la captura del comprobante Yape.';
    setErrores(next);
    return Object.keys(next).length === 0;
  };

  const confirmarPago = async () => {
    if (!validar() || !file) return;
    setGuardando(true);
    try {
      const numero = await nextPedidoNumero();
      const comprobante = await subirComprobante(file, numero);
      const pedido = await crearPedido(
        {
          clienteUid: userId,
          clienteEmail: userEmail || correo.trim() || undefined,
          cliente: {
            nombre: nombre.trim(),
            telefono: telefono.trim(),
            correo: correo.trim() || undefined,
            direccion: direccion.trim(),
          },
          productos,
          total,
          comprobantePago: comprobante,
        },
        numero
      );
      setExito(pedido);
      onCompletado(pedido.numero);
    } catch (err) {
      console.error('[YAPE] Error al confirmar el pago:', err);
      const msg = (err as Error)?.message || 'No se pudo registrar el pago. Intenta de nuevo.';
      setErrores({ file: msg });
    } finally {
      setGuardando(false);
    }
  };

  // El total a mostrar se congela al abrir el modal: la tienda vacía el
  // carrito en onCompletado, así que la prop `total` llega a 0 en la pantalla
  // de éxito y el cliente veía "Total a pagar S/ 0".
  const totalBase = Number.isFinite(total) ? total : 0;
  const totalMostrado = exito ? exito.total : totalBase;
  const totalValido = totalBase > 0;

  const copiarNumero = async () => {
    try {
      await navigator.clipboard.writeText(yapeNumeroLimpio || yapeNumero);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* clipboard no disponible */
    }
  };

  const inputCls = (err?: string): string =>
    `w-full rounded-xl border bg-ink/60 px-4 py-3 text-sm text-cream placeholder:text-husk/50 focus:outline-none transition-colors ${
      err ? 'border-coral/60 focus:border-coral' : 'border-line focus:border-honey'
    }`;

  useScrollLock(open);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm"
            onClick={() => {
              // Durante la subida del comprobante el pedido se sigue creando en
              // segundo plano: cerrarse dejaría al cliente pensando que falló
              // (y terminaría pagando dos veces).
              if (!guardando) onClose();
            }}
          />
          <div className="fixed inset-0 z-[71] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="card relative my-auto w-full max-w-lg overflow-hidden rounded-2xl border-line"
              role="dialog"
              aria-modal="true"
            >
              {/* Cabecera */}
              <div className="flex items-center justify-between border-b border-line bg-ink/40 px-5 py-4">
                <h2 className="font-display text-lg font-bold text-cream">Pagar con Yape</h2>
                {!exito && (
                  <button
                    onClick={onClose}
                    disabled={guardando}
                    aria-label="Cerrar modal de pago"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-husk transition-colors hover:border-honey/60 hover:text-cream disabled:opacity-40"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Pantalla de éxito animada */}
              {exito ? (
                <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-honey text-ink"
                  >
                    <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={tIn}
                    className="font-display text-2xl font-bold text-cream"
                  >
                    ¡Pedido registrado!
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...tIn, delay: 0.1 }}
                    className="text-sm text-husk"
                  >
                    Tu pedido <span className="font-mono font-bold text-honey">{exito.numero}</span> está en{' '}
                    <span className="text-cream">pendiente de pago</span>. En cuanto confirmemos tu comprobante
                    Yape lo preparamos y te contactamos.
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...tIn, delay: 0.2 }}
                    className="w-full max-w-xs rounded-xl border border-line bg-ink/40 p-4 text-left text-sm"
                  >
                    <div className="flex justify-between text-husk">
                      <span>Total a pagar</span>
                      <span className="font-mono text-cream">{formatSoles(totalMostrado)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-husk">
                      <span>N° pedido</span>
                      <span className="font-mono text-honey">{exito.numero}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-husk">
                      <span>Método</span>
                      <span className="text-cream">Yape</span>
                    </div>
                  </motion.div>
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ ...tIn, delay: 0.3 }}
                    onClick={onClose}
                    className="mt-2 rounded-xl bg-honey px-6 py-3 text-sm font-bold text-ink transition-colors hover:bg-honeysoft"
                  >
                    Volver a la tienda
                  </motion.button>
                </div>
              ) : (
                <div className="modal-cuerpo max-h-[calc(100vh-10rem)] overflow-y-auto p-5">
                  {/* QR + monto + número */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <img
                        src={YAPE_QR_IMAGE}
                        alt="Código QR de Yape"
                        className="h-44 w-44 rounded-xl border-2 border-honey/30 bg-white object-contain"
                      />
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-950">
                        Escanea con Yape
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-wide text-husk">Monto a pagar</p>
                      <p className="font-display text-3xl font-black text-honey">{formatSoles(totalMostrado)}</p>
                    </div>
                    {yapeNumero && (
                      <button
                        onClick={copiarNumero}
                        className="flex items-center gap-2 rounded-xl border border-line bg-ink/40 px-4 py-2 text-sm font-mono text-cream transition-colors hover:border-honey/50"
                        title="Copiar número"
                      >
                        📱 {yapeNumero}
                        <span className="text-[10px] uppercase tracking-wide text-husk">
                          {copiado ? 'Copiado ✓' : 'Copiar'}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Pasos */}
                  <ol className="mt-5 space-y-2 text-sm text-husk">
                    {[
                      'Abre la app Yape en tu celular.',
                      'Escanea el QR o ingresa el número de la cuenta.',
                      `Escribe el monto exacto: ${formatSoles(totalMostrado)}.`,
                      'Adjunta la captura de pantalla del pago abajo y confirma tu pedido.',
                    ].map((paso, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-honey/15 text-xs font-black text-honey">
                          {i + 1}
                        </span>
                        <span>{paso}</span>
                      </li>
                    ))}
                  </ol>

                  {/* Datos del cliente */}
                  <div className="mt-6 rounded-xl border border-line bg-ink/30 p-4">
                    <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-cream">
                      Tus datos
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <input
                          className={inputCls(errores.nombre)}
                          placeholder="Nombre completo *"
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          maxLength={80}
                        />
                        {errores.nombre && <p className="mt-1 text-xs text-coral">{errores.nombre}</p>}
                      </div>
                      <div>
                        <input
                          className={inputCls(errores.telefono)}
                          placeholder="Teléfono de contacto *"
                          inputMode="tel"
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          maxLength={20}
                        />
                        {errores.telefono && <p className="mt-1 text-xs text-coral">{errores.telefono}</p>}
                      </div>
                      <div>
                        <input
                          className={inputCls(errores.direccion)}
                          placeholder="Dirección de entrega *"
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          maxLength={140}
                        />
                        {errores.direccion && <p className="mt-1 text-xs text-coral">{errores.direccion}</p>}
                      </div>
                      <div>
                        <input
                          className={inputCls()}
                          placeholder="Correo (opcional)"
                          type="email"
                          value={correo}
                          onChange={(e) => setCorreo(e.target.value)}
                          maxLength={120}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Comprobante */}
                  <div className="mt-4 rounded-xl border border-line bg-ink/30 p-4">
                    <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-cream">
                      Comprobante de pago
                    </h3>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        handleFile(e.target.files?.[0]);
                        // Se vacía el input para que volver a elegir el MISMO
                        // archivo dispare `change` otra vez (si no, el botón
                        // "Cambiar imagen" parece no hacer nada).
                        e.target.value = '';
                      }}
                    />
                    {previewUrl ? (
                      <div className="flex items-start gap-3">
                        <img
                          src={previewUrl}
                          alt="Vista previa del comprobante"
                          loading="lazy"
                          decoding="async"
                          className="h-24 w-24 rounded-lg border border-line object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-cream">{file?.name}</p>
                          <p className="text-xs text-husk">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}</p>
                          <button
                            onClick={() => inputRef.current?.click()}
                            className="mt-2 text-xs font-semibold text-honey transition-colors hover:text-honeysoft"
                          >
                            Cambiar imagen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => inputRef.current?.click()}
                        className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line py-6 text-sm text-husk transition-colors hover:border-honey/50 hover:text-cream"
                      >
                        <span className="text-2xl">📷</span>
                        <span className="font-semibold">Subir captura del pago</span>
                        <span className="text-xs text-husk/60">
                          JPG, PNG o WebP · máx {COMPROBANTE_MAX_MB} MB
                        </span>
                      </button>
                    )}
                    {errores.file && <p className="mt-2 text-xs text-coral">{errores.file}</p>}
                  </div>

                  {/* Acciones */}
                  <div className="mt-5 space-y-2">
                    <button
                      onClick={confirmarPago}
                      disabled={guardando || !totalValido}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-honey py-3.5 text-sm font-bold text-ink transition-colors hover:bg-honeysoft disabled:opacity-50"
                    >
                      {guardando ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
                          Registrando tu pedido…
                        </>
                      ) : total <= 0 ? (
                        'Total a confirmar por WhatsApp'
                      ) : (
                        'Confirmar pago'
                      )}
                    </button>
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onWhatsapp}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 py-3 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/10"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        O pide por WhatsApp
                      </a>
                    )}
                    <p className="pt-1 text-center text-xs text-husk/70">
                      Al confirmar aceptas que tu pedido quede en estado pendiente hasta validar el pago.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}