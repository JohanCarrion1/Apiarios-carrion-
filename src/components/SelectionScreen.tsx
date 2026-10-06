import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  saveLastSelection,
  loadApiaries,
  saveLastActiveApiaryId,
  loadLastActiveApiaryId,
} from "../utils/storage";
import {
  saveUltimaVista,
  loadUltimaVista,
  clearUltimaVista,
} from "../utils/lastView";
import { isEmailAdmin } from "../lib/adminAccess";
import { usePedidos } from "../lib/pedidosService";
import { emitGlobalToast } from "../lib/toastBus";
import { useScrollToTopOnMount } from "../hooks/useScrollToTopOnMount";
import Logo from "./Logo";
import TermsModal from "./TermsModal";
import {
  TERMS_VERSION,
  hasAcceptedTermsCached,
  isTermsAccepted,
  saveTermsAccepted,
  syncTermsFromFirestore,
  useProfile,
} from "../services/profileService";

/* Nota: esta pantalla ya no enlaza los documentos legales. La única vía de
   consulta es el modal de aceptación que se superpone en el primer login (ver
   TermsModal) y las rutas públicas /privacidad, /cookies y /terminos, que se
   abren sin sesión y conservan su "← Volver". El bloque que las mostraba aquí
   era redundante y se eliminó. */
