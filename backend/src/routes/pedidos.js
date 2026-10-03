const express = require('express');
const { db, transaccion } = require('../db');
const { requiereLogin } = require('../middleware/auth');

const router = express.Router();
router.use(requiereLogin); // todo lo de pedidos exige sesión iniciada

// POST /api/pedidos
// body: { despacho: { nombre, direccion, comuna?, telefono, notas? }, items: [{ nombre, cantidad }] }
router.post('/', (req, res) => {
  const d = req.body.despacho || {};
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  const nombre = String(d.nombre || '').trim();
  const direccion = String(d.direccion || '').trim();
  const comuna = String(d.comuna || '').trim();
  const telefono = String(d.telefono || '').trim();
  const notas = String(d.notas || '').trim().slice(0, 300);

  if (nombre.length < 3) return res.status(400).json({ error: 'Ingresa tu nombre completo.' });
  if (direccion.length < 5) return res.status(400).json({ error: 'Ingresa una dirección de despacho válida.' });
  if (telefono.replace(/\D/g, '').length < 8) {
    return res.status(400).json({ error: 'Ingresa un teléfono de contacto válido.' });
  }
  if (items.length === 0) return res.status(400).json({ error: 'Tu pedido está vacío.' });

  // El precio y el total se calculan AQUÍ con los datos de la base,
  // nunca con lo que mande el navegador (así nadie puede "rebajar" un precio).
  const buscar = db.prepare('SELECT * FROM productos WHERE nombre = ? AND activo = 1');
  const lineas = [];
  let total = 0;
  for (const it of items) {
    const cantidad = Number(it.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 50) {
      return res.status(400).json({ error: `Cantidad inválida para "${it.nombre}".` });
    }
    const p = buscar.get(String(it.nombre));
    if (!p) return res.status(400).json({ error: `El producto "${it.nombre}" ya no está disponible.` });
    lineas.push({ p, cantidad });
    total += p.precio * cantidad;
  }

  const pedidoId = transaccion(() => {
    const { lastInsertRowid } = db
      .prepare(`INSERT INTO pedidos (usuario_id, nombre, direccion, comuna, telefono, notas, total)
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(req.usuario.id, nombre, direccion, comuna, telefono, notas, total);
    const id = Number(lastInsertRowid);
    const insertItem = db.prepare(
      `INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio_unitario, cantidad)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const { p, cantidad } of lineas) insertItem.run(id, p.id, p.nombre, p.precio, cantidad);
    return id;
  });

  res.status(201).json({ id: pedidoId, total, estado: 'recibido' });
});

// GET /api/pedidos/mios  -> historial del usuario logueado
router.get('/mios', (req, res) => {
  const pedidos = db
    .prepare('SELECT id, total, estado, creado_en FROM pedidos WHERE usuario_id = ? ORDER BY id DESC')
    .all(req.usuario.id);
  res.json(pedidos);
});

// GET /api/pedidos/:id  -> detalle (solo si es tuyo)
router.get('/:id', (req, res) => {
  const pedido = db
    .prepare('SELECT * FROM pedidos WHERE id = ? AND usuario_id = ?')
    .get(Number(req.params.id), req.usuario.id);
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });
  const items = db.prepare('SELECT nombre, precio_unitario, cantidad FROM pedido_items WHERE pedido_id = ?').all(pedido.id);
  res.json({ ...pedido, items });
});

module.exports = router;
