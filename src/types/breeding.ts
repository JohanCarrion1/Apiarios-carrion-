import type { PhotoData } from '../services/photos';

export type BreedingType = 'Traslarve' | 'Nicot';

export type WithdrawalMethod = 'enjaular' | 'realeras';

export type BreedingStatus =
  | 'enRealeras'
  | 'enjauladas'
  | 'nacidas'
  | 'fecundando'
  | 'aceptadas'
  | 'perdidas';

export interface BreedingLot {
  id: string;
  tipo: BreedingType;
  coloniaDonante: string;
  coloniasReceptoras: string[];
  fechaInicio: string;
  cantidadPortacupulas: number;
  fechaEnjauladoEstimada: string;
  fechaNacimientoEstimada: string;
  metodoRetiro: WithdrawalMethod;
  estado: BreedingStatus;
  notas: string;
  fotos?: PhotoData[];
  fechaCreacion: string;
  estadoHistorial: { estado: BreedingStatus | 'aceptacion'; fecha: string; descripcion?: string }[];
  acceptance?: {
    acceptedCount: number;
    totalCount: number;
    percentage: number;
    notes?: string;
    registeredAt: string;
  };
}

export const ACCEPTANCE_BADGES = (percentage: number) => {
  if (percentage >= 70) return { label: 'Alta aceptación', color: '#93cc68', bg: 'bg-sage/15 border-sage/40 text-sage' };
  if (percentage >= 40) return { label: 'Aceptación media', color: '#ffa90a', bg: 'bg-honey/15 border-honey/40 text-honey' };
  if (percentage === 0) return { label: 'Sin aceptación', color: '#f4552b', bg: 'bg-coral/15 border-coral/40 text-coral' };
  return { label: 'Baja aceptación', color: '#f4552b', bg: 'bg-coral/15 border-coral/40 text-coral' };
};

export const BREEDING_STATUS_LABELS: Record<BreedingStatus, string> = {
  enRealeras: 'En Realeras',
  enjauladas: 'Enjauladas',
  nacidas: 'Nacidas',
  fecundando: 'Fecundando',
  aceptadas: 'Aceptadas',
  perdidas: 'Perdidas',
};

export const BREEDING_STATUS_COLORS: Record<BreedingStatus, string> = {
  enRealeras: '#b19a68',
  enjauladas: '#ffa90a',
  nacidas: '#93cc68',
  fecundando: '#6fa8dc',
  aceptadas: '#93cc68',
  perdidas: '#f4552b',
};

export const BREEDING_TYPE_LABELS: Record<BreedingType, string> = {
  Traslarve: 'Traslarve',
  Nicot: 'Nicot',
};

export interface CuadernoEntry {
  id: string;
  date: string;
  text: string;
  type: 'inspection' | 'breeding' | 'general';
  breedingLotId?: string;
}
