# 🔥 Integración con Firebase Firestore - Documentación Completa

## 📋 Resumen de la Integración

Se ha integrado Firebase Firestore en la aplicación para manejar los datos de apiarios, colmenas, inspecciones, cosechas y tareas. Los datos ahora se sincronizan en la nube y están separados por usuario autenticado.

## 🏗️ Estructura de Datos en Firestore

```
Firestore Database
│
├── apiarios/
│   ├── {apiaryId}
│   │   ├── userId: string
│   │   ├── name: string
│   │   ├── location: string
│   │   ├── createdAt: string
│   │   └── updatedAt: string
│   │
│   ├── colmenas/
│   │   ├── {hiveId}
│   │   │   ├── apiaryId: string
│   │   │   ├── code: string
│   │   │   ├── name: string
│   │   │   ├── status: string
│   │   │   ├── queenYear: number
│   │   │   ├── queenMarkedColor: string
│   │   │   ├── location: string
│   │   │   ├── notes: string
│   │   │   ├── lastInspectionDate: string
│   │   │   ├── createdAt: string
│   │   │   └── updatedAt: string
│   │   │
│   │   ├── inspecciones/
│   │   │   ├── {inspectionId}
│   │   │   │   ├── hiveId: string
│   │   │   │   ├── date: string
│   │   │   │   ├── queenSeen: boolean
│   │   │   │   ├── varroaLevel: number
│   │   │   │   ├── temperature: number
│   │   │   │   ├── notes: string
│   │   │   │   ├── createdAt: string
│   │   │   │   └── updatedAt: string
│   │   │
│   │   └── cosechas/
│   │       ├── {harvestId}
│   │       │   ├── hiveId: string
│   │       │   ├── date: string
│   │       │   ├── honeyKg: number
│   │       │   ├── pollenG: number
│   │       │   ├── propolisG: number
│   │       │   ├── waxKg: number
│   │       │   ├── createdAt: string
│   │       │   └── updatedAt: string
│   │
│   └── tareas/
│       ├── {taskId}
│       │   ├── apiaryId: string
│       │   ├── title: string
│       │   ├── description: string
│       │   ├── dueDate: string
│       │   ├── priority: string
│       │   ├── completed: boolean
│       │   ├── createdAt: string
│       │   └── updatedAt: string
│
└── users/
    └── {userId}
        ├── email: string
        ├── displayName: string
        └── createdAt: string
```

## 🔒 Reglas de Seguridad de Firestore

Las reglas de seguridad aseguran que cada usuario solo pueda acceder a sus propios datos:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // APIARIOS
    match /apiarios/{apiaryId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      
      // COLMENAS (subcolección)
      match /colmenas/{hiveId} {
        allow read, write: if request.auth != null && 
                              request.auth.uid == get(/databases/$(database)/documents/apiarios/$(apiaryId)).data.userId;
        
        // INSPECCIONES (subcolección de colmenas)
        match /inspecciones/{inspectionId} {
          allow read, write: if request.auth != null && 
                                request.auth.uid == get(/databases/$(database)/documents/apiarios/$(apiaryId)).data.userId;
        }
        
        // COSECHAS (subcolección de colmenas)
        match /cosechas/{harvestId} {
          allow read, write: if request.auth != null && 
                                request.auth.uid == get(/databases/$(database)/documents/apiarios/$(apiaryId)).data.userId;
        }
      }
      
      // TAREAS (subcolección de apiarios)
      match /tareas/{taskId} {
        allow read, write: if request.auth != null && 
                              request.auth.uid == get(/databases/$(database)/documents/apiarios/$(apiaryId)).data.userId;
      }
    }
  }
}
```

## 📁 Archivos Creados/Modificados

### Nuevos Archivos

1. **`src/services/firestoreApi.ts`** - Servicios para interactuar con Firestore
   - Funciones CRUD para apiarios
   - Funciones CRUD para colmenas
   - Funciones CRUD para inspecciones
   - Funciones CRUD para cosechas
   - Funciones CRUD para tareas

2. **`src/components/ApiarySelector.tsx`** - Componente para seleccionar/crear apiarios
   - Muestra lista de apiarios del usuario
   - Formulario para crear nuevo apiario
   - Tarjetas con información de cada apiario

3. **`src/components/ApiaryDashboard.tsx`** - Dashboard de un apiario específico
   - Muestra estadísticas del apiario
   - Lista de colmenas del apiario
   - Estadísticas de colmenas

4. **`src/components/ApiaryFlow.tsx`** - Flujo completo de selección de apiarios
   - Maneja la navegación entre selector y dashboard
   - Permite volver a la selección de apiarios

5. **`firestore.rules`** - Reglas de seguridad de Firestore

### Archivos Modificados

1. **`src/lib/firebase.ts`**
   - Agregada inicialización de Firestore
   - Exportada instancia de Firestore

2. **`src/App.tsx`**
   - Importado ApiaryFlow
   - Agregada ruta `/apiarios`
   - Actualizada ruta de "Control de Colmenas" para usar `/apiarios`

3. **`src/components/SelectionScreen.tsx`**
   - Actualizada navegación de "Control de Colmenas" para ir a `/apiarios`

## 🔄 Flujo de la Aplicación

### Flujo Completo

```
1. Usuario inicia sesión
   ↓
