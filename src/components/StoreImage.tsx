import { useEffect, useState } from 'react';
import { getOptimizedImageUrl } from '../lib/cloudinary';

interface StoreImageProps {
  src: string;
  alt: string;
  emoji: string;
  className?: string;
  imgClassName?: string;
}

/* Imagen del catálogo con fallback: si la imagen en línea falla (o una URL
   inválida), se muestra un placeholder del tema (degradado marrón + emoji de
   la categoría). NUNCA un cuadro roto.
   Las URLs de Cloudinary pasan por getOptimizedImageUrl (q_auto,f_auto) para
   no descargar el original; el resto de hosts se muestran tal cual. */
export default function StoreImage({ src, alt, emoji, className = '', imgClassName = '' }: StoreImageProps) {
  const [failed, setFailed] = useState(false);
  const optimized = getOptimizedImageUrl(src);
  const showImage = Boolean(optimized) && !failed;

  // Al cambiar src se re-intenta cargar la imagen aunque la anterior haya
  // fallado. Sin esto, un placeholder que falló (emoji) dejaba 'failed'
  // clavado y una imagen nueva (galería/cámara/URL al editar un producto)
  // nunca aparecía hasta recargar o remontar el componente.
  useEffect(() => {
    setFailed(false);
  }, [optimized]);

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-pane3 via-pane2 to-ink ${className}`}
    >
      {showImage && (
        <img
          src={optimized}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover object-center ${imgClassName}`}
        />
      )}
      {!showImage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="select-none" style={{ fontSize: 'clamp(1.75rem, 6vw, 3rem)' }}>
            {emoji}
          </span>
        </div>
      )}
    </div>
  );
}