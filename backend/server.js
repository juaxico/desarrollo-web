const path = require('path');
const express = require('express');

const app = express();
app.use(express.json({ limit: '50kb' }));

// API
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/productos', require('./src/routes/productos'));
app.use('/api/pedidos', require('./src/routes/pedidos'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// También sirve el frontend, así con un solo comando funciona todo en http://localhost:3000
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Errores inesperados
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de El Asador corriendo en http://localhost:${PORT}`);
});
