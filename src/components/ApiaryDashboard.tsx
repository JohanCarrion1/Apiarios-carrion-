import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';
import { getApiary, getApiaryHives, type Apiary, type HiveWithApiary } from '../services/apiaryService';
import type { Hive } from '../types/hive';
import PhotoGallery from './PhotoGallery';

interface ApiaryDashboardProps {
  apiaryId: string;
}

export default function ApiaryDashboard({ apiaryId }: ApiaryDashboardProps) {
  const { user } = useAuth();
  const [apiary, setApiary] = useState<Apiary | null>(null);
  const [hives, setHives] = useState<HiveWithApiary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApiaryData();
  }, [apiaryId]);

  const loadApiaryData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Cargar datos del apiario
      const apiaryData = await getApiary(user.uid, apiaryId);
      setApiary(apiaryData);
      
      // Cargar colmenas del apiario
      const apiaryHives = await getApiaryHives(user.uid, apiaryId);
      setHives(apiaryHives);
      
      console.log('✅ Datos del apiario cargados:', apiaryData);
      console.log('✅ Colmenas cargadas:', apiaryHives.length);
    } catch (error) {
      console.error('❌ Error al cargar datos del apiario:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen size="lg" label="Cargando apiario..." fullScreen />;
  }

  if (!apiary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <div className="text-center">
          <p className="text-cream mb-4">Apiario no encontrado</p>
          <Link
            to="/apiarios"
            className="inline-block rounded-xl bg-honey px-6 py-3 font-semibold text-ink hover:bg-honeysoft transition-colors relative z-50"
          >
            Volver a mis apiarios
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header del apiario */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            to="/apiarios"
            className="flex items-center gap-2 text-husk hover:text-cream mb-4 transition-colors cursor-pointer relative z-50 group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Volver a mis apiarios</span>
          </Link>
          
          <h1 className="font-display text-4xl font-bold text-cream mb-2">
            {apiary.name}
          </h1>
          {apiary.location && (
            <p className="text-husk text-lg">{apiary.location}</p>
          )}
        </motion.div>

        {/* Fotos del apiario */}
        {apiary.fotos && apiary.fotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <PhotoGallery photos={apiary.fotos} />
          </motion.div>
        )}

        {/* Estadísticas del apiario */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <p className="text-husk text-sm mb-1">Total de colmenas</p>
            <p className="font-display text-3xl font-bold text-cream">{hives.length}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-6"
          >
            <p className="text-husk text-sm mb-1">Colmenas saludables</p>
            <p className="font-display text-3xl font-bold text-sage">
              {hives.filter(h => h.status === 'saludable').length}
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-6"
          >
            <p className="text-husk text-sm mb-1">Requieren atención</p>
            <p className="font-display text-3xl font-bold text-coral">
              {hives.filter(h => h.status === 'alerta' || h.status === 'sin_reina').length}
            </p>
          </motion.div>
        </div>

        {/* Lista de colmenas */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="font-display text-2xl font-bold text-cream mb-6">
            Colmenas del Apiario
          </h2>
          
          {hives.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-honey/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-honey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-cream font-semibold mb-2">No hay colmenas registradas</p>
              <p className="text-husk text-sm">
                Comienza agregando tu primera colmena a este apiario
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hives.map((hive, index) => (
                <motion.div
                  key={hive.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="card p-6 cursor-pointer hover:border-honey/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-display text-xl font-bold text-cream mb-1">
                        {hive.code}
                      </h3>
                      {hive.name && (
                        <p className="text-sm text-husk">{hive.name}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      hive.status === 'saludable' ? 'bg-sage/20 text-sage' :
                      hive.status === 'revision' ? 'bg-honey/20 text-honey' :
                      hive.status === 'alerta' ? 'bg-coral/20 text-coral' :
                      'bg-mauve/20 text-mauve'
                    }`}>
                      {hive.status === 'saludable' ? 'Saludable' :
                       hive.status === 'revision' ? 'Revisión' :
                       hive.status === 'alerta' ? 'Alerta' :
                       'Sin reina'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {hive.queenYear && (
                      <div className="flex items-center gap-2 text-husk">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2.015v.985l-3 3v1h6v-1c0-1.12.895-2.015 2-2.015M12 8V6a2 2 0 114 0v2m-4 0h4" />
                        </svg>
                        <span>Reina {hive.queenYear}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-husk">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Última inspección: {new Date(hive.updatedAt).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
