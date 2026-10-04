// Subida de imágenes a Cloudinary mediante UNSIGNED UPLOAD PRESET.
// Cada destino tiene su propio preset unsigned en el panel de Cloudinary:
//   - `inspections_unsigned` → fotos de inspecciones (carpeta `inspections`)
//   - `productos_unsigned`   → imágenes de la tienda (carpeta `productos`)
// Ambos están configurados como "unsigned", así que el navegador sube sin
// credenciales: solo se envía el nombre del preset. No hay API Key ni API
// Secret en el bundle, y por tanto tampoco hay firma que calcular en el cliente.
//
// Dato público: el cloud name y los nombres de los presets no son secretos. El
// control real de lo que se puede subir vive en la configuración de cada preset
// (carpeta de destino, formatos y tamaño máximo permitidos).
const env = import.meta.env;

export const CLOUDINARY_CLOUD_NAME: string = env.VITE_CLOUDINARY_CLOUD_NAME || '';

/** Preset unsigned de las fotos de inspecciones. */
export const CLOUDINARY_UPLOAD_PRESET: string = env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

/** Preset unsigned de las imágenes de productos. Si no se define, cae al de
    inspecciones para no romper la subida si falta la variable. */
export const CLOUDINARY_PRODUCTS_UPLOAD_PRESET: string =
  env.VITE_CLOUDINARY_PRODUCTS_UPLOAD_PRESET || CLOUDINARY_UPLOAD_PRESET;

// Carpetas donde Cloudinary agrupa los assets. El preset las impone en su
// configuración de "folder"; se envían igualmente para que la organización no
// dependa de cambios futuros en el panel.
export const CLOUDINARY_INSPECTIONS_FOLDER = 'inspections';
export const CLOUDINARY_PRODUCTS_FOLDER = 'productos';

export const MAX_CLOUDINARY_FILE_MB = 10;

export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/** Preset unsigned que corresponde a una carpeta de destino. */
export const uploadPresetForFolder = (folder: string): string =>
  folder === CLOUDINARY_PRODUCTS_FOLDER ? CLOUDINARY_PRODUCTS_UPLOAD_PRESET : CLOUDINARY_UPLOAD_PRESET;

const assertConfigured = (folder: string): void => {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('Falta la configuración de Cloudinary (VITE_CLOUDINARY_CLOUD_NAME).');
  }
  if (!uploadPresetForFolder(folder)) {
    throw new Error(
      `Falta el upload preset de Cloudinary para la carpeta "${folder}" (VITE_CLOUDINARY_UPLOAD_PRESET).`
    );
  }
};

const isCloudinaryDeliveryUrl = (url: string): boolean =>
  /^https?:\/\/res\.cloudinary\.com\//i.test(url.trim());

/**
 * Normaliza la URL de imagen de un producto para mostrarla en la tienda.
 * Reglas, en orden:
 *  1. Sin imagen, base64, rutas locales o URLs ya de Cloudinary → se devuelven
 *     tal cual (las de Cloudinary sí pasan por getOptimizedImageUrl).
 *  2. Cualquier otra URL externa (unsplash, qwenlm.ai, imgur, sitios de
 *     terceros...) NO se usa: el catálogo no debe depender de hosts ajenos que
 *     pueden caerse o bloquear hotlinking. Se devuelve '' para que la tarjeta
 *     muestre el placeholder local.
 */
