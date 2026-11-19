const db = require('../config/db');

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (err, results) => {
    if (err) return reject(err);
    resolve(results);
  });
});

let tableReady;

const ensureTable = () => {
  if (!tableReady) {
    tableReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS barber_schedule (
          id INT NOT NULL AUTO_INCREMENT,
          barber_id INT NOT NULL,
          day_of_week TINYINT NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY unique_barber_day (barber_id, day_of_week),
          KEY idx_barber_schedule_barber (barber_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);

      const breakColumn = await query("SHOW COLUMNS FROM barber_schedule LIKE 'break_start'");
      if (!breakColumn.length) {
        await query(`
          ALTER TABLE barber_schedule
          ADD COLUMN break_start TIME NULL AFTER end_time,
          ADD COLUMN break_end TIME NULL AFTER break_start
        `);
      }

      await query(`
        INSERT INTO barber_schedule (barber_id, day_of_week, start_time, end_time)
        SELECT u.user_id, d.day_of_week, '08:00:00', '20:00:00'
        FROM user u
        JOIN (
          SELECT 1 AS day_of_week UNION ALL
          SELECT 2 UNION ALL
          SELECT 3 UNION ALL
          SELECT 4 UNION ALL
          SELECT 5 UNION ALL
          SELECT 6
        ) d
        WHERE u.role_fk = 2
          AND NOT EXISTS (
            SELECT 1 FROM barber_schedule bs WHERE bs.barber_id = u.user_id
          )
      `);
    })().catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  return tableReady;
};

const normalizeTime = (value) => {
  const match = String(value || '').trim().match(/^(\d{2}):(\d{2})/);
  if (!match) {
    throw new Error('Cada horario debe tener una hora de inicio y una hora de fin válidas.');
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    throw new Error('Cada horario debe tener una hora de inicio y una hora de fin válidas.');
  }
  return `${match[1]}:${match[2]}:00`;
};

const validateSchedules = (schedules) => {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    throw new Error('Asigna al menos un día de atención para el barbero.');
  }

  const seen = new Set();
  return schedules.map((item) => {
    const day = Number(item.day_of_week);
    if (!Number.isInteger(day) || day < 0 || day > 6 || seen.has(day)) {
      throw new Error('Los días del horario no son válidos.');
    }
    seen.add(day);

    const start = normalizeTime(item.start_time);
    const end = normalizeTime(item.end_time);
    if (start >= end) {
      throw new Error('La hora de fin debe ser posterior a la hora de inicio.');
    }

    const hasBreak = item.break_start != null && String(item.break_start).trim() !== '';
    const hasBreakEnd = item.break_end != null && String(item.break_end).trim() !== '';
    if (hasBreak !== hasBreakEnd) {
      throw new Error('El descanso debe tener hora de inicio y hora de fin.');
    }

    let breakStart = null;
    let breakEnd = null;
    if (hasBreak) {
      breakStart = normalizeTime(item.break_start);
      breakEnd = normalizeTime(item.break_end);
      if (!(start < breakStart && breakStart < breakEnd && breakEnd < end)) {
        throw new Error('El descanso debe quedar dentro de la jornada, después de abrir y antes de cerrar.');
      }
    }

    return {
      day_of_week: day,
      start_time: start,
      end_time: end,
      break_start: breakStart,
      break_end: breakEnd
    };
  });
};

const getByBarber = async (barberId) => {
  await ensureTable();
  return query(
    `SELECT day_of_week, start_time, end_time, break_start, break_end
     FROM barber_schedule
     WHERE barber_id = ?
     ORDER BY day_of_week`,
    [barberId]
  );
};

const getByBarberAndDay = async (barberId, dayOfWeek) => {
  await ensureTable();
  const rows = await query(
    `SELECT day_of_week, start_time, end_time, break_start, break_end
     FROM barber_schedule
     WHERE barber_id = ? AND day_of_week = ?
     LIMIT 1`,
    [barberId, dayOfWeek]
  );
  return rows[0] || null;
};

const saveForBarber = async (barberId, schedules) => {
  const rows = validateSchedules(schedules);
  await ensureTable();
  await query('DELETE FROM barber_schedule WHERE barber_id = ?', [barberId]);
  for (const row of rows) {
    await query(
      `INSERT INTO barber_schedule (barber_id, day_of_week, start_time, end_time, break_start, break_end)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [barberId, row.day_of_week, row.start_time, row.end_time, row.break_start, row.break_end]
    );
  }
  return rows;
};

const deleteForBarber = async (barberId) => {
  await ensureTable();
  await query('DELETE FROM barber_schedule WHERE barber_id = ?', [barberId]);
};

module.exports = {
  ensureTable,
  validateSchedules,
  getByBarber,
  getByBarberAndDay,
  saveForBarber,
  deleteForBarber
};
