// Tipos de datos para el historial de transferencias

export type TransferType = 'nucleo_a_colmena' | 'nucleo_apiario' | 'colmena_apiario' | 'fecundador_a_nucleo' | 'fecundador_apiario';

export interface TransferRecord {
  id: string;
  tipo: TransferType;
  entidadCodigo: string; // N-01, C-05, etc.
  desdeApiarioId?: string;
  hastaApiarioId?: string;
  desdeApiarioNombre?: string;
  hastaApiarioNombre?: string;
  motivo?: string;
  fecha: string; // ISO date
  registradaPor: string; // userId
}

export const TRANSFER_TYPE_LABELS: Record<TransferType, string> = {
  nucleo_a_colmena: 'Núcleo → Colmena',
  nucleo_apiario: 'Núcleo entre apiarios',
  colmena_apiario: 'Colmena entre apiarios',
  fecundador_a_nucleo: 'Fecundador → Núcleo',
  fecundador_apiario: 'Fecundador entre apiarios',
};