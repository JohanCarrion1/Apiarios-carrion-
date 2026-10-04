import type { PhotoData } from './photos';

export const MAX_INSPECTION_PHOTOS = 5;

interface InspectionPhotoLike {
  fotos?: PhotoData[];
  photos?: string[];
  date?: string;
}

export function collectInspectionPhotos(ins?: InspectionPhotoLike): PhotoData[] {
  if (!ins) return [];
  const legacy = ins.fotos || [];
  const base = ins.date ? new Date(ins.date).getTime() : Date.now();
  const remote = (ins.photos || []).map((url, idx) => ({
    id: url,
    data: url,
    timestamp: base + idx,
    size: 0,
  }));
  return [...legacy, ...remote];
}

export function inspectionPhotoCount(ins?: InspectionPhotoLike): number {
  return (ins?.fotos?.length || 0) + (ins?.photos?.length || 0);
}

export function isStoragePhotoId(id: string): boolean {
  return /^https?:\/\//.test(id);
}