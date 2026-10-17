# Reglas de la base de datos (Firestore y Storage) — Apiarios Carrión

Revisión hecha el 2026-10-17 contra los cambios recientes de la app (chats del
Asistente IA en la nube, sincronización de colmenas/núcleos/fecundadores/
inspecciones, fotos del chat).

Archivos de reglas del proyecto: `firestore.rules` y `storage.rules`.

## 1. ¿Las reglas actuales cubren lo nuevo?

**Sí. No hace falta cambiar nada para que todo funcione.**

| Dato nuevo o cambiado | Dónde se guarda | Regla que lo permite |
|---|---|---|
| Chats del Asistente IA (`conversacionesIA`) | `userData/{uid}` (campo del documento) | `match /userData/{userId}`: el dueño lee y escribe |
| Colmenas, núcleos, fecundadores, inspecciones, tareas, etc. | `apiarioData/{apiaryId}_{entidad}` con `{ userId, apiaryId, entity, items }` | `match /apiarioData/{dataId}`: crea si `userId == uid`; lee, actualiza y borra si es el dueño |
| Ajustes, meta anual, precio base, unidad de cosecha | `userData/{uid}` | igual que arriba |
| Apiarios | `apiarios/{id}` | `match /apiarios/{apiaryId}` (dueño o admin) |
| Fotos del chat y de inspecciones | Cloudinary (no usa Storage de Firebase) | no aplica |

Detalle importante: cada escritura de `apiarioData` lleva `userId` (lo agrega
`upsertApiaryEntity` en `src/services/firestoreSync.ts`), que es justo lo que
exige la regla de `create`. Los documentos que se mandan ya no llevan `undefined`
(Firestore rechazaba el documento entero por eso), y el historial de chats se
recorta a 600 KB para no pasar el límite de 1 MiB por documento.

> Si "con los cambios seguro se actualizó" se refiere a que las reglas se
> publicaron solas: **no ocurre automáticamente**. Vercel solo despliega la
> web; las reglas se publican aparte (sección 3).

## 2. Mejoras recomendadas (opcionales, no urgentes)

Estas **no** están aplicadas en `firestore.rules`; son endurecimientos que
conviene hacer cuando quieras.

### 2.1 `trapBoxes` está abierta a cualquier usuario con sesión (la más importante)

Hoy:

```
match /trapBoxes/{boxId} {
  allow read, write: if isSignedIn();
}
```

Cualquier usuario autenticado puede leer, modificar y borrar las cajas trampa
de otros. Propuesta (igual que `colmenas`):

```
match /trapBoxes/{boxId} {
  allow read: if isSignedIn()
    && (resource.data.userId == request.auth.uid || isAdmin());
  allow create: if isSignedIn()
    && request.resource.data.userId == request.auth.uid;
  allow update, delete: if isSignedIn()
    && (resource.data.userId == request.auth.uid || isAdmin());
}
```

Antes de aplicarla, comprobar que todas las cajas existentes tengan el campo
`userId` (las que no lo tengan dejarían de verse). La app ya consulta con
`where('userId', '==', uid)`, así que las creadas desde la app lo tienen.

### 2.2 Que `userId` no se pueda cambiar en `apiarioData`

Hoy el dueño puede actualizar el documento y poner otro `userId`. Añadir a
`update`:

```
allow update: if isSignedIn()
  && (resource.data.userId == request.auth.uid || isAdmin())
  && request.resource.data.userId == resource.data.userId;
```

### 2.3 Tope de tamaño para `userData`

Los chats ya se recortan en el cliente (600 KB). Como defensa extra no hay
forma sencilla de limitar bytes en las reglas, así que esa protección queda
del lado de la app (`src/lib/chatSync.ts`). No requiere cambio.

### 2.4 Lo que está bien y conviene no tocar

- `config/admins`: solo la cuenta propietaria modifica la lista y no puede
  quitarse a sí misma.
- `pedidos`: el cliente solo crea el suyo en `pendiente_pago`; solo un admin
  cambia el estado; el total y el cliente no se pueden mutar; no se borra.
- `cotizaciones`: solo admins.
- `products`: lectura pública, escritura solo de admins.
- `storage.rules`: comprobantes ≤ 2 MB y fotos de inspección ≤ 10 MB, solo
  imágenes, escritura con sesión.

## 3. Cómo publicar las reglas

Con la CLI de Firebase, desde la raíz del repositorio:

```
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage
```

O, sin CLI: Firebase Console → Firestore Database → pestaña **Reglas** → pegar
el contenido de `firestore.rules` → **Publicar** (y lo mismo en Storage →
Reglas con `storage.rules`).

Para saber si las reglas publicadas están al día, compara la fecha de
"Última publicación" de la pestaña Reglas con la del último cambio de
`firestore.rules` en GitHub.

## 4. Pruebas

- Las pruebas de reglas están en `tests/rules/` y se ejecutan con
  `npm run test:rules` (necesitan el emulador de Firebase y Java).
- **No se pudieron ejecutar en la revisión de hoy**: el entorno donde se trabajó
  bloquea la descarga del emulador. Conviene correrlas en tu computadora antes
  de publicar cualquier cambio de reglas.
- Sí se ejecutaron y pasaron: `npm run test:sync` (sanitizado de datos y
  límite de tamaño de chats), `npm run test:scroll` y `npm run test:motion`.
