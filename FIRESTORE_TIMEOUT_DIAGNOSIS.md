# 🔍 Guía de Diagnóstico: Error de Timeout en Creación de Apiarios

## 📋 Problema Identificado

Al hacer clic en "Crear Apiario", aparece el error:
```
Timeout: La operación tardó demasiado. Verifica tu conexión a internet.
```

## 🔧 Cambios Realizados

He actualizado la función `createApiary` en `src/services/firestoreApi.ts` con:

1. ✅ **Logs detallados** antes y después de la llamada a Firestore
2. ✅ **Eliminación del timeout genérico** para ver el error real de Firebase
3. ✅ **Manejo de errores específico** basado en códigos de error de Firebase
4. ✅ **Validación de datos** para evitar valores undefined
5. ✅ **Medición de tiempo** de ejecución de la operación

## 📊 Cómo Diagnosticar el Problema

### Paso 1: Abrir la Consola del Navegador

1. Abre tu aplicación en el navegador
2. Presiona **F12** o **Ctrl+Shift+I** (Windows/Linux) o **Cmd+Option+I** (Mac)
3. Ve a la pestaña **Console**

### Paso 2: Intentar Crear un Apiario

1. Ve a la pantalla de "Mis Apiarios"
2. Haz clic en "Crear tu primer apiario"
3. Llena el formulario con datos de prueba
4. Haz clic en "Crear Apiario"
5. **Observa la consola del navegador**

### Paso 3: Interpretar los Logs

Verás logs como estos:

```
🔍 [FIRESTORE] === INICIO createApiary ===
🔍 [FIRESTORE] Parámetros recibidos: { userId: "...", name: "...", location: "...", coordinates: {...} }
✅ [FIRESTORE] Base de datos obtenida: OK
📝 [FIRESTORE] Datos a guardar: {...}
📝 [FIRESTORE] Verificando tipos de datos:
  - userId: string ...
  - name: string ...
  - location: string ...
  - createdAt: string ...
  - updatedAt: string ...
  - coordinates.lat: number ...
  - coordinates.lng: number ...
📝 [FIRESTORE] Llamando a addDoc...
```

## 🚨 Posibles Errores y Soluciones

### Error 1: `permission-denied`

**Log en consola:**
```
❌ [FIRESTORE] PERMISO DENEGADO - Verifica las reglas de seguridad de Firestore
```

**Causa:** Las reglas de seguridad de Firestore están bloqueando la escritura.

**Solución:**
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Firestore Database** → **Rules**
4. Verifica que las reglas permitan escritura:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /apiarios/{apiaryId} {
      // Permitir lectura y escritura solo al propietario
      allow read, write: if request.auth != null && request.auth.uid == request.resource.data.userId;
      
      // O para modo prueba (SOLO PARA DESARROLLO):
      // allow read, write: if true;
    }
  }
}
```

5. Haz clic en **Publicar**

### Error 2: `unavailable`

**Log en consola:**
```
❌ [FIRESTORE] SERVICIO NO DISPONIBLE - Posible problema de red o configuración
```

**Causa:** Problema de conexión o configuración de Firebase.

**Solución:**
1. Verifica tu conexión a internet
2. Verifica que las variables de entorno estén correctas en `.env`:
   ```
   VITE_FIREBASE_API_KEY=tu-api-key
   VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu-project-id
   VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```
3. Reinicia el servidor de desarrollo: `npm run dev`
4. Verifica que Firestore esté habilitado en Firebase Console

### Error 3: `invalid-argument`

**Log en consola:**
```
❌ [FIRESTORE] ARGUMENTO INVÁLIDO - Revisa los datos enviados
```

**Causa:** Algún campo tiene un valor inválido (undefined, null, tipo incorrecto).

**Solución:**
1. Revisa los logs de "Verificando tipos de datos"
2. Asegúrate de que todos los campos tengan valores válidos
3. Verifica que no haya valores `undefined` en los datos

### Error 4: `deadline-exceeded`

**Log en consola:**
```
❌ [FIRESTORE] TIEMPO LÍMITE EXCEDIDO - La operación tardó demasiado
```

**Causa:** La operación tardó demasiado en completarse (posible problema de red o Firestore lento).

**Solución:**
1. Verifica tu conexión a internet
2. Intenta nuevamente
3. Si el problema persiste, verifica el estado de Firebase en [status.firebase.google.com](https://status.firebase.google.com/)

### Error 5: `not-found`

**Log en consola:**
```
❌ [FIRESTORE] RECURSO NO ENCONTRADO - La colección o documento no existe
```

**Causa:** La colección "apiarios" no existe en Firestore.

**Solución:**
1. Ve a Firebase Console
2. Ve a **Firestore Database**
3. Crea manualmente la colección "apiarios" con un documento de prueba
5. Elimina el documento de prueba (la colección permanecerá)

## 🔍 Diagnóstico Paso a Paso

### Verificación 1: Configuración de Firebase

Abre la consola del navegador y ejecuta:

```javascript
// Verificar que Firebase esté inicializado
import { db } from './src/lib/firebase';
console.log('Firebase db:', db);
```

Deberías ver un objeto Firestore, no `null` o `undefined`.

### Verificación 2: Usuario Autenticado

```javascript
import { getAuth } from 'firebase/auth';
const auth = getAuth();
console.log('Usuario actual:', auth.currentUser);
```

Deberías ver el objeto del usuario autenticado.

### Verificación 3: Prueba Manual de Escritura

En la consola del navegador, ejecuta:

```javascript
import { db } from './src/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const userId = auth.currentUser?.uid;

try {
  const docRef = await addDoc(collection(db, 'apiarios'), {
    userId: userId,
    name: 'Test Apiary',
    location: 'Test Location',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  console.log('✅ Documento creado:', docRef.id);
} catch (error) {
  console.error('❌ Error:', error);
}
```

## 📋 Checklist de Diagnóstico

- [ ] Abrir la consola del navegador (F12)
- [ ] Intentar crear un apiario
- [ ] Copiar todos los logs de la consola
- [ ] Identificar el código de error (permission-denied, unavailable, etc.)
- [ ] Verificar las reglas de seguridad de Firestore
- [ ] Verificar las variables de entorno en `.env`
- [ ] Verificar que el usuario esté autenticado
- [ ] Verificar que Firestore esté habilitado
- [ ] Probar escritura manual desde la consola

## 🎯 Próximos Pasos

1. **Ejecuta la aplicación** e intenta crear un apiario
2. **Copia los logs** de la consola del navegador
3. **Identifica el error** específico usando la guía anterior
4. **Aplica la solución** correspondiente
5. **Reporta el resultado** con los logs completos

## 📞 Soporte

Si después de seguir esta guía el problema persiste, proporciona:

1. Los logs completos de la consola del navegador
2. Captura de pantalla de las reglas de Firestore
3. Captura de pantalla de las variables de entorno (oculta las claves sensibles)
4. Versión de Node.js y npm (`node --version` y `npm --version`)

---

**Nota:** Los logs ahora son mucho más detallados y te permitirán identificar exactamente qué está fallando en la creación del apiario.
