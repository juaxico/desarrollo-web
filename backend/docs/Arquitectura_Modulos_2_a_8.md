# Arquitectura, permisos y seguridad · Módulos 2 a 8

## Módulo 2. Clases, cardinalidades y DTO

Diagrama editable: [`Modulo_2_UML.mmd`](Modulo_2_UML.mmd). Notación UML: `*--` composición; `-->` asociación; `..>` dependencia de uso (no cardinalidad de datos). Multiplicidades en ambos extremos.

| Origen / destino | Multiplicidad | Regla de negocio |
|---|---|---|
| Cliente ↔ Pedido | Cliente 1; Pedido 0..* | Cada pedido tiene un titular, y un cliente puede tener varios pedidos o ninguno. No se almacena copia de la contraseña en pedidos. |
| Pedido ↔ DetallePedido | Pedido 1; Detalles 1..* | No se confirma pedido vacío. Un detalle pertenece exactamente a un pedido. |
| Producto ↔ DetallePedido | Producto 1; Detalles 0..* | El detalle conserva nombre y precio históricos; si el producto se desactiva el historial permanece. |
| Pedido ↔ Pago | Pedido 1; Pago 0..1 | Puede existir pedido pendiente sin pago iniciado; solo una referencia por pedido, para evitar dobles inicios. |

**DTO y privacidad:** Cliente devuelve `id,nombre,email,role` y nunca `password_hash`, `token_version` ni sal. Pedido propio incluye despacho, pero el listado de pedidos no incluye dirección ni teléfono. Producto público devuelve catálogo y stock. Pago devuelve referencia de prueba y estado, no secretos de integración. Los servicios `ClientsService`, `OrdersService`, `CatalogService`, `PaymentsService` realizan las operaciones S01–S21 de M1 a través de API Gateway.

## Módulo 3. Sistemas privados e integración

Archivos editables: [`Modulo_3_Componentes.mmd`](Modulo_3_Componentes.mmd), [`Modulo_3_Secuencia.mmd`](Modulo_3_Secuencia.mmd).

| Sistema | Responsabilidad y fuente oficial | Datos propios | Dependencias / contrato | Fallos |
|---|---|---|---|---|
| `inventory` | Catálogo, productos, precios y reservas | inventory.sqlite: products, reservations | POST `/internal/reserve`, `/internal/restore`, `/internal/batch` | 409 si no hay stock; operación SQL atómica; reintento de restauración manual si compensación cae |
| `orders` | Pedido, titular, total snapshot, avance de estados | orders.sqlite: orders, order_items | reserve/restore en inventory; start pago en payments | Ante fallo de reserva no crea pedido; ante error de grabación intenta restaurar stock |
| `clients` | Identidad, hash adaptativo scrypt, rol y revocación | clients.sqlite: users | GET `/internal/validate` con JWT | 401 sesión inválida o revocada; no entregar hash |
| `payments` | Referencia sandbox, verificación HMAC, deduplicación | payments.sqlite: payments, webhook_events | POST `/internal/start` y `/internal/webhook`; notifica a orders | Firma inválida 401, evento repetido no produce segundo efecto |
| `graphql` | Solo lectura y agregación autorizada | No almacena datos propios | GET orders propio + POST inventory batch | Error parcial de descripción; evita filtrar despacho/secretos |

Cada módulo se inicia como **proceso Node independiente**, unido por HTTP en loopback y una credencial propia. Las bases son independientes y pertenecen a cada sistema; no hay consultas SQL cruzadas. Los secretos se inyectan por variables de entorno. En despliegue fuera del equipo se necesitan contenedores/red privada, TLS y almacenamiento de secretos administrado. Esta entrega demuestra privacidad de servicios mediante loopback y claves por destino; no afirma aislamiento de host o red equivalente a nube.

**Consistencia:** reserva atómica de stock; si falla grabar pedido se intenta compensar devolviendo stock. Queda una limitación explícita: no hay un reconciliador duradero de reservas huérfanas ante caída de proceso entre reserva y grabación. El frontend no puede decidir por sí solo que un pedido está pagado: muestra el estado devuelto por `orders`; durante pruebas locales S21 permite simular una aprobación controlada.

