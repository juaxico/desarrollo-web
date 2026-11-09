# Módulos 4 y 6 — Matriz de permisos y enrutamiento por operación

Extraída de la tabla de rutas `backend/src/gateway.js` y validadores de los microservicios. El gateway expone `PORT` (3000 por defecto), los destinos internos usan solo `127.0.0.1` y una clave por servicio.

| ID | Verbo | Ruta externa | Rol/autorización | Destino interno | Ruta interna | Control |
|---|---|---|---|---|---|---|
| S01 | GET | `/api/productos` | Anónimo | inventory | `/products` | Pública |
| S02 | POST | `/api/auth/registro` | Anónimo | clients | `/register` | Registro público |
| S03 | POST | `/api/auth/login` | Anónimo | clients | `/login` | Inicio de sesión público |
| S04 | GET | `/api/auth/me` | Cliente autenticado | clients | `/me` | Titular |
| S05 | PATCH | `/api/auth/me` | Cliente autenticado | clients | `/me` | Titular |
| S06 | POST | `/api/auth/logout` | Cliente autenticado | clients | `/logout` | Titular |
| S07 | POST | `/api/pedidos` | Cliente autenticado | orders | `/orders` | Titular |
| S08 | GET | `/api/pedidos/mios` | Cliente autenticado | orders | `/orders/mine` | Filtrado por titular |
| S09 | GET | `/api/pedidos/:id` | Cliente autenticado | orders | `/orders/:id` | Solo titular o admin/operador |
| S10 | POST | `/api/pedidos/:id/anular` | Cliente autenticado | orders | `/orders/:id/cancel` | Titular y estado permitido |
| S11 | POST | `/api/pagos/iniciar/:id` | Cliente autenticado | orders | `/orders/:id/payment` | Titular y no cancelado/pagado |
| S12 | GET | `/api/admin/productos` | admin / admin_inventario | inventory | `/admin/products` | Rol administrativo |
| S13 | POST | `/api/admin/productos` | admin / admin_inventario | inventory | `/admin/products` | Rol administrativo |
| S14 | PATCH | `/api/admin/productos/:id` | admin / admin_inventario | inventory | `/admin/products/:id` | Rol administrativo |
| S15 | DELETE | `/api/admin/productos/:id` | admin / admin_inventario | inventory | `/admin/products/:id` | Baja lógica, rol |
| S16 | PATCH | `/api/admin/productos/:id/stock` | admin / admin_inventario | inventory | `/admin/products/:id/stock` | Rol y validación de stock |
| S17 | GET | `/api/admin/pedidos` | admin / operador_pedidos | orders | `/admin/orders` | Rol administrativo |
| S18 | PATCH | `/api/admin/pedidos/:id/estado` | admin / operador_pedidos | orders | `/admin/orders/:id/status` | Transiciones válidas y pago |
| S19 | POST | `/api/graphql` | Cliente autenticado | graphql | `/query` | Rol/campos/titular/limites |
| S20 | POST | `/api/pagos/webhook` | Proveedor HMAC | payments | `/internal/webhook` | Firma HMAC e idempotencia |
| S21 | POST | `/api/pagos/demo/:id/confirmar` | Titular en entorno local | orders | `/orders/:id/payment/demo` | PAYMENTS_DEMO=1, no producción |

**Permisos denegados por defecto:**

- Una ruta no listada se rechaza (404). Cambiar el verbo no autoriza otra operación.
- Un cliente normal recibe 403 al acceder a endpoints administrativos; un usuario sin token recibe 401 en rutas autenticadas.
- Los pedidos se filtran por titular en `orders`, incluso si llega identidad validada desde el gateway. Los pedidos ajenos producen 404.
- Los campos de GraphQL se validan por la lista permitida; POST `/api/graphql` no habilita mutations arbitrarias.
- S20 no requiere JWT de cliente, pero exige HMAC del proveedor. S21 requiere JWT de titular y activación local explícita.

**Credenciales por tramo (referencias, sin valores):** `INVENTORY_SERVICE_KEY`, `CLIENTS_SERVICE_KEY`, `ORDERS_SERVICE_KEY`, `PAYMENTS_SERVICE_KEY`, `GRAPHQL_SERVICE_KEY`, `JWT_SECRET` y `PAYMENT_WEBHOOK_SECRET`. Ver inventario de secretos de `Arquitectura_Modulos_2_a_8.md`.

**Notas de implementación:** La matriz documenta las rutas efectivas, no una política hipotética. Las operaciones S12–S18 se prueban por API pero no tienen todavía un panel administrativo completo en el frontend.
