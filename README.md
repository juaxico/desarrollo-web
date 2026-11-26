# El Asador 

**Caso 20:** Parrilladas «El Asador» — carnes y parrillas familiares.  
**Integrantes:** Vadin Fuentes y Joaquín Latham · **NRC:** 8479.  

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

Abrir **http://127.0.0.1:3000**. El Gateway sirve tanto la página como la API.
`/health` comprueba el Gateway y `/health/ready` comprueba también los cinco servicios privados.

## Validación local — Unidad 3

En `backend/`, `npm test` ejecuta pruebas de frontend, la integración anterior y la validación ampliada con servicios reales y bases SQLite temporales. No utiliza las cuentas, claves ni bases del desarrollo local. Para conservar los resultados anteriores, indicar una carpeta de evidencias distinta por ejecución:

```powershell
$env:EVIDENCE_DIR = "C:\ruta\a\evidencias\RUN01"
npm test
```

Para probar fallos desde el navegador con datos aislados:

```powershell
npm run validate:ui
```

Abrir `http://127.0.0.1:3400`. En esa terminal se aceptan `stop inventory`, `start inventory`, `stop payments`, `start payments`, `stop clients`, `start clients` y `exit`. Este laboratorio genera claves efímeras y una base temporal distinta en cada inicio. Usar datos ficticios. `exit` detiene sus servicios y conserva las bases temporales para inspección; no es un mecanismo de despliegue productivo.

El frontend también permite `npm ci`, `npm run dev`, `npm run build` y `npm run preview` desde `frontend/`, con el backend encendido. La compilación incluye las seis entradas HTML, los scripts clásicos y las imágenes dinámicas del catálogo. Los avisos de Vite sobre scripts sin `type="module"` son esperados: se conservan como scripts clásicos por compatibilidad con los controles HTML y se copian al resultado mediante el plugin de compilación.

Detalles de correcciones, pruebas y limitaciones: [revisión local de la Unidad 3](backend/docs/Evaluacion_3_Revision_Local.md).
