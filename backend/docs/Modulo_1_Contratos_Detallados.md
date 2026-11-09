# Módulo 1 — Contratos detallados y ejemplos JSON ficticios

**Alcance:** rutas efectivamente presentes en `backend/src/gateway.js`; ejemplos ilustrativos, no contienen tokens ni direcciones reales. Para todos los servicios autenticados se envía `Authorization: Bearer <TOKEN_FICTICIO>`.

La clasificación de datos y errores adicionales se encuentra en `Modulo_1_Servicios.md`. Las respuestas pueden incluir `codigo` de correlación en fallos.

## S01 · `GET /api/productos?categoria=vacuno`

Consulta: `categoria` texto opcional de hasta 40 caracteres, letras/números/guion/bajo. Sin cuerpo.

**Petición:** sin cuerpo JSON

**Respuesta 200:**
```json
[
  {
    "id": 5,
    "nombre": "Filete",
    "categoria": "vacuno",
    "precio": 20000,
    "imagen": "filete.jpg",
    "descripcion": "Corte tierno y magro.",
    "stock": 50,
    "activo": 1
  }
]
```

## S02 · `POST /api/auth/registro`

`nombre` string 2–120, `email` string 5–254 válido, `password` string 8–128; obligatorios.

**Petición:** 
```json
{
  "nombre": "María Ejemplo",
  "email": "maria@example.invalid",
  "password": "ClaveEjemplo2026!"
}
```

**Respuesta 201:**
```json
{
  "token": "JWT_FICTICIO",
  "usuario": {
    "id": 7,
    "nombre": "María Ejemplo",
    "email": "maria@example.invalid",
    "role": "cliente"
  }
}
```

## S03 · `POST /api/auth/login`

`email` y `password` strings obligatorios.

**Petición:** 
```json
{
  "email": "maria@example.invalid",
  "password": "ClaveEjemplo2026!"
}
```

**Respuesta 200:**
```json
{
  "token": "JWT_FICTICIO",
  "usuario": {
    "id": 7,
    "nombre": "María Ejemplo",
    "email": "maria@example.invalid",
    "role": "cliente"
  }
}
```

## S04 · `GET /api/auth/me`

Bearer requerido. Sin cuerpo.

**Petición:** sin cuerpo JSON

**Respuesta 200:**
```json
{
  "usuario": {
    "id": 7,
    "nombre": "María Ejemplo",
    "email": "maria@example.invalid",
    "role": "cliente"
  }
}
```

## S05 · `PATCH /api/auth/me`

Bearer; `nombre` string 2–120 o `email` válido (al menos uno).

**Petición:** 
```json
{
  "nombre": "María Ejemplo Actualizada"
}
```

**Respuesta 200:**
```json
{
  "usuario": {
    "id": 7,
    "nombre": "María Ejemplo Actualizada",
    "email": "maria@example.invalid",
    "role": "cliente"
  }
}
```

## S06 · `POST /api/auth/logout`

Bearer requerido; cuerpo vacío.

**Petición:** 
```json
{}
```

**Respuesta 200:**
```json
{
  "mensaje": "Sesión cerrada."
}
```

## S07 · `POST /api/pedidos`

Bearer; `despacho` objeto con nombre/dirección/teléfono obligatorios; `items` array 1–40 con nombre y cantidad 1–50.

**Petición:** 
```json
{
  "despacho": {
    "nombre": "María Ejemplo",
    "direccion": "Av. Ficticia 123",
    "comuna": "La Reina",
    "telefono": "+56912345678",
    "notas": ""
  },
  "items": [
    {
      "nombre": "Filete",
      "cantidad": 2
    }
  ]
}
```

**Respuesta 201:**
```json
{
  "id": 101,
  "total": 40000,
  "estado": "recibido",
  "pagoEstado": "pendiente"
}
```

## S08 · `GET /api/pedidos/mios`

Bearer; lista limitada al titular; sin cuerpo.

**Petición:** sin cuerpo JSON

**Respuesta 200:**
```json
[
  {
    "id": 101,
    "total": 40000,
    "estado": "recibido",
    "pagoEstado": "pendiente",
    "creado_en": "2026-11-09 00:00:00"
  }
]
```

## S09 · `GET /api/pedidos/101`

Bearer; `id` entero positivo en ruta.

**Petición:** sin cuerpo JSON

**Respuesta 200:**
```json
{
  "id": 101,
  "total": 40000,
  "estado": "recibido",
  "pagoEstado": "pendiente",
  "despacho": {
    "nombre": "María Ejemplo",
    "direccion": "Av. Ficticia 123",
    "comuna": "La Reina",
    "telefono": "+56912345678",
    "notas": ""
  },
  "items": [
    {
      "nombre": "Filete",
      "precio_unitario": 20000,
      "cantidad": 2
    }
  ]
}
```

## S10 · `POST /api/pedidos/101/anular`

Bearer + titular; `id` en ruta, cuerpo vacío. Solo antes del pago aprobado.

**Petición:** 
```json
{}
```

**Respuesta 200:**
```json
{
  "id": 101,
  "estado": "cancelado"
}
```

## S11 · `POST /api/pagos/iniciar/101`

Bearer + titular; `id` en ruta, cuerpo vacío.

**Petición:** 
```json
{}
```

