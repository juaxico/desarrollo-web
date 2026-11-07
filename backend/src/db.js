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
    descripcion TEXT,
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

// Si la base ya existía de antes (sin la columna "descripcion"), se la agrega sola
const columnas = db.prepare('PRAGMA table_info(productos)').all().map(c => c.name);
if (!columnas.includes('descripcion')) {
  db.exec('ALTER TABLE productos ADD COLUMN descripcion TEXT');
}

// Productos iniciales: [nombre, categoria, precio, imagen, descripcion]
const PRODUCTOS = [
  ['Costillas de Vacuno', 'vacuno', 15000, 'costillas de vacuno.png',
    'Costillas ideales para una cocción lenta. Su carne queda tierna, jugosa y llena de sabor.'],
  ['Entraña', 'vacuno', 16000, 'entraña.png',
    'Corte delgado de intenso sabor, ideal para cocinar rápidamente a fuego fuerte y servir jugoso.'],
  ['Asado de Tira', 'vacuno', 17000, 'asado de tiras.jpg',
    'Corte tradicional de parrilla que combina carne, grasa y hueso, entregando un sabor intenso.'],
  ['Lomo Vetado', 'vacuno', 18000, 'lomo vetado.png',
    'Corte jugoso y sabroso, caracterizado por una excelente infiltración de grasa.'],
  ['Filete', 'vacuno', 20000, 'filete.jpg',
    'Uno de los cortes más tiernos del vacuno, con poca grasa y una textura suave y delicada.'],
  ['Parrillada', 'parrillada', 45000, 'parrillada.jpg',
    'Selección de distintos cortes pensada para compartir y preparar un asado completo.'],
  ['Alitas de Pollo', 'pollo', 6990, 'alitas de pollo.png',
    'Ideales para marinar y cocinar sobre la parrilla. Perfectas para compartir como aperitivo.'],
  ['Trutro de Pollo', 'pollo', 7990, 'truto de pollo.jpg',
    'Corte jugoso y de gran sabor, recomendado para cocinar lentamente sobre la parrilla.'],
  ['Pechuga de Pollo', 'pollo', 8990, 'PECHUGA.jpg',
    'Pechuga fresca y magra, ideal para cocinar a la parrilla, al horno o a la plancha.'],
  ['Filete de Pollo', 'pollo', 9990, 'filete de pollo.png',
    'Filetes tiernos y fáciles de preparar. Ideales para una cocción rápida a la parrilla.'],
  ['Brochetas de Pollo', 'pollo', 10990, 'brochetas de pollo.png',
    'Trozos de pollo preparados en brochetas y listos para cocinar directamente a la parrilla.'],
  ['Pechuga de Pavo', 'pavo', 11990, 'pechuga de pavo.jpg',
    'Carne baja en grasa y de sabor suave. Excelente alternativa para preparaciones ligeras.'],
  ['Parrilla Clásica', 'parrilla', 79990, 'parrilla clasica.jfif',
    'Parrilla tradicional ideal para reuniones familiares y asados de fin de semana.'],
  ['Parrilla Tambor', 'parrilla', 99990, 'parrilla tambor.jfif',
    'Parrilla de gran capacidad, diseñada para preparar distintos cortes al mismo tiempo.'],
  ['Parrilla Premium', 'parrilla', 129990, 'parrilla premium.jfif',
    'Parrilla robusta y de excelente terminación para quienes buscan una experiencia superior.'],
];

const { n } = db.prepare('SELECT COUNT(*) AS n FROM productos').get();
if (n === 0) {
  const insert = db.prepare(
    'INSERT INTO productos (nombre, categoria, precio, imagen, descripcion) VALUES (?, ?, ?, ?, ?)'
  );
  for (const p of PRODUCTOS) insert.run(...p);
  console.log(`Base de datos creada con ${PRODUCTOS.length} productos.`);
} else {
  // Base existente: rellena las descripciones que falten (no toca precios ni nada más)
  const rellenar = db.prepare(
    "UPDATE productos SET descripcion = ? WHERE nombre = ? AND (descripcion IS NULL OR descripcion = '')"
  );
  for (const p of PRODUCTOS) rellenar.run(p[4], p[0]);
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
