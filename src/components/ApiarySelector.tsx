import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';
import { getUserApiaries, createApiary, type Apiary } from '../services/apiaryService';
import { saveLastActiveApiaryId } from '../utils/storage';
import PhotoUploader from './PhotoUploader';
import type { PhotoData } from '../services/photos';

export default function ApiarySelector() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newApiaryName, setNewApiaryName] = useState('');
  const [newApiaryLocation, setNewApiaryLocation] = useState('');
  const [newApiaryPhotos, setNewApiaryPhotos] = useState<PhotoData[]>([]);
  const [creating, setCreating] = useState(false);

  // Cargar apiarios del usuario
  useEffect(() => {
    if (user) {
      loadApiaries();
    }
  }, [user]);

  const loadApiaries = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userApiaries = await getUserApiaries(user.uid);
      setApiaries(userApiaries);
      
      // Si no tiene apiarios, mostrar formulario de creación
      if (userApiaries.length === 0) {
        setShowCreateForm(true);
      }
    } catch (error) {
      console.error('❌ Error al cargar apiarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newApiaryName.trim()) return;

    try {
      console.log('🔄 [APIARY] Iniciando creación de apiario...');
      console.log('🔄 [APIARY] Datos:', { 
        userId: user.uid, 
        name: newApiaryName, 
        location: newApiaryLocation 
      });
      
      setCreating(true);
      
      // Crear apiario en localStorage (sin coordenadas por ahora)
      const apiaryId = await createApiary(
        user.uid, 
        newApiaryName, 
        newApiaryLocation,
        undefined,
        newApiaryPhotos
      );
      
      console.log('✅ [APIARY] Apiario creado exitosamente:', apiaryId);
      
      // Guardar como último activo y entrar directo al dashboard del nuevo apiario
      saveLastActiveApiaryId(apiaryId, user.uid);
      console.log('✅ [APIARY] Navegando directo al dashboard del apiario creado');
      navigate(`/dashboard/${apiaryId}`);
    } catch (error: any) {
      console.error('❌ [APIARY] Error al crear apiario:', error);
      console.error('❌ [APIARY] Error completo:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      
      // Mostrar mensaje de error más específico
      const errorMessage = error.message || 'Error desconocido al crear el apiario';
      alert(`Error al crear el apiario: ${errorMessage}\n\nPor favor intenta de nuevo.`);
    } finally {
      console.log('🔄 [APIARY] Resetando estado de carga...');
      setCreating(false);
    }
  };

  if (loading) {
    return <LoadingScreen size="lg" label="Cargando apiarios..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-ink p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-4xl font-bold text-cream mb-2">
            Mis Apiarios
          </h1>
          <p className="text-husk">
            Selecciona un apiario para gestionar sus colmenas
          </p>
        </motion.div>

        {/* Formulario de creación */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card p-6 mb-8"
            >
              <h2 className="font-display text-2xl font-bold text-cream mb-4">
                Crear tu primer apiario
              </h2>
              <form onSubmit={handleCreateApiary} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-husk mb-2">
                    Nombre del apiario *
                  </label>
                  <input
                    type="text"
                    value={newApiaryName}
                    onChange={(e) => setNewApiaryName(e.target.value)}
                    required
                    placeholder="Ej: Apiario La Dehesa"
                    className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-cream placeholder:text-husk/50 focus:border-honey focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-husk mb-2">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={newApiaryLocation}
                    onChange={(e) => setNewApiaryLocation(e.target.value)}
                    placeholder="Ej: Cochac, Independencia, Áncash"
                    className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-cream placeholder:text-husk/50 focus:border-honey focus:outline-none"
                  />
                </div>
                <div className="border-t border-line pt-4">
                  <PhotoUploader photos={newApiaryPhotos} onPhotosChange={setNewApiaryPhotos} />
                </div>
                <div className="flex gap-3">
                  <motion.button
                    type="submit"
                    disabled={creating}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 rounded-xl bg-honey py-3 font-semibold text-ink hover:bg-honeysoft disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creando...' : 'Crear Apiario'}
                  </motion.button>
                  {apiaries.length > 0 && (
                    <motion.button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-6 rounded-xl border border-line py-3 font-semibold text-husk hover:text-cream"
                    >
                      Cancelar
                    </motion.button>
                  )}
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lista de apiarios */}
        {!showCreateForm && apiaries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apiaries.map((apiary, index) => {
              return (
                <motion.div
                  key={apiary.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  className="card p-6 hover:border-honey/50 transition-colors relative group"
                >
                  <button
                    onClick={() => {
                      // Guardar el ID del apiario como último activo
                      if (user) saveLastActiveApiaryId(apiary.id, user.uid);
                      // Navegar al dashboard
                      navigate(`/dashboard/${apiary.id}`);
                    }}
                    className="block absolute inset-0 z-30 w-full h-full"
                    aria-label={`Ver apiario ${apiary.name}`}
                  />
                  <div className="flex items-start justify-between mb-4 relative z-10 pointer-events-none">
                    <div className="flex-1">
                      <h3 className="font-display text-xl font-bold text-cream mb-1">
                        {apiary.name}
                      </h3>
                      {apiary.location && (
                        <p className="text-sm text-husk">{apiary.location}</p>
                      )}
                    </div>
                    <div className="text-honey">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-husk relative z-10 pointer-events-none">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Creado {new Date(apiary.createdAt).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Botón para crear nuevo apiario */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: apiaries.length * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateForm(true)}
              className="card p-6 cursor-pointer hover:border-honey/50 transition-colors flex items-center justify-center min-h-[200px]"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-honey/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-honey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-cream font-semibold">Crear nuevo apiario</p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Mensaje si no hay apiarios y no se está mostrando el formulario */}
        {!showCreateForm && apiaries.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-husk mb-4">No tienes apiarios registrados</p>
            <motion.button
              onClick={() => setShowCreateForm(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-xl bg-honey px-6 py-3 font-semibold text-ink hover:bg-honeysoft"
            >
              Crear tu primer apiario
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
