import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, GithubAuthProvider, Auth } from 'firebase/auth';

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
let googleProvider: GoogleAuthProvider | null = null;
let facebookProvider: FacebookAuthProvider | null = null;
let githubProvider: GithubAuthProvider | null = null;

// Inicializar Firebase solo si la configuración es válida
if (checkFirebaseConfig()) {
  try {
    console.log('✅ [FIREBASE] Inicializando Firebase...');
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    facebookProvider = new FacebookAuthProvider();
    githubProvider = new GithubAuthProvider();
    console.log('✅ [FIREBASE] Firebase inicializado correctamente');
  } catch (error) {
    console.error('❌ [FIREBASE] Error al inicializar Firebase:', error);
  }
} else {
  console.warn('⚠️ [FIREBASE] Firebase no se inicializó debido a configuración faltante');
  console.warn('⚠️ [FIREBASE] La aplicación funcionará en modo limitado sin autenticación');
}

// Exportar servicios (pueden ser null si Firebase no se inicializó)
export { app, auth, googleProvider, facebookProvider, githubProvider };

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
  };

  return errorMap[errorCode] || 'Error de autenticación. Intenta de nuevo';
};
