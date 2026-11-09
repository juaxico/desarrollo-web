# Módulo 10 · Despliegue, integraciones y validación

## Arranque reproducible

1. Node 22.13+, en `backend/` ejecutar `npm run setup` para generar claves aleatorias locales. Revisar puerto y host en `.env`.
2. `npm start` ejecuta como procesos independientes: inventory, clients, orders, payments, graphql, gateway. Crea `data/*.sqlite` y productos de ejemplo si el catálogo está vacío.
3. Navegador `http://localhost:3000`, registro/login, productos, carrito, pedido. Para consulta agregada abre `mis-pedidos.html` con sesión.
4. El pago simulado se habilita solo en desarrollo local agregando `PAYMENTS_DEMO=1` al `.env` (sin editar otros secretos). Reiniciar `npm start`; usar **Pagar** en `pedido.html` (pago integrado); los pedidos anteriores se retoman desde **Mis pedidos**. `pago.html` solo redirige para compatibilidad. No hay cobros reales ni captura de tarjetas.
5. `GET /health` verifica respuesta del gateway, pero no todos los componentes; `npm test` valida integraciones.
6. `Ctrl+C` detiene los procesos supervisados. No abrir puertos 3001–3005 al exterior.

Configurar nuevos roles con variables de entorno locales (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_ROLE`, `ADMIN_NAME`) y ejecutar `npm run seed:admin` una sola vez. No adjuntar cuentas ni credenciales reales. No existe pago productivo ni cuenta cloud requerida.

## Pruebas automatizadas y matriz requisito → pantalla → servicio → verificación

| Requisito | Pantalla | Servicio | Prueba automatizada | Resultado |
|---|---|---|---|---|
| R01 catálogo | index, cortes, parrillas | S01 inventory | Catálogo público | aprobada |
| R02 registro/login | modal acceso | S02–S04 clients | Registro, login y perfil | aprobada |
| R03 crear pedido | pedido | S07 orders/inventory | Precio alterado ignorado, stock reservado | aprobada |
| R04 consultar historial | mis-pedidos | S08/S09/S19 orders/graphql | Propiedad + agregado con descripción | aprobada |
| R05 producto admin | API admin | S12–S16 | CRUD admin + denegación cliente | aprobada |
| R05 despacho | API admin | S17–S18 | Transición inválida/permitida | aprobada |
| R06 iniciar y validar pago | pedido.html y API local | S11/S20/S21 | HMAC inválido, webhook válido y repetido; simulador local solo titular | aprobada |
| R03 anular | API cliente | S10 | Stock restaurado, pagado no anulable | aprobada |
| Resguardo de sesión | modal/acceso | S06 clients | Revocación de token | aprobada |
| Backend privado | solo gateway | todas | Consulta directa sin secreto 401 | aprobada |
| GraphQL seguro | mis-pedidos | S19 | Introspección rechazada, pedido ajeno 404 | aprobada |

La lista individual y sus resultados concretos están en `../tests/resultados.json`, generada al ejecutar `npm test`. Todos los ejemplos usan clientes y datos ficticios y una base temporal independiente. La suite no implica auditoría de seguridad ni reemplaza pruebas manuales de interfaz y responsividad.

## Evidencias y pruebas pendientes para evaluación presencial

- Capturas de pantallas responsivas en tamaños 375, 768, 1024 y 1440 px incluidas en `evidencias/`. Revisar también las páginas nuevas y sus tamaños.
- Capturas del flujo Pagar → «¡Pedido recibido!» → «Mis pedidos» incluidas en `evidencias/`, aportadas durante pruebas manuales. La prueba automatizada demuestra integración de API, pero no reemplaza la validación visual de todos los tamaños.
- Capturas de `npm test` y `npm run load:test` incluidas en `evidencias/` y resultados JSON en `backend/tests/`. La verificación de `/health` del Gateway no equivale a comprobar todos los microservicios.
- Para un despliegue productivo faltan HTTPS, gestor de secretos, cambio de token desde localStorage a HttpOnly/SameSite, migraciones versionadas, restauración de reservas huérfanas, una pasarela externa de pago y conciliación/reembolsos.

## Medición local observada (9-nov-2026)

La captura y `backend/tests/carga-resultados.json` reportan 240 solicitudes GET al catálogo, concurrencia 12, 0 errores, p95 11,2 ms y throughput 1.421 req/s (duración aproximada 0,169 s). **CPU y RSS corresponden al generador de carga, no al proceso backend**. Faltan métricas propias del servidor para cumplir literalmente toda la evidencia del Módulo 9.

La suite `npm test` agrupa **18 verificaciones internas en 1 subprueba Node.js**; no presentar el resultado de terminal como «18 pruebas» independientes.
