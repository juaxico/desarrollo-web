const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { crearToken, requiereLogin } = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Freno simple contra fuerza bruta: máx. 10 intentos de login por IP cada 15 min
const intentos = new Map();
function limitarLogin(req, res, next) {
  const ahora = Date.now();
  const clave = req.ip;
  const lista = (intentos.get(clave) || []).filter(t => ahora - t < 15 * 60 * 1000);
  if (lista.length >= 10) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
  }
  lista.push(ahora);
  intentos.set(clave, lista);
  next();
}

const publico = u => ({ id: u.id, nombre: u.nombre, email: u.email });

// POST /api/auth/registro
router.post('/registro', (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (nombre.length < 2) return res.status(400).json({ error: 'Ingresa tu nombre.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'El correo no es válido.' });
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  if (db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'Ese correo ya está registrado.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)')
    .run(nombre, email, hash);

  const usuario = { id: Number(lastInsertRowid), nombre, email };
  res.status(201).json({ token: crearToken(usuario), usuario: publico(usuario) });
});

// POST /api/auth/login
router.post('/login', limitarLogin, (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const u = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  // Mismo mensaje si falla el correo o la contraseña (no revela cuál de los dos)
  if (!u || !bcrypt.compareSync(password, u.password_hash)) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }
  res.json({ token: crearToken(u), usuario: publico(u) });
});

// GET /api/auth/me  (para saber si la sesión sigue activa)
router.get('/me', requiereLogin, (req, res) => {
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (!u) return res.status(401).json({ error: 'Usuario no encontrado.' });
  res.json({ usuario: publico(u) });
});

module.exports = router;
