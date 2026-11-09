# Módulo 1 · Trazabilidad, contratos y clasificación

**Caso 20:** Parrilladas El Asador. Actor prioritario: cliente. Objetivo: consultar productos, seleccionar cortes, identificarse, confirmar pedido y consultar su historial/pago. El frontend de la Evaluación 1 se conserva. La ruta de carrito es local (`localStorage`), por lo que no requiere CRUD remoto; los precios se recalculan en backend.

## Pantallas/requisitos

- P01 `index.html`: catálogo destacado y navegación. R01 catálogo público.
- P02 `cortes.html`: filtros vacuno/pollo/pavo. R01.
- P03 `parrillas.html`: catálogo de parrillas. R01.
- P04 modal de `auth.js`: registro/login. R02 identidad y sesión.
- P05 `pedido.html`: carrito local, despacho y confirmación. R03 pedido persistente.
- P06 `mis-pedidos.html`: historial y agregado GraphQL (nuevo). R04 consulta autorizada.
- P07 sin pantalla administrativa completa: `/api/admin/*` se demuestra por pruebas HTTP. R05 mantenimiento de inventario y pedidos.
- P05 `pedido.html`: el pago se procesa dentro del mismo flujo, después de guardar el pedido y antes de mostrar «¡Pedido recibido!». R06 pago y verificación. `pago.html` se conserva únicamente como redirección de compatibilidad.

## Matriz de operaciones HTTP

| ID | Requisito / pantalla y acción | Método y ruta externa | Entrada requerida | Respuesta | Regla/errores | Clasificación y acceso |
|---|---|---|---|---|---|---|
| S01 | R01 P01–P03 cargar productos | GET `/api/productos?categoria=vacuno` | categoria opcional (texto) | 200 lista de productos | 400 filtro inválido | Catálogo público; anónimo |
| S02 | R02 P04 registrarse | POST `/api/auth/registro` | nombre, email, password (JSON) | 201 token y usuario sin hash | 400 formato; 409 email duplicado | Credenciales restringidas; anónimo |
| S03 | R02 P04 iniciar sesión | POST `/api/auth/login` | email, password | 200 token y usuario | 401 credenciales inválidas; 429 límite | Restringido; anónimo |
| S04 | R02 P04 comprobar identidad | GET `/api/auth/me` | Authorization Bearer | 200 perfil propio | 401 sesión inválida | Personal; autenticado |
| S05 | R02 perfil propio | PATCH `/api/auth/me` | nombre o email | 200 perfil actualizado | 400,401,409 | Personal; titular |
| S06 | R02 cerrar sesión | POST `/api/auth/logout` | Bearer | 200 mensaje | 401 | Credencial; titular |
| S07 | R03 P05 confirmar pedido | POST `/api/pedidos` | despacho:{nombre,direccion,comuna?,telefono,notas?}; items:[{nombre,cantidad}] | 201 id,total,estado,pagoEstado | 400 datos; 404 producto; 409 sin stock; 401 | Despacho restringido; cliente |
| S08 | R04 P06 historial | GET `/api/pedidos/mios` | Bearer | 200 lista propia | 401 | Personal; titular |
| S09 | R04 P06 detalle | GET `/api/pedidos/:id` | id entero, Bearer | 200 detalle y despacho propio | 401,404 ajeno/inexistente | Personal; titular/admin pedidos |
| S10 | R03 anular antes de pagar | POST `/api/pedidos/:id/anular` | id entero, Bearer | 200 estado cancelado | 401,404,409 ya pagado/en despacho | Personal; propietario |
| S11 | R06 iniciar pago sandbox | POST `/api/pagos/iniciar/:id` | id pedido propio, Bearer | 200 referencia y estado pendiente | 401,404,409 | Restringido; propietario |
| S21 | R06 P05 pago de prueba propio | POST `/api/pagos/demo/:id/confirmar` | Bearer, id pedido propio, `estado`: `aprobado` o `rechazado` | 200 id, pagoEstado, modo:prueba | 400,401,404 ajeno/deshabilitado,409 | Restringido; propietario, modo local explícito |
| S12 | R05 administración: listar inventario | GET `/api/admin/productos` | Bearer admin | 200 lista | 401,403 | Interno; admin/inventario |
| S13 | R05 crear producto | POST `/api/admin/productos` | nombre,categoria,precio,stock,imagen?,descripcion? | 201 producto | 400,403,409 duplicado | Interno; admin/inventario |
| S14 | R05 modificar producto | PATCH `/api/admin/productos/:id` | campos editables | 200 producto | 400,403,404,409 | Interno; admin/inventario |
| S15 | R05 desactivar producto | DELETE `/api/admin/productos/:id` | id | 200 activo:false | 403,404 | Interno; admin/inventario; baja lógica |
| S16 | R05 ajustar stock | PATCH `/api/admin/productos/:id/stock` | stock entero≥0; motivo texto | 200 id,stock,motivo | 400,403,404 | Interno; admin/inventario |
| S17 | R05 listar pedidos operativos | GET `/api/admin/pedidos` | Bearer admin pedidos | 200 lista ≤200 | 401,403 | Personal parcial; admin/operador |
| S18 | R05 avanzar estado pedido | PATCH `/api/admin/pedidos/:id/estado` | estado enumerado | 200 estado | 403,404,409 transición/pago | Restringido; admin/operador |
| S19 | R04 P06 consultas agregadas | POST `/api/graphql` | query GraphQL y variables | 200 data | 400 sintaxis/costo; 401; 404 ajeno | Personal; titular |
| S20 | R06 notificación del proveedor | POST `/api/pagos/webhook` | JSON evento + `x-provider-signature` | 200 procesado/duplicado | 401 firma; 404 referencia; 409 regla | Secreto técnico; proveedor de prueba |