## Módulo 4. Stakeholders y permisos HTTP

| Stakeholder | Interés | Rol | Acceso |
|---|---|---|---|
| Visitante | Consultar carnes, parrillas y precios | anónimo | GET S01; registro/login S02–S03; sin pedidos |
| Comprador | Comprar y consultar solo lo propio | `cliente` | S01–S11, S19 y S21; sujetos a identidad, propiedad y activación local del adaptador de pago |
| Administrador | Actualizar productos/estados | `admin` | S01–S19; S21 solo en entorno local y para pedidos propios |
| Encargado inventario | Catálogo, stock y bajas lógicas | `admin_inventario` | S12–S16; sin permisos operativos de pedidos ajenos |
| Operador pedidos | Gestionar despachos | `operador_pedidos` | S17–S18 y consulta propia/operativa; sin catálogo admin |
| Proveedor de pagos (sandbox) | Notificar pago | identidad técnica HMAC | S20 únicamente; no puede consultar historial |
| Docente / dueño | Supervisión y evaluación | sin permisos operativos asignados | Evidencias y reportes agregados, no datos de clientes |

**Matriz por verbos y recursos:**

| Rol / recurso | GET | POST | PATCH/PUT | DELETE | Verificador |
|---|---|---|---|---|---|
| Anónimo / productos públicos | Permitido S01 | Denegado modificar | Denegado | Denegado | Gateway + inventory |
| Anónimo / auth registro y login | N/A | Permitido S02–S03 | Denegado | Denegado | Gateway + clients |
| Cliente / perfil propio | Permitido S04 | Logout S06 | Permitido S05 (solo propio) | Denegado | Gateway JWT + clients |
| Cliente / pedidos propios | Permitido S08–S09 | Crear/anular S07/S10 | Denegado | Denegado | Gateway JWT + orders titular |
| Cliente / pago propio | N/A | Iniciar S11; confirmar S21 solo local | Denegado | Denegado | orders verifica titular; payments exige modo local |
| Admin inventario / productos | S12 | S13 | S14, S16 | S15 baja lógica | Gateway + inventory rol |
| Operador pedidos / pedidos | S17 | N/A | S18 estado condicionado | Denegado | Gateway + orders rol/estado |
| Proveedor sandbox / evento pago | N/A | S20 con HMAC | Denegado | Denegado | payments HMAC + orders idempotencia |
| Cliente / GraphQL | S19 vía POST (Query) | Consulta autorizada | Sin mutation | Denegado | Gateway JWT + GraphQL + orders titular |

Denegación por defecto: los destinos no listados retornan 404. Ocultar botones no reemplaza comprobación del backend. Un pedido ajeno retorna 404 sin información de su existencia. La administración puede avanzar un pedido solo en transiciones válidas y con pago aprobado.

## Módulo 5. API Gateway y fronteras de confianza

Diagrama editable [`Modulo_5_Gateway_UML.mmd`](Modulo_5_Gateway_UML.mmd). **Uno** gateway externo es suficiente: rutas públicas y protegidas con políticas distintas; GraphQL opera como un servicio privado, invocado a través del gateway. `RouteDefinition` mapea pares método+ruta a `ServiceTarget`, `AuthenticationPolicy` valida JWT consultando `clients`, `AuthorizationPolicy` decide por rol, `SecretProvider` lee referencia desde entorno. `Resolver` agrega datos de `orders` e `inventory`.

Fronteras: navegador no es confiable (no se aceptan `x-verified-user-id`, `x-service-key` ni precios); Gateway verifica token y crea cabeceras internas; servicio privado exige clave propia y vuelve a validar titular/rol/regla; DB nunca escucha red. Las rutas están en lista positiva, límite de solicitudes por IP y timeout 2500 ms. Un GET catálogo anónimo pasa; POST pedido sin token falla 401; usuario cliente en admin falla 403; ID de pedido ajeno falla 404. Cualquier ruta interna directa sin clave da 401. Los registros incluyen ID correlativo sin tokens ni contraseñas.

