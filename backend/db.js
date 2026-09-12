const { DatabaseSync } = require('node:sqlite');
const database = new DatabaseSync('elasador.db');

database.exec(`
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio INTEGER NOT NULL,
    stock INTEGER NOT NULL
  )
`);

module.exports = database;