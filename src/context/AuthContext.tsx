import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider, githubProvider, translateFirebaseError, isFirebaseAvailable } from '../lib/firebase';
import { getCurrentUserId, migrateOldData } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  firebaseAvailable: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
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
    console.log('🟡 [AUTH] useEffect de onAuthStateChanged montado');
    
    if (!auth) {
      console.warn('⚠️ [AUTH] Firebase no está disponible, usando modo sin autenticación');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔐 [AUTH] onAuthStateChanged disparado:', user ? user.uid : 'null');
      console.log('🔐 [AUTH] Actualizando estado user...');
      setUser(user);
      console.log('🔐 [AUTH] Estado user actualizado');
      
      // Ejecutar migración de datos si es necesario
      if (user) {
        migrateOldData();
        console.log('✅ [AUTH] UID establecido para usuario:', user.uid);
      } else {
        console.log('🚪 [AUTH] Usuario cerró sesión');
      }
      
      console.log('🔐 [AUTH] Actualizando loading a false...');
      setLoading(false);
      console.log('🔐 [AUTH] Loading actualizado a false');
    });

    console.log('🟡 [AUTH] Listener de onAuthStateChanged registrado');

    return () => {
      console.log('🟡 [AUTH] useEffect limpiado, desuscribiendo listener');
      unsubscribe();
    };
  }, []);

  // Login con email y contraseña
  const login = async (email: string, password: string) => {
    console.log('🟡 [AUTH] login() iniciado');
    if (!auth) {
      const errorMsg = 'Firebase no está configurado. Por favor configura las variables de entorno.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    try {
      setError(null);
      console.log('🟡 [AUTH] Llamando a signInWithEmailAndPassword...');
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ [AUTH] signInWithEmailAndPassword completado:', result.user.uid);
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
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      const errorMessage = translateFirebaseError(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Login con Facebook
  const loginWithFacebook = async () => {
    if (!auth || !facebookProvider) {
      const errorMsg = 'Firebase no está configurado. Por favor configura las variables de entorno.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    try {
      setError(null);
      await signInWithPopup(auth, facebookProvider);
    } catch (error: any) {
      const errorMessage = translateFirebaseError(error.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Login con GitHub
  const loginWithGithub = async () => {
    if (!auth || !githubProvider) {
      const errorMsg = 'Firebase no está configurado. Por favor configura las variables de entorno.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    try {
      setError(null);
      await signInWithPopup(auth, githubProvider);
    } catch (error: any) {
      const errorMessage = translateFirebaseError(error.code);
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
      await signOut(auth);
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
        loginWithFacebook,
        loginWithGithub,
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