## Módulo 6. Rutas y secretos simbólicos

Rutas externas y trazabilidad: M1/S01–S21. El detalle de cada ruta/rol y verbo se entrega también en [`Modulo_4_6_Matrices_Completas.md`](Modulo_4_6_Matrices_Completas.md). Transformaciones principales:

| ID | Gateway externo | Destino privado | Política / credencial de tramo |
|---|---|---|---|
| S01 | GET `/api/productos` | inventory GET `/products` | anónimo, `INVENTORY_SERVICE_KEY` |
| S02–S06 | `/api/auth/*` | clients `/register`, `/login`, `/me`, `/logout` | acceso anónimo o JWT, `CLIENTS_SERVICE_KEY` |
| S07–S10 | `/api/pedidos*` | orders `/orders*` | JWT propio, `ORDERS_SERVICE_KEY` |
| S11 | POST `/api/pagos/iniciar/:id` | orders POST `/orders/:id/payment` -> payments `/internal/start` | JWT + titular, claves orders/payments |
| S12–S16 | `/api/admin/productos*` | inventory `/admin/products*` | rol admin/inventario, clave inventory |
| S17–S18 | `/api/admin/pedidos*` | orders `/admin/orders*` | rol admin/operador, clave orders |
| S19 | POST `/api/graphql` | graphql POST `/query` | JWT, `GRAPHQL_SERVICE_KEY`; Query limitada |
| S20 | POST `/api/pagos/webhook` | payments POST `/internal/webhook` | HMAC proveedor + `PAYMENTS_SERVICE_KEY` |
| S21 | POST `/api/pagos/demo/:id/confirmar` | orders POST `/orders/:id/payment/demo` → payments POST `/internal/demo/confirm` | JWT, titular + `PAYMENTS_DEMO=1`, local, no producción |

**Inventario de secretos** (solo REFERENCIAS; no valores):

| Referencia | Tipo/emisor | Consumidor | Propósito, almacenamiento, rotación/revocación |
|---|---|---|---|
| `JWT_SECRET` | firma HMAC local | clients | JWT HS256; `.env` local fuera de Git; renovar y revocar sesiones (token_version), 2 h expiración |
| `INVENTORY_SERVICE_KEY` | clave técnica aleatoria | Gateway, orders, graphql → inventory | Solo destino inventory; regenerar `.env`, reiniciar servicios |
| `ORDERS_SERVICE_KEY` | clave técnica aleatoria | Gateway, payments, graphql → orders | Solo destino orders; rotación coordinada |
| `CLIENTS_SERVICE_KEY` | clave técnica aleatoria | Gateway → clients | Solo destino clients; rotación coordinada |
| `PAYMENTS_SERVICE_KEY` | clave técnica aleatoria | Gateway, orders → payments | Solo destino payments; rotación coordinada |
| `GRAPHQL_SERVICE_KEY` | clave técnica aleatoria | Gateway → GraphQL | Solo GraphQL; rotación coordinada |
| `PAYMENT_WEBHOOK_SECRET` | HMAC proveedor de prueba | proveedor simulado → payments | Verifica firma de bytes exactos; rotación proveedor y servidor |

Generar localmente con `npm run setup`; `.env` y bases en `.gitignore`. Nunca almacenar valores en README, código, navegador o capturas. En producción guardar referencias en un gestor de secretos con roles por proceso, no un `.env` compartido entre procesos. TLS requerido fuera de loopback. Si se filtra una clave: revocar, generar reemplazo, desplegar y auditar logs; el arranque rechaza secretos ausentes/débiles.

## Módulo 7. Datos personales y secretos del cliente

