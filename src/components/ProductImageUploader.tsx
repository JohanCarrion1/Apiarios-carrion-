import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  uploadImage,
  getOptimizedImageUrl,
  normalizeProductImageUrl,
  MAX_CLOUDINARY_FILE_MB,
  CLOUDINARY_PRODUCTS_FOLDER,
} from '../lib/cloudinary';

interface ProductImageUploaderProps {
  /** URL guardada en el producto. '' si no tiene imagen. */
  value: string;
  /** Recibe la URL final de Cloudinary (o '' para quitar la imagen). */
  onChange: (url: string) => void;
  /** Emoji del placeholder cuando no hay imagen. */
  emoji?: string;
  label?: string;
  disabled?: boolean;
}

/**
 * Subida de la imagen de un producto a Cloudinary (carpeta `productos`).
 *
 * A diferencia de InspectionPhotoUploader, aquí es UNA sola imagen y se sube
 * en el momento: el admin elige el archivo, se ve la vista previa local y
 * cuando Cloudinary responde ya tenemos la `secure_url` definitiva que se
 * guarda junto al producto. Nada de base64 ni de URLs pegadas a mano.
 *
 * La optimización q_auto,f_auto la aplica getOptimizedImageUrl al previsualizar
 * (las URLs guardadas en el producto quedan limpias, tal como devolvió Cloudinary).
 */
export default function ProductImageUploader({
  value,
  onChange,
  emoji = '🛠️',
  label = 'Imagen del producto',
  disabled = false,
}: ProductImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const successTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    };
  }, []);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    successTimerRef.current = window.setTimeout(() => setSuccess(null), 4000);
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen');
      return;
    }
    if (file.size > MAX_CLOUDINARY_FILE_MB * 1024 * 1024) {
      setError(`La imagen "${file.name}" es demasiado grande (máximo ${MAX_CLOUDINARY_FILE_MB}MB)`);
      return;
    }

    setError(null);
    setSuccess(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const url = await uploadImage(file, CLOUDINARY_PRODUCTS_FOLDER);
      onChange(url);
      showSuccess('¡Imagen subida a Cloudinary!');
    } catch (err) {
      console.error('[PRODUCT IMAGE] Error al subir la imagen:', err);
      setError(err instanceof Error && err.message ? err.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
      setPreview(null);
      URL.revokeObjectURL(objectUrl);
    }
  };

  // Durante la subida se muestra el blob local; si no, la imagen ya guardada.
  const displayed = preview ?? (value ? normalizeProductImageUrl(value) : '');
  const showPlaceholder = !displayed;

  return (
    <div>
      <span className="mb-1.5 block text-xs text-husk">{label}</span>

      <div className="relative h-32 w-full overflow-hidden rounded-lg border border-line bg-ink">
        {showPlaceholder ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pane3 via-pane2 to-ink">
            <span className="select-none" style={{ fontSize: 'clamp(1.75rem, 6vw, 3rem)' }}>
              {emoji}
            </span>
          </div>
        ) : (
          <img
            src={displayed}
            alt="Vista previa"
            className="h-full w-full object-cover object-center"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
            }}
          />
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/55">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-honey border-t-transparent" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-honey">
              Subiendo
            </span>
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
        {/* capture="environment" → abre la cámara trasera directo en móvil */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-honey/40 bg-honey/10 px-3 py-2.5 text-sm font-semibold text-honey transition-colors hover:bg-honey/20 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {value ? 'Cambiar' : 'Galería'}
        </button>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={disabled || uploading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-honey/40 bg-honey/10 px-3 py-2.5 text-sm font-semibold text-honey transition-colors hover:bg-honey/20 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h1.5l1.5-2h8l1.5 2H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm9 3a3 3 0 100 6 3 3 0 000-6z"
            />
          </svg>
          Cámara
        </button>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={disabled}
            aria-label="Quitar imagen"
            className="flex w-11 items-center justify-center rounded-xl border border-coral/40 bg-coral/10 px-3 text-coral transition-colors hover:bg-coral/20 disabled:opacity-50"
          >
            ✕
          </button>
        )}
      </div>

      <p className="mt-1 text-[10px] leading-tight text-husk">
        Se sube a Cloudinary (carpeta productos). Si el producto se queda sin imagen se
        muestra un placeholder local.
      </p>

      <AnimatePresence>
        {success && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-1.5 text-[11px] font-medium text-emerald-300"
            role="status"
          >
            {success}
          </motion.p>
        )}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-1.5 text-[11px] text-coral"
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}