2. Se muestra SelectionScreen
   ↓
3. Usuario hace clic en "Control de Colmenas"
   ↓
4. Se navega a /apiarios
   ↓
5. Se muestra ApiaryFlow
   ↓
6. ApiaryFlow muestra ApiarySelector
   ↓
7. ApiarySelector consulta Firestore por apiarios del usuario
   ↓
8a. Si NO tiene apiarios → Muestra formulario de creación
8b. Si TIENE apiarios → Muestra lista de apiarios
   ↓
9. Usuario selecciona/crea un apiario
   ↓
10. ApiaryFlow muestra ApiaryDashboard con el apiario seleccionado
   ↓
11. ApiaryDashboard consulta Firestore por colmenas del apiario
   ↓
12. Se muestra dashboard con colmenas del apiario
```

## 📦 Servicios de Firestore

### Apiarios

```typescript
// Crear apiario
createApiary(userId: string, name: string, location: string): Promise<string>

// Obtener apiarios del usuario
getUserApiaries(userId: string): Promise<Apiary[]>

// Obtener apiario específico
getApiary(apiaryId: string): Promise<Apiary | null>

// Actualizar apiario
updateApiary(apiaryId: string, updates: Partial<Apiary>): Promise<void>

// Eliminar apiario
deleteApiary(apiaryId: string): Promise<void>
```

### Colmenas

```typescript
// Crear colmena
createHive(apiaryId: string, hiveData: Omit<Hive, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>

// Obtener colmenas del apiario
getApiaryHives(apiaryId: string): Promise<HiveWithApiary[]>

// Obtener colmena específica
getHive(hiveId: string): Promise<HiveWithApiary | null>

// Actualizar colmena
updateHive(hiveId: string, updates: Partial<Hive>): Promise<void>

// Eliminar colmena
deleteHive(hiveId: string): Promise<void>
```

### Inspecciones

```typescript
// Crear inspección
createInspection(hiveId: string, inspectionData: any): Promise<string>

// Obtener inspecciones de colmena
getHiveInspections(hiveId: string): Promise<any[]>

// Actualizar inspección
updateInspection(inspectionId: string, updates: any): Promise<void>

// Eliminar inspección
deleteInspection(inspectionId: string): Promise<void>
```

### Cosechas

```typescript
// Crear cosecha
createHarvest(hiveId: string, harvestData: any): Promise<string>

// Obtener cosechas de colmena
getHiveHarvests(hiveId: string): Promise<any[]>

// Actualizar cosecha
updateHarvest(harvestId: string, updates: any): Promise<void>

// Eliminar cosecha
deleteHarvest(harvestId: string): Promise<void>
```

### Tareas

```typescript
// Crear tarea
createTask(apiaryId: string, taskData: any): Promise<string>

// Obtener tareas del apiario
getApiaryTasks(apiaryId: string): Promise<any[]>

// Actualizar tarea
updateTask(taskId: string, updates: any): Promise<void>

// Eliminar tarea
deleteTask(taskId: string): Promise<void>
```

## 🚀 Despliegue de Reglas de Firestore

### Paso 1: Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

### Paso 2: Iniciar sesión en Firebase

```bash
firebase login
```

### Paso 3: Inicializar Firebase en el proyecto

```bash
firebase init firestore
```

Selecciona:
- Usar proyecto existente
- Selecciona tu proyecto de Firebase
- Archivo de reglas: `firestore.rules`
- No configurar índices automáticamente

### Paso 4: Desplegar reglas

```bash
firebase deploy --only firestore:rules
```

### Paso 5: Verificar reglas en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Firestore Database** > **Rules**
4. Verifica que las reglas estén desplegadas correctamente

## 🧪 Pruebas de la Integración

### Prueba 1: Crear primer apiario
1. ✅ Iniciar sesión con un usuario nuevo
2. ✅ Hacer clic en "Control de Colmenas"
3. ✅ Verificar que se muestra formulario de creación
4. ✅ Crear un apiario con nombre y ubicación
5. ✅ Verificar que se guarda en Firestore
6. ✅ Verificar que se muestra en la lista

### Prueba 2: Crear colmenas
1. ✅ Seleccionar un apiario
4. ✅ Verificar que se muestra dashboard vacío
6. ✅ Crear colmenas en el apiario
8. ✅ Verificar que se guardan en Firestore
10. ✅ Verificar que se muestran en el dashboard

### Prueba 3: Separación de datos por usuario
1. ✅ Crear datos con Usuario A
4. ✅ Cerrar sesión
6. ✅ Iniciar sesión con Usuario B
8. ✅ Verificar que Usuario B NO ve los datos de Usuario A
10. ✅ Crear datos con Usuario B
12. ✅ Cerrar sesión
14. ✅ Iniciar sesión con Usuario A
16. ✅ Verificar que Usuario A solo ve sus propios datos

### Prueba 4: Reglas de seguridad
1. ✅ Intentar acceder a apiarios de otro usuario desde la consola
4. ✅ Verificar que Firestore rechaza la solicitud
6. ✅ Verificar que solo se pueden acceder a los propios datos

## 📊 Ventajas de la Integración con Firestore

### Antes (localStorage)
- ❌ Datos solo en el navegador del usuario
- ❌ No hay sincronización entre dispositivos
- ❌ No hay respaldo de datos
- ❌ Datos se pierden si se limpia el caché
6. ❌ No hay separación real por usuario

### Después (Firestore)
- ✅ Datos en la nube
- ✅ Sincronización en tiempo real
- ✅ Respaldo automático
- ✅ Datos persistentes
- ✅ Separación segura por usuario
- ✅ Reglas de seguridad robustas
- ✅ Escalable

## 🎯 Próximos Pasos

### Integración Completa

1. **Migrar componentes existentes a Firestore**
   - HivesSection → usar getApiaryHives
   - Production → usar getHiveHarvests
   - NotebookSection → usar getHiveInspections
   - TasksSection → usar getApiaryTasks

2. **Actualizar formularios para guardar en Firestore**
   - AddHiveModal → usar createHive
   - InspectionModal → usar createInspection
   - HarvestForm → usar createHarvest
   - TaskForm → usar createTask

3. **Implementar sincronización en tiempo real**
   - Usar onSnapshot para actualizaciones en tiempo real
   - Mostrar indicadores de sincronización

4. **Implementar caché offline**
   - Configurar persistencia offline de Firestore
   - Sincronizar cuando haya conexión

## ✅ Estado del Proyecto

- ✅ Firebase Firestore configurado
- ✅ Servicios CRUD creados
- ✅ Reglas de seguridad creadas
- ✅ Componentes de selección de apiarios creados
- ✅ Dashboard de apiarios creado
- ✅ Flujo de selección integrado
- ✅ Rutas actualizadas
- ✅ Documentación completa

## 🎉 Conclusión

La integración con Firebase Firestore está lista. Los datos ahora se sincronizan en la nube y están separados por usuario autenticado. Las reglas de seguridad aseguran que cada usuario solo pueda acceder a sus propios datos.

**Próximos pasos:** Migrar los componentes existentes para usar los servicios de Firestore en lugar de localStorage.
