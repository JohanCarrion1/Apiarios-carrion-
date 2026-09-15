import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Hive, Inspection } from "../types/hive";
import type { Queen, QueenChange } from '../types/queen';
import type { BreedingLot } from '../types/breeding';
import HiveComb from './HiveComb';
import HiveDetail from './HiveDetail';
import type { PhotoData } from '../services/photos';

interface HivesSectionProps {
  hives: Hive[];
  nuclei: Hive[];
  selectedHiveId: string | null;
  selectedNucleusId: string | null;
  onSelectHive: (id: string) => void;
  onSelectNucleus: (id: string) => void;
  onAddHive: () => void;
  onAddNucleus: () => void;
  onEditHive: (hive: Hive) => void;
  onEditNucleus: (nucleus: Hive) => void;
  onDeleteHive: (id: string) => void;
  onDeleteNucleus: (id: string) => void;
  onInspectHive: (id: string) => void;
  onInspectNucleus: (id: string) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
  onUpdateHivePhotos?: (id: string, fotos: PhotoData[]) => void;
  onUpdateNucleusPhotos?: (id: string, fotos: PhotoData[]) => void;
  queens?: Queen[];
  queenHistory?: QueenChange[];
  inspections?: Inspection[];
  nextHiveCode?: string;
  onRegisterQueen?: (hive: Hive) => void;
  onEditQueen?: (queen: Queen) => void;
  onChangeQueen?: (queen: Queen, hive: Hive) => void;
  onMarkQueenLost?: (queen: Queen) => void;
  breedingLots?: BreedingLot[];
  onShowQueenLot?: (loteId: string) => void;
  apiaries?: { id: string; name?: string }[];
  currentApiaryId?: string;
  onConvertNucleus?: (hive: Hive) => void;
  onTransfer?: (hive: Hive, destApiaryId: string, motivo: string, fecha: string) => void;
}

