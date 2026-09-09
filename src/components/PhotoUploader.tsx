import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage, calculateTotalSize, formatBytes, generateId, type PhotoData } from '../services/photos';

interface PhotoUploaderProps {
  photos: PhotoData[];
  onPhotosChange: (photos: PhotoData[]) => void;
  maxPhotos?: number;
  maxFileSizeMB?: number;
}

export default function PhotoUploader({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  maxFileSizeMB = 10,
}: PhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSize = calculateTotalSize(photos);
  const totalSizeMB = totalSize / (1024 * 1024);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setIsUploading(true);

    try {
      const newPhotos: PhotoData[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
          setError('Solo se permiten archivos de imagen');
          continue;
        }

        // Validar tamaño
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxFileSizeMB) {
          setError(`La imagen "${file.name}" es demasiado grande (máximo ${maxFileSizeMB}MB)`);
          continue;
        }

        // Validar límite de fotos
        if (photos.length + newPhotos.length >= maxPhotos) {
          setError(`Máximo ${maxPhotos} fotos permitidas`);
          break;
        }

        // Comprimir imagen
        const compressed = await compressImage(file, 800, 0.7);
        
        newPhotos.push({
          id: generateId(),
          data: compressed,
          timestamp: Date.now(),
          size: compressed.length,
        });
      }

      if (newPhotos.length > 0) {
        onPhotosChange([...photos, ...newPhotos]);
      }
    } catch (err) {
      setError('Error al procesar las imágenes');
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    onPhotosChange(photos.filter(p => p.id !== photoId));
  };

  const handleTakePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const handleSelectFromGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold mb-1">Fotos</h3>
          <p className="text-white/60 text-sm">
            {photos.length} de {maxPhotos} fotos • {formatBytes(totalSize)}
          </p>
        </div>
        {totalSizeMB > 5 && (
          <div className="flex items-center gap-1 text-amber-400 text-xs">
            <span>⚠️</span>
            <span>Tamaño alto</span>
          </div>
        )}
      </div>

      {/* Grid de fotos */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <AnimatePresence>
            {photos.map((photo) => (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square rounded-lg overflow-hidden group"
              >
                <img
                  src={photo.data}
                  alt="Foto de inspección"
                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setLightboxPhoto(photo)}
                />
                <motion.button
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  onClick={() => handleRemovePhoto(photo.id)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 rounded-full flex items-center justify-center text-white text-xs"
                >
                  ✕
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Botones de acción */}
      {photos.length < maxPhotos && (
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTakePhoto}
            disabled={isUploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            <span>📷</span>
            <span className="text-sm font-medium">Tomar Foto</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSelectFromGallery}
            disabled={isUploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <span>🖼️</span>
            <span className="text-sm font-medium">Galería</span>
          </motion.button>
        </div>
      )}

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Loading indicator */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 py-2"
          >
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white/60 text-sm">Procesando imagen...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxPhoto(null)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={lightboxPhoto.data}
              alt="Foto ampliada"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
