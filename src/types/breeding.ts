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
  estadoHistorial: { estado: BreedingStatus; fecha: string }[];
}

export const BREEDING_STATUS_LABELS: Record<BreedingStatus, string> = {
  enRealeras: 'En Realeras',
  enjauladas: 'Enjauladas',
  nacidas: 'Nacidas',
  fecundando: 'Fecundando',
  aceptadas: 'Aceptadas',
  perdidas: 'Perdidas',
};

export const BREEDING_STATUS_COLORS: Record<BreedingStatus, string> = {
  enRealeras: '#a3906a',
  enjauladas: '#f0a41c',
  nacidas: '#a3bf7f',
  fecundando: '#6fa8dc',
  aceptadas: '#a3bf7f',
  perdidas: '#e4603f',
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
