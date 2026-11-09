# Revisión final del paquete — Evaluación 2

**Base:** RAR completo recibido el 9-nov-2026 y revisión directa del código. No incluye secretos ni bases con datos personales.

## Resultado comprobable

- Se ejecutó `npm test` sobre el código extraído en un entorno aislado: 1 suite integral Node.js, **18 comprobaciones internas aprobadas**, 0 fallos. La prueba crea bases SQLite temporales y claves aleatorias.
- Evidencia del usuario: pago aprobado tras Pagar en `pedido.html`, pedido N.º 3 con el mismo estado en `mis-pedidos.html`.
- Se adjunta registro previo de carga de 240 GET al catálogo, concurrencia 12, p95 11,2 ms, 0 errores; **CPU/memoria de servidor no medidos**.
- Composición privada de `orders`+`inventory` comprobada por test GraphQL.

## Puntos pendientes o riesgos de nota

1. **GraphQL**: motor propio de consultas limitadas; no implementación completa del estándar GraphQL. Podría recibir evaluación parcial en el criterio de 15 puntos si el profesor espera un servidor interoperable.
2. **Módulo 9**: el script de carga registra CPU/memoria del cliente, no del servidor. Para cumplimiento literal medir CPU/RSS del servidor y, preferiblemente, otro flujo distinto del catálogo. La no aplicabilidad de gRPC y analítica está argumentada con ADR.
3. **Operaciones administrativas**: rutas/API con pruebas de permisos, pero sin pantalla administrativa completa. Confirmar si el caso del curso exige esa pantalla.
4. **Persistencia y seguridad operativa**: faltan migraciones versionadas y recuperación durable de reservas huérfanas tras caída entre servicios; JWT en localStorage, sin TLS para despliegue externo ni gestor de secretos centralizado. Están declarados como límites de la demostración local.
5. **Contratos**: la matriz anterior tenía pocos JSON de ejemplo y permisos agrupados. Se añadieron contratos ficticios para S01–S21 y matriz desglosada en archivos complementarios.
6. **Evidencias**: hay capturas del flujo cliente y pruebas. Falta una demostración documentada de negativas de seguridad desde interfaz/Postman (usuario ajeno, ruta interna, pago sin identidad) para máxima solidez.

## Seguridad del archivo entregable

La entrega original `desarrollo web.rar` contenía `.env`, respaldo de `.env`, bases SQLite y objetos Git. Esta copia se ha generado **sin** ellos y sin `node_modules`. En el Git index del RAR solo aparece la plantilla `.env.example` entre los archivos de entorno; eso no garantiza la ausencia de secretos en historial antiguo ni en servicios externos. No compartir valores reales de `.env`.

## Cambios en esta copia

- README reescrito con arranque, estructura, pruebas y advertencias.
- `Modulo_1_Servicios.md`, `Arquitectura_Modulos_2_a_8.md`, `Modulo_9_ADR_Analitica_gRPC.md`, `Modulo_10_Pruebas_y_Despliegue.md`: coherencia con pago integrado y resultados reales.
- `Modulo_1_Contratos_Detallados.md` y `Modulo_4_6_Matrices_Completas.md`: anexos nuevos.
- `Modulo_2_UML.mmd`: operaciones relacionadas con IDs de servicios (S01–S21).
- `.gitignore` en raíz y en backend: excluyen claves, respaldos y archivos de datos.
- `backend/docs/evidencias/`: imágenes aportadas en la conversación.

**No se alteró la lógica de aplicación de los archivos JS/HTML/CSS** en esta copia. Los problemas funcionales que se descubran después requieren otra revisión.
