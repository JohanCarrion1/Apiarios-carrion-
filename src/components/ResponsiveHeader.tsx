import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { IconPanel, IconHex, IconChart, IconCalendar, IconDrop, IconClipboard, IconCheck, IconQueen, IconPackage, IconLayers, IconFlower, IconTrap, IconRobot } from '../ui';
import { useAuth } from '../context/AuthContext';
import { BRANDING } from '../lib/branding';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import type { Notification } from '../types/calendar';
import { useScrollLock } from '../hooks/useScrollLock';
import { backdropVariants, drawerVariants, SPRING_TAP, TAP_SCALE } from '../lib/motion';
import { isEmailAdmin } from '../lib/adminAccess';
import { saveUltimaVista } from '../utils/lastView';

interface MenuItem {
  id: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
}

// Bloque B — secciones del dashboard (mismo contenido y orden).
// "Colmenas" es la ÚNICA puerta a esa parte del panel: la página ya muestra,
// en el mismo scroll, las tres secciones (colmenas → núcleos → fecundadores),
// así que no hay submenú ni entradas separadas para las subsecciones.
const menuItems: MenuItem[] = [
  { id: 'panel', label: 'Panel', icon: IconPanel },
  { id: 'colmenas', label: 'Colmenas', icon: IconHex },
  { id: 'cria', label: 'Cría de reinas', icon: IconQueen },
  { id: 'estadisticas', label: 'Estadísticas', icon: IconChart },
  { id: 'calendario', label: 'Calendario', icon: IconCalendar },
  { id: 'produccion', label: 'Cosecha', icon: IconDrop },
  { id: 'registro', label: 'Cuaderno', icon: IconClipboard },
  { id: 'tareas', label: 'Tareas', icon: IconCheck },
  { id: 'inventario', label: 'Inventario', icon: IconPackage },
  { id: 'transferencias', label: 'Transferencias', icon: IconLayers },
  { id: 'polinizacion', label: 'Polinización', icon: IconFlower },
  { id: 'cajas-trampa', label: 'Cajas Trampa', icon: IconTrap },
  { id: 'asistente-ia', label: 'Asistente IA', icon: IconRobot },
];

interface ResponsiveHeaderProps {
  onNavigate: (sectionId: string) => void;
  onSettings?: () => void;
  onHome?: () => void;
  onChangeSection?: () => void;
  /**
   * Ancla del dashboard (colmenas | núcleos | fecundadores | inspecciones).
   *
   * El menú ya NO la usa: "Colmenas" lleva a la sección completa y las tres
   * subsecciones se ven al hacer scroll dentro de ella. Se mantiene la prop
   * porque App.tsx la sigue pasando y quitar el cableado de `goToHiveAnchor`
   * (`focusAnchor` → `HivesSection`) es tocar la lógica de navegación.
   */
  onNavigateSubsection?: (anchorId: string) => void;
  activeSection?: string;
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onNotificationClick?: (notification: Notification) => void;
  inventoryAlertsCount?: number;
}

/* Ícono inline de engranaje (administración / ajustes). */
const GearIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

/**
 * HEADER UNIFICADO para TODOS los usuarios (admin y no-admin).
 * - Mismo header, mismas opciones para cualquier rol (un solo menú compartido).
 * - "← Volver a inicio" se muestra SIEMPRE (redirige a /seleccionar).
 * - El menú hamburguesa contiene únicamente: tarjeta de perfil (con badge de
 *   rol), secciones del dashboard (Panel…Transferencias), "Ajustes" y
 *   "Cerrar sesión". Sin secciones administrativas.
 */
