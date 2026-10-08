// Tratamientos sanitarios: fechas, período de espera y estado
import { addDays, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import type { Treatment } from '../types/hive';

/** Fin efectivo del tratamiento (si no tiene endDate, el propio inicio). */
export const treatmentEnd = (t: Treatment): Date => parseISO(t.endDate || t.startDate);

/** Primer día en el que se puede cosechar con seguridad. */
export const safeHarvestDate = (t: Treatment): Date => addDays(treatmentEnd(t), t.waitingDays);

/** Días que faltan para poder cosechar (<= 0 → ya se puede). */
export const daysUntilSafeHarvest = (t: Treatment, today: Date = new Date()): number =>
  differenceInCalendarDays(startOfDay(safeHarvestDate(t)), startOfDay(today));

export type TreatmentStatus = 'espera' | 'curso' | 'seguro';

/** espera = aún no empieza · curso = aplicado/pendiente de espera · seguro = ya se puede cosechar */
export const treatmentStatus = (t: Treatment, today: Date = new Date()): TreatmentStatus => {
  if (daysUntilSafeHarvest(t, today) <= 0) return 'seguro';
  return startOfDay(today) >= startOfDay(parseISO(t.startDate)) ? 'curso' : 'espera';
};

export const TREATMENT_STATUS_LABELS: Record<TreatmentStatus, string> = {
  espera: 'En preparación',
  curso: 'En curso',
  seguro: 'Seguro para cosechar',
};

/**
 * Productos habituales con una espera orientativa. NO sustituye a la ficha
 * técnica del producto: el apicultor siempre puede ajustar los días.
 */
export const TREATMENT_PRESETS: { product: string; waitingDays: number }[] = [
  { product: 'Amitraz (tiras)', waitingDays: 42 },
  { product: 'Flumetrina (Bayvarol)', waitingDays: 42 },
  { product: 'Ametrina (Apitraz)', waitingDays: 42 },
  { product: 'Timol', waitingDays: 7 },
  { product: 'Ácido oxálico', waitingDays: 7 },
  { product: 'Ácido fórmico', waitingDays: 7 },
];
