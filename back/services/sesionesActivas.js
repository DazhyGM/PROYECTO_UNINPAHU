const crypto = require('crypto');

// Vive solo en memoria: al apagar el servidor estas sesiones dejan de existir.
const activas = new Map();

function abrir(userId) {
  const id = Number(userId);
  for (const [sid, datos] of activas) {
    if (Number(datos.userId) === id) activas.delete(sid);
  }

  const sid = crypto.randomBytes(16).toString('hex');
  activas.set(sid, { userId: id });
  return sid;
}

function vigente(sid) {
  return Boolean(sid && activas.has(sid));
}

function cerrar(sid) {
  if (!sid) return false;
  return activas.delete(sid);
}

function responderCerrada(res) {
  return res.status(401).json({
    error: 'La sesión ya no está activa. Inicia sesión nuevamente.',
    code: 'SESION_CERRADA',
  });
}

module.exports = { abrir, vigente, cerrar, responderCerrada };
