import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Hive, Inspection, HiveStatus, Equipamiento } from "../types/hive";
import type { Queen, QueenChange } from '../types/queen';
import type { BreedingLot } from '../types/breeding';
import type { Fecundador } from '../types/fecundador';
import HiveComb from './HiveComb';
import HiveDetail from './HiveDetail';
import FecundadoresSection from './FecundadoresSection';
import { IconPlus } from '../ui';
import type { PhotoData } from '../services/photos';
import { useClosingPanel } from '../hooks/useClosingPanel';

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
  onDeleteInspection?: (inspectionId: string) => void;
  onDeleteInspectionPhoto?: (inspectionId: string, photoId: string) => void;
  onUpdateEquipment?: (id: string, equipamiento: Equipamiento) => void;
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
  onTransfer?: (hive: Hive, destApiaryId: string, motivo: string, fecha: string) => boolean;
  fecundadores?: Fecundador[];
  onFecundadorToast?: (title: string, desc?: string) => void;
  onAddFecundadorCuaderno?: (text: string) => void;
  onCreateFecundador?: (f: Fecundador) => void;
  onUpdateFecundador?: (f: Fecundador) => void;
  onDeleteFecundador?: (id: string) => void;
  onPromoteFecundador?: (fecundador: Fecundador) => void;
  onShowFecundadorBreedingLot?: (lotId: string) => void;
  onTransferFecundador?: (fecundador: Fecundador, destApiaryId: string, motivo: string, fecha: string) => boolean;
  /** Ancla solicitada desde el menú (anchor-colmenas | anchor-nucleos | anchor-fecundadores). */
  focusAnchor?: string | null;
  /** Callback para limpiar el ancla después de desplazarse. */
  onAnchorConsumed?: () => void;
  /** Códigos de colmena asignados a contratos de polinización activos. */
  polinizacionCodes?: string[];
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
  onDeleteInspection,
  onDeleteInspectionPhoto,
  onUpdateEquipment,
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
  fecundadores = [],
  onFecundadorToast,
  onAddFecundadorCuaderno,
  onCreateFecundador = () => {},
  onUpdateFecundador = () => {},
  onDeleteFecundador = () => {},
  onPromoteFecundador = () => {},
  onShowFecundadorBreedingLot = () => {},
  onTransferFecundador,
  focusAnchor,
  onAnchorConsumed,
  polinizacionCodes = [],
}: HivesSectionProps) {
  // Estados para colmenas
  const [searchQueryHives, setSearchQueryHives] = useState('');

  // Estados para núcleos
  const [searchQueryNuclei, setSearchQueryNuclei] = useState('');

  // Filtro de estado por sección
  const [statusFilterHives, setStatusFilterHives] = useState<HiveStatus | 'todas' | 'transferidas' | 'polinizacion'>('todas');
  const [statusFilterNuclei, setStatusFilterNuclei] = useState<HiveStatus | 'todas' | 'transferidas' | 'polinizacion'>('todas');

  // Id de la entidad en animación de salida (estado "closing"): un closing por
  // tipo, con clearTimeout al reabrir para que no queden timeouts huérfanos
  const { closingId: closingHiveId, beginClose: beginCloseHive, cancelClosing: cancelHiveClose } = useClosingPanel();
  const { closingId: closingNucleusId, beginClose: beginCloseNucleus, cancelClosing: cancelNucleusClose } = useClosingPanel();

  // Desplazarse al ancla solicitada desde el menú hamburguesa (p. ej.
  // "Mis núcleos"). Espera al fin de la animación de entrada de la sección.
  useEffect(() => {
    if (!focusAnchor) return;
    const t = window.setTimeout(() => {
      document.getElementById(focusAnchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onAnchorConsumed?.();
    }, 320);
    return () => window.clearTimeout(t);
  }, [focusAnchor, onAnchorConsumed]);

  const handleSelectHive = (id: string) => {
    cancelHiveClose();
    onSelectHive(id);
  };

  const handleCloseHive = () => {
    if (!selectedHiveId) return;
    beginCloseHive(selectedHiveId, () => onSelectHive(''));
  };

  const handleSelectNucleus = (id: string) => {
    cancelNucleusClose();
    onSelectNucleus(id);
  };

  const handleCloseNucleus = () => {
    if (!selectedNucleusId) return;
    beginCloseNucleus(selectedNucleusId, () => onSelectNucleus(''));
  };

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

  // Si la entidad seleccionada desaparece (se borró, o el usuario la excluyó
  // con el buscador o con un chip de estado), la selección huérfana se limpia:
  // antes quedaba abierto un panel de detalle de algo que ya no está en la
  // rejilla, con datos que no correspondían a lo que se veía.
  useEffect(() => {
    if (selectedHiveId && !hives.some((h) => h.id === selectedHiveId)) onSelectHive('');
  }, [selectedHiveId, hives, onSelectHive]);
  useEffect(() => {
    if (selectedNucleusId && !nuclei.some((h) => h.id === selectedNucleusId)) onSelectNucleus('');
  }, [selectedNucleusId, nuclei, onSelectNucleus]);

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
              {hives.length} colmena{hives.length !== 1 ? 's' : ''} · {nuclei.length} núcleo{nuclei.length !== 1 ? 's' : ''} · {fecundadores.length} fecundador{fecundadores.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
      </motion.div>

      {/* SECCIÓN 1: COLMENAS (aparece primero; el scroll muestra las siguientes) */}
      <motion.div
        id="anchor-colmenas"
        className="space-y-6 scroll-mt-28"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <div>
            <h2 className="font-display text-3xl font-bold text-cream">Colmenas</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-lg font-mono text-cream">{filteredHives.length} colonia{filteredHives.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              aria-label="Crear colmena"
              onClick={onAddHive}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5A623] text-ink shadow-[0_2px_12px_rgba(245,166,35,.5)] transition-all hover:shadow-[0_4px_16px_rgba(245,166,35,.75)]"
            >
              <IconPlus className="h-5 w-5" />
            </button>
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
          onSelect={handleSelectHive}
          filter={statusFilterHives}
          onFilter={setStatusFilterHives}
          query=""
          entityType="colmena"
          polinizacionCodes={polinizacionCodes}
        />

        {/* Detalle de colmena seleccionada */}
        <div className={`accordion-grid ${selectedHive && closingHiveId !== selectedHive.id ? 'open' : ''}`}>
          {selectedHive && (
            <HiveDetail
              hive={selectedHive}
              closing={closingHiveId === selectedHive.id}
              onClose={handleCloseHive}
              inspections={(inspections || []).filter(i => i.hiveId === selectedHive.id)}
              totalHives={hives.length}
              onInspect={onInspectHive}
              onEdit={onEditHive}
              onDelete={onDeleteHive}
              onShowToast={onShowToast}
              onUpdateFotos={onUpdateHivePhotos}
              onDeleteInspection={onDeleteInspection}
              onDeleteInspectionPhoto={onDeleteInspectionPhoto}
              onUpdateEquipment={onUpdateEquipment}
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
      </motion.div>

      {/* SECCIÓN 2: NÚCLEOS (aparece al hacer scroll) */}
      <motion.div
        id="anchor-nucleos"
        className="space-y-6 scroll-mt-28"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <div>
            <h2 className="font-display text-3xl font-bold text-cream">Núcleos</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-lg font-mono text-cream">{filteredNuclei.length} núcleo{filteredNuclei.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              aria-label="Crear núcleo"
              onClick={onAddNucleus}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5A623] text-ink shadow-[0_2px_12px_rgba(245,166,35,.5)] transition-all hover:shadow-[0_4px_16px_rgba(245,166,35,.75)]"
            >
              <IconPlus className="h-5 w-5" />
            </button>
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
          onSelect={handleSelectNucleus}
          filter={statusFilterNuclei}
          onFilter={setStatusFilterNuclei}
          query=""
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
        <div className={`accordion-grid ${selectedNucleus && closingNucleusId !== selectedNucleus.id ? 'open' : ''}`}>
          {selectedNucleus && (
            <HiveDetail
              hive={selectedNucleus}
              closing={closingNucleusId === selectedNucleus.id}
              onClose={handleCloseNucleus}
              inspections={(inspections || []).filter(i => i.hiveId === selectedNucleus.id)}
              totalHives={nuclei.length}
              onInspect={onInspectNucleus}
              onEdit={onEditNucleus}
              onDelete={onDeleteNucleus}
              onShowToast={onShowToast}
              onUpdateFotos={onUpdateNucleusPhotos}
              onDeleteInspection={onDeleteInspection}
              onDeleteInspectionPhoto={onDeleteInspectionPhoto}
              onUpdateEquipment={onUpdateEquipment}
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
      </motion.div>

      {/* SECCIÓN 3: FECUNDADORES (aparece al hacer scroll) */}
      <motion.div
        id="anchor-fecundadores"
        className="space-y-6 scroll-mt-28"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <FecundadoresSection
          fecundadores={fecundadores}
          breedingLots={breedingLots}
          nuclei={nuclei}
          onShowToast={onFecundadorToast}
          onAddCuadernoEntry={onAddFecundadorCuaderno}
          onCreate={onCreateFecundador}
          onUpdate={onUpdateFecundador}
          onDelete={onDeleteFecundador}
          onPromote={onPromoteFecundador}
          onShowBreedingLot={onShowFecundadorBreedingLot}
          apiaries={apiaries}
          currentApiaryId={currentApiaryId}
          onTransferFecundador={onTransferFecundador}
        />
      </motion.div>

    </div>
  );
}
