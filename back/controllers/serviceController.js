const fs = require('fs');
const path = require('path');
const ServiceModel = require('../models/serviceModel');

// Obtener todos los servicios activos
exports.getAllServices = (req, res) => {
  ServiceModel.getAllActiveServices((err, results) => {
    if (err) {
      console.error('Error al obtener los servicios:', err);
      return res.status(500).json({ error: 'Error al obtener los servicios' });
    }
    res.json(results);
  });
};

// Obtener un servicio por ID
exports.getServiceById = (req, res) => {
  const { id } = req.params;
  ServiceModel.getServiceById(id, (err, result) => {
    if (err) {
      console.error('Error al obtener el servicio:', err);
      return res.status(500).json({ message: 'Error al obtener el servicio' });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    res.json(result[0]);
  });
};

// Crear nuevo servicio
exports.createService = (req, res) => {
  const { name_service, description, estimated_time, price, id_category_services, id_status } = req.body;
  const image = req.file ? req.file.filename : null;

  const data = [name_service, description, estimated_time, price, id_category_services, id_status, image];

  ServiceModel.createService(data, (err) => {
    if (err) {
      console.error('Error al crear el servicio:', err);
      return res.status(500).json({ message: 'Error al crear el servicio' });
    }
    res.status(201).json({ message: 'Servicio creado correctamente' });
  });
};

// Actualizar servicio
exports.updateService = (req, res) => {
  const { id } = req.params;
  const { name_service, description, estimated_time, price, id_category_services, id_status } = req.body;
  const newImage = req.file ? req.file.filename : null;

  // 1. Primero consultamos el servicio actual para obtener la imagen anterior
  ServiceModel.getServiceById(id, (err, results) => {
    if (err) {
      console.error('Error al buscar el servicio:', err);
      return res.status(500).json({ message: 'Error al actualizar el servicio' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    const currentService = results[0];
    const oldImage = currentService.image;

    // 2. Construimos la consulta de actualización dinámica
    let query = `
      UPDATE services 
      SET name_service = ?, description = ?, estimated_time = ?, price = ?, 
          id_category_services = ?, id_status = ?
    `;
    const params = [name_service, description, estimated_time, price, id_category_services, id_status];

    if (newImage) {
      query += `, image = ?`;
      params.push(newImage);
    }

    query += ` WHERE id_services = ?`;
    params.push(id);

    // 3. Ejecutamos la actualización en la BD
    ServiceModel.updateService(query, params, (err) => {
      if (err) {
        console.error('Error al actualizar el servicio:', err);
        return res.status(500).json({ message: 'Error al actualizar el servicio' });
      }

      // 4. Si se subió una nueva imagen y existía una anterior, eliminamos la vieja de la carpeta física
      if (newImage && oldImage) {

        // Construimos la ruta exacta: Subimos de 'controllers' a 'back', luego entramos a 'uploads'
        const imagePath = path.join(__dirname, '../uploads', oldImage);
        
        console.log('Ruta intentando borrar:', imagePath); // Para verificar en consola

        // Verificamos si el archivo realmente existe antes de llamar a fs.unlink
        if (fs.existsSync(imagePath)) {
          fs.unlink(imagePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error('No se pudo eliminar la imagen anterior del disco:', unlinkErr);
            } else {
              console.log('Imagen anterior eliminada correctamente del disco.');
            }
          });
        } else {
          console.log('El archivo no se encontró físicamente en la ruta especificada.');
        }
      }

      res.json({ message: 'Servicio actualizado correctamente' });
    });
  });
};

// Eliminar servicio (cambiar estado a inactivo)
exports.deleteService = (req, res) => {
  const { id } = req.params;
  ServiceModel.deleteService(id, (err, result) => {
    if (err) {
      console.error('Error al eliminar el servicio:', err);
      return res.status(500).json({ message: 'Error al eliminar el servicio' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    res.json({ message: 'Servicio eliminado (estado cambiado a inactivo)' });
  });
};

// Obtener servicios inactivos
exports.getInactiveServices = (req, res) => {
  ServiceModel.getInactiveServices((err, results) => {
    if (err) {
      console.error('Error al obtener los servicios inactivos:', err);
      return res.status(500).json({ error: 'Error al obtener los servicios inactivos' });
    }
    res.json(results);
  });
};

// Reactivar un servicio
exports.activateService = (req, res) => {
  const { id } = req.params;
  ServiceModel.activateService(id, (err, result) => {
    if (err) {
      console.error('Error al activar el servicio:', err);
      return res.status(500).json({ message: 'Error al activar el servicio' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    res.json({ message: 'Servicio activado correctamente' });
  });
};
