const { entenderMensaje } = require('../services/cisoGemini');

function listaDe(valor, limite) {
  if (!Array.isArray(valor)) return [];
  return valor.slice(0, limite).map((item) => String(item || '').trim().slice(0, 80)).filter(Boolean);
}

function hoyLocal() {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const nombres = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return `${fecha.getFullYear()}-${mes}-${dia} (${nombres[fecha.getDay()]})`;
}

exports.entender = async (req, res) => {
  const mensaje = String(req.body?.mensaje || '').trim().slice(0, 1000);
  if (!mensaje) return res.status(400).json({ ok: false, motivo: 'vacio' });

  const historial = Array.isArray(req.body?.historial)
    ? req.body.historial.slice(-8).map((turno) => ({
      rol: turno?.rol === 'ciso' ? 'ciso' : 'usuario',
      texto: String(turno?.texto || '').slice(0, 400),
    }))
    : [];

  try {
    const lectura = await entenderMensaje({
      mensaje,
      historial,
      rol: String(req.body?.rol || '').slice(0, 40),
      nombre: String(req.body?.nombre || '').slice(0, 80),
      paso: String(req.body?.paso || 'inicio').slice(0, 40),
      borrador: req.body?.borrador && typeof req.body.borrador === 'object' ? req.body.borrador : {},
      barberos: listaDe(req.body?.barberos, 30),
      servicios: listaDe(req.body?.servicios, 40),
      hoy: hoyLocal(),
    });
    if (!lectura) return res.json({ ok: false, motivo: 'sin_modelo' });
    return res.json({ ok: true, lectura });
  } catch (error) {
    if (error.code === 'SIN_CLAVE') return res.json({ ok: false, motivo: 'sin_clave' });
    console.error('Ciso IA:', error.message);
    return res.json({ ok: false, motivo: 'error' });
  }
};
