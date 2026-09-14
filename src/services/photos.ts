// Servicio de compresión y manejo de fotos

export interface PhotoData {
  id: string;
  data: string; // base64
  timestamp: number;
  size: number; // en bytes
}

export async function compressImage(
  file: File,
  maxWidth: number = 800,
  quality: number = 0.7
): Promise<string> {
  console.log('🔧 [COMPRESS] Iniciando compresión de imagen');
  console.log('🔧 [COMPRESS] Archivo:', file.name, 'Tamaño:', file.size, 'bytes');
  console.log('🔧 [COMPRESS] MaxWidth:', maxWidth, 'Quality:', quality);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      console.log('🔧 [COMPRESS] FileReader cargó el archivo');
      const img = new Image();
      
      img.onload = () => {
        console.log('🔧 [COMPRESS] Imagen cargada, dimensiones originales:', img.width, 'x', img.height);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcular nuevas dimensiones manteniendo aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
          console.log('🔧 [COMPRESS] Imagen redimensionada a:', width, 'x', height);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('❌ [COMPRESS] No se pudo crear el contexto del canvas');
          reject(new Error('No se pudo crear el contexto del canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        console.log('🔧 [COMPRESS] Imagen dibujada en canvas');

        // Convertir a base64 con calidad especificada
        const base64 = canvas.toDataURL('image/jpeg', quality);
        console.log('✅ [COMPRESS] Imagen convertida a base64, tamaño:', base64.length, 'caracteres');
        resolve(base64);
      };
      
      img.onerror = (error) => {
        console.error('❌ [COMPRESS] Error al cargar la imagen:', error);
        reject(new Error('Error al cargar la imagen'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = (error) => {
      console.error('❌ [COMPRESS] Error al leer el archivo:', error);
      reject(new Error('Error al leer el archivo'));
    };
    
    console.log('🔧 [COMPRESS] Leyendo archivo con FileReader...');
    reader.readAsDataURL(file);
  });
}

export function calculateTotalSize(photos: PhotoData[]): number {
  return photos.reduce((total, photo) => total + photo.size, 0);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
