// Base de datos SQLite (módulo nativo de Node 22.5+, no requiere instalar nada extra)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '..', 'elasador.db'));

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre        TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS productos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT NOT NULL UNIQUE,
    categoria TEXT NOT NULL,
    precio    INTEGER NOT NULL CHECK (precio > 0),
    imagen    TEXT,
    activo    INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS pedidos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id),
    nombre      TEXT NOT NULL,
    direccion   TEXT NOT NULL,
    comuna      TEXT,
    telefono    TEXT NOT NULL,
    notas       TEXT,
    total       INTEGER NOT NULL,
    estado      TEXT NOT NULL DEFAULT 'recibido',
    creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pedido_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id       INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id     INTEGER NOT NULL REFERENCES productos(id),
    nombre          TEXT NOT NULL,
    precio_unitario INTEGER NOT NULL,
    cantidad        INTEGER NOT NULL CHECK (cantidad > 0)
  );
`);

// Productos iniciales (los mismos que están en cortes.html, parrillas.html e index.html)
const PRODUCTOS = [
  ['Costillas de Vacuno', 'vacuno',   15000, 'costillas de vacuno.png'],
  ['Entraña',             'vacuno',   16000, 'entraña.png'],
  ['Asado de Tira',       'vacuno',   17000, 'asado de tiras.jpg'],
  ['Lomo Vetado',         'vacuno',   18000, 'lomo vetado.png'],
  ['Filete',              'vacuno',   20000, 'filete.jpg'],
  ['Parrillada',          'parrillada', 45000, 'parrillada.jpg'],
  ['Alitas de Pollo',     'pollo',     6990, 'alitas de pollo.png'],
  ['Trutro de Pollo',     'pollo',     7990, 'truto de pollo.jpg'],
  ['Pechuga de Pollo',    'pollo',     8990, 'PECHUGA.jpg'],
  ['Filete de Pollo',     'pollo',     9990, 'filete de pollo.png'],
  ['Brochetas de Pollo',  'pollo',    10990, 'brochetas de pollo.png'],
  ['Pechuga de Pavo',     'pavo',     11990, 'pechuga de pavo.jpg'],
  ['Parrilla Clásica',    'parrilla', 79990, 'parrilla clasica.jfif'],
  ['Parrilla Tambor',     'parrilla', 99990, 'parrilla tambor.jfif'],
  ['Parrilla Premium',    'parrilla', 129990, 'parrilla premium.jfif'],
];

const { n } = db.prepare('SELECT COUNT(*) AS n FROM productos').get();
if (n === 0) {
  const insert = db.prepare(
    'INSERT INTO productos (nombre, categoria, precio, imagen) VALUES (?, ?, ?, ?)'
  );
  for (const p of PRODUCTOS) insert.run(...p);
  console.log(`Base de datos creada con ${PRODUCTOS.length} productos.`);
}

// Ejecuta varias operaciones como una sola transacción (o todo o nada)
function transaccion(fn) {
  db.exec('BEGIN');
  try {
    const resultado = fn();
    db.exec('COMMIT');
    return resultado;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { db, transaccion };
