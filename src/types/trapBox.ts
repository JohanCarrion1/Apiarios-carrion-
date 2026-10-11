// ============================================================
// Tipos de CAJAS TRAMPA (captura de enjambres en el monte)
// ============================================================
// Una caja trampa es un punto físico (apiario propio o lugar nuevo en el
// monte) donde se coloca un atrayente para capturar enjambres. Se controla la
// renovación del atrayente (cada 30 días) y las capturas registradas.

export type TrapBoxType = 'APIS' | 'MELI';
export type TrapBoxStatus = 'available' | 'occupied' | 'bait_expired';
export type TrapCaptureSize = 'small' | 'medium' | 'large';

export const TRAP_BOX_TYPES: TrapBoxType[] = ['APIS', 'MELI'];

export const TRAP_TYPE_LABELS: Record<TrapBoxType, string> = {
  APIS: 'APIS',
  MELI: 'MELI',
};

export const TRAP_TYPE_DESCRIPTIONS: Record<TrapBoxType, string> = {
  APIS: 'Abejas melíferas (Apis mellifera)',
  MELI: 'Abejas sin aguijón (meliponas)',
};

export const TRAP_STATUS_LABELS: Record<TrapBoxStatus, string> = {
  available: 'Disponible',
  occupied: 'Con enjambre',
  bait_expired: 'Atrayente vencido',
};

export const TRAP_STATUS_COLORS: Record<TrapBoxStatus, string> = {
  available: '#a3bf7f',
  occupied: '#f0a41c',
  bait_expired: '#e4603f',
};

export const TRAP_CAPTURE_SIZES: TrapCaptureSize[] = ['small', 'medium', 'large'];

export const TRAP_SIZE_LABELS: Record<TrapCaptureSize, string> = {
  small: 'Pequeño',
  medium: 'Mediano',
  large: 'Grande',
};

/** Días que dura el atrayente antes de necesitar renovación. */
export const BAIT_INTERVAL_DAYS = 30;

export interface TrapBoxLocation {
  lat: number;
  lng: number;
  /** Representación opcional en grados/minutos/segundos. */
  dms?: string;
}

export interface TrapCapture {
  date: string;
  type: TrapBoxType;
  size: TrapCaptureSize;
  notes: string;
  /** Código del núcleo creado al promover la captura (opcional). */
  promotedToNucleus?: string;
}

export interface TrapBox {
  /** Id corto tipo TRP-001 (usado como id de documento en Firestore). */
  id: string;
  userId: string;
  apiaryId: string;
  name: string;
  type: TrapBoxType;
  location: TrapBoxLocation;
  status: TrapBoxStatus;
  /** Fechas YYYY-MM-DD. */
  installedDate: string;
  lastBaitCheck: string;
  nextBaitCheck: string;
  captures: TrapCapture[];
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  saved?: boolean;
}

/** Datos que envía el formulario (el resto lo calcula el servicio). */
export interface TrapBoxInput {
  apiaryId: string;
  name: string;
  type: TrapBoxType;
  location: TrapBoxLocation;
  installedDate: string;
  nextBaitCheck: string;
  notes: string;
}

/* ---------- helpers de fechas ---------- */

/** Fecha de hoy en formato YYYY-MM-DD (hora local). */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

/** Fecha de hoy + `days` días en formato YYYY-MM-DD. */
export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

/** true si la próxima revisión del atrayente ya venció. */
export function isBaitExpired(box: Pick<TrapBox, 'nextBaitCheck'>, today = todayISO()): boolean {
  return !!box.nextBaitCheck && box.nextBaitCheck < today;
}

/**
 * Estado efectivo para mostrar: si el atrayente venció se destaca sobre el
 * estado almacenado, salvo que la caja tenga un enjambre (ocupada manda).
 */
export function effectiveTrapStatus(
  box: Pick<TrapBox, 'status' | 'nextBaitCheck'>,
  today = todayISO()
): TrapBoxStatus {
  if (box.status === 'occupied') return 'occupied';
  if (isBaitExpired(box, today)) return 'bait_expired';
  return box.status === 'bait_expired' ? 'available' : box.status;
}

/* ---------- helpers de coordenadas ---------- */

/** Formatea lat/lng para mostrar (6 decimales, igual que geolocation). */
export function formatTrapCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/** Parsea un texto "lat, lng" (o "lat lng"). Devuelve null si no es válido. */
export function parseCoords(raw: string): { lat: number; lng: number } | null {
  if (!raw) return null;
  const nums = raw
    .trim()
    .split(/[\s,;]+/)
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n));
  if (nums.length < 2) return null;
  const [lat, lng] = nums;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function dmsPart(value: number, positive: string, negative: string): string {
  const dir = value >= 0 ? positive : negative;
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  return `${deg}°${String(min).padStart(2, '0')}'${sec}"${dir}`;
}

/** Convierte lat/lng a una cadena DMS legible, ej. 9°31'25.4"S 77°33'31.2"W. */
export function toDMS(lat: number, lng: number): string {
  return `${dmsPart(lat, 'N', 'S')} ${dmsPart(lng, 'E', 'W')}`;
}

const DMS_RE = /(\d+(?:[.,]\d+)?)\s*°\s*(\d+(?:[.,]\d+)?)?\s*['′]?\s*(\d+(?:[.,]\d+)?)?\s*["″]?\s*([NSEWnsew])/g;

/** Parsea una cadena DMS a lat/lng. Devuelve null si no hay dos componentes. */
export function parseDMS(raw: string): { lat: number; lng: number } | null {
  if (!raw) return null;
  DMS_RE.lastIndex = 0;
  const matches = [...raw.matchAll(DMS_RE)];
  if (matches.length < 2) return null;
  const parts = matches.slice(0, 2).map((m) => {
    const deg = parseFloat((m[1] || '0').replace(',', '.'));
    const min = parseFloat((m[2] || '0').replace(',', '.'));
    const sec = parseFloat((m[3] || '0').replace(',', '.'));
    let value = deg + min / 60 + sec / 3600;
    const dir = m[4].toUpperCase();
    if (dir === 'S' || dir === 'W') value = -value;
    return { value, dir };
  });
  const first = parts[0];
  const second = parts[1];
  if (first.dir === 'N' || first.dir === 'S') {
    return { lat: first.value, lng: second.value };
  }
  return { lat: second.value, lng: first.value };
}
