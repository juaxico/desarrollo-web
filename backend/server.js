const express = require('express');
const db = require('./db');
const app = express();

app.use(express.json());

app.get('/productos', (req, res) => {
    const productos = db.prepare('SELECT * FROM productos').all();
    res.json(productos);
});

app.listen(3000, () => {
    console.log('Servidor de El Asador corriendo en http://localhost:3000');
});