export default function SelectionScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // El navegador NO reinicia el scroll al cambiar de ruta en una SPA, así que
  // llegar aquí desde el dashboard (o cualquier página larga) mantenía la
  // posición anterior: la pantalla de selección aparecía desplazada y a media
  // altura. Es el mismo hook que ya usan Tienda, Catálogo y Pedidos.
  useScrollToTopOnMount();

  // Rol del usuario: las tarjetas "Cotizaciones", "Catálogo" y "Pedidos"
  // solo aparecen para admins.
  // isEmailAdmin une la lista viva de Firestore (config/admins) con la
  // semilla de VITE_ADMIN_EMAILS.
  const isAdmin = isEmailAdmin(user?.email);

  // Pedidos pendientes (solo admins): badge rojo con el conteo en vivo.
  //
  // Este badge era la razón de que /seleccionar fuera la pantalla más lenta
  // de la app: montaba `usePedidos()` sin condiciones, es decir un onSnapshot
  // de la colección de pedidos ANTES de que la pantalla pintara nada, y para
  // un cliente normal además consultaba la colección filtrada sin necesidad
  // (el badge solo le importa a un admin). Ahora:
  //   - solo se suscribe si la cuenta es admin;
  //   - y la suscripción se abre un frame DESPUÉS del primer pintado, con
  //     `requestIdleCallback`, para que el número rellene el hueco sin
  //     retrasar el menú.
  const [contarPedidos, setContarPedidos] = useState(false);
  useEffect(() => {
    if (!isAdmin) return;
    const abrir = () => setContarPedidos(true);
    // requestIdleCallback no está en todos los navegadores (Safari no lo
    // implementa); el setTimeout es el respaldo.
    const ric = (
      window as unknown as {
        requestIdleCallback?: (
          cb: () => void,
          o?: { timeout: number },
        ) => number;
      }
    ).requestIdleCallback;
    if (typeof ric === "function") {
      const id = ric(abrir, { timeout: 2000 });
      return () => {
        (
          window as unknown as { cancelIdleCallback?: (i: number) => void }
        ).cancelIdleCallback?.(id);
      };
    }
    const id = window.setTimeout(abrir, 300);
    return () => window.clearTimeout(id);
  }, [isAdmin]);

  const { pedidos: pedidosAdm } = usePedidos({ enabled: contarPedidos });
  const pendientesCount = contarPedidos
    ? pedidosAdm.filter((p) => p.estado === "pendiente_pago").length
    : 0;

  // Aviso "Acceso denegado": llega por navigation state cuando un no-admin
  // intenta entrar a /tienda/admin o /admin/cotizaciones y es redirigido aquí.
  const deniedMessage = (location.state as { accessDenied?: string } | null)
    ?.accessDenied;
  const [deniedVisible, setDeniedVisible] = useState(!!deniedMessage);

  // ---------- Overlay de términos + selección ----------
  //
  // El modal se decide con la caché local ANTES del primer render (lectura
  // síncrona): si el usuario ya aceptó en este dispositivo, el overlay no llega
  // a pintarse nunca. Ese es el caso común de un usuario recurrente.
  //
  // `revisando` cubre el caso inverso, el que sí necesita ayuda: usuario nuevo
  // en este dispositivo (caché vacía, así que el modal se abriría) que ya
  // aceptó en otro. Sin ese gate vería el overlay aparecer y cerrarse solo un
  // segundo después, cuando Firestore confirma la aceptación.
  const uid = user?.uid;
  // El modal de términos es un overlay sobre la selección, no una pantalla
  // intermedia: la pantalla de módulos se monta siempre detrás. Así el usuario
  // ve a dónde va a entrar mientras acepta, en vez de un formulario que
  // oculta el destino.
  const [modalTerminos, setModalTerminos] = useState(
    () => !(uid && hasAcceptedTermsCached(uid)),
  );
  const [revisando, setRevisando] = useState(true);

  /* ¿Está el modal de aceptación en pantalla ahora mismo?
   *
   * Se calcula una vez y se usa en DOS sitios: para montar el overlay y para
   * ocultar el botón "Cerrar sesión". Derivar la condición en ambos lugares por
   * separado era una trampa: en cuanto una de las dos copias se desincroniza,
   * aparece un botón flotando sobre el modal o un overlay sin poder salir. */
  const modalAbierto = !revisando && modalTerminos;

  /* Marca que el modal ya se mostró. Sirve solo para el retardo de entrada del
     botón: la primera vez aparece escalonado con la pantalla (0.45 s), pero si
     reaparece después de aceptar no tiene que esperar, porque la pantalla de
     selección ya está visible y retrasarlo se percibe como un fallo. */
  const [modalMostrado, setModalMostrado] = useState(false);
  useEffect(() => {
    if (modalAbierto) setModalMostrado(true);
  }, [modalAbierto]);
  const [guardando, setGuardando] = useState(false);

  // El perfil en vivo trae `termsAcceptedAt` (lo escribe ensureUserProfile y
  // este mismo modal), así que es la fuente de verdad cuando hay Firestore.
  const { profile, status: profileStatus } = useProfile(uid);

  useEffect(() => {
    if (!uid) {
      setRevisando(false);
      return;
    }
    let vivo = true;
    // Firestore manda: si el doc dice que aceptó, la caché local se refresca
    // (dentro de syncTermsFromFirestore) y el overlay se cierra.
    syncTermsFromFirestore(uid).then(({ accepted, version }) => {
      if (!vivo) return;
      setRevisando(false);
      if (accepted && version === TERMS_VERSION) setModalTerminos(false);
    });
    return () => {
      vivo = false;
    };
  }, [uid]);

  // El perfil en vivo confirma la aceptación sin necesidad de esperar al
  // syncTermsFromFirestore, así que el overlay se cierra antes si viene de
  // ahí. Ambas fuentes convergen en el mismo cierre idempotente.
  useEffect(() => {
    if (profileStatus === "offline") return;
    if (isTermsAccepted(profile)) setModalTerminos(false);
  }, [profile, profileStatus]);

  const nombreUsuario =
    user?.displayName || user?.email?.split("@")[0] || "Apicultor";

  const handleAceptarTerminos = async () => {
    if (!uid || guardando) return;
    setGuardando(true);
    try {
      // La caché local se escribe dentro de saveTermsAccepted ANTES de la
      // red: si Firestore falla el usuario avanza igualmente y no le vuelve a
      // saltar el overlay al recargar.
      await saveTermsAccepted(uid, user?.email || undefined);
    } finally {
      setGuardando(false);
      // El modal se cierra en `finally`: si Firestore falló, la caché local
      // ya tiene la aceptación y el usuario no debe quedarse bloqueado.
      setModalTerminos(false);
    }
  };

  // Resuelve el destino de ultima_vista validando que el apiario exista.
  const resolveVistaTarget = (vista: string): string | null => {
    if (vista === "/seleccionar") return "/seleccionar";
    if (vista === "/tienda") return "/tienda";
    if (vista === "/admin/cotizaciones")
      return isAdmin ? "/admin/cotizaciones" : null;
    if (vista === "/admin/catalogo") return isAdmin ? "/admin/catalogo" : null;
    if (vista === "/admin/pedidos") return isAdmin ? "/admin/pedidos" : null;
    if (vista === "/dashboard") return "/dashboard";
    if (vista.startsWith("/dashboard/")) {
      const id = vista.slice("/dashboard/".length);
      const apiarios = loadApiaries(user?.uid || "anonymous");
      if (id && apiarios.some((a: any) => a.id === id)) return vista;
      return apiarios.length > 0 ? "/dashboard" : null;
    }
    return null;
  };

  // Al cargar /seleccionar se CONSERVA '/seleccionar' como última vista y NO se
  // auto-redirige. Antes, si había otra última vista guardada, pulsar
  // "Volver a inicio" (o abrir /seleccionar directamente) expulsaba al usuario
  // de la pantalla sin dejarle elegir: el efecto se ejecutaba después de que el
  // handler ya guardase '/seleccionar', y el destino final acababa siendo la
  // sección anterior. La reanudación automática ya la hace HomeRedirect en '/',
  // que es el start_url de la PWA; aquí solo se normaliza el estado guardado y,
  // si quedó apuntando a una ruta que ya no existe, se limpia.
  useEffect(() => {
    if (!user) return;
    const last = loadUltimaVista(user.uid);
    if (last?.vista === "/seleccionar") return;
    if (last && !resolveVistaTarget(last.vista)) {
      clearUltimaVista(user.uid);
      return;
    }
    saveUltimaVista("/seleccionar", user?.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleSelectStore = () => {
    // Guardar elección en localStorage
    saveLastSelection("store");
    saveUltimaVista("/tienda", user?.uid);
    navigate("/tienda");
  };

  const handleSelectHives = () => {
    // Obtener lista de apiarios del usuario
    const apiarios = loadApiaries(user?.uid || "anonymous");
    let target = "/dashboard";

    if (apiarios.length === 0) {
      // No hay apiarios, entrar al dashboard que muestra el onboarding de creación
      saveLastSelection("hives");
    } else {
      // Hay apiarios, verificar si hay último usado
      const lastActiveId = loadLastActiveApiaryId(user?.uid || "anonymous");

      if (lastActiveId) {
        // Verificar que el último apiario aún existe
        const lastApiario = apiarios.find((a: any) => a.id === lastActiveId);
        if (lastApiario) {
          // El último apiario existe, ir directamente al dashboard
          target = `/dashboard/${lastActiveId}`;
        } else {
          // El último apiario ya no existe, usar el primero
          const firstApiario = apiarios[0];
          saveLastActiveApiaryId(firstApiario.id);
          target = `/dashboard/${firstApiario.id}`;
        }
      } else {
        // No hay último apiario guardado, usar el primero
        const firstApiario = apiarios[0];
        saveLastActiveApiaryId(firstApiario.id);
        target = `/dashboard/${firstApiario.id}`;
      }
      saveLastSelection("hives");
    }

    saveUltimaVista(target, user?.uid);
    navigate(target);
  };

  const handleSelectCotizaciones = () => {
    saveLastSelection("cotizaciones");
    saveUltimaVista("/admin/cotizaciones", user?.uid);
    navigate("/admin/cotizaciones");
  };

  const handleSelectCatalogo = () => {
    saveLastSelection("catalogo");
    saveUltimaVista("/admin/catalogo", user?.uid);
    navigate("/admin/catalogo");
  };

  const handleSelectPedidos = () => {
    saveLastSelection("pedidos");
    saveUltimaVista("/admin/pedidos", user?.uid);
    navigate("/admin/pedidos");
  };

  // ---------- Cerrar sesión ----------
  //
  // Mismo flujo que el menú del dashboard: el botón de la esquina NO cierra
  // sesión directamente, abre primero un modal de confirmación. Al confirmar,
  // se llama al `logout()` del AuthContext (que internamente hace signOut y
  // limpia las preferencias de última vista) — la misma lógica, sin duplicarla
  // ni tocar la autenticación.
  //
  // La redirección a /login tampoco se fuerza: cuando `user` pasa a null,
  // ProtectedRoute detecta que no hay sesión y redirige por su cuenta.
  //
  // `cerrando` bloquea un segundo envío mientras signOut viaja a Firebase.
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  // Escape cierra el modal (mismo comportamiento que el del dashboard).
  useEffect(() => {
    if (!showLogoutConfirm) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowLogoutConfirm(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showLogoutConfirm]);

  const handleLogout = async () => {
    if (cerrando) return;
    setCerrando(true);
    try {
      await logout();
      setShowLogoutConfirm(false);
    } catch (err: any) {
      setCerrando(false);
      setShowLogoutConfirm(false);
      emitGlobalToast(
        "No se pudo cerrar sesión",
        err?.message || String(err),
        "error",
      );
    }
  };

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-y-auto overflow-x-hidden bg-ink">
      {/* Fondo con patrón hexagonal */}
      <div className="absolute inset-0">
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.08]"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="hex-pattern"
              width="50"
              height="87"
              patternUnits="userSpaceOnUse"
              patternTransform="scale(2)"
            >
              <path
                d="M25 7.5L43.3 18.5v22L25 51.5 6.7 40.5v-22Z"
                fill="none"
                stroke="#f0a41c"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex-pattern)" />
        </svg>
      </div>

      {/* Cerrar sesión — esquina superior derecha.
          Absolutely posicionado respecto a la pantalla completa (no al bloque
          centrado) para que caiga en la esquina de verdad. En móvil el logo
          horizontal queda centrado y ocupa casi todo el ancho, así que el
          texto se oculta por debajo de `sm` y solo se ve el ícono; el
          `aria-label` mantiene el nombre accesible en todos los tamaños. El
          ícono es el mismo del menú del dashboard y los colores siguen la
          paleta ámbar/dorado sobre fondo oscuro.

          Solo existe cuando NO hay modal de aceptación abierto: se renderiza
          condicionalmente en vez de esconderse con `opacity-0` para que no
          quede en el árbol de accesibilidad ni sea alcanzable con el teclado
          detrás del overlay. `AnimatePresence` conserva el `exit`, de modo que
          se desvanece al abrirse el modal en lugar de desaparecer de golpe.

          El retardo de entrada es condicional: la primera vez se escalona con
          la pantalla (0.45 s), pero si reaparece tras aceptar entra ya, porque
          la pantalla de selección ya está visible y esperar se lee como un
          fallo. */}
      <AnimatePresence>
        {modalAbierto ? null : (
          <motion.button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            disabled={cerrando}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ delay: modalMostrado ? 0 : 0.45 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            className="group absolute right-4 top-4 z-[60] flex items-center gap-2 rounded-xl border border-line bg-pane/70 px-3 py-2.5 text-husk backdrop-blur-sm transition-colors hover:border-honey/60 hover:text-honey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey/60 disabled:pointer-events-none disabled:opacity-60 sm:right-6 sm:top-6"
          >
            <svg
              className="h-5 w-5 flex-shrink-0 transition-colors group-hover:text-honey"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="hidden text-sm font-medium sm:inline">
              Cerrar sesión
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Selección de módulos. Se centra vertical y horizontalmente: el
          `py-10` deja aire para que el bloque no se pegue a los bordes en
          pantallas cortas, y `mx-auto` + `max-w-4xl` lo mantiene centrado en
          desktop. */}
      <div className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
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
              Bienvenido,{" "}
              {user?.displayName || user?.email?.split("@")[0] || "Apicultor"}
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

          {/* Aviso de acceso denegado (redirección desde rutas exclusivas) */}
          {deniedVisible && deniedMessage && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-8 flex items-start gap-3 rounded-2xl border border-coral/40 bg-coral/10 px-5 py-4 text-sm text-coral"
              role="alert"
            >
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="font-semibold">Acceso denegado</p>
                <p className="mt-0.5 text-husk">{deniedMessage}</p>
              </div>
              <button
                onClick={() => setDeniedVisible(false)}
                className="text-coral/80 hover:text-coral transition-colors"
                aria-label="Cerrar aviso"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </motion.div>
          )}

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
                  <svg
                    className="w-10 h-10 text-honey"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                </motion.div>

                <h2 className="font-display text-3xl font-bold text-cream mb-3 group-hover:text-honey transition-colors">
                  Tienda
                </h2>

                <p className="text-husk leading-relaxed">
                  Explora nuestra selección de productos apícolas, miel
                  artesanal y herramientas para tu apiario
                </p>

                <div className="mt-6 flex items-center gap-2 text-honey opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm font-medium">
                    Explorar la tienda
                  </span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
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
                  <svg
                    className="w-10 h-10 text-honey"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </motion.div>

                <h2 className="font-display text-3xl font-bold text-cream mb-3 group-hover:text-honey transition-colors">
                  Control de Colmenas
                </h2>

                <p className="text-husk leading-relaxed">
                  Gestiona tus colmenas, registra inspecciones, monitorea la
                  producción y mantén un registro completo de tu apiario
                </p>

                <div className="mt-6 flex items-center gap-2 text-honey opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm font-medium">Ir al Dashboard</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </motion.button>

            {/* Cotizaciones (exclusivo de administradores) */}
            {isAdmin && (
              <motion.button
                onClick={handleSelectCotizaciones}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.05, y: -8 }}
                whileTap={{ scale: 0.98 }}
                className="card p-8 text-left group cursor-pointer border-2 border-transparent hover:border-honey/50 active:border-honey transition-all"
              >
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-honey/20 to-honey/5 flex items-center justify-center mb-6 group-hover:from-honey/30 group-hover:to-honey/10 transition-all"
                    whileHover={{ rotate: 5 }}
                  >
                    <span className="text-4xl leading-none">📋</span>
                  </motion.div>

                  <h2 className="font-display text-3xl font-bold text-cream mb-3 group-hover:text-honey transition-colors">
                    Cotizaciones
                  </h2>

                  <p className="text-husk leading-relaxed">
                    Crea cotizaciones personalizadas con los productos de la
                    tienda, envíalas por WhatsApp o en PDF
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-honey opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm font-medium">Abrir POS</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </motion.button>
            )}

            {/* Catálogo (exclusivo de administradores) */}
            {isAdmin && (
              <motion.button
                onClick={handleSelectCatalogo}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
                whileHover={{ scale: 1.05, y: -8 }}
                whileTap={{ scale: 0.98 }}
                className="card p-8 text-left group cursor-pointer border-2 border-transparent hover:border-honey/50 active:border-honey transition-all"
              >
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-honey/20 to-honey/5 flex items-center justify-center mb-6 group-hover:from-honey/30 group-hover:to-honey/10 transition-all"
                    whileHover={{ rotate: 5 }}
                  >
                    <span className="text-4xl leading-none">📖</span>
                  </motion.div>

                  <h2 className="font-display text-3xl font-bold text-cream mb-3 group-hover:text-honey transition-colors">
                    Catálogo
                  </h2>

                  <p className="text-husk leading-relaxed">
                    Genera catálogos de productos en PDF con tu marca para
                    compartir con clientes
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-honey opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm font-medium">Crear catálogo</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </motion.button>
            )}

            {/* Pedidos (exclusivo de administradores) */}
            {isAdmin && (
              <motion.button
                onClick={handleSelectPedidos}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.05, y: -8 }}
                whileTap={{ scale: 0.98 }}
                className="card relative p-8 text-left group cursor-pointer border-2 border-transparent hover:border-honey/50 active:border-honey transition-all"
              >
                {/* Badge rojo de pedidos pendientes */}
                {pendientesCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-9 min-w-9 items-center justify-center rounded-full bg-coral px-2.5 text-sm font-black text-ink shadow-[0_6px_16px_rgba(0,0,0,.35)]">
                    {pendientesCount > 99 ? "99+" : pendientesCount}
                  </span>
                )}
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-honey/20 to-honey/5 flex items-center justify-center mb-6 group-hover:from-honey/30 group-hover:to-honey/10 transition-all"
                    whileHover={{ rotate: -5 }}
                  >
                    <span className="text-4xl leading-none">🧾</span>
                  </motion.div>

                  <h2 className="font-display text-3xl font-bold text-cream mb-3 group-hover:text-honey transition-colors">
                    Pedidos
                  </h2>

                  <p className="text-husk leading-relaxed">
                    Revisa, aprueba o rechaza los pagos con Yape de tus clientes
                    y gestiona las entregas
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-honey opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm font-medium">
                      Gestionar pedidos
                    </span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </motion.button>
            )}
          </div>

          {/* Footer info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-husk/60">
              Puedes cambiar entre secciones en cualquier momento desde el menú
            </p>
          </motion.div>
        </div>
      </div>

      {/* Overlay de términos. Va DESPUÉS de la selección en el DOM y con
          `z-50`, así que tapa las cards. `AnimatePresence` es imprescindible:
          sin él, el `exit` del modal no se ejecuta y el overlay desaparecería
          de golpe al cambiar `modalTerminos` a false, sin la animación de fade
          que pide el diseño.

          Mientras este overlay está abierto, el botón "Cerrar sesión" NO se
          monta (ver más arriba): la pantalla queda limpia y sin controles
          sueltos detrás del modal. */}
      <AnimatePresence>
        {modalAbierto && (
          <TermsModal
            nombre={nombreUsuario}
            onContinue={handleAceptarTerminos}
            guardando={guardando}
          />
        )}
      </AnimatePresence>

      {/* Modal de confirmación de cierre de sesión.
          Réplica exacta del que usa el menú del dashboard (ResponsiveHeader):
          mismo backdrop, mismas clases de la card, mismos botones y mismas
          animaciones. No se extrae a un componente compartido precisamente
          para no tocar el modal del dashboard, que ya funciona. */}
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
            <div
              className="card relative p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-xl font-bold text-cream mb-2">
                ¿Deseas cerrar sesión?
              </h3>
              <p className="text-sm text-husk mb-6">
                Tu sesión actual se cerrará y deberás iniciar sesión nuevamente.
              </p>
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
                  disabled={cerrando}
                  className="flex-1 px-4 py-2 text-sm font-medium text-ink bg-coral rounded-lg hover:bg-coral/90 transition-colors disabled:opacity-60 disabled:pointer-events-none"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cerrar sesión
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
