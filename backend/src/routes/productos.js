const express = require('express');
const { db } = require('../db');

const router = express.Router();

// GET /api/productos            -> todos
// GET /api/productos?categoria=pollo
router.get('/', (req, res) => {
  const { categoria } = req.query;
  const productos = categoria
    ? db.prepare('SELECT * FROM productos WHERE activo = 1 AND categoria = ? ORDER BY precio').all(categoria)
    : db.prepare('SELECT * FROM productos WHERE activo = 1 ORDER BY categoria, precio').all();
  res.json(productos);
});

module.exports = router;
