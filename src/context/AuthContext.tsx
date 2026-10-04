import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider, twitterProvider, translateFirebaseError, translateTwitterError, isFirebaseAvailable } from '../lib/firebase';
import { getCurrentUserId, migrateOldData } from '../utils/storage';
import { clearAllLastViews } from '../utils/lastView';
import { isAllowedAdmin } from '../lib/adminSession';
import { setupAdminAccess } from '../lib/adminAccess';
import { ensureUserProfile } from '../services/profileService';
import { enableFirestoreSync, getHydrationPromise } from '../services/firestoreSync';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  firebaseAvailable: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithTwitter: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firebaseAvailable = isFirebaseAvailable();

  // Detectar sesión activa al recargar y actualizar el UID
  useEffect(() => {
    if (import.meta.env.DEV) console.log('🟡 [AUTH] useEffect de onAuthStateChanged montado');
    
    if (!auth) {
      console.warn('⚠️ [AUTH] Firebase no está disponible, usando modo sin autenticación');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (import.meta.env.DEV) console.log('🔐 [AUTH] onAuthStateChanged disparado:', user ? user.uid : 'null');
      if (import.meta.env.DEV) console.log('🔐 [AUTH] Actualizando estado user...');
      setUser(user);
      if (import.meta.env.DEV) console.log('🔐 [AUTH] Estado user actualizado');
      
      // Conectar la lista de admins de la tienda (Firestore config/admins)
      // al usuario que acaba de autenticarse. Se re-consulta al cambiar de
      // sesión para reflejar altas/bajas sin recargar manualmente.
      setupAdminAccess(user ? { uid: user.uid, email: user.email } : null);
      
// Ejecutar migración de datos si es necesario
        if (user) {
          migrateOldData();
          // Habilitar el puente storage → Firestore (si aún no está registrado).
          enableFirestoreSync();
          // Crear/actualizar el perfil users/{uid} (rol, lastLogin, apiario).
          void ensureUserProfile(user);
          // Hidratar Firestore → caché local para este usuario (sin bloquear).
          void getHydrationPromise(user.uid);
          if (import.meta.env.DEV) console.log('✅ [AUTH] UID establecido para usuario:', user.uid);
        } else {
        if (import.meta.env.DEV) console.log('🚪 [AUTH] Usuario cerró sesión');
      }
      
      if (import.meta.env.DEV) console.log('🔐 [AUTH] Actualizando loading a false...');
      setLoading(false);
      if (import.meta.env.DEV) console.log('🔐 [AUTH] Loading actualizado a false');
    });

    if (import.meta.env.DEV) console.log('🟡 [AUTH] Listener de onAuthStateChanged registrado');

    return () => {
      if (import.meta.env.DEV) console.log('🟡 [AUTH] useEffect limpiado, desuscribiendo listener');
      unsubscribe();
    };
  }, []);

  // Login con email y contraseña
  const login = async (email: string, password: string) => {
    if (import.meta.env.DEV) console.log('🟡 [AUTH] login() iniciado');
    if (!auth) {
      const errorMsg = 'Firebase no está configurado. Por favor configura las variables de entorno.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    try {
      setError(null);
      if (import.meta.env.DEV) console.log('🟡 [AUTH] Llamando a signInWithEmailAndPassword...');
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (import.meta.env.DEV) console.log('✅ [AUTH] signInWithEmailAndPassword completado:', result.user.uid);
    } catch (error: any) {
      console.error('❌ [AUTH] Error en login:', error.code, error.message);
      const errorMessage = translateFirebaseError(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Registro con email y contraseña
  const register = async (email: string, password: string) => {
    if (!auth) {
      const errorMsg = 'Firebase no está configurado. Por favor configura las variables de entorno.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    try {
      setError(null);
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      const errorMessage = translateFirebaseError(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Login con Google
  const loginWithGoogle = async () => {
    if (!auth || !googleProvider) {
      const errorMsg = 'Firebase no está configurado. Por favor configura las variables de entorno.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    try {
      setError(null);
      if (import.meta.env.DEV) console.log('🔐 [AUTH] Intentando login con Google...');
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;
      if (import.meta.env.DEV) console.log('📧 [AUTH] Email del usuario:', googleUser.email);
      if (import.meta.env.DEV) console.log('✅ [AUTH] ¿Es admin?', isAllowedAdmin(googleUser.email));
      if (import.meta.env.DEV) console.log('🔐 [AUTH] Google login completado para:', googleUser.uid);
    } catch (error: any) {
      console.error('❌ [AUTH] Error en login con Google:', error.code, error.message);
      const errorMessage = translateFirebaseError(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Login con X (Twitter)
  //
  // El popup se abre siempre por `signInWithPopup`. X no admite playground con
  // proveedores OAuth sin el dominio autorizado, así que en desarrollo hace
  // falta un dominio real configurado en Authentication → Authorized domains.
  const loginWithTwitter = async () => {
    if (!auth || !twitterProvider) {
      const errorMsg = 'Firebase no está configurado. Por favor configura las variables de entorno.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    try {
      setError(null);
      if (import.meta.env.DEV) console.log('🔐 [AUTH] Intentando login con X (Twitter)...');
      const result = await signInWithPopup(auth, twitterProvider);
      if (import.meta.env.DEV) console.log('🔐 [AUTH] Login con X completado para:', result.user.uid);
    } catch (error: any) {
      // Los errores de X van a su propio traductor: "popup cerrado" y
      // "cuenta ya existe" significan algo distinto aquí y el texto genérico
      // de Firebase confunde ("Error de autenticación. Intenta de nuevo").
      console.error('❌ [AUTH] Error en login con X:', error.code, error.message);
      const errorMessage = translateTwitterError(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Cerrar sesión
  const logout = async () => {
    if (!auth) {
      const errorMsg = 'Firebase no está configurado.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    try {
      setError(null);
      const uid = user?.uid;
      await signOut(auth);
      // Al cerrar sesión se borran las preferencias de última vista para que
      // /seleccionar se muestre normal en el próximo inicio de sesión.
      if (uid) clearAllLastViews(uid);
    } catch (error: any) {
      const errorMessage = translateFirebaseError(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Limpiar error
  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        firebaseAvailable,
        login,
        register,
        loginWithGoogle,
        loginWithTwitter,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
