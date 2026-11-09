# El Asador — Evaluación 2

**Caso 20:** Parrilladas «El Asador» — carnes y parrillas familiares.  
**Integrantes:** Vadin Fuentes y Joaquín Latham · **NRC:** 8479.  
**Frontend:** versión responsiva desarrollada en Evaluación 1, con carrito, despacho, pago integrado e historial.

## Arquitectura y flujo

El cliente consulta el catálogo, agrega productos al carrito, se registra o inicia sesión, ingresa despacho, presiona **Pagar** y recibe la confirmación después de que el backend verifica el estado del pago. La página **Mis pedidos** muestra el historial y combina datos de `orders` e `inventory` mediante GraphQL privado.

El backend usa Node.js, seis procesos independientes (`gateway`, `inventory`, `clients`, `orders`, `payments`, `graphql`) y bases SQLite separadas por dominio. El Gateway aplica rutas permitidas, autenticación y políticas de autorización; los servicios privados escuchan en loopback y requieren identidades técnicas.

## Ejecución local

Requisitos: **Node.js >= 22.13** y npm. Desde `backend/`:

```powershell
npm run setup
# El setup crea una configuración privada .env si no existe.
# Para habilitar el adaptador local de pagos, agregar PAYMENTS_DEMO=1 al .env.
npm start
```