export function normalizeProductImageUrl(url: string | null | undefined): string {
  const raw = (url || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:')) return raw;
  if (raw.startsWith('/')) return raw;
  if (isCloudinaryDeliveryUrl(raw)) return getOptimizedImageUrl(raw);
  if (!/^https?:\/\//i.test(raw)) return '';
  console.warn(
    `[CLOUDINARY] Se ignora la imagen externa "${raw.slice(0, 80)}" y se usa el placeholder local.`
  );
  return '';
}

const assertUploadable = (file: File): void => {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Solo se permiten archivos de imagen.');
  }
  if (file.size > MAX_CLOUDINARY_FILE_MB * 1024 * 1024) {
    throw new Error(`La imagen "${file.name}" es demasiado grande (máximo ${MAX_CLOUDINARY_FILE_MB}MB).`);
  }
};

export async function uploadImage(file: File, folder: string = CLOUDINARY_INSPECTIONS_FOLDER): Promise<string> {
  assertConfigured(folder);
  assertUploadable(file);

  // Compresión previa en el cliente: mismos píxeles, mucho menos tráfico de
  // subida. Si el navegador no puede (formato no soportado por createImageBitmap)
  // se sube el original sin tocar.
  let payload: Blob = file;
  let fileName = file.name;
  try {
    const compressed = await compressImage(file);
    if (compressed !== file) {
      payload = compressed;
      fileName = file.name.replace(/\.[a-z0-9]+$/i, '') + '.jpg';
    }
  } catch (err) {
    console.warn('[CLOUDINARY] Compresión omitida, se sube el original:', err);
  }

  const form = new FormData();
  form.append('file', payload, fileName);
  form.append('upload_preset', uploadPresetForFolder(folder));
  form.append('folder', folder);

  let res: Response;
  try {
    res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: form });
  } catch {
    throw new Error('Error de conexión al subir la foto. Verifica tu internet e inténtalo de nuevo.');
  }

  const data = (await res.json().catch(() => null)) as
    | { secure_url?: string; error?: { message?: string } }
    | null;

  if (!res.ok) {
    const detail = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Cloudinary rechazó la foto: ${detail}`);
  }
  if (!data?.secure_url) {
    throw new Error('Cloudinary respondió sin la URL de la foto.');
  }
  return data.secure_url;
}

export async function uploadImages(
  files: File[],
  folder: string = CLOUDINARY_INSPECTIONS_FOLDER
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    urls.push(await uploadImage(file, folder));
  }
  return urls;
}

// ------------------------------------------------------------
// Optimización en el momento de mostrar
// ------------------------------------------------------------
// Una foto de móvil pesa 9-10MB tal como entra. Servirla con transformaciones
// de Cloudinary (en su CDN, no en el cliente) mantiene la resolución original y
// la deja en 50-500KB:
//   q_auto  → Cloudinary elige la calidad mínima aceptable para el tamaño
//   f_auto  → sirve WebP/AVIF si el navegador lo admite, si no JPEG
// La transformación va en la RUTA, antes de la versión, separada por comas:
//   /image/upload/v123/inspections/x.png
//   /image/upload/q_auto,f_auto/v123/inspections/x.png
const CLOUDINARY_UPLOAD_URL_RE = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video|raw)\/upload\/)(.*)$/;
const VERSION_SEGMENT_RE = /^v\d+$/;

export function getOptimizedImageUrl(url: string): string {
  if (!url || !/^https?:\/\//.test(url)) return url;
  if (url.includes('q_auto') || url.includes('f_auto')) return url;

  const match = url.match(CLOUDINARY_UPLOAD_URL_RE);
  if (!match) return url;

  const [, prefix, rest] = match;
  const segments = rest.split('/');

  if (VERSION_SEGMENT_RE.test(segments[0])) {
    // URL sin transformaciones: se antepone el bloque nuevo.
    segments.unshift('q_auto,f_auto');
  } else if (segments.slice(1).some((s) => VERSION_SEGMENT_RE.test(s))) {
    // Ya hay transformaciones: se añaden al mismo segmento, separadas por
    // coma (es el separador de Cloudinary en la ruta, no un `&`).
    segments[0] = `${segments[0]},q_auto,f_auto`;
  } else {
    // Sin versión ni transformaciones (URL de api.cloudinary.com o similar).
    segments.unshift('q_auto,f_auto');
  }

  return prefix + segments.join('/');
}

// Comprime en el navegador ANTES de subir: mismo tamaño en píxeles, menos
// bytes que atravesar la red. Reduce de ~9MB a ~1-2MB el tráfico de subida;
// el grueso del ahorro lo hace después q_auto,f_auto en el CDN.
// Se usa solo si el resultado es más pequeño que el original.
export async function compressImage(file: File, quality: number = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo crear el contexto del canvas');
    ctx.drawImage(bitmap, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    if (!blob || blob.size >= file.size) return file;
    return blob;
  } finally {
    bitmap.close();
  }
}