export default function HivesSection({
  hives,
  nuclei,
  selectedHiveId,
  selectedNucleusId,
  onSelectHive,
  onSelectNucleus,
  onAddHive,
  onAddNucleus,
  onEditHive,
  onEditNucleus,
  onDeleteHive,
  onDeleteNucleus,
  onInspectHive,
  onInspectNucleus,
  onShowToast,
  onUpdateHivePhotos,
  onUpdateNucleusPhotos,
  queens = [],
  queenHistory = [],
  inspections,
  nextHiveCode,
  onRegisterQueen,
  onEditQueen,
  onChangeQueen,
  onMarkQueenLost,
  breedingLots = [],
  onShowQueenLot,
  apiaries = [],
  currentApiaryId,
  onConvertNucleus,
  onTransfer,
}: HivesSectionProps) {
  // Estados para colmenas
  const [searchQueryHives, setSearchQueryHives] = useState('');

  // Estados para núcleos
  const [searchQueryNuclei, setSearchQueryNuclei] = useState('');

  // Filtrar colmenas
  const filteredHives = useMemo(() => {
    let result = [...hives];
    
    if (searchQueryHives.trim()) {
      const query = searchQueryHives.toLowerCase();
      result = result.filter(h => 
        h.code.toLowerCase().includes(query) ||
        (h.name && h.name.toLowerCase().includes(query))
      );
    }
    
    return result;
  }, [hives, searchQueryHives]);

  // Filtrar núcleos
  const filteredNuclei = useMemo(() => {
    let result = [...nuclei];
    
    if (searchQueryNuclei.trim()) {
      const query = searchQueryNuclei.toLowerCase();
      result = result.filter(h => 
        h.code.toLowerCase().includes(query) ||
        (h.name && h.name.toLowerCase().includes(query))
      );
    }
    
    return result;
  }, [nuclei, searchQueryNuclei]);

  const selectedHive = hives.find(h => h.id === selectedHiveId);
  const selectedNucleus = nuclei.find(h => h.id === selectedNucleusId);

  const getQueenForHive = (hive?: Hive): Queen | null => {
    if (!hive) return null;
    const hiveQueens = queens
      .filter(q => q.hiveId === hive.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const active = hiveQueens.find(q => q.estado === 'activa');
    return active ?? hiveQueens[0] ?? null;
  };

  return (
    <div className="space-y-12">
      {/* Resumen general */}
      <motion.div 
        className="card p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Resumen del Apiario</p>
            <p className="font-display text-2xl font-bold text-cream">
              {hives.length} colmena{hives.length !== 1 ? 's' : ''} · {nuclei.length} núcleo{nuclei.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </motion.div>

      {/* BLOQUE 1: COLMENAS */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Mapa del bancal</p>
            <h2 className="font-display text-3xl font-bold text-cream">Colmenas</h2>
          </div>
          <div className="text-right">
            <p className="text-lg font-mono text-cream">{filteredHives.length} colonia{filteredHives.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-husk">distribución por calles</p>
          </div>
        </div>

        {/* Controles de colmenas */}
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={searchQueryHives}
              onChange={(e) => setSearchQueryHives(e.target.value)}
              placeholder="Buscar colmena..."
              className="w-full rounded-xl border border-line bg-ink/50 pl-12 pr-12 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-husk" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQueryHives && (
              <button
                onClick={() => setSearchQueryHives('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-husk/20 hover:bg-husk/40 flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mapa de colmenas */}
        <HiveComb
          hives={filteredHives}
          selectedId={selectedHiveId || ''}
          onSelect={onSelectHive}
          filter="todas"
          onFilter={() => {}}
          query=""
          onAdd={onAddHive}
          entityType="colmena"
        />

        {/* Detalle de colmena seleccionada */}
        {selectedHive && (
          <HiveDetail
            hive={selectedHive}
            inspections={(inspections || []).filter(i => i.hiveId === selectedHive.id)}
            totalHives={hives.length}
            onInspect={onInspectHive}
            onEdit={onEditHive}
            onDelete={onDeleteHive}
            onShowToast={onShowToast}
            onUpdateFotos={onUpdateHivePhotos}
            queen={getQueenForHive(selectedHive)}
            queenHistory={queenHistory}
            onRegisterQueen={onRegisterQueen}
            onEditQueen={onEditQueen}
            onChangeQueen={onChangeQueen}
            onMarkQueenLost={onMarkQueenLost}
            breedingLots={breedingLots}
            onShowQueenLot={onShowQueenLot}
            apiaries={apiaries}
            currentApiaryId={currentApiaryId}
            nextHiveCode={nextHiveCode}
            onConvertNucleus={onConvertNucleus}
            onTransfer={onTransfer}
          />
        )}
      </div>

      {/* BLOQUE 2: NÚCLEOS */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Mapa del bancal</p>
            <h2 className="font-display text-3xl font-bold text-cream">Núcleos</h2>
          </div>
          <div className="text-right">
            <p className="text-lg font-mono text-cream">{filteredNuclei.length} núcleo{filteredNuclei.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-husk">distribución por calles</p>
          </div>
        </div>

        {/* Controles de núcleos */}
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={searchQueryNuclei}
              onChange={(e) => setSearchQueryNuclei(e.target.value)}
              placeholder="Buscar núcleo..."
              className="w-full rounded-xl border border-line bg-ink/50 pl-12 pr-12 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-husk" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQueryNuclei && (
              <button
                onClick={() => setSearchQueryNuclei('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-husk/20 hover:bg-husk/40 flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mapa de núcleos */}
        <HiveComb
          hives={filteredNuclei}
          selectedId={selectedNucleusId || ''}
          onSelect={onSelectNucleus}
          filter="todas"
          onFilter={() => {}}
          query=""
          onAdd={onAddNucleus}
          entityType="nucleo"
          title="Núcleos"
          countLabel="núcleos"
          allChipLabel="TODOS"
          emptyStateText="No hay núcleos registrados"
          emptyStateInvitation="Agrega tu primer núcleo para empezar"
          helpText="Toca una celda para ver detalles del núcleo"
          entitySingular="núcleo"
        />

        {/* Detalle de núcleo seleccionado */}
        {selectedNucleus && (
          <HiveDetail
            hive={selectedNucleus}
            inspections={(inspections || []).filter(i => i.hiveId === selectedNucleus.id)}
            totalHives={nuclei.length}
            onInspect={onInspectNucleus}
            onEdit={onEditNucleus}
            onDelete={onDeleteNucleus}
            onShowToast={onShowToast}
            onUpdateFotos={onUpdateNucleusPhotos}
            queen={getQueenForHive(selectedNucleus)}
            queenHistory={queenHistory}
            onRegisterQueen={onRegisterQueen}
            onEditQueen={onEditQueen}
            onChangeQueen={onChangeQueen}
            onMarkQueenLost={onMarkQueenLost}
            breedingLots={breedingLots}
            onShowQueenLot={onShowQueenLot}
            apiaries={apiaries}
            currentApiaryId={currentApiaryId}
            nextHiveCode={nextHiveCode}
            onConvertNucleus={onConvertNucleus}
            onTransfer={onTransfer}
          />
        )}
      </div>
    </div>
  );
}
