const db = require('../config/db');

const ServiceModel = {
  getPopularServices: (limit, callback) => {
    const query = `
      SELECT
        s.id_services,
        s.name_service,
        s.description,
        s.price,
        s.image,
        cs.name AS category_name,
        COUNT(q.id_quotes) AS total_citas
      FROM services s
      INNER JOIN category_services cs ON s.id_category_services = cs.id_category_services
      LEFT JOIN quotes q
        ON q.id_services = s.id_services
        AND q.state_quotes <> 'cancelada'
      WHERE s.id_status = 1
      GROUP BY s.id_services, s.name_service, s.description, s.price, s.image, cs.name
      ORDER BY total_citas DESC, s.name_service ASC
      LIMIT ?
    `;
    db.query(query, [limit], callback);
  },

  getAllActiveServices: (callback) => {
    const query = `
      SELECT 
        s.id_services, 
        s.name_service, 
        s.description, 
        s.estimated_time, 
        s.price, 
        s.id_category_services, 
        cs.name AS category_name,
        s.id_status,
        s.image,
        ss.name_status
      FROM services s
      INNER JOIN category_services cs ON s.id_category_services = cs.id_category_services
      INNER JOIN service_status ss ON s.id_status = ss.id_status
      WHERE s.id_status = 1
    `;
    db.query(query, callback);
  },

  getServiceById: (id, callback) => {
    db.query('SELECT * FROM services WHERE id_services = ?', [id], callback);
  },

  createService: (data, callback) => {
    const query = `
      INSERT INTO services 
      (name_service, description, estimated_time, price, id_category_services, id_status, image) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(query, data, callback);
  },

  updateService: (query, params, callback) => {
    db.query(query, params, callback);
  },

  deleteService: (id, callback) => {
    db.query('UPDATE services SET id_status = 2 WHERE id_services = ?', [id], callback);
  },

  getInactiveServices: (callback) => {
    const query = `
      SELECT 
        s.id_services, 
        s.name_service, 
        s.description, 
        s.estimated_time, 
        s.price, 
        s.id_category_services, 
        cs.name AS category_name,
        s.id_status,
        ss.name_status
      FROM services s
      INNER JOIN category_services cs ON s.id_category_services = cs.id_category_services
      INNER JOIN service_status ss ON s.id_status = ss.id_status
      WHERE s.id_status = 2
    `;
    db.query(query, callback);
  },

  activateService: (id, callback) => {
    db.query('UPDATE services SET id_status = 1 WHERE id_services = ?', [id], callback);
  }
};

module.exports = ServiceModel;
