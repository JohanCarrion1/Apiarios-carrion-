// ============================================================
// TESTS DE REGLAS DE FIRESTORE
// ============================================================
// Qué se busca: que el aislamiento por propietario (userId/clienteUid) y por
// rol de admin (config/admins) se cumpla de verdad, y sobre todo que NO se
// pueda saltarse. Estos casos son los que la app asume en cada pantalla.

import { test, before, after, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  ADMIN,
  ADMIN_SECUNDARIO,
  USUARIO_A,
  USUARIO_B,
  crearEntorno,
  sembrar,
  sembrarAdmins,
  como,
  comoAdmin,
  comoAdminSecundario,
  comoAnonimo,
  comoSinVerificar,
  fs,
} from './helpers.mjs';

let entorno;

before(async () => {
  entorno = await crearEntorno();
});
after(async () => {
  await entorno.cleanup();
});

beforeEach(async () => {
  await entorno.clearFirestore();
  await sembrarAdmins(entorno);
});

/* ---------- fixtures que replican lo que escribe el cliente ---------- */

function pedidoValido(over = {}) {
  return {
    numero: 'PED-001',
    clienteUid: USUARIO_A.uid,
    cliente: { nombre: 'Ana', telefono: '999888777', direccion: 'Jr. Lima 123' },
    productos: [{ id: 'miel', nombre: 'Miel', precio: 25, cantidad: 2 }],
    total: 50,
    comprobantePago: {
      url: 'https://example.com/comprobantes/1.jpg',
      nombre: 'comprobante.jpg',
      mime: 'image/jpeg',
      tamano: 12000,
      subidoAt: '2026-01-01T00:00:00.000Z',
    },
    metodoPago: 'yape',
    estado: 'pendiente_pago',
    historial: [{ estado: 'pendiente_pago', at: '2026-01-01T00:00:00.000Z', actor: USUARIO_A.uid }],
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function cotizacionValida(over = {}) {
  return {
    numero: 'COT-001',
    total: 120,
    adminEmail: ADMIN.email,
    estado: 'pendiente',
    productos: [{ id: 'miel', nombre: 'Miel', precio: 120, cantidad: 1 }],
    cliente: { nombre: 'Ana', telefono: '999' },
    ...over,
  };
}

/* ================================================================
   PEDIDOS — el flujo de pago con Yape
   ================================================================ */
describe('pedidos', () => {
  test('un cliente puede crear SU propio pedido válido', async () => {
    const db = como(entorno, USUARIO_A).firestore();
    await assertSucceeds(db.doc('pedidos/PED-001').set(pedidoValido()));
  });

  test('un cliente NO puede crear un pedido a nombre de otro', async () => {
    const db = como(entorno, USUARIO_A).firestore();
    await assertFails(db.doc('pedidos/PED-002').set(pedidoValido({ clienteUid: USUARIO_B.uid })));
  });

  test('un cliente NO puede crear el pedido ya pagado (auto-aprobarse)', async () => {
    const db = como(entorno, USUARIO_A).firestore();
    await assertFails(db.doc('pedidos/PED-003').set(pedidoValido({ estado: 'pagado' })));
  });

  test('un cliente NO puede colarse otro método de pago', async () => {
    const db = como(entorno, USUARIO_A).firestore();
    await assertFails(db.doc('pedidos/PED-004').set(pedidoValido({ metodoPago: 'tarjeta' })));
  });

  test('un cliente NO puede crear un pedido con total negativo', async () => {
    const db = como(entorno, USUARIO_A).firestore();
    await assertFails(db.doc('pedidos/PED-005').set(pedidoValido({ total: -10 })));
  });

  test('un cliente NO puede crear un pedido sin datos de contacto', async () => {
    const db = como(entorno, USUARIO_A).firestore();
    const vacio = pedidoValido();
    vacio.cliente = { nombre: '', telefono: '', direccion: '' };
    await assertFails(db.doc('pedidos/PED-006').set(vacio));
  });

  test('un cliente NO puede crear un pedido sin comprobante', async () => {
    const db = como(entorno, USUARIO_A).firestore();
    await assertFails(db.doc('pedidos/PED-007').set(pedidoValido({ comprobantePago: { url: '' } })));
  });

  test('un anónimo NO puede crear pedidos', async () => {
    const db = comoAnonimo(entorno).firestore();
    await assertFails(db.doc('pedidos/PED-008').set(pedidoValido()));
  });

  test('el cliente lee su pedido y NO el de otro', async () => {
    await sembrar(entorno, async (db) => {
      await db.doc('pedidos/PED-A').set(pedidoValido({ clienteUid: USUARIO_A.uid }));
      await db.doc('pedidos/PED-B').set(pedidoValido({ numero: 'PED-B', clienteUid: USUARIO_B.uid }));
    });
    const db = como(entorno, USUARIO_A).firestore();
    await assertSucceeds(db.doc('pedidos/PED-A').get());
    await assertFails(db.doc('pedidos/PED-B').get());
  });

  test('el admin lee cualquier pedido', async () => {
    await sembrar(entorno, (db) =>
      db.doc('pedidos/PED-B').set(pedidoValido({ clienteUid: USUARIO_B.uid }))
    );
    const db = comoAdmin(entorno).firestore();
    await assertSucceeds(db.doc('pedidos/PED-B').get());
  });

  test('el listado del cliente funciona con el filtro clienteUid', async () => {
    await sembrar(entorno, async (db) => {
      await db.doc('pedidos/PED-A').set(pedidoValido({ clienteUid: USUARIO_A.uid }));
      await db.doc('pedidos/PED-B').set(pedidoValido({ numero: 'PED-B', clienteUid: USUARIO_B.uid }));
    });
    const db = como(entorno, USUARIO_A).firestore();
    // Esto es lo que hace usePedidos() para un cliente normal.
    await assertSucceeds(
      db.collection('pedidos').where('clienteUid', '==', USUARIO_A.uid).get()
    );
  });

  test('el cliente NO puede listar la colección completa (ni para numerar)', async () => {
    await sembrar(entorno, (db) =>
      db.doc('pedidos/PED-A').set(pedidoValido({ clienteUid: USUARIO_A.uid }))
    );
    const db = como(entorno, USUARIO_A).firestore();
    // Documenta por qué nextPedidoNumero() degrada al número por reloj.
    await assertFails(db.collection('pedidos').get());
  });

  test('el admin SÍ puede listar la colección completa (para el correlativo)', async () => {
    await sembrar(entorno, (db) =>
      db.doc('pedidos/PED-A').set(pedidoValido({ clienteUid: USUARIO_A.uid }))
    );
    const db = comoAdmin(entorno).firestore();
    await assertSucceeds(db.collection('pedidos').get());
  });

  test('el cliente NO puede cambiar el estado de su propio pedido', async () => {
    await sembrar(entorno, (db) =>
      db.doc('pedidos/PED-A').set(pedidoValido({ clienteUid: USUARIO_A.uid }))
    );
    const db = como(entorno, USUARIO_A).firestore();
    await assertFails(
      db.doc('pedidos/PED-A').update({ estado: 'pagado', historial: [] })
    );
  });

  test('el admin cambia el estado (aprobar) y el historial se conserva', async () => {
    await sembrar(entorno, (db) =>
      db.doc('pedidos/PED-A').set(pedidoValido({ clienteUid: USUARIO_A.uid }))
    );
    const db = comoAdmin(entorno).firestore();
    await assertSucceeds(
      db.doc('pedidos/PED-A').update({
        estado: 'pagado',
        historial: [
          { estado: 'pendiente_pago', at: '2026-01-01T00:00:00.000Z', actor: USUARIO_A.uid },
          { estado: 'pagado', at: '2026-01-02T00:00:00.000Z', actor: ADMIN.uid },
        ],
      })
    );
  });

  test('el admin NO puede alterar el total ya cobrado', async () => {
    await sembrar(entorno, (db) =>
      db.doc('pedidos/PED-A').set(pedidoValido({ clienteUid: USUARIO_A.uid }))
    );
    const db = comoAdmin(entorno).firestore();
    await assertFails(db.doc('pedidos/PED-A').update({ estado: 'pagado', total: 1 }));
  });

  test('el admin NO puede transferring un pedido a otro cliente', async () => {
    await sembrar(entorno, (db) =>
      db.doc('pedidos/PED-A').set(pedidoValido({ clienteUid: USUARIO_A.uid }))
    );
    const db = comoAdmin(entorno).firestore();
    await assertFails(
      db.doc('pedidos/PED-A').update({ estado: 'pagado', clienteUid: USUARIO_B.uid })
    );
  });

  test('el admin NO puede poner un estado inventado', async () => {
    await sembrar(entorno, (db) =>
      db.doc('pedidos/PED-A').set(pedidoValido({ clienteUid: USUARIO_A.uid }))
    );
    const db = comoAdmin(entorno).firestore();
    await assertFails(db.doc('pedidos/PED-A').update({ estado: 'enviado_milagroso' }));
  });

  test('nadie puede borrar un pedido (evidencia de pago)', async () => {
    await sembrar(entorno, (db) =>
      db.doc('pedidos/PED-A').set(pedidoValido({ clienteUid: USUARIO_A.uid }))
    );
    await assertFails(comoAdmin(entorno).firestore().doc('pedidos/PED-A').delete());
    await assertFails(como(entorno, USUARIO_A).firestore().doc('pedidos/PED-A').delete());
  });
});

/* ================================================================
   COTIZACIONES — POS exclusivo de admins
   ================================================================ */
describe('cotizaciones', () => {
  test('un cliente NO puede leer cotizaciones', async () => {
    await sembrar(entorno, (db) => db.doc('cotizaciones/COT-001').set(cotizacionValida()));
    await assertFails(como(entorno, USUARIO_A).firestore().doc('cotizaciones/COT-001').get());
  });

  test('un cliente NO puede crear cotizaciones', async () => {
    const db = como(entorno, USUARIO_A).firestore();
    await assertFails(db.doc('cotizaciones/COT-002').set(cotizacionValida()));
  });

  test('el admin crea, lee y actualiza', async () => {
    const db = comoAdmin(entorno).firestore();
    await assertSucceeds(db.doc('cotizaciones/COT-001').set(cotizacionValida()));
    await assertSucceeds(db.doc('cotizaciones/COT-001').get());
    await assertSucceeds(db.doc('cotizaciones/COT-001').update({ estado: 'enviada' }));
  });

  test('el admin NO puede crear una cotización con estado inválido', async () => {
    const db = comoAdmin(entorno).firestore();
    await assertFails(
      db.doc('cotizaciones/COT-003').set(cotizacionValida({ estado: 'cobrada' }))
    );
  });

  test('el admin NO puede crear una cotización con total negativo', async () => {
    const db = comoAdmin(entorno).firestore();
    await assertFails(db.doc('cotizaciones/COT-004').set(cotizacionValida({ total: -5 })));
  });

  test('la cotización queda atada al correo del admin que la firma', async () => {
    const db = comoAdmin(entorno).firestore();
    await assertFails(
      db.doc('cotizaciones/COT-005').set(cotizacionValida({ adminEmail: USUARIO_B.email }))
    );
  });

  test('un anónimo no toca cotizaciones', async () => {
    await assertFails(comoAnonimo(entorno).firestore().doc('cotizaciones/COT-006').set(cotizacionValida()));
  });
});

/* ================================================================
   LISTA DE ADMINS — la única fuente de privilegio
   ================================================================ */
describe('config/admins', () => {
  /* La lista tiene DOS niveles de permiso:
   *   - `ownerEmail` (cuenta predeterminada) → administra la lista.
   *   - cualquier otro admin de `emails`     → solo entra al panel.
   * Estos tests fijan que el veto se aplica en el SERVIDOR, no solo en la UI:
   * un admin añadido que manipule el cliente recibe PERMISSION_DENIED. */

  /** Documento de update tal y como lo escribe addAdminEmail/removeAdminEmail. */
  const update = (emails, over = {}) => ({
    emails,
    ownerEmail: ADMIN.email,
    updatedAt: fs.Timestamp.now(),
    updatedBy: ADMIN.uid,
    ...over,
  });

  test('no se puede crear desde el cliente (ni siquiera siendo admin)', async () => {
    await assertFails(
      comoAdmin(entorno).firestore().doc('config/admins2').set({ emails: ['nuevo@x.com'] })
    );
  });

  test('la lista no se puede borrar', async () => {
    await assertFails(comoAdmin(entorno).firestore().doc('config/admins').delete());
  });

  test('un usuario normal NO puede leer la lista de admins', async () => {
    await assertFails(como(entorno, USUARIO_A).firestore().doc('config/admins').get());
  });

  test('la cuenta predeterminada puede añadir a otro admin', async () => {
    const db = comoAdmin(entorno).firestore();
    await assertSucceeds(
      db.doc('config/admins').set(update([ADMIN.email, 'segundo@apiar.com']))
    );
  });

  test('la cuenta predeterminada puede quitar a otro admin', async () => {
    await sembrarAdmins(entorno, [ADMIN.email, ADMIN_SECUNDARIO.email]);
    const db = comoAdmin(entorno).firestore();
    await assertSucceeds(db.doc('config/admins').set(update([ADMIN.email])));
  });

  test('un admin AÑADIDO no puede agregar administradores', async () => {
    await sembrarAdmins(entorno, [ADMIN.email, ADMIN_SECUNDARIO.email]);
    const db = comoAdminSecundario(entorno).firestore();
    await assertFails(
      db.doc('config/admins').set(
        update([ADMIN.email, ADMIN_SECUNDARIO.email, 'tercero@apiar.com'], {
          updatedBy: ADMIN_SECUNDARIO.uid,
        })
      )
    );
  });

  test('un admin AÑADIDO no puede quitar administradores', async () => {
    await sembrarAdmins(entorno, [ADMIN.email, ADMIN_SECUNDARIO.email]);
    const db = comoAdminSecundario(entorno).firestore();
    // Ni a la cuenta predeterminada...
    await assertFails(
      db.doc('config/admins').set(update([ADMIN_SECUNDARIO.email], {
        updatedBy: ADMIN_SECUNDARIO.uid,
      }))
    );
    // ...ni a otro admin añadido.
    await assertFails(
      db.doc('config/admins').set(update([ADMIN.email, ADMIN_SECUNDARIO.email], {
        emails: [ADMIN.email],
        updatedBy: ADMIN_SECUNDARIO.uid,
      }))
    );
  });

  test('un admin AÑADIDO puede seguir usando el resto del panel', async () => {
    // El veto es solo sobre la lista de admins: no debe afectar a cotizaciones
    // ni pedidos, que es justamente "solo tiene acceso admin".
    await sembrarAdmins(entorno, [ADMIN.email, ADMIN_SECUNDARIO.email]);
    const db = comoAdminSecundario(entorno).firestore();
    await assertSucceeds(db.doc('config/admins').get());
    await assertSucceeds(db.doc('pedidos/PED-1').get());
  });

  test('la cuenta predeterminada NO puede quitarse a sí misma', async () => {
    await sembrarAdmins(entorno, [ADMIN.email, ADMIN_SECUNDARIO.email]);
    const db = comoAdmin(entorno).firestore();
    // Aunque quede más de un admin, el propietario es intocable: es quien
    // puede volver a gestionar la lista.
    await assertFails(db.doc('config/admins').set(update([ADMIN_SECUNDARIO.email])));
  });

  test('la cuenta predeterminada NO puede quedar con la lista sin ella', async () => {
    await sembrarAdmins(entorno, [ADMIN.email, ADMIN_SECUNDARIO.email]);
    const db = comoAdmin(entorno).firestore();
    await assertFails(db.doc('config/admins').set(update([ADMIN_SECUNDARIO.email])));
    await assertFails(db.doc('config/admins').set(update([])));
  });

  test('NO se puede cambiar quién es la cuenta predeterminada', async () => {
    // Si se pudiera, quien hoy es propietario podría reasignar el cargo y dejar
    // la lista sin gestor. El valor se lee de `resource` (estado previo).
    const db = comoAdmin(entorno).firestore();
    await assertFails(
      db.doc('config/admins').set(
        update([ADMIN.email, 'nuevo@apiar.com'], { ownerEmail: 'nuevo@apiar.com' })
      )
    );
  });

  test('un update sin ownerEmail se rechaza (documento sin backfill)', async () => {
    // Si el documento de producción aún no tiene el campo, ningún update debe
    // colarse: falla `keys().hasAll` y, sobre todo, `isAdminOwner()`.
    const db = comoAdmin(entorno).firestore();
    await assertFails(
      db.doc('config/admins').set({
        emails: [ADMIN.email, 'otro@apiar.com'],
        updatedAt: fs.Timestamp.now(),
        updatedBy: ADMIN.uid,
      })
    );
  });

  test('la regla acota tamaño y valida el primer correo de la lista', async () => {
    const db = comoAdmin(entorno).firestore();
    // Demasiados admins: el tope duro (20) corta el crecimiento de golpe.
    await assertFails(
      db.doc('config/admins').set(update(Array.from({ length: 21 }, (_, i) => `a${i}@apiar.com`)))
    );
    // emails debe ser una lista.
    await assertFails(db.doc('config/admins').set(update(ADMIN.email)));
    // Lista vacía: no puede quedar la app sin ningún admin.
    await assertFails(db.doc('config/admins').set(update([])));
    // El primer elemento (el admin preexistente) sí se valida con formato.
    await assertFails(db.doc('config/admins').set(update(['no-es-correo', ADMIN.email])));
    await assertFails(db.doc('config/admins').set(update(['Mayusculas@Apiar.com', ADMIN.email])));
  });

  test('el formato de los correos nuevos lo valida el cliente, no las reglas', async () => {
    // El lenguaje de reglas NO tiene iteradores (`all()`/`map()` no existen),
    // así que solo se puede validar el elemento 0. Este test fija esa
    // limitación de forma explícita para que nadie dé por hecho lo contrario:
    // un correo inválido en posiciones 1..n PASA la regla. La defensa real es
    // `validateAdminEmail` en src/lib/adminAccess.ts, que el cliente ejecuta
    // antes de escribir, más que solo la cuenta predeterminaria llega aquí.
    const db = comoAdmin(entorno).firestore();
    await assertSucceeds(
      db.doc('config/admins').set(update([ADMIN.email, 'esto-no-es-correo']))
    );
  });

  test('updatedBy tiene que ser el propio uid de quien edita', async () => {
    const db = comoAdmin(entorno).firestore();
    await assertFails(
      db.doc('config/admins').set(
        update([ADMIN.email, 'otro@apiar.com'], { updatedBy: USUARIO_B.uid })
      )
    );
  });
});

/* ================================================================
   AISLAMIENTO POR PROPIETARIO
   ================================================================ */
describe('apiarios, apiarioData, userData y usuarios aíslan por propietario', () => {
  test('cada quien lee y escribe solo su apiario', async () => {
    await sembrar(entorno, (db) =>
      db.doc('apiarios/api-1').set({ userId: USUARIO_A.uid, nombre: 'Apiario A' })
    );
    const db = como(entorno, USUARIO_A).firestore();
    await assertSucceeds(db.doc('apiarios/api-1').get());
    await assertSucceeds(db.doc('apiarios/api-2').set({ userId: USUARIO_A.uid, nombre: 'Otro' }));
  });

  test('NO se puede leer el apiario de otro usuario', async () => {
    await sembrar(entorno, (db) =>
      db.doc('apiarios/api-1').set({ userId: USUARIO_A.uid, nombre: 'Apiario A' })
    );
    await assertFails(como(entorno, USUARIO_B).firestore().doc('apiarios/api-1').get());
  });

  test('NO se puede crear un apiario a nombre de otro', async () => {
    const db = como(entorno, USUARIO_B).firestore();
    await assertFails(db.doc('apiarios/api-x').set({ userId: USUARIO_A.uid }));
  });

  test('el admin de tienda supervisa cualquier apiario', async () => {
    await sembrar(entorno, (db) =>
      db.doc('apiarios/api-1').set({ userId: USUARIO_A.uid, nombre: 'Apiario A' })
    );
    await assertSucceeds(comoAdmin(entorno).firestore().doc('apiarios/api-1').get());
  });

  test('userData: solo el propio usuario (doc id = uid)', async () => {
    await sembrar(entorno, (db) =>
      db.doc(`userData/${USUARIO_A.uid}`).set({ userId: USUARIO_A.uid, inventory: [] })
    );
    await assertSucceeds(como(entorno, USUARIO_A).firestore().doc(`userData/${USUARIO_A.uid}`).get());
    await assertFails(como(entorno, USUARIO_B).firestore().doc(`userData/${USUARIO_A.uid}`).get());
  });

  test('users: el perfil propio se edita, el ajeno no; nunca se borra', async () => {
    await sembrar(entorno, (db) =>
      db.doc(`users/${USUARIO_A.uid}`).set({ userId: USUARIO_A.uid, nombre: 'Ana' })
    );
    const db = como(entorno, USUARIO_A).firestore();
    await assertSucceeds(db.doc(`users/${USUARIO_A.uid}`).update({ nombre: 'Ana María' }));
    await assertFails(como(entorno, USUARIO_B).firestore().doc(`users/${USUARIO_A.uid}`).get());
    await assertFails(db.doc(`users/${USUARIO_A.uid}`).delete());
  });

  test('las colmenas de nivel raíz respetan al propietario', async () => {
    await sembrar(entorno, (db) =>
      db.doc('colmenas/col-1').set({ userId: USUARIO_A.uid, apiaryId: 'api-1' })
    );
    await assertSucceeds(como(entorno, USUARIO_A).firestore().doc('colmenas/col-1').get());
    await assertFails(como(entorno, USUARIO_B).firestore().doc('colmenas/col-1').get());
  });

  test('apiarioData: se escribe el doc propio y NO el de otro', async () => {
    const db = como(entorno, USUARIO_A).firestore();
    // Doc id = `${apiaryId}_${entidad}`.
    await assertSucceeds(
      db.doc('apiarioData/api-1_inspecciones').set({
        userId: USUARIO_A.uid,
        apiaryId: 'api-1',
        entity: 'inspecciones',
        items: [],
      })
    );
    await assertFails(
      como(entorno, USUARIO_B).firestore().doc('apiarioData/api-1_inspecciones').get()
    );
  });

  test('inspecciones de nivel superior quedaron sin regla: cerrada por defecto', async () => {
    // Documenta la decisión conscious de firestore.rules: se borraron las
    // reglas huérfanas de las colecciones top-level (la app no las usa) y, al
    // no haber `match`, aplica deny por defecto.
    const db = como(entorno, USUARIO_A).firestore();
    await assertFails(
      db.doc('inspecciones/insp-1').set({ userId: USUARIO_A.uid, fecha: '2026-01-01' })
    );
  });
});

/* ================================================================
   PRODUCTOS — catálogo público, escritura solo admin
   ================================================================ */
describe('productos', () => {
  test('el catálogo se lee sin iniciar sesión', async () => {
    await sembrar(entorno, (db) => db.doc('products/p1').set({ nombre: 'Miel', precio: 25 }));
    await assertSucceeds(comoAnonimo(entorno).firestore().doc('products/p1').get());
    await assertSucceeds(comoAnonimo(entorno).firestore().collection('products').get());
  });

  test('un usuario normal NO puede escribir productos', async () => {
    const db = como(entorno, USUARIO_A).firestore();
    await assertFails(db.doc('products/p1').set({ nombre: 'Miel', precio: 1 }));
    await assertFails(db.doc('products/p1').update({ precio: 1 }));
    await assertFails(db.doc('products/p1').delete());
  });

  test('el admin sí gestiona el catálogo', async () => {
    const db = comoAdmin(entorno).firestore();
    await assertSucceeds(db.doc('products/p1').set({ nombre: 'Miel', precio: 25 }));
    await assertSucceeds(db.doc('products/p1').update({ precio: 30 }));
    await assertSucceeds(db.doc('products/p1').delete());
  });

  test('sin lista de admins NO hay admin: escribir queda denegado', async () => {
    await entorno.clearFirestore();
    const db = como(entorno, ADMIN).firestore();
    await assertFails(db.doc('products/p2').set({ nombre: 'Miel', precio: 1 }));
  });
});

/* ================================================================
   CAJAS TRAMPA — aislamiento por propietario (corregido)
   ================================================================ */
describe('trapBoxes', () => {
  const caja = (over = {}) => ({
    userId: USUARIO_A.uid,
    apiaryId: 'api-1',
    name: 'Trampa 1',
    location: { lat: -12.05, lng: -77.04 },
    ...over,
  });

  test('el dueño crea, lee y actualiza sus cajas trampa', async () => {
    const db = como(entorno, USUARIO_A).firestore();
    await assertSucceeds(db.doc('trapBoxes/TRP-001').set(caja()));
    await assertSucceeds(db.doc('trapBoxes/TRP-001').get());
    await assertSucceeds(db.doc('trapBoxes/TRP-001').update({ name: 'Renombrada' }));
  });

  test('OTRO usuario NO puede leer ni modificar cajas ajenas (ni su GPS)', async () => {
    await sembrar(entorno, (db) => db.doc('trapBoxes/TRP-001').set(caja()));
    const db = como(entorno, USUARIO_B).firestore();
    await assertFails(db.doc('trapBoxes/TRP-001').get());
    await assertFails(db.doc('trapBoxes/TRP-001').update({ name: 'hackeada' }));
    await assertFails(db.doc('trapBoxes/TRP-001').delete());
  });

  test('nadie puede crear una caja a nombre de otro', async () => {
    const db = como(entorno, USUARIO_B).firestore();
    await assertFails(db.doc('trapBoxes/TRP-002').set(caja()));
  });

  test('el listado propio funciona con el filtro userId (no la colección entera)', async () => {
    await sembrar(entorno, async (db) => {
      await db.doc('trapBoxes/TRP-001').set(caja());
      await db.doc('trapBoxes/TRP-B').set(caja({ userId: USUARIO_B.uid, name: 'Ajena' }));
    });
    const db = como(entorno, USUARIO_A).firestore();
    // Esto es lo que hace el cliente para traer solo sus cajas.
    await assertSucceeds(
      db.collection('trapBoxes').where('userId', '==', USUARIO_A.uid).get()
    );
    // Pero NO puede volcar la colección completa.
    await assertFails(db.collection('trapBoxes').get());
  });

  test('el admin de tienda supervisa cualquier caja', async () => {
    await sembrar(entorno, (db) => db.doc('trapBoxes/TRP-001').set(caja()));
    await assertSucceeds(comoAdmin(entorno).firestore().doc('trapBoxes/TRP-001').get());
  });
});

/* ================================================================
   CORREO SIN VERIFICAR — no basta con "decir" el email de un admin
   ================================================================ */
describe('admins con correo sin verificar', () => {
  test('un correo de admin SIN verificar NO da acceso admin', async () => {
    // Firebase permite crear una cuenta con un correo ajeno sin verificarlo:
    // el token diría el email del admin, pero email_verified es false. Aunque
    // ese correo esté en config/admins, la regla debe rechazarlo.
    const db = comoSinVerificar(entorno).firestore();
    await assertFails(db.doc('products/p1').set({ nombre: 'Miel', precio: 1 }));
    await assertFails(db.doc('config/admins').get());
  });

  test('un usuario normal verificado sigue funcionando igual', async () => {
    await sembrar(entorno, (db) =>
      db.doc('apiarios/api-1').set({ userId: USUARIO_A.uid, nombre: 'Apiario A' })
    );
    const db = como(entorno, USUARIO_A).firestore();
    await assertSucceeds(db.doc('apiarios/api-1').get());
  });
});
