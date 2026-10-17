# Reglas de la base de datos — Apiarios Carrión

Aquí está el código COMPLETO de las reglas de Firestore en un solo bloque, para
copiar y pegar. Fuente de verdad en el repo: `firestore.rules` (este archivo es
una copia; si cambias uno, actualiza el otro).

Las reglas de **Storage** (`storage.rules`) NO cambiaron: no hace falta tocarlas.

## Cómo publicarlas

- **Sin instalar nada:** Firebase Console → Firestore Database → pestaña
  **Reglas** → borrar todo, pegar el bloque de abajo → **Publicar**.
- **Con la CLI:** `firebase deploy --only firestore:rules`

## Qué cubren (revisado el 2026-10-17)

- Chats del Asistente IA (`conversacionesIA`), ajustes, inventario → dentro de
  `userData/{uid}`.
- Colmenas, núcleos, fecundadores, inspecciones, tareas… → `apiarioData/{apiaryId}_{entidad}`.
- Cada documento lleva `userId`; solo su dueño lo lee/edita (el admin de tienda
  supervisa). El `userId` no se puede reasignar al actualizar.
- `trapBoxes` y `polinizacion` solo del propietario.
- Tienda: `products` (lectura pública), `pedidos`, `cotizaciones`, `config/admins`.
- Todo lo que no aparece aquí queda **denegado**.
- Las fotos de los chats y de las inspecciones van a Cloudinary, no a Storage.

Notas:
- Los IDs de cajas trampa (`TRP-001`…) y contratos (`POL-001`…) se calculan por
  usuario pero viven en una colección compartida: con varios usuarios podrían
  chocar. Con una sola cuenta no pasa nada.
- Si una caja trampa antigua no tiene el campo `userId`, dejará de verse.
- Pruebas: `npm run test:rules` (requiere el emulador de Firebase y Java; no se
  pudieron ejecutar al reestructurar el archivo, córrelas antes de publicar).

---

## Reglas de Firestore (copiar y pegar todo)

```
rules_version = '2';

// =====================================================================
// REGLAS DE FIRESTORE — Apiarios Carrión
// =====================================================================
// Mapa de colecciones (de arriba abajo):
//
//   1. CONFIGURACIÓN      config/admins
//   2. CUENTA Y DATOS     users · userData · apiarios · apiarioData
//   3. ENTIDADES          colmenas · nucleos · fecundadores · trapBoxes ·
//                         polinizacion            (documento por entidad)
//   4. TIENDA             products · pedidos · cotizaciones
//   (apiarios incluye las subcolecciones de LEGADO colmenas|tareas)
//   5. TODO LO DEMÁS      denegado
//
// Modelo: app de un solo cliente, sin multi-tenant. El aislamiento es por
// PROPIETARIO (campo `userId` del documento) y, para supervisar y gestionar
// la tienda, por la lista de admins de `config/admins`.
//
// Los chats del Asistente IA, ajustes, inventario, etc. viven DENTRO de
// `userData/{uid}`; colmenas, núcleos, fecundadores, inspecciones, tareas...
// viven en `apiarioData/{apiaryId}_{entidad}`. Ambos los cubre la sección 2.
// =====================================================================

service cloud.firestore {
  match /databases/{database}/documents {

    // ================================================================
    // HELPERS
    // ================================================================

    // Sesión iniciada.
    function isSignedIn() {
      return request.auth != null;
    }

    // El documento (existente) pertenece a quien hace la petición.
    // Usar SOLO con `resource.data` (en un create `resource` es null).
    function isOwner(data) {
      return isSignedIn() && data.userId == request.auth.uid;
    }

    // En un create/update, el documento que se va a escribir es del propio
    // usuario: nadie puede crear ni reasignar datos a nombre de otro.
    function writesAsSelf() {
      return isSignedIn() && request.resource.data.userId == request.auth.uid;
    }

    // El `userId` no cambia al actualizar.
    function keepsOwner() {
      return request.resource.data.userId == resource.data.userId;
    }

    // Helper: el correo de la cuenta está en la lista de admins de tienda
    // (config/admins). Null-safe: si el documento no existe devuelve false en
    // vez de reventar la evaluación (get().data sería null y `.emails`
    // denegaría en cascada). Se usan ternarios porque el motor de reglas NO
    // garantiza cortocircuito en `&&`.
    function isAdmin() {
      return !isSignedIn() || !exists(/databases/$(database)/documents/config/admins)
        ? false
        : get(/databases/$(database)/documents/config/admins).data.emails
            .hasAny([request.auth.token.email]);
    }

    // CUENTA PROPIETARIA de la lista de admins.
    //
    // Modelo de permisos de `config/admins`:
    //   - ownerEmail (la "cuenta predeterminada") → puede AGREGAR y QUITAR
    //     administradores, y no se puede quitar a sí misma.
    //   - cualquier otro admin de la lista     → solo accede al panel; NO
    //     puede tocar la lista en absoluto.
    //
    // El propietario se guarda EN el documento, no en el código: las reglas no
    // pueden leer variables de entorno ni el .env. Se fija una sola vez por
    // fuera con `npm run bootstrap:admins` (Admin SDK), igual que el documento
    // en sí. Por eso `allow create` sigue en false.
    function isAdminOwner() {
      return !isSignedIn() || !exists(/databases/$(database)/documents/config/admins)
        ? false
        : request.auth.token.email == resource.data.ownerEmail;
    }

    // Valida la lista de correos de la tienda.
    //
    // LIMITACIÓN CONOCIDA DEL LENGUAJE DE REGLAS: no existen iteradores de
    // orden superior sobre listas. NO hay `all()`, ni `map()`, ni `distinct()`.
    // La versión anterior de esta función usaba `emails.all(email, ...)` y
    // `emails.distinct(true)`: el motor resolvía "Function not found error:
    // Name: [all]" y la evaluación entera fallaba, así que la regla de update
    // de config/admins DENEGABA SIEMPRE. En la práctica el panel "Gestión de
    // administradores" (src/components/AdminStore.tsx) no podía agregar ni
    // quitar a nadie: el error llegaba al cliente como PERMISSION_DENIED.
    //
    // Lo que sí se comprueba aquí, con lo que el lenguaje permite:
    //   - que sea lista, no vacía y de tamaño razonable (tope duro);
    //   - formato y minúsculas del PRIMER elemento, que en el flujo real es el
    //     admin que ya existía (addAdminEmail anexa al final).
    // El formato de cada correo lo valida el cliente en
    // `validateAdminEmail` (src/lib/adminAccess.ts), y solo un admin ya
    // listado puede escribir en este documento.
    function isValidAdminEmails(emails) {
      return emails is list
        && emails.size() >= 1
        && emails.size() <= 20
        && emails[0] is string
        && emails[0].size() > 3
        && emails[0].size() < 255
        && emails[0].matches('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$')
        && emails[0] == emails[0].lower();
    }

    // Propietario del documento o administrador de la tienda.
    function isOwnerOrAdmin(data) {
      return isOwner(data) || isAdmin();
    }

    // ================================================================
    // 1. CONFIGURACIÓN
    // ================================================================
    // Lista de administradores de la tienda.
    // La crea el Admin SDK (`npm run bootstrap:admins`); el cliente solo la
    // lee y, si es la cuenta propietaria, la modifica.
    match /config/admins {
      allow read: if isSignedIn()
        && (!exists(/databases/$(database)/documents/config/admins) || isAdmin());

      // El documento NO se puede crear desde el cliente: no hay ninguna
      // cuenta privilegiada ni correo hardcodeado en las reglas. Se crea
      // una sola vez por fuera, con Admin SDK:
      //   npm run bootstrap:admins
      // (ver scripts/bootstrap-admins.mjs).
      allow create: if false;

      // Modificar la lista SOLO desde la cuenta propietaria (ownerEmail).
      //
      // Un admin añadido solo tiene acceso al panel: aunque manipule el
      // cliente, Firestore le rechaza. Y las tres últimas condiciones blindan
      // la lista:
      //   - `ownerEmail` no se puede cambiar (se lee `resource`, el valor
      //     previo, en vez de `request.resource`): si no, quien sea dueño
      //     podría ceder o reasignar el cargo y dejar la lista sin gestor.
      //   - la lista no puede quedar sin al menos un admin.
      //   - la cuenta propietaria no puede quitarse a sí misma, nunca (da igual
      //     cuántas cuentas haya): siempre tiene que quedar alguien que pueda
      //     administrar la lista.
      allow update: if isSignedIn()
        && isAdmin()
        && isAdminOwner()
        && request.resource.data.keys().hasAll(['emails', 'ownerEmail', 'updatedAt', 'updatedBy'])
        && (request.resource.data.ownerEmail is string)
        && (request.resource.data.ownerEmail == resource.data.ownerEmail)
        && (request.resource.data.updatedAt is timestamp)
        && (request.resource.data.updatedBy == request.auth.uid)
        && isValidAdminEmails(request.resource.data.emails)
        && (request.resource.data.emails.size() >= 1)
        && (request.resource.data.emails.hasAny([resource.data.ownerEmail]));

      allow delete: if false;
    }

    // ================================================================
    // 2. CUENTA Y DATOS DEL USUARIO
    // ================================================================

    // Perfil. El usuario edita el suyo; un admin puede leerlo y actualizarlo.
    match /users/{userId} {
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow delete: if false;
    }

    // Datos del usuario: inventario, historial de traslados, ajustes, meta
    // anual, precio base y CHATS del Asistente IA (`conversacionesIA`).
    // Doc id = uid. El cliente mantiene este documento por debajo de 1 MiB
    // (los chats se recortan a 600 KB y sin fotos en base64).
    match /userData/{userId} {
      allow read, write: if isSignedIn() && (request.auth.uid == userId || isAdmin());
    }

    // Datos por apiario: fuente de verdad de la app.
    // Doc id = `${apiaryId}_${entidad}` con { userId, apiaryId, entity, items }.
    match /apiarioData/{dataId} {
      allow read, delete: if isOwnerOrAdmin(resource.data);
      allow create: if writesAsSelf();
      allow update: if isOwnerOrAdmin(resource.data) && keepsOwner();
    }

    // ================================================================
    // 2b. APIARIOS (+ subcolecciones de LEGADO)
    // ================================================================
    // El documento del apiario es del dueño; un admin lo supervisa. Las
    // subcolecciones (colmenas, tareas...) ya no se usan —la app escribe en
    // `apiarioData`— pero se conservan por si quedan datos antiguos.
    match /apiarios/{apiaryId} {
      allow read, update, delete: if isOwnerOrAdmin(resource.data);
      allow create: if writesAsSelf() || isAdmin();

      match /colmenas/{hiveId} {
        allow read, write: if isSignedIn() && (
          request.auth.uid == get(/databases/$(database)/documents/apiarios/$(apiaryId)).data.userId
          || isAdmin());

        match /inspecciones/{inspectionId} {
          allow read, write: if isSignedIn() && (
            request.auth.uid == get(/databases/$(database)/documents/apiarios/$(apiaryId)).data.userId
            || isAdmin());
        }

        match /cosechas/{harvestId} {
          allow read, write: if isSignedIn() && (
            request.auth.uid == get(/databases/$(database)/documents/apiarios/$(apiaryId)).data.userId
            || isAdmin());
        }
      }

      match /tareas/{taskId} {
        allow read, write: if isSignedIn() && (
          request.auth.uid == get(/databases/$(database)/documents/apiarios/$(apiaryId)).data.userId
          || isAdmin());
      }
    }

    // ================================================================
    // 3. ENTIDADES (un documento por entidad, con `userId`)
    // ================================================================
    // colmenas · nucleos · fecundadores · trapBoxes · polinizacion:
    // el dueño crea, lee, edita y borra los suyos; el admin supervisa.

    match /colmenas/{id} {
      allow read, delete: if isOwnerOrAdmin(resource.data);
      allow create: if writesAsSelf();
      allow update: if isOwnerOrAdmin(resource.data) && keepsOwner();
    }

    match /nucleos/{id} {
      allow read, delete: if isOwnerOrAdmin(resource.data);
      allow create: if writesAsSelf();
      allow update: if isOwnerOrAdmin(resource.data) && keepsOwner();
    }

    match /fecundadores/{id} {
      allow read, delete: if isOwnerOrAdmin(resource.data);
      allow create: if writesAsSelf();
      allow update: if isOwnerOrAdmin(resource.data) && keepsOwner();
    }

    // Cajas trampa. Doc id = "TRP-001". (Antes: cualquier usuario con sesión.)
    match /trapBoxes/{id} {
      allow read, delete: if isOwnerOrAdmin(resource.data);
      allow create: if writesAsSelf();
      allow update: if isOwnerOrAdmin(resource.data) && keepsOwner();
    }

    // Contratos de polinización. Doc id = "POL-001".
    match /polinizacion/{id} {
      allow read, delete: if isOwnerOrAdmin(resource.data);
      allow create: if writesAsSelf();
      allow update: if isOwnerOrAdmin(resource.data) && keepsOwner();
    }

    // ================================================================
    // 4. TIENDA
    // ================================================================

    // Catálogo: lectura pública; escritura solo de admins.
    match /products/{productId} {
      allow read: if true;
      allow create, update, delete: if isSignedIn() && isAdmin();
    }

    // Cotizaciones (POS exclusivo de administradores).
    // Doc id = "COT-001".
    match /cotizaciones/{quoteId} {
      allow read: if isSignedIn() && isAdmin();

      allow create: if isSignedIn()
        && isAdmin()
        && (request.resource.data.total is number)
        && (request.resource.data.total >= 0)
        && (request.resource.data.adminEmail is string)
        && (request.resource.data.adminEmail == request.auth.token.email)
        && (request.resource.data.estado in ['pendiente', 'enviada', 'aprobada']);

      allow update: if isSignedIn()
        && isAdmin()
        && (request.resource.data.estado in ['pendiente', 'enviada', 'aprobada']);

      allow delete: if isSignedIn() && isAdmin();
    }

    // Pedidos (pago con Yape). Doc id = "PED-001".
    //  - CREATE: cualquier usuario con sesión crea SU pedido en 'pendiente_pago'.
    //  - READ:   el cliente dueño (clienteUid) o un admin.
    //  - UPDATE: solo un admin cambia el estado; total y cliente no mutan.
    //  - DELETE: denegado.
    match /pedidos/{pedidoId} {
      allow read: if isSignedIn()
        && (resource.data.clienteUid == request.auth.uid || isAdmin());

      allow create: if isSignedIn()
        && (request.resource.data.total is number)
        && (request.resource.data.total >= 0)
        && (request.resource.data.clienteUid == request.auth.uid)
        && (request.resource.data.metodoPago == 'yape')
        && (request.resource.data.estado == 'pendiente_pago')
        && (request.resource.data.cliente.nombre is string)
        && (request.resource.data.cliente.nombre.size() > 0)
        && (request.resource.data.cliente.telefono is string)
        && (request.resource.data.cliente.telefono.size() > 0)
        && (request.resource.data.cliente.direccion is string)
        && (request.resource.data.cliente.direccion.size() > 0)
        && (request.resource.data.comprobantePago.url is string)
        && (request.resource.data.comprobantePago.url.size() > 0);

      allow update: if isSignedIn()
        && isAdmin()
        && (request.resource.data.estado in ['pendiente_pago', 'pagado', 'rechazado', 'completado'])
        && (request.resource.data.total == resource.data.total)
        && (request.resource.data.clienteUid == resource.data.clienteUid);

      allow delete: if false;
    }

    // ================================================================
    // 5. TODO LO DEMÁS: DENEGADO
    // ================================================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```
