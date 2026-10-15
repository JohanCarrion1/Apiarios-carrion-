import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CONTACT_EMAIL } from '../config';
import { saveUltimaVista } from '../utils/lastView';

export default function StorePlaceholder() {
  const navigate = useNavigate();

  const handleBackToSelection = () => {
    // Persistir /seleccionar como vista para que el cierre de la app vuelva aquí
    localStorage.removeItem('lastSelection');
    saveUltimaVista('/seleccionar');
    navigate('/seleccionar');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-ink">
      {/* Fondo con patrón hexagonal */}
      <div className="absolute inset-0">
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" aria-hidden="true">
          <defs>
            <pattern id="hex-pattern" width="50" height="87" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
              <path d="M25 7.5L43.3 18.5v22L25 51.5 6.7 40.5v-22Z" fill="none" stroke="#ffa90a" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex-pattern)" />
        </svg>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #ffa90a 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #c98508 0%, transparent 70%)' }} />
      </div>

      {/* Contenido */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="card p-12 text-center">
          {/* Icono de construcción */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mb-8"
          >
            <div className="inline-block relative">
              <motion.div
                animate={{ 
                  rotate: [0, -5, 5, -5, 0],
                  scale: [1, 1.1, 1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
                className="text-8xl"
              >
                🍯
              </motion.div>
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 0.5
                }}
                className="absolute -top-2 -right-2 text-4xl"
              >
                🚧
              </motion.div>
            </div>
          </motion.div>

          {/* Título */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display text-4xl sm:text-5xl font-black tracking-tight text-cream mb-4"
          >
            Tienda en Construcción
          </motion.h1>

          {/* Descripción */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4 mb-8"
          >
            <p className="text-lg text-husk leading-relaxed">
              Estamos preparando algo especial para ti
            </p>
            
            <div className="bg-ink/50 border border-line rounded-lg p-6 text-left">
              <h2 className="font-display text-xl font-bold text-honey mb-3">
                Próximamente podrás encontrar:
              </h2>
              <ul className="space-y-2 text-husk">
                <li className="flex items-start gap-2">
                  <span className="text-honey mt-1">🍯</span>
                  <span>Miel artesanal de diferentes floraciones</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-honey mt-1">🐝</span>
                  <span>Polen, propóleo y jalea real</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-honey mt-1">🕯️</span>
                  <span>Velas y productos de cera de abeja</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-honey mt-1">🛠️</span>
                  <span>Herramientas y equipos para apicultura</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-honey mt-1">📚</span>
                  <span>Libros y recursos educativos</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Botones */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.button
              onClick={handleBackToSelection}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 rounded-xl bg-honey text-ink font-semibold text-lg hover:bg-honeysoft transition-colors shadow-[0_4px_20px_rgba(255,169,10,.3)]"
            >
              Volver a Selección
            </motion.button>
            
            <motion.button
              onClick={() => navigate('/dashboard')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 rounded-xl border-2 border-line text-cream font-semibold text-lg hover:border-honey/50 hover:text-honey transition-all"
            >
              Ir al Dashboard
            </motion.button>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 pt-6 border-t border-line"
          >
            <p className="text-sm text-husk/60">
              ¿Tienes sugerencias?{CONTACT_EMAIL ? (
                <> Contáctanos en{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-honey hover:underline">
                  {CONTACT_EMAIL}
                </a></>
              ) : (
                <> Contáctanos por WhatsApp</>
              )}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
