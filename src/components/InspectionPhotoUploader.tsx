import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadImage, getOptimizedImageUrl, MAX_CLOUDINARY_FILE_MB } from '../lib/cloudinary';

export interface InspectionPhotoUploaderHandle {
  hasPending: () => boolean;
  uploadPending: () => Promise<string[] | null>;
}

interface InspectionPhotoUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

export const INSPECTION_MAX_PHOTOS = 5;

interface PendingPhoto {
  key: string;
  file: File;
  previewUrl: string;
}

let pendingKeyCounter = 0;

const InspectionPhotoUploader = forwardRef<
  InspectionPhotoUploaderHandle,
  InspectionPhotoUploaderProps
>(function InspectionPhotoUploader(
  {
    value,
    onChange,
    maxPhotos = INSPECTION_MAX_PHOTOS,
    disabled = false,
    onUploadingChange,
  },
  ref
) {
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const successTimerRef = useRef<number | null>(null);

  const pendingRef = useRef<PendingPhoto[]>(pending);
  pendingRef.current = pending;

  useEffect(() => {
    return () => {
      pendingRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    };
  }, []);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    successTimerRef.current = window.setTimeout(() => setSuccess(null), 4000);
  };

  const totalPhotos = value.length + pending.length;

  const runUploads = async (): Promise<string[] | null> => {
    if (uploading || disabled) return null;
    if (pending.length === 0) return [...value];
    setError(null);
    setSuccess(null);
    setUploading(true);
    setProgress(0);

    try {
      const uploaded: string[] = [];
      for (let i = 0; i < pending.length; i++) {
        uploaded.push(await uploadImage(pending[i].file));
        setProgress(Math.round(((i + 1) / pending.length) * 100));
      }
      const merged = [...value, ...uploaded];
      const released = pendingRef.current;
      onChange(merged);
      setPending([]);
      released.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      showSuccess(
        `¡${uploaded.length} foto${uploaded.length !== 1 ? 's' : ''} subida${uploaded.length !== 1 ? 's' : ''} a Cloudinary!`
      );
      return merged;
    } catch (err) {
      console.error('[INSPECTION PHOTO] Error al subir la foto:', err);
      setError(err instanceof Error && err.message ? err.message : 'Error al subir la foto. Intenta de nuevo.');
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  useImperativeHandle(ref, () => ({
    hasPending: () => pendingRef.current.length > 0,
    uploadPending: () => runUploads(),
  }));

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    setSuccess(null);

    const next: PendingPhoto[] = [];
    for (const file of Array.from(files)) {
      if (totalPhotos + next.length >= maxPhotos) {
        setError(`Máximo ${maxPhotos} fotos por inspección`);
        break;
      }
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen');
        continue;
      }
      if (file.size > MAX_CLOUDINARY_FILE_MB * 1024 * 1024) {
        setError(`La imagen "${file.name}" es demasiado grande (máximo ${MAX_CLOUDINARY_FILE_MB}MB)`);
        continue;
      }
      next.push({
        key: `pending-${Date.now()}-${pendingKeyCounter++}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (next.length > 0) {
      setPending((prev) => [...prev, ...next]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePending = (key: string) => {
    const target = pending.find((p) => p.key === key);
    if (target) URL.revokeObjectURL(target.previewUrl);
    setPending((prev) => prev.filter((p) => p.key !== key));
  };

  const removeUploaded = (url: string) => {
    onChange(value.filter((u) => u !== url));
  };

  const handleUpload = () => {
    void runUploads();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-cream">Fotos</h3>
          <p className="text-sm text-husk">
            {value.length} subida{value.length !== 1 ? 's' : ''}
            {pending.length > 0 && (
              <>
                {' '}· {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
              </>
            )}{' '}
            de {maxPhotos}
          </p>
        </div>
        {pending.length > 0 && !uploading && (
          <span className="rounded-full border border-honey/40 bg-honey/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-honey">
            Sin guardar
          </span>
        )}
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url) => (
            <motion.div
              key={url}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative aspect-square overflow-hidden rounded-lg"
            >
              <img src={getOptimizedImageUrl(url)} alt="Foto subida" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeUploaded(url)}
                disabled={uploading || disabled}
                aria-label="Quitar foto"
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-coral text-xs text-white transition-opacity hover:bg-coral/80 disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {pending.map((p) => (
            <motion.div
              key={p.key}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative aspect-square overflow-hidden rounded-lg border-2 border-honey/60"
            >
              <img src={p.previewUrl} alt="Vista previa" className="h-full w-full object-cover" />
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-center font-mono text-[9px] uppercase tracking-wider text-honey">
                Pendiente
              </span>
              <button
                type="button"
                onClick={() => removePending(p.key)}
                disabled={uploading}
                aria-label="Quitar foto pendiente"
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-coral text-xs text-white disabled:opacity-50"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled || totalPhotos >= maxPhotos}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-ink/50 py-2.5 text-sm font-medium text-husk transition-colors hover:border-honey/50 hover:text-cream disabled:opacity-40"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Seleccionar fotos
        </motion.button>
        {pending.length > 0 && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleUpload}
            disabled={uploading || disabled}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-honey py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-honeysoft disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                Subiendo {progress}%
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Subir {pending.length} foto{pending.length !== 1 ? 's' : ''}
              </>
            )}
          </motion.button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleSelect}
        className="hidden"
        disabled={uploading || disabled}
      />

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"
            role="status"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-coral/30 bg-coral/10 p-3 text-sm text-coral"
            role="alert"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default InspectionPhotoUploader;