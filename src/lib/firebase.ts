import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, TwitterAuthProvider, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Verificar que las variables de entorno de Firebase existan
const checkFirebaseConfig = () => {
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID'
  ];

  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ [FIREBASE] Variables de entorno faltantes:', missingVars);
    console.error('❌ [FIREBASE] Por favor configura las variables de Firebase en el archivo .env');
    console.error('❌ [FIREBASE] Consulta .env.example para ver las variables requeridas');
    return false;
  }

  return true;
};

// Configuración de Firebase desde variables de entorno
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let twitterProvider: TwitterAuthProvider | null = null;

// Inicializar Firebase solo si la configuración es válida
if (checkFirebaseConfig()) {
  try {
    if (import.meta.env.DEV) console.log('✅ [FIREBASE] Inicializando Firebase...');
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    // Caché persistente (IndexedDB): las escrituras hechas sin conexión o con
    // la app en segundo plano quedan encoladas y se envían al volver, en lugar
    // de perderse al recargar. El gestor multi-pestaña evita que dos pestañas
    // peleen por la misma caché. Si el navegador no la admite (modo privado,
    // IndexedDB bloqueado) se cae a la caché en memoria de siempre.
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch (error) {
      console.warn('⚠️ [FIRESTORE] Caché persistente no disponible; se usa caché en memoria', error);
      db = getFirestore(app);
    }
    storage = getStorage(app);
    googleProvider = new GoogleAuthProvider();
    twitterProvider = new TwitterAuthProvider();
    if (import.meta.env.DEV) console.log('✅ [FIREBASE] Firebase inicializado correctamente');
  } catch (error) {
    console.error('❌ [FIREBASE] Error al inicializar Firebase:', error);
  }
} else {
  if (import.meta.env.DEV) console.warn('⚠️ [FIREBASE] Firebase no se inicializó debido a configuración faltante');
  if (import.meta.env.DEV) console.warn('⚠️ [FIREBASE] La aplicación funcionará en modo limitado sin autenticación');
}

// Exportar servicios (pueden ser null si Firebase no se inicializó)
export { app, auth, db, storage, googleProvider, twitterProvider };

// Función para verificar si Firebase está disponible
export const isFirebaseAvailable = (): boolean => {
  return auth !== null;
};

// Traducción de errores de Firebase al español
export const translateFirebaseError = (errorCode: string): string => {
  const errorMap: Record<string, string> = {
    'auth/email-already-in-use': 'Este email ya está registrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/user-not-found': 'No existe cuenta con este email',
    'auth/invalid-email': 'Email no válido',
    'auth/popup-closed-by-user': 'Inicio de sesión cancelado',
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/invalid-credential': 'Credenciales inválidas',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
    'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este email usando otro método de inicio de sesión',
    'auth/unauthorized-domain': 'Error de configuración. Contacta al soporte',
  };

  return errorMap[errorCode] || 'Error de autenticación. Intenta de nuevo';
};

/**
 * Mensajes de error específicos del botón de X (Twitter).
 *
 * Van aparte de `translateFirebaseError` a propósito: ese traductor es
 * compartido con el login por correo y con Google, y sus textos ya están
 * ajustados a esos flujos. Mezclarlos cambiaría mensajes de pantallas que
 * no toca este trabajo.
 */
export const translateTwitterError = (errorCode: string): string => {
  const twitterErrorMap: Record<string, string> = {
    'auth/popup-closed-by-user': 'Inicio de sesión cancelado.',
    'auth/account-exists-with-different-credential':
      'Ya existe una cuenta con este correo usando otro método.',
    'auth/network-request-failed': 'Error de conexión. Revisa tu internet.',
    'auth/unauthorized-domain': 'Error de configuración. Contacta al soporte.',
  };

  return twitterErrorMap[errorCode] || 'Error al iniciar sesión con X. Intenta más tarde.';
};
