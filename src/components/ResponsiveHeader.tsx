import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconBee } from '../ui';
import { useAuth } from '../context/AuthContext';

interface ResponsiveHeaderProps {
  onNavigate: (sectionId: string) => void;
  onSettings?: () => void;
}

export function ResponsiveHeader({ onNavigate, onSettings }: ResponsiveHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'panel', label: 'Panel' },
    { id: 'colmenas', label: 'Colmenas' },
    { id: 'estadisticas', label: 'Estadísticas' },
    { id: 'calendario', label: 'Calendario' },
    { id: 'produccion', label: 'Cosecha' },
    { id: 'registro', label: 'Cuaderno' },
    { id: 'tareas', label: 'Tareas' },
  ];

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-pane/95 backdrop-blur-md border-b border-line">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="hexclip flex h-10 w-9 items-center justify-center bg-honey text-ink">
              <IconBee className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-lg font-bold text-cream">PANAL</h1>
              <p className="text-[10px] text-husk">Apiarios Carrión</p>
            </div>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            {menuItems.map((item, index) => (
              <motion.button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="px-4 py-2 text-sm font-medium text-husk hover:text-cream transition-colors rounded-lg hover:bg-pane2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {item.label}
              </motion.button>
            ))}
          </nav>

          {/* User Menu & Logout */}
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-honey/20 flex items-center justify-center">
                <span className="text-sm font-semibold text-honey">
                  {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            </div>

            {/* Settings Button */}
            {onSettings && (
              <motion.button
                onClick={onSettings}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-husk hover:text-amber-500 transition-colors rounded-lg hover:bg-amber-500/10"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Ajustes"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">Ajustes</span>
              </motion.button>
            )}

            {/* Logout Button */}
            <motion.button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-husk hover:text-coral transition-colors rounded-lg hover:bg-coral/10"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Cerrar sesión"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Salir</span>
            </motion.button>

            {/* Hamburger Button */}
            <motion.button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-pane2 transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              <motion.span
                className="w-5 h-0.5 bg-cream block"
                animate={isMenuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3 }}
              />
              <motion.span
                className="w-5 h-0.5 bg-cream block"
                animate={isMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <motion.span
                className="w-5 h-0.5 bg-cream block"
                animate={isMenuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-pane border-l border-line lg:hidden"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-line">
                  <h2 className="font-display text-lg font-bold text-cream">Menú</h2>
                  <motion.button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 rounded-lg hover:bg-pane2 transition-colors"
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg className="w-5 h-5 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 p-4 space-y-2">
                  {menuItems.map((item, index) => (
                    <motion.button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-husk hover:text-cream hover:bg-pane2 rounded-lg transition-colors"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {item.label}
                    </motion.button>
                  ))}
                </nav>

                {/* User Info & Actions */}
                <div className="p-4 border-t border-line">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-honey/20 flex items-center justify-center">
                      <span className="text-sm font-semibold text-honey">
                        {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-cream truncate">
                        {user?.name || user?.email || 'Usuario'}
                      </p>
                      {user?.email && (
                        <p className="text-xs text-husk truncate">{user.email}</p>
                      )}
                    </div>
                  </div>
                  {onSettings && (
                    <motion.button
                      onClick={() => {
                        onSettings();
                        setIsMenuOpen(false);
                      }}
                      className="w-full mb-2 px-4 py-2 text-sm font-medium text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors flex items-center gap-2"
                      whileTap={{ scale: 0.98 }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Ajustes
                    </motion.button>
                  )}
                  <motion.button
                    onClick={() => {
                      setShowLogoutConfirm(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-coral hover:bg-coral/10 rounded-lg transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    Cerrar sesión
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="card p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-display text-xl font-bold text-cream mb-2">¿Deseas cerrar sesión?</h3>
                <p className="text-sm text-husk mb-6">Tu sesión actual se cerrará y deberás iniciar sesión nuevamente.</p>
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-husk border border-line rounded-lg hover:bg-pane2 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    onClick={handleLogout}
                    className="flex-1 px-4 py-2 text-sm font-medium text-ink bg-coral rounded-lg hover:bg-coral/90 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cerrar sesión
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
