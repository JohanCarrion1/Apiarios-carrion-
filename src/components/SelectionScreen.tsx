import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

export default function SelectionScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSelectStore = () => {
    // Guardar elección en localStorage
    localStorage.setItem('lastSelection', 'store');
    navigate('/tienda');
  };

  const handleSelectHives = () => {
    // Obtener lista de apiarios del usuario
    const apiariosKey = `apiarios_${user?.uid}`;
    const apiariosJson = localStorage.getItem(apiariosKey);
    const apiarios = apiariosJson ? JSON.parse(apiariosJson) : [];
    
    if (apiarios.length === 0) {
      // No hay apiarios, ir a /apiarios para crear uno
      localStorage.setItem('lastSelection', 'hives');
      navigate('/apiarios');
    } else {
      // Hay apiarios, verificar si hay último usado
      const lastActiveId = localStorage.getItem('lastActiveApiarioId');
      
      if (lastActiveId) {
        // Verificar que el último apiario aún existe
        const lastApiario = apiarios.find((a: any) => a.id === lastActiveId);
        if (lastApiario) {
          // El último apiario existe, ir directamente al dashboard
          navigate(`/dashboard/${lastActiveId}`);
        } else {
          // El último apiario ya no existe, usar el primero
          const firstApiario = apiarios[0];
          localStorage.setItem('lastActiveApiarioId', firstApiario.id);
          navigate(`/dashboard/${firstApiario.id}`);
        }
      } else {
        // No hay último apiario guardado, usar el primero
        const firstApiario = apiarios[0];
        localStorage.setItem('lastActiveApiarioId', firstApiario.id);
        navigate(`/dashboard/${firstApiario.id}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-ink">
      {/* Fondo con patrón hexagonal */}
      <div className="absolute inset-0">
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" aria-hidden="true">
          <defs>
            <pattern id="hex-pattern" width="50" height="87" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
              <path d="M25 7.5L43.3 18.5v22L25 51.5 6.7 40.5v-22Z" fill="none" stroke="#f0a41c" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex-pattern)" />
        </svg>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #f0a41c 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #b97d15 0%, transparent 70%)' }} />
      </div>

      {/* Contenido */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-4xl"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mb-4 flex justify-center"
          >
            <Logo variant="horizontal" className="justify-center" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display text-4xl sm:text-5xl font-black tracking-tight text-cream mb-3"
          >
            Bienvenido, {user?.displayName || user?.email?.split('@')[0] || 'Apicultor'}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-husk"
          >
            ¿Qué te gustaría hacer hoy?
          </motion.p>
        </div>

        {/* Tarjetas de selección */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tienda */}
          <motion.button
            onClick={handleSelectStore}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.05, y: -8 }}
            whileTap={{ scale: 0.98 }}
            className="card p-8 text-left group cursor-pointer border-2 border-transparent hover:border-honey/50 active:border-honey transition-all"
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                className="w-20 h-20 rounded-full bg-gradient-to-br from-honey/20 to-honey/5 flex items-center justify-center mb-6 group-hover:from-honey/30 group-hover:to-honey/10 transition-all"
                whileHover={{ rotate: 5 }}
              >
                <svg className="w-10 h-10 text-honey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </motion.div>
              
              <h2 className="font-display text-3xl font-bold text-cream mb-3 group-hover:text-honey transition-colors">
                Tienda
              </h2>
              
              <p className="text-husk leading-relaxed">
                Explora nuestra selección de productos apícolas, miel artesanal y herramientas para tu apiario
              </p>
              
              <div className="mt-6 flex items-center gap-2 text-honey opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-medium">Próximamente</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </motion.button>

          {/* Control de Colmenas */}
          <motion.button
            onClick={handleSelectHives}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.05, y: -8 }}
            whileTap={{ scale: 0.98 }}
            className="card p-8 text-left group cursor-pointer border-2 border-transparent hover:border-honey/50 active:border-honey transition-all"
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                className="w-20 h-20 rounded-full bg-gradient-to-br from-honey/20 to-honey/5 flex items-center justify-center mb-6 group-hover:from-honey/30 group-hover:to-honey/10 transition-all"
                whileHover={{ rotate: -5 }}
              >
                <svg className="w-10 h-10 text-honey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </motion.div>
              
              <h2 className="font-display text-3xl font-bold text-cream mb-3 group-hover:text-honey transition-colors">
                Control de Colmenas
              </h2>
              
              <p className="text-husk leading-relaxed">
                Gestiona tus colmenas, registra inspecciones, monitorea la producción y mantén un registro completo de tu apiario
              </p>
              
              <div className="mt-6 flex items-center gap-2 text-honey opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-medium">Ir al Dashboard</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </motion.button>
        </div>

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-husk/60">
            Puedes cambiar entre secciones en cualquier momento desde el menú
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
