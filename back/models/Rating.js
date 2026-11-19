const db = require('../config/db');

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function comoNumero(valor) {
  if (valor === null || valor === undefined) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

class Rating {
  static async findByQuote(quoteId) {
    const rows = await run('SELECT * FROM calificaciones WHERE id_quotes = ?', [quoteId]);
    return rows[0] || null;
  }

  static async getPendingByUser(userId) {
    return run(`
      SELECT
        q.id_quotes,
        q.date_time,
        s.name_service,
        b.full_name AS barber_name
      FROM quotes q
      JOIN services s ON s.id_services = q.id_services
      LEFT JOIN user b ON b.user_id = q.barber_id
      LEFT JOIN calificaciones c ON c.id_quotes = q.id_quotes
      WHERE q.user_id = ?
        AND q.state_quotes = 'finalizada'
        AND c.id_calificacion IS NULL
      ORDER BY q.date_time DESC
    `, [userId]);
  }

  static async create({ id_quotes, id_barbero, id_servicio, id_cliente, calificacion_servicio, calificacion_barberia }) {
    const result = await run(`
      INSERT INTO calificaciones
        (id_quotes, id_barbero, id_servicio, id_cliente, calificacion_servicio, calificacion_barberia)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id_quotes, id_barbero, id_servicio, id_cliente, calificacion_servicio, calificacion_barberia]);

    return result.insertId;
  }

  static async getMetrics() {
    const [resumen] = await run(`
      SELECT
        COUNT(*) AS total,
        ROUND(AVG(calificacion_servicio), 2) AS promedio_servicio,
        ROUND(AVG(calificacion_barberia), 2) AS promedio_barberia
      FROM calificaciones
    `);

    const porBarbero = await run(`
      SELECT
        c.id_barbero,
        u.full_name AS barbero,
        COUNT(*) AS total,
        ROUND(AVG(c.calificacion_servicio), 2) AS promedio_servicio,
        ROUND(AVG(c.calificacion_barberia), 2) AS promedio_barberia
      FROM calificaciones c
      JOIN user u ON u.user_id = c.id_barbero
      GROUP BY c.id_barbero, u.full_name
      ORDER BY promedio_servicio DESC, barbero ASC
    `);

    const porServicio = await run(`
      SELECT
        c.id_servicio,
        s.name_service AS servicio,
        COUNT(*) AS total,
        ROUND(AVG(c.calificacion_servicio), 2) AS promedio_servicio
      FROM calificaciones c
      JOIN services s ON s.id_services = c.id_servicio
      GROUP BY c.id_servicio, s.name_service
      ORDER BY promedio_servicio DESC, servicio ASC
    `);

    const clientes = await this.getClientKpis();

    return {
      resumen: {
        total: Number(resumen?.total || 0),
        promedio_servicio: comoNumero(resumen?.promedio_servicio),
        promedio_barberia: comoNumero(resumen?.promedio_barberia),
      },
      clientes,
      por_barbero: porBarbero.map((fila) => ({
        id_barbero: fila.id_barbero,
        barbero: fila.barbero,
        total: Number(fila.total),
        promedio_servicio: comoNumero(fila.promedio_servicio),
        promedio_barberia: comoNumero(fila.promedio_barberia),
      })),
      por_servicio: porServicio.map((fila) => ({
        id_servicio: fila.id_servicio,
        servicio: fila.servicio,
        total: Number(fila.total),
        promedio_servicio: comoNumero(fila.promedio_servicio),
      })),
    };
  }

  static async findClientRatingByQuote(quoteId) {
    const rows = await run(
      'SELECT * FROM calificaciones_cliente WHERE id_quotes = ?',
      [quoteId]
    );
    return rows[0] || null;
  }

  static async createClientRating({ id_quotes, id_barbero, id_cliente, id_servicio, calificacion_cliente }) {
    const result = await run(`
      INSERT INTO calificaciones_cliente
        (id_quotes, id_barbero, id_cliente, id_servicio, calificacion_cliente)
      VALUES (?, ?, ?, ?, ?)
    `, [id_quotes, id_barbero, id_cliente, id_servicio, calificacion_cliente]);

    return result.insertId;
  }

  static async getClientKpis(year = new Date().getFullYear()) {
    const anio = Number(year);

    const porCalificacion = await run(`
      SELECT
        c.id_cliente,
        u.full_name AS cliente,
        COUNT(*) AS calificaciones,
        ROUND(AVG(c.calificacion_cliente), 2) AS promedio
      FROM calificaciones_cliente c
      JOIN user u ON u.user_id = c.id_cliente
      JOIN quotes q ON q.id_quotes = c.id_quotes
      WHERE YEAR(q.date_time) = ?
      GROUP BY c.id_cliente, u.full_name
      ORDER BY promedio DESC, calificaciones DESC, cliente ASC
    `, [anio]);

    const porServicios = await run(`
      SELECT
        q.user_id AS id_cliente,
        u.full_name AS cliente,
        COUNT(*) AS servicios
      FROM quotes q
      JOIN user u ON u.user_id = q.user_id
      WHERE q.state_quotes = 'finalizada'
        AND YEAR(q.date_time) = ?
      GROUP BY q.user_id, u.full_name
      ORDER BY servicios DESC, cliente ASC
    `, [anio]);

    return {
      anio,
      por_calificacion: porCalificacion.map((fila) => ({
        id_cliente: fila.id_cliente,
        cliente: fila.cliente,
        calificaciones: Number(fila.calificaciones),
        promedio: comoNumero(fila.promedio),
      })),
      por_servicios: porServicios.map((fila) => ({
        id_cliente: fila.id_cliente,
        cliente: fila.cliente,
        servicios: Number(fila.servicios),
      })),
    };
  }
}

module.exports = Rating;
