import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { STATUS_COLORS, type Hive, type HiveStatus } from "../types/hive";
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
  onRegisterQueen?: (hive: Hive) => void;
  onEditQueen?: (queen: Queen) => void;
  onChangeQueen?: (queen: Queen, hive: Hive) => void;
  onMarkQueenLost?: (queen: Queen) => void;
  breedingLots?: BreedingLot[];
  onShowQueenLot?: (loteId: string) => void;
}

type SortOption = 'code' | 'lastInspection' | 'status' | 'health';

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
  onRegisterQueen,
  onEditQueen,
  onChangeQueen,
  onMarkQueenLost,
  breedingLots = [],
  onShowQueenLot,
}: HivesSectionProps) {
  // Estados para colmenas
  const [searchQueryHives, setSearchQueryHives] = useState('');
  const [filterHives, setFilterHives] = useState<HiveStatus | "todas">("todas");
  const [sortByHives, setSortByHives] = useState<SortOption>('code');

  // Estados para núcleos
  const [searchQueryNuclei, setSearchQueryNuclei] = useState('');
  const [filterNuclei, setFilterNuclei] = useState<HiveStatus | "todas">("todas");
  const [sortByNuclei, setSortByNuclei] = useState<SortOption>('code');

  // Calcular salud
  const calculateHealth = (hive: Hive): number => {
    let health = 100;
    const daysSinceInspection = Math.floor(
      (Date.now() - new Date(hive.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceInspection > 30) health -= 40;
    else if (daysSinceInspection > 14) health -= 20;
    else if (daysSinceInspection > 7) health -= 10;
    
    if (hive.status === 'alerta') health -= 30;
    else if (hive.status === 'sin_reina') health -= 50;
    else if (hive.status === 'revision') health -= 15;
    
    return Math.max(0, Math.min(100, health));
  };

  // Filtrar y ordenar colmenas
  const filteredHives = useMemo(() => {
    let result = [...hives];
    
    if (searchQueryHives.trim()) {
      const query = searchQueryHives.toLowerCase();
      result = result.filter(h => 
        h.code.toLowerCase().includes(query) ||
        (h.name && h.name.toLowerCase().includes(query))
      );
    }
    
    if (filterHives !== 'todas') {
      result = result.filter(h => h.status === filterHives);
    }
    
    result.sort((a, b) => {
      switch (sortByHives) {
        case 'code':
          return a.code.localeCompare(b.code);
        case 'lastInspection':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'status':
          const statusOrder = { alerta: 0, sin_reina: 1, revision: 2, saludable: 3 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'health':
          return calculateHealth(b) - calculateHealth(a);
        default:
          return 0;
      }
    });
    
    return result;
  }, [hives, searchQueryHives, filterHives, sortByHives]);

  // Filtrar y ordenar núcleos
  const filteredNuclei = useMemo(() => {
    let result = [...nuclei];
    
    if (searchQueryNuclei.trim()) {
      const query = searchQueryNuclei.toLowerCase();
      result = result.filter(h => 
        h.code.toLowerCase().includes(query) ||
        (h.name && h.name.toLowerCase().includes(query))
      );
    }
    
    if (filterNuclei !== 'todas') {
      result = result.filter(h => h.status === filterNuclei);
    }
    
    result.sort((a, b) => {
      switch (sortByNuclei) {
        case 'code':
          return a.code.localeCompare(b.code);
        case 'lastInspection':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'status':
          const statusOrder = { alerta: 0, sin_reina: 1, revision: 2, saludable: 3 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'health':
          return calculateHealth(b) - calculateHealth(a);
        default:
          return 0;
      }
    });
    
    return result;
  }, [nuclei, searchQueryNuclei, filterNuclei, sortByNuclei]);

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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Mapa del bancal</p>
            <h2 className="font-display text-3xl font-bold text-cream">Colmenas</h2>
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

          <div className="flex flex-wrap gap-3">
            <select
              value={filterHives}
              onChange={(e) => setFilterHives(e.target.value as HiveStatus | "todas")}
              className="rounded-xl border border-line bg-ink/50 px-4 py-2.5 text-sm text-cream"
            >
              <option value="todas">Todas</option>
              <option value="saludable">Saludable</option>
              <option value="revision">Revisión</option>
              <option value="alerta">Alerta</option>
              <option value="sin_reina">Sin reina</option>
            </select>

            <select
              value={sortByHives}
              onChange={(e) => setSortByHives(e.target.value as SortOption)}
              className="rounded-xl border border-line bg-ink/50 px-4 py-2.5 text-sm text-cream"
            >
              <option value="code">Código</option>
              <option value="lastInspection">Última inspección</option>
              <option value="status">Estado</option>
              <option value="health">Salud</option>
            </select>
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
            inspections={[]}
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
          />
        )}
      </div>

      {/* BLOQUE 2: NÚCLEOS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Mapa del bancal</p>
            <h2 className="font-display text-3xl font-bold text-cream">Núcleos</h2>
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

          <div className="flex flex-wrap gap-3">
            <select
              value={filterNuclei}
              onChange={(e) => setFilterNuclei(e.target.value as HiveStatus | "todas")}
              className="rounded-xl border border-line bg-ink/50 px-4 py-2.5 text-sm text-cream"
            >
              <option value="todas">Todos</option>
              <option value="saludable">Saludable</option>
              <option value="revision">Revisión</option>
              <option value="alerta">Alerta</option>
              <option value="sin_reina">Sin reina</option>
            </select>

            <select
              value={sortByNuclei}
              onChange={(e) => setSortByNuclei(e.target.value as SortOption)}
              className="rounded-xl border border-line bg-ink/50 px-4 py-2.5 text-sm text-cream"
            >
              <option value="code">Código</option>
              <option value="lastInspection">Última inspección</option>
              <option value="status">Estado</option>
              <option value="health">Salud</option>
            </select>
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
            inspections={[]}
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
          />
        )}
      </div>
    </div>
  );
}