**Respuesta 200:**
```json
{
  "pagoId": 9,
  "referencia": "TEST-REFERENCIA-FICTICIA",
  "estado": "pendiente",
  "modo": "prueba"
}
```

## S12 · `GET /api/admin/productos`

Bearer rol `admin` o `admin_inventario`; sin cuerpo.

**Petición:** sin cuerpo JSON

**Respuesta 200:**
```json
[
  {
    "id": 5,
    "nombre": "Filete",
    "categoria": "vacuno",
    "precio": 20000,
    "imagen": "filete.jpg",
    "descripcion": "Corte tierno y magro.",
    "stock": 50,
    "activo": 1
  }
]
```

## S13 · `POST /api/admin/productos`

Bearer rol inventario; nombre, categoría, precio entero >0 y stock entero ≥0 obligatorios; imagen/descripcion opcionales.

**Petición:** 
```json
{
  "nombre": "Corte Nuevo",
  "categoria": "vacuno",
  "precio": 15500,
  "stock": 20,
  "imagen": "corte.jpg",
  "descripcion": "Producto ficticio."
}
```

**Respuesta 201:**
```json
{
  "id": 20,
  "nombre": "Corte Nuevo",
  "categoria": "vacuno",
  "precio": 15500,
  "stock": 20,
  "imagen": "corte.jpg",
  "descripcion": "Producto ficticio.",
  "activo": 1
}
```

## S14 · `PATCH /api/admin/productos/20`

Bearer rol inventario; campos editables parciales.

**Petición:** 
```json
{
  "precio": 16500
}
```

**Respuesta 200:**
```json
{
  "id": 20,
  "nombre": "Corte Nuevo",
  "categoria": "vacuno",
  "precio": 16500,
  "stock": 20,
  "imagen": "corte.jpg",
  "descripcion": "Producto ficticio.",
  "activo": 1
}
```

## S15 · `DELETE /api/admin/productos/20`

Bearer rol inventario; `id` entero positivo en ruta; desactivación lógica.

**Petición:** sin cuerpo JSON

**Respuesta 200:**
```json
{
  "id": 20,
  "activo": false
}
```

## S16 · `PATCH /api/admin/productos/5/stock`

Bearer rol inventario; `stock` entero ≥0 y `motivo` string 3–200 obligatorios.

**Petición:** 
```json
{
  "stock": 35,
  "motivo": "Ajuste inventario ficticio"
}
```

**Respuesta 200:**
```json
{
  "id": 5,
  "stock": 35,
  "motivo": "Ajuste inventario ficticio"
}
```

## S17 · `GET /api/admin/pedidos`

Bearer rol `admin` o `operador_pedidos`; lista operativa máx. 200.

**Petición:** sin cuerpo JSON

**Respuesta 200:**
```json
[
  {
    "id": 101,
    "userId": 7,
    "total": 40000,
    "estado": "recibido",
    "pagoEstado": "aprobado",
    "creado_en": "2026-11-09 00:00:00"
  }
]
```

## S18 · `PATCH /api/admin/pedidos/101/estado`

Bearer rol pedidos; `estado` enum: en_preparacion/en_camino/entregado sujeto a transiciones y pago aprobado.

**Petición:** 
```json
{
  "estado": "en_preparacion"
}
```

**Respuesta 200:**
```json
{
  "id": 101,
  "estado": "en_preparacion"
}
```

## S19 · `POST /api/graphql`

Bearer; `query` string GraphQL restringida ≤1500 caracteres y `variables` objeto opcional; selección de campos autorizada.

**Petición:** 
```json
{
  "query": "query Resumen($id: ID!) { resumenPedido(id: $id) { id total items { nombre cantidad descripcion } } }",
  "variables": {
    "id": 101
  }
}
```

**Respuesta 200:**
```json
{
  "data": {
    "resumenPedido": {
      "id": 101,
      "total": 40000,
      "items": [
        {
          "nombre": "Filete",
          "cantidad": 2,
          "descripcion": "Corte tierno y magro."
        }
      ]
    }
  }
}
```

## S20 · `POST /api/pagos/webhook`

Identidad técnica del proveedor; cabecera `x-provider-signature` HMAC SHA-256 sobre bytes exactos.

**Petición:** 
```json
{
  "eventId": "evt-prueba-0001",
  "referencia": "TEST-REFERENCIA-FICTICIA",
  "estado": "aprobado"
}
```

**Respuesta 200:**
```json
{
  "procesado": true,
  "duplicado": false,
  "estado": "aprobado"
}
```

## S21 · `POST /api/pagos/demo/101/confirmar`

Bearer + titular; `estado` enum aprobado/rechazado. Solo si PAYMENTS_DEMO=1 en modo local no productivo.

**Petición:** 
```json
{
  "estado": "aprobado"
}
```

**Respuesta 200:**
```json
{
  "id": 101,
  "pagoEstado": "aprobado",
  "duplicado": false,
  "modo": "prueba"
}
```

## Estados y errores generales

`400` validación, `401` autenticación o firma inválida, `403` rol prohibido, `404` recurso inexistente o ajeno, `409` duplicado/estado/stock, `413` cuerpo demasiado grande, `429` tasa excedida, `503` dependencia no disponible. Los precios y estados son determinados por servicios internos.

`GET` consulta, `POST` crea/ejecuta una transición, `PATCH` actualiza parcialmente y `DELETE` en S15 desactiva el producto sin borrarlo físicamente.
