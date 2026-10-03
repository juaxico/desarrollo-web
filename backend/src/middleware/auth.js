const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'secreto-solo-para-desarrollo';
if (!process.env.JWT_SECRET) {
  console.warn('⚠ Falta JWT_SECRET en .env: usando un secreto de desarrollo.');
}

function crearToken(usuario) {
  return jwt.sign({ id: usuario.id, nombre: usuario.nombre }, SECRET, { expiresIn: '7d' });
}

// Exige un token válido en el header "Authorization: Bearer <token>"
function requiereLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Debes iniciar sesión.' });
  try {
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Tu sesión expiró. Inicia sesión de nuevo.' });
  }
}

module.exports = { crearToken, requiereLogin };