export function ResponsiveHeader({ onNavigate, onSettings, onHome, onChangeSection, onNavigateSubsection, activeSection = 'panel', notifications = [], onMarkAsRead, onMarkAllAsRead, onNotificationClick, inventoryAlertsCount = 0 }: ResponsiveHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // En modo standalone la app es una aplicación nativa: se respetan las
  // safe-areas de iOS. El botón "Volver a inicio" SIEMPRE se muestra.
  const [isStandalone, setIsStandalone] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );

  // Rol: isEmailAdmin une la lista viva de Firestore (config/admins) con la
  // semilla de VITE_ADMIN_EMAILS. Solo cambia la visibilidad de los ítems
  // "Panel de administración" y "Cotizaciones" y el badge del perfil.
  const isAdmin = !!user && isEmailAdmin(user.email);

  useScrollLock(isMenuOpen || showLogoutConfirm);

  useEffect(() => {
    const mql = window.matchMedia('(display-mode: standalone)');
    const onChange = () => {
      setIsStandalone(mql.matches || (navigator as any).standalone === true);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Cerrar el menú con la tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Cerrar el modal de confirmación con la tecla Escape
  useEffect(() => {
    if (!showLogoutConfirm) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLogoutConfirm(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showLogoutConfirm]);

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Header */}
      <header className={`sticky top-0 z-30 bg-pane/95 backdrop-blur-md border-b border-line ${isStandalone ? 'pwa-standalone-header' : ''}`}>
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo — clic lleva al dashboard */}
          <motion.button
            onClick={() => {
              if (user?.uid) saveUltimaVista('/dashboard', user.uid);
              navigate('/dashboard');
            }}
            className="flex shrink-0 items-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            whileTap={{ scale: 0.97 }}
            aria-label="Ir al dashboard"
            title="Ir al dashboard"
          >
            <Logo variant="compact-inline" label={BRANDING.nombreEmpresa} />
          </motion.button>

          {/* La barra horizontal de secciones se eliminó: era redundante con el
              menú lateral (☰), que ya lista las mismas secciones en el mismo
              orden y además mantiene el badge de alertas de inventario. Al
              quitarla, este cluster recupera la derecha con `ml-auto`: el `flex-1`
              que lo empujaba estaba en el <nav>. */}

          {/* Botón "Volver a inicio" (SIEMPRE visible para todos) + Campana + Foto + Hamburguesa */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {onHome && (
              <motion.button
                onClick={onHome}
                className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-honey px-2.5 py-1 min-h-[26px] text-[11px] font-medium leading-none shrink-0 text-ink transition-all duration-200 hover:bg-honeysoft active:scale-95 md:gap-2 md:px-4 md:py-2 md:text-sm md:leading-normal md:shadow-[0_2px_10px_rgba(240,164,28,.35)]"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.92 }}
                aria-label="Volver a inicio"
                title="Volver a inicio"
              >
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M11 17l-5-5m0 0l5-5m-5 5h12"
                  />
                </svg>
                <span className="inline-flex items-center">Volver a inicio</span>
              </motion.button>
            )}

            {/* Campana de notificaciones */}
            {notifications.length > 0 && onMarkAsRead && onMarkAllAsRead && onNotificationClick && (
              <NotificationBell
                notifications={notifications}
                onMarkAsRead={onMarkAsRead}
                onMarkAllAsRead={onMarkAllAsRead}
                onNotificationClick={onNotificationClick}
              />
            )}

            {/* Foto de perfil (siempre visible) */}
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Usuario'}
                className="h-9 w-9 rounded-full object-cover shadow"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-honey to-honeysoft text-sm font-bold text-ink">
                {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}

            {/* El color dorado y todos los estilos explícitos viven en
                `.menu-btn` / `.menu-btn__bar` (index.css): las barras eran
                `bg-cream` y el botón no fijaba `appearance`, `background-color`
                ni `border`, así que cada motor pintaba su control nativo. Se
                mantiene el mismo tamaño (40x40), el mismo gap y las mismas
                animaciones de apertura/cierre. */}
            <motion.button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="menu-btn"
              whileTap={{ scale: 0.9 }}
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isMenuOpen}
              aria-haspopup="dialog"
            >
              <motion.span
                className="menu-btn__bar"
                animate={isMenuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3 }}
              />
              <motion.span
                className="menu-btn__bar"
                animate={isMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <motion.span
                className="menu-btn__bar"
                animate={isMenuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Menu Overlay - Available on all devices */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm touch-none"
            />

            {/* Menu Panel - Mini ventana lateral */}
            <motion.div
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 right-0 bottom-0 z-50 w-[75vw] sm:w-80 bg-pane rounded-l-2xl border-l border-line shadow-[0_0_50px_rgba(0,0,0,0.5)] touch-pan-y"
              role="dialog"
              aria-modal="true"
              aria-label="Menú de navegación"
            >
              <div className="flex flex-col h-full">
                {/* Header with Close Button */}
                <div className="flex items-center justify-between p-6 border-b border-line">
                  <h2 className="font-display text-xl font-bold text-cream">Menú</h2>
                  <motion.button
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-center w-11 h-11 rounded-full bg-honey/10 border-2 border-honey/30 hover:bg-honey/20 hover:border-honey/50 transition-all duration-200"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Cerrar menú"
                    title="Cerrar (Esc)"
                  >
                    <svg className="w-6 h-6 text-honey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>

                {/* User Profile Section */}
                <div className="p-6 border-b border-line bg-gradient-to-br from-honey/5 to-transparent">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    {user?.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName || 'Usuario'}
                        className="h-16 w-16 rounded-full object-cover shadow-lg"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-honey to-honeysoft flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-ink">
                          {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    {/* User Info + badge de rol */}
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-semibold text-cream truncate">
                        {user?.displayName || 'Usuario'}
                      </p>
                      {user?.email && (
                        <p className="text-sm text-husk truncate">{user.email}</p>
                      )}
                      {isAdmin ? (
                        <span className="mt-1 inline-flex rounded-full bg-honey/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-honey">
                          ADMIN
                        </span>
                      ) : (
                        <span className="mt-1 inline-flex rounded-full bg-husk/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-husk">
                          USUARIO
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Navigation Menu Items */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                  {/* SECCIONES DEL DASHBOARD */}
                  {menuItems.map((item, index) => {
                    const isActive = activeSection === item.id;
                    const IconComponent = item.icon;
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-3 relative overflow-hidden ${
                          isActive
                            ? 'bg-honey/20 text-honey'
                            : 'text-husk hover:text-cream hover:bg-pane2'
                        }`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: TAP_SCALE, transition: SPRING_TAP }}
                      >
                        {/* Indicador de opción activa */}
                        <motion.div
                          className="absolute left-0 top-0 bottom-0 w-1 bg-honey"
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: isActive ? 1 : 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ originY: 0.5 }}
                        />
                        {/* Icono */}
                        <IconComponent className="w-5 h-5 flex-shrink-0" />
                        {/* Label */}
                        <span className="relative z-10 flex-1">{item.label}</span>
                        {/* Badge de inventario */}
                        {item.id === 'inventario' && inventoryAlertsCount > 0 && (
                          <span className="relative z-10 rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold text-ink">
                            {inventoryAlertsCount}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </nav>

                {/* Actions Section */}
                <div className="p-4 border-t border-line space-y-2">
                  {onSettings && (
                    <motion.button
                      onClick={() => {
                        onSettings();
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 text-sm font-medium text-cream hover:bg-pane2 rounded-lg transition-all duration-200 flex items-center gap-3"
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <GearIcon className="w-5 h-5 text-honey" />
                      Ajustes
                    </motion.button>
                  )}
                  <motion.button
                    onClick={() => {
                      setShowLogoutConfirm(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-sm font-medium text-coral hover:bg-coral/10 rounded-lg transition-all duration-200 flex items-center gap-3"
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: TAP_SCALE, transition: SPRING_TAP }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar Sesión
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
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-modal="true"
            role="dialog"
          >
            {/* Backdrop - tapa TODA la pantalla */}
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm touch-none"
              onClick={() => setShowLogoutConfirm(false)}
            />

            {/* Modal - centrado encima del backdrop */}
            <div className="card relative p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-xl font-bold text-cream mb-2">¿Deseas cerrar sesión?</h3>
              <p className="text-sm text-husk mb-6">Tu sesión actual se cerrará y deberás iniciar sesión nuevamente.</p>
              <div className="flex gap-3">
                <motion.button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-husk border border-line rounded-lg hover:bg-pane2 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: TAP_SCALE, transition: SPRING_TAP }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2 text-sm font-medium text-ink bg-coral rounded-lg hover:bg-coral/90 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: TAP_SCALE, transition: SPRING_TAP }}
                >
                  Cerrar sesión
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}