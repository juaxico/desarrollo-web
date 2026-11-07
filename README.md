# El Asador

**Caso:** Parrilladas «El Asador»  
**Integrantes:** Vadin Fuentes y Joaquín Latham  
**NRC:** 8479

## Caso, actor y objetivo

**Actor principal:** Cliente de la tienda.

**Objetivo:** Consultar carnes y parrillas, seleccionar productos y confirmar un pedido con datos de despacho.

## Flujo y requisitos abordados

Catálogo → filtros y selección → carrito de compras → datos de despacho → inicio de sesión/registro → confirmación del pedido.

El prototipo utiliza Bootstrap, Grid, Box Model y Flexbox para implementar un diseño responsivo. JavaScript permite actualizar dinámicamente los productos, el carrito y los estados de la interfaz.

Los bocetos se encuentran en `el_sketch_+_paleta_de_colores/`.

## Instrucciones de ejecución

Se requiere Node.js 22.5 o superior y npm.

Desde la carpeta raíz del proyecto ejecutar:

```bash
cd backend
npm install
npm start
```

Abrir `http://localhost:3000` en el navegador.

## Servicios utilizados

- **GET /api/productos:** Obtiene los productos del catálogo.
- **POST /api/pedidos:** Registra un pedido.
- **Estados simulados:** `?simular=lento`, `?simular=error` y `?simular=vacio`.

El proyecto utiliza una API local con Express y SQLite.

