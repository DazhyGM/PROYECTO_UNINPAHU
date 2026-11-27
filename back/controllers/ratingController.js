const Rating = require('../models/Rating');
const Quote = require('../models/Quote');

function puntajeValido(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1 && numero <= 5;
}

function esAdmin(user) {
  return String(user?.role || '').toLowerCase() === 'admin';
}

exports.pending = async (req, res) => {
  try {
    const citas = await Rating.getPendingByUser(req.user.id);
    res.status(200).json(citas);
  } catch (error) {
    console.error('Error al consultar encuestas pendientes:', error);
    res.status(500).json({ message: 'No se pudieron consultar las encuestas pendientes.' });
  }
};

exports.quote = async (req, res) => {
  try {
    const quote = await Quote.findDetailedById(req.params.id);
    if (!quote) {
      return res.status(404).json({ message: 'No encontramos esa cita.' });
    }
    if (Number(quote.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Esta cita no te pertenece.' });
    }

    const calificacion = await Rating.findByQuote(quote.id_quotes);
    res.status(200).json({
      id_quotes: quote.id_quotes,
      date_time: quote.date_time,
      state_quotes: quote.state_quotes,
      name_service: quote.name_service,
      barber_name: quote.barber_name,
      calificada: Boolean(calificacion),
      calificacion_servicio: calificacion ? calificacion.calificacion_servicio : null,
      calificacion_barberia: calificacion ? calificacion.calificacion_barberia : null,
    });
  } catch (error) {
    console.error('Error al abrir la encuesta:', error);
    res.status(500).json({ message: 'No se pudo abrir la encuesta.' });
  }
};

exports.create = async (req, res) => {
  const idQuotes = Number(req.body.id_quotes);
  const servicio = Number(req.body.calificacion_servicio);
  const barberia = Number(req.body.calificacion_barberia);

  if (!Number.isInteger(idQuotes) || idQuotes <= 0) {
    return res.status(400).json({ message: 'La cita no es válida.' });
  }
  if (!puntajeValido(servicio) || !puntajeValido(barberia)) {
    return res.status(400).json({ message: 'Cada calificación debe ser un número entero del 1 al 5.' });
  }

  try {
    const quote = await Quote.findDetailedById(idQuotes);
    if (!quote) {
      return res.status(404).json({ message: 'No encontramos esa cita.' });
    }
    if (Number(quote.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Solo el cliente de la cita puede calificarla.' });
    }
    if (quote.state_quotes !== 'finalizada') {
      return res.status(400).json({ message: 'Solo puedes calificar un servicio que ya haya finalizado.' });
    }
    if (!quote.barber_id || !quote.id_services || !quote.user_id) {
      return res.status(400).json({ message: 'La cita no tiene la información necesaria para guardar la calificación.' });
    }

    const existente = await Rating.findByQuote(idQuotes);
    if (existente) {
      return res.status(409).json({ message: 'Esta cita ya fue calificada.' });
    }

    const id = await Rating.create({
      id_quotes: quote.id_quotes,
      id_barbero: quote.barber_id,
      id_servicio: quote.id_services,
      id_cliente: quote.user_id,
      calificacion_servicio: servicio,
      calificacion_barberia: barberia,
    });

    res.status(201).json({
      message: 'Gracias. Tu calificación quedó registrada.',
      id_calificacion: id,
    });
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Esta cita ya fue calificada.' });
    }
    console.error('Error al guardar la calificación:', error);
    res.status(500).json({ message: 'No se pudo guardar la calificación.' });
  }
};

exports.barberos = async (req, res) => {
  try {
    const filas = await Rating.getPublicByBarber();
    res.status(200).json(filas);
  } catch (error) {
    console.error('Error al consultar calificaciones de barberos:', error);
    res.status(500).json({ message: 'No se pudieron consultar las calificaciones.' });
  }
};

exports.metrics = async (req, res) => {
  if (!esAdmin(req.user)) {
    return res.status(403).json({ message: 'Solo el administrador puede ver las métricas de calidad.' });
  }

  try {
    const metricas = await Rating.getMetrics();
    res.status(200).json(metricas);
  } catch (error) {
    console.error('Error al consultar métricas:', error);
    res.status(500).json({ message: 'No se pudieron consultar las métricas.' });
  }
};

exports.createClientRating = async (req, res) => {
  const idQuotes = Number(req.body.id_quotes);
  const calificacion = Number(req.body.calificacion_cliente);

  if (!Number.isInteger(idQuotes) || idQuotes <= 0) {
    return res.status(400).json({ message: 'La cita no es válida.' });
  }
  if (!puntajeValido(calificacion)) {
    return res.status(400).json({ message: 'La calificación del cliente debe ser un número entero del 1 al 5.' });
  }

  try {
    const quote = await Quote.findDetailedById(idQuotes);
    if (!quote) {
      return res.status(404).json({ message: 'No encontramos esa cita.' });
    }
    if (Number(quote.barber_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Solo el barbero de la cita puede calificar al cliente.' });
    }
    if (quote.state_quotes !== 'finalizada') {
      return res.status(400).json({ message: 'Solo puedes calificar al cliente de un servicio que ya haya finalizado.' });
    }
    if (!quote.user_id || !quote.id_services) {
      return res.status(400).json({ message: 'La cita no tiene la información necesaria para calificar al cliente.' });
    }

    const existente = await Rating.findClientRatingByQuote(idQuotes);
    if (existente) {
      return res.status(409).json({ message: 'Este cliente ya fue calificado en esta cita.' });
    }

    const id = await Rating.createClientRating({
      id_quotes: quote.id_quotes,
      id_barbero: quote.barber_id,
      id_cliente: quote.user_id,
      id_servicio: quote.id_services,
      calificacion_cliente: calificacion,
    });

    res.status(201).json({
      message: 'La calificación del cliente quedó registrada.',
      id_calificacion_cliente: id,
    });
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Este cliente ya fue calificado en esta cita.' });
    }
    console.error('Error al guardar la calificación del cliente:', error);
    res.status(500).json({ message: 'No se pudo guardar la calificación del cliente.' });
  }
};
