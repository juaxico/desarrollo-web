# Módulo 9 · ADR-001: analítica y gRPC

**Contexto:** e-commerce pequeño con catálogo de ~15 productos en datos ficticios, clientes y pedidos de demostración, sin streaming, telemetría ni sensores, ni necesidad comprobada de procesamiento masivo. Las operaciones transaccionales deben ser fiables y protegidas.

**Alternativas:** (A) HTTP/JSON entre servicios internos y consultas SQL indexadas, (B) gRPC unary, (C) gRPC streaming + analítica dedicada. B/C requieren más contratos, operación de certificados y protocolos, sin beneficio demostrado para este caso de bajo volumen.

**Decisión:** no implementar gRPC ni analítica independiente mientras no exista un requisito de streaming o una carga medida que los justifique. Microservicios privados HTTP/JSON con timeouts, credenciales por destino y propiedad de datos. GraphQL agrega sobre REST privado. La implementación obligatoria del resto de la evaluación no se omite por esta decisión.

**Prueba de carga reproducible:** con backend encendido, `npm run load:test` hace solicitudes `GET /api/productos`, con `LOAD_REQUESTS` y `LOAD_CONCURRENCY` parametrizables. Guarda `backend/tests/carga-resultados.json` (solicitudes, concurrencia, duración, latencia p95, throughput, errores, CPU/memoria del **cliente generador**, no del servidor). Los resultados de una sola corrida local no permiten prometer rendimiento en nube ni probar ausencia de cuello de botella a escala mayor. Se propone como objetivo de laboratorio: 0 errores y p95 inferior a 500 ms con 240 solicitudes y concurrencia 12. La prueba mide lectura pública: no es benchmark de escrituras concurrentes ni de servicios externos.

**Consecuencias:** menos complejidad, menor costo de mantenimiento y pruebas sencillas. Si crece la demanda, instrumentar métricas del servidor (CPU/memoria reales, percentiles por operación), probar sobre carga de pedidos y considerar eventos/analítica o gRPC solo ante un cuello de botella medido. Criterios de reconsideración: streaming de despacho, reportes sobre millones de eventos, o métricas que incumplan el SLO en una carga representativa.

## Registro observado (prueba local reproducible)

Captura de terminal y resultado JSON de la ejecución del **9 de noviembre de 2026**:

| Métrica | Resultado |
|---|---:|
| Endpoint | `GET /api/productos` |
| Solicitudes / concurrencia | 240 / 12 |
| Errores HTTP / red | 0 |
| Latencia p95 | 11,2 ms |
| Throughput | 1.421 solicitudes/s |
| Duración de la carga | 0,169 s |
| CPU y memoria del backend | No medidos |

La memoria y CPU que registra el script pertenecen al **cliente generador de carga**. Por ello, esta medición solo valida el escenario de lectura del catálogo en entorno local; no justifica una garantía de producción ni evalúa cargas de pedidos, pagos o GraphQL. Para un logro completo de la rúbrica debe añadirse captura/medición del **proceso servidor** y un escenario representativo adicional si el docente lo solicita.
