const db = require('../config/db');
const { createTransporter, getMailConfig } = require('../config/mailer');

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatFechaCita(value) {
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

class Quote {
  // 🔹 Verificar disponibilidad del barbero
  static async checkAvailability(barberId, startTime, endTime) {
    const query = `
      SELECT * FROM quotes
      WHERE barber_id = ? 
        AND (date_time BETWEEN ? AND ? OR end_time BETWEEN ? AND ?)
    `;

    const result = await new Promise((resolve, reject) => {
      db.query(query, [barberId, startTime, endTime, startTime, endTime], (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });

    return result.length === 0;
  }

  // 🔹 Obtener duración estimada del servicio
  static async getServiceDuration(serviceId) {
    const [result] = await new Promise((resolve, reject) => {
      db.query('SELECT estimated_time FROM services WHERE id_services = ?', [serviceId], (err, results) => {
        if (err || results.length === 0) return reject(err || 'No se encontró el servicio');
        resolve(results);
      });
    });

    const [hours, minutes] = result.estimated_time.split(':').map(Number);
    return (hours * 60) + minutes;
  }

  // 🔹 Crear nueva cita
  static async create(userId, barberId, dateTime, stateQuotes, serviceId) {
    const estimatedMinutes = await this.getServiceDuration(serviceId);
    const startTime = new Date(dateTime);
    const endTime = new Date(startTime.getTime() + estimatedMinutes * 60000);

    const isAvailable = await this.checkAvailability(barberId, startTime, endTime);
    if (!isAvailable) {
      throw new Error('El barbero ya tiene una cita en ese horario');
    }

    const result = await new Promise((resolve, reject) => {
      db.query(
        `INSERT INTO quotes (user_id, barber_id, date_time, end_time, state_quotes, id_services)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, barberId, startTime, endTime, stateQuotes, serviceId],
        (err, results) => {
          if (err) reject(err);
          resolve(results);
        }
      );
    });

    return {
      id: result.insertId,
      end_time: endTime
    };
  }

  // 🔹 Obtener citas por barbero y mes
  static async getByBarberAndMonth(barberId, year, month) {
    const query = `
      SELECT id_quotes, date_time, end_time
      FROM quotes
      WHERE barber_id = ? 
        AND YEAR(date_time) = ? 
        AND MONTH(date_time) = ?
    `;

    const results = await new Promise((resolve, reject) => {
      db.query(query, [barberId, year, month], (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });

    return results.map(cita => ({
      id: cita.id_quotes,
      date_time: cita.date_time,
      end_time: cita.end_time,
      duration: (new Date(cita.end_time) - new Date(cita.date_time)) / 60000
    }));
  }

  // 🔹 Obtener citas con detalles de servicio
  static async getWithServiceDetails(userId = null, barberId = null, isAdmin = false) {
    let query = `
      SELECT 
        q.id_quotes,
        q.date_time,
        q.state_quotes,
        q.id_services,
        s.name_service,
        s.price,
        s.estimated_time,
        q.barber_id,
        q.user_id,
        barberos.full_name AS barber_name,
        clientes.full_name AS client_name,
        clientes.document_number AS client_document,
        CASE WHEN cal.id_calificacion IS NULL THEN 0 ELSE 1 END AS calificada,
        CASE WHEN cc.id_calificacion_cliente IS NULL THEN 0 ELSE 1 END AS calificada_cliente
      FROM quotes q
      JOIN services s ON q.id_services = s.id_services
      LEFT JOIN user barberos ON q.barber_id = barberos.user_id
      LEFT JOIN user clientes ON q.user_id = clientes.user_id
      LEFT JOIN calificaciones cal ON cal.id_quotes = q.id_quotes
      LEFT JOIN calificaciones_cliente cc ON cc.id_quotes = q.id_quotes
    `;

    const params = [];

    if (!isAdmin && (userId || barberId)) {
      query += ' WHERE (q.user_id = ? OR q.barber_id = ?)';
      params.push(userId || barberId, barberId || userId);
    }

    query += ' ORDER BY q.date_time DESC';

    const results = await new Promise((resolve, reject) => {
      db.query(query, params, (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });

    return results;
  }

  // 🔹 Obtener citas por barbero y fecha
  static async getByBarberAndDate(barberId, date) {
    const startOfDay = `${date} 00:00:00`;  // Asegúrate de que `date` es string
    const endOfDay = `${date} 23:59:59`;


    const query = `
      SELECT id_quotes, date_time, end_time
      FROM quotes
      WHERE barber_id = ?
        AND date_time BETWEEN ? AND ?
    `;

    const results = await new Promise((resolve, reject) => {
      db.query(query, [barberId, startOfDay, endOfDay], (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });

    return results;cd
  }

  // 🔹 Actualizar estado de la cita
  static async updateStatus(quoteId, status) {
    const result = await new Promise((resolve, reject) => {
      db.query(
        'UPDATE quotes SET state_quotes = ? WHERE id_quotes = ?',
        [status, quoteId],
        (err, results) => {
          if (err) reject(err);
          resolve(results);
        }
      );
    });

    return result.affectedRows > 0;
  }

  static async findDetailedById(quoteId) {
    const results = await query(`
      SELECT
        q.id_quotes,
        q.date_time,
        q.state_quotes,
        q.user_id,
        q.barber_id,
        q.id_services,
        s.name_service,
        barberos.full_name AS barber_name,
        clientes.full_name AS client_name,
        clientes.user_email AS client_email
      FROM quotes q
      JOIN services s ON q.id_services = s.id_services
      LEFT JOIN user barberos ON q.barber_id = barberos.user_id
      LEFT JOIN user clientes ON q.user_id = clientes.user_id
      WHERE q.id_quotes = ?
    `, [quoteId]);

    return results[0] || null;
  }

static async sendConfirmationEmail(email, servicio, fecha, hora, total, barbero) {
  try {
    const { user: emailUser } = getMailConfig();
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Mystical Cut" <${emailUser}>`,
      to: email,
      subject: 'Confirmación de tu cita - MysticalCut',
      html: `
        <h2>💥💈Gracias por confiar en MysticalCut💈💥</h2>
        <h2>💈Aquí tienes el resumen de tu cita 😉💈</h2>
        <p><strong>Servicio:</strong> ${servicio}</p>
        <p><strong>Barbero:</strong> ${barbero}</p>
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Hora:</strong> ${hora}</p>
        <p><strong>Total:</strong> $${total}</p>
        <br>
        <p>💈Te brindamos estilo y confianza en cada corte💈</p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('📧 Correo enviado:', info.response);

    return true;

  } catch (error) {
    console.error('❌ Error en sendConfirmationEmail:', error);
    throw error;
  }
}

  static async sendSatisfactionEmail(quote) {
    if (!quote.client_email) {
      throw new Error('El cliente no tiene correo registrado.');
    }

    const { user: emailUser, pass } = getMailConfig();
    if (!emailUser || !pass) {
      throw new Error('El envío de correos no está configurado.');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const enlace = `${frontendUrl}/Calificar/${quote.id_quotes}?origen=correo`;
    const cliente = escapeHtml(quote.client_name || 'cliente');
    const servicio = escapeHtml(quote.name_service || 'tu servicio');
    const barbero = escapeHtml(quote.barber_name || 'tu barbero');
    const fecha = escapeHtml(formatFechaCita(quote.date_time));
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"Mystical Cut" <${emailUser}>`,
      to: quote.client_email,
      subject: '¿Cómo fue tu servicio? - MysticalCut',
      html: `
        <div style="font-family: Arial, sans-serif; background:#111111; color:#f4e7c4; padding:28px;">
          <h2 style="margin:0 0 12px;">Tu servicio en MysticalCut ya terminó</h2>
          <p>Hola ${cliente}, queremos conocer tu experiencia. Son dos preguntas, de 1 a 5 estrellas.</p>
          <p><strong>Servicio:</strong> ${servicio}<br>
             <strong>Barbero:</strong> ${barbero}<br>
             <strong>Fecha:</strong> ${fecha}</p>
          <p>1. En un rango de 1 a 5 estrellas, donde 1 es muy malo y 5 es muy bueno, califica la calidad del servicio prestado.</p>
          <p>2. En un rango de 1 a 5 estrellas, donde 1 es muy malo y 5 es muy bueno, califica la calidad de la barbería en general.</p>
          <p style="margin:24px 0;">
            <a href="${enlace}" style="background:#ccaf54; color:#111111; text-decoration:none; padding:12px 18px; border-radius:8px; font-weight:bold;">
              Responder encuesta
            </a>
          </p>
          <p style="color:#bdbdbd;">También puedes calificarla al ingresar al sistema. La encuesta queda ligada a esta cita.</p>
        </div>
      `,
    });

    return true;
  }

// 🔹 Nuevo método: Obtener citas con detalles filtradas por rango de fechas
  static async getQuotesForReports(startDate, endDate) {
    const query = `
      SELECT
        q.id_quotes,
        q.date_time,
        q.end_time,
        q.state_quotes,
        q.barber_id,
        q.user_id,
        s.name_service,
        s.price,
        s.estimated_time,
        barberos.full_name AS barber_name,
        clientes.full_name AS client_name,
        cal.calificacion_servicio
      FROM quotes q
      JOIN services s ON q.id_services = s.id_services
      LEFT JOIN user barberos ON q.barber_id = barberos.user_id
      LEFT JOIN user clientes ON q.user_id = clientes.user_id
      LEFT JOIN calificaciones cal ON cal.id_quotes = q.id_quotes
      WHERE DATE(q.date_time) BETWEEN ? AND ?
      ORDER BY q.date_time ASC;
    `;

    const results = await new Promise((resolve, reject) => {
      db.query(query, [startDate, endDate], (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
    return results;
  }


}

module.exports = Quote;