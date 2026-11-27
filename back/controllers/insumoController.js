const insumoAsignacion = require('../models/insumoAsignacionModel');

function responder(res, error) {
  const status = error.status || 500;
  if (status === 500) console.error('Insumos:', error);
  res.status(status).json({ error: status === 500 ? 'No se pudo completar la operación de insumos.' : error.message });
}

exports.miDotacion = async (req, res) => {
  if (req.user.role !== 'Employee') {
    return res.status(403).json({ error: 'Solo un empleado consulta sus insumos asignados.' });
  }
  try {
    const insumos = await insumoAsignacion.miDotacion(req.user.id);
    res.status(200).json(insumos);
  } catch (error) {
    responder(res, error);
  }
};

exports.verAsignacion = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Solo el administrador asigna insumos.' });
  }
  try {
    const asignacion = await insumoAsignacion.asignacionDe(req.params.barberoId);
    res.status(200).json(asignacion);
  } catch (error) {
    responder(res, error);
  }
};

exports.guardarAsignacion = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Solo el administrador asigna insumos.' });
  }
  try {
    const asignacion = await insumoAsignacion.guardarAsignacion(req.params.barberoId, req.body.items);
    res.status(200).json({ message: 'Asignación guardada.', ...asignacion });
  } catch (error) {
    responder(res, error);
  }
};

exports.registrarConsumo = async (req, res) => {
  if (req.user.role !== 'Employee') {
    return res.status(403).json({ error: 'Solo el empleado registra el consumo de su turno.' });
  }
  try {
    const registrados = await insumoAsignacion.registrarConsumo(req.user.id, req.body.items);
    res.status(200).json({
      message: 'Consumo registrado. El inventario ya fue descontado.',
      registrados,
    });
  } catch (error) {
    responder(res, error);
  }
};