Las entradas `PATCH` permiten actualización parcial (semántica elegida). El uso de DELETE en producto significa **desactivación lógica**, no destrucción del historial.

## Ejemplos de contratos JSON ficticios

**S02 POST registro**
```json
{"nombre":"María Prueba","email":"cliente@example.invalid","password":"ClaveDeEjemplo123!"}
```
Respuesta 201 ilustrativa:
```json
{"token":"<JWT_DE_EJEMPLO_NO_REAL>","usuario":{"id":42,"nombre":"María Prueba","email":"cliente@example.invalid","role":"cliente"}}
```

**S01 GET catálogo** respuesta 200 (fragmento):
```json
[{"id":5,"nombre":"Filete","categoria":"vacuno","precio":20000,"stock":50,"imagen":"filete.jpg","descripcion":"Corte tierno y magro.","activo":1}]
```

**S07 POST pedido** (ignora cualquier precio suministrado por el navegador):
```json
{"despacho":{"nombre":"María Prueba","direccion":"Calle Ejemplo 123","comuna":"La Reina","telefono":"+56912345678","notas":"Tocar timbre"},"items":[{"nombre":"Filete","cantidad":2}]}
```
Respuesta 201:
```json
{"id":1001,"total":40000,"estado":"recibido","pagoEstado":"pendiente"}
```

**S11 POST inicio pago** respuesta de sandbox:
```json
{"pagoId":20,"referencia":"TEST-uuid-de-ejemplo","estado":"pendiente","modo":"prueba"}
```

**S21 POST pago simulado (desde `pedido.html`)** (únicamente `PAYMENTS_DEMO=1` en entorno local):
```json
{"estado":"aprobado"}
```
Respuesta 200 ilustrativa:
```json
{"id":1001,"pagoEstado":"aprobado","duplicado":false,"modo":"prueba"}
```
No se cobran tarjetas ni se habilita una ruta real que permita al cliente marcar pagos como aprobados. Para pagos productivos se requiere proveedor externo y verificación de webhook firmada.

**S19 POST GraphQL** cuerpo:
```json
{"query":"query Resumen($id: ID!) { resumenPedido(id: $id) { id total items { nombre cantidad descripcion } } }","variables":{"id":1001}}
```
Respuesta 200 de ejemplo:
```json
{"data":{"resumenPedido":{"id":1001,"total":40000,"items":[{"nombre":"Filete","cantidad":2,"descripcion":"Corte tierno y magro."}]}}}
```

**Errores uniformes**:
```json
{"error":"Debes iniciar sesión.","codigo":"id-de-correlacion"}
```

**Validación:** `nombre` cliente 2–120 caracteres; `email` 5–254 con formato; contraseña 8–128; cantidad por ítem 1–50; despacho nombre 3–120, dirección 5–200, teléfono 8–30 con al menos 8 dígitos; producto precio entero positivo; stock entero ≥0; IDs enteros positivos. El servidor determina precios, estado oficial de pedido y pago; no acepta esas decisiones del navegador.

**Contratos complementarios:** ver [`Modulo_1_Contratos_Detallados.md`](Modulo_1_Contratos_Detallados.md) con contratos, tipos y JSON ficticio para cada servicio.