| Elemento | Finalidad | Clasificación | Custodio | Acceso / frontend | Protección / retención |
|---|---|---|---|---|---|
| Nombre, correo | cuenta | personal | clients | propio/admin justificado, modal | SQLite privada, validar; conservar durante cuenta |
| `password_hash` | autenticación | credencial derivada | clients | nunca expuesto | scrypt + sal aleatoria, no reversible; hasta baja cuenta |
| Dirección, teléfono y notas | despacho | personal restringido | orders | titular y operador autorizado | consultas por propietario, no incluir en listado público; retención legal/configurar política |
| Pedido, precio, ítems | historial de compra | personal/restringido | orders | titular y operador | precio snapshot, total servidor; conservación contable según normativa aplicable |
| JWT | sesión | credencial | clients firma / browser porta | cliente legítimo | 2 h, revocación por token_version. **Limitación frontend: localStorage** |
| Secreto HMAC proveedor | validar pagos | secreto técnico | payments | nunca | archivo .env local excluido de Git; rotación |
| Nombre/imagen/precio catálogo | publicar productos | público | inventory | cualquiera | validación de salida, sin secretos |

**Secretos propios de clientes:** No se custodian claves privadas de bancos/tarjetas del cliente. Se administra únicamente contraseña derivada (`password_hash`), tokens de sesión y datos personales. La integración de pagos es ficticia: no se almacenan tarjetas ni CVV. Captura del formulario → HTTPS requerido en despliegue externo → Gateway → servicio custodio → DB privada → consulta limitada al titular → conservación justificada/eliminación mediante política a definir con requisitos legales. No loguear formularios ni tokens.

**Pruebas ejecutadas:** catálogo anónimo 200; pedido anónimo 401; cliente en admin 403; pedido ajeno 404; acceso directo a microservicio 401; precio adulterado ignorado; webhook alterado sin HMAC 401. Archivo `../tests/resultados.json`. **Riesgos residuales:** JWT en localStorage (XSS), sin política real automatizada de borrado o HTTPS público, gestión de secretos mediante `.env` en demo.

## Módulo 8. GraphQL privado y agregación

Schema editable: [`../schema.graphql`](../schema.graphql). Ruta externa `POST /api/graphql`; destino privado POST `/query` en puerto `PORT+5`. Operaciones soportadas:

```graphql
query Resumen($id: ID!) {
  resumenPedido(id: $id) {
    id total estado pagoEstado
    items { nombre cantidad precioUnitario descripcion }
  }
}
```

Agregación: `graphql` solicita **pedido del titular** a `orders` y luego en una operación batch solicita **descripciones públicas** a `inventory` (sin compartir bases). `misPedidos` consulta solo `orders`. Si `inventory` está indisponible, devuelve `descripcion:null` y error parcial sin filtrar datos. GraphQL autentica mediante gateway y valida titular mediante orders. Selección de campos en lista permitida, consulta ≤1500 caracteres, profundidad ≤3, costo ≤24, sin introspección ni mutaciones. Prueba negativa de `__schema` y pedido ajeno en suite automática.

**Integración visual:** `frontend/mis-pedidos.html` + `frontend/assets/js/historial.js` muestra historial y detalle agregado. **Limitación explícita:** motor GraphQL con parser restringido a queries documentadas; no es una implementación del estándar completo. Para evaluación de interoperabilidad general habría que sustituirlo por un servidor GraphQL estándar y conservar los resolvers/autorizaciones.


## Adaptador de pago de prueba en navegador (S21)

`pedido.html` consume `POST /api/pagos/iniciar/:id` y `POST /api/pagos/demo/:id/confirmar` tras el despacho. `pago.html` únicamente redirige a `pedido.html?pendiente=ID` para compatibilidad con enlaces anteriores. El gateway valida JWT y envía identidad verificada a orders; orders comprueba titular y delega en payments mediante credencial interna; payments actualiza el estado oficial a través de orders. **Solo se habilita con `PAYMENTS_DEMO=1` y en entorno local no productivo.** No captura tarjetas ni confirma transacciones reales. En despliegue productivo debe estar apagado y sustituto por proveedor de pago verificable.
