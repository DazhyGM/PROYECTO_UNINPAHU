const db = require('../config/db');

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)));
  });
}

function fallo(mensaje, status) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function itemsValidos(items) {
  if (!Array.isArray(items)) return [];
  const vistos = new Set();
  return items.map((item) => {
    const idProducto = Number(item.id_product);
    const cantidad = Number(item.cantidad);
    if (!Number.isInteger(idProducto) || idProducto <= 0 || !Number.isInteger(cantidad) || cantidad < 0) {
      throw fallo('Cada insumo debe tener una cantidad entera igual o mayor a cero.', 400);
    }
    if (vistos.has(idProducto)) throw fallo('Hay un insumo repetido en el registro.', 400);
    vistos.add(idProducto);
    return { id_product: idProducto, cantidad };
  });
}

async function miDotacion(barberoId) {
  return query(
    `SELECT d.id_product, d.cantidad, p.name, p.description, p.amount AS stock, p.image,
            c.cantidad AS consumido_hoy
     FROM dotacion d
     JOIN product p ON p.id_product = d.id_product
     LEFT JOIN consumo_insumo c
       ON c.id_product = d.id_product AND c.id_barbero = d.id_barbero AND c.fecha = CURDATE()
     WHERE d.id_barbero = ? AND p.id_status <> 3
     ORDER BY p.name`,
    [barberoId]
  );
}

async function asignacionDe(barberoId) {
  const empleados = await query(
    'SELECT user_id, full_name FROM user WHERE user_id = ? AND role_fk = 2 AND userStatus_fk = 1',
    [barberoId]
  );
  if (!empleados.length) throw fallo('Ese empleado no está activo.', 404);

  const insumos = await query(
    `SELECT p.id_product, p.name, p.amount AS stock,
            COALESCE(mia.cantidad, 0) AS cantidad,
            COALESCE(otros.total, 0) AS asignado_otros
     FROM product p
     LEFT JOIN dotacion mia ON mia.id_product = p.id_product AND mia.id_barbero = ?
     LEFT JOIN (
       SELECT id_product, SUM(cantidad) AS total
       FROM dotacion
       WHERE id_barbero <> ?
       GROUP BY id_product
     ) otros ON otros.id_product = p.id_product
     WHERE p.id_status = 1
     ORDER BY p.name`,
    [barberoId, barberoId]
  );

  return { empleado: empleados[0], insumos };
}

async function guardarAsignacion(barberoId, items) {
  const limpios = itemsValidos(items).filter((item) => item.cantidad > 0);
  const empleados = await query(
    'SELECT user_id FROM user WHERE user_id = ? AND role_fk = 2 AND userStatus_fk = 1',
    [barberoId]
  );
  if (!empleados.length) throw fallo('Solo se pueden asignar insumos a un empleado activo.', 400);

  await query('START TRANSACTION');
  try {
    for (const item of limpios) {
      const productos = await query(
        'SELECT name, amount, id_status FROM product WHERE id_product = ? FOR UPDATE',
        [item.id_product]
      );
      if (!productos.length || Number(productos[0].id_status) !== 1) {
        throw fallo('Solo se pueden asignar insumos activos.', 400);
      }
      const otros = await query(
        'SELECT COALESCE(SUM(cantidad), 0) AS total FROM dotacion WHERE id_product = ? AND id_barbero <> ?',
        [item.id_product, barberoId]
      );
      const ocupado = Number(otros[0].total);
      if (ocupado + item.cantidad > Number(productos[0].amount)) {
        const libre = Math.max(Number(productos[0].amount) - ocupado, 0);
        throw fallo(
          `${productos[0].name}: hay ${productos[0].amount} en inventario y ${ocupado} ya están asignados a otros empleados. Puedes asignar hasta ${libre}.`,
          400
        );
      }
    }

    await query('DELETE FROM dotacion WHERE id_barbero = ?', [barberoId]);
    for (const item of limpios) {
      await query(
        'INSERT INTO dotacion (id_product, id_barbero, cantidad) VALUES (?, ?, ?)',
        [item.id_product, barberoId, item.cantidad]
      );
    }
    await query('COMMIT');
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
  return asignacionDe(barberoId);
}

async function registrarConsumo(barberoId, items) {
  const limpios = itemsValidos(items);
  if (!limpios.length) throw fallo('Indica los insumos que vas a reportar.', 400);

  await query('START TRANSACTION');
  try {
    const registrados = [];
    for (const item of limpios) {
      const filas = await query(
        `SELECT d.cantidad AS asignada, p.amount AS stock, p.name
         FROM dotacion d
         JOIN product p ON p.id_product = d.id_product
         WHERE d.id_barbero = ? AND d.id_product = ? AND p.id_status <> 3
         FOR UPDATE`,
        [barberoId, item.id_product]
      );
      if (!filas.length) throw fallo('Ese insumo no está asignado a tu turno.', 400);
      const fila = filas[0];
      const previos = await query(
        'SELECT id_consumo FROM consumo_insumo WHERE id_barbero = ? AND id_product = ? AND fecha = CURDATE() FOR UPDATE',
        [barberoId, item.id_product]
      );
      if (previos.length) throw fallo(`Ya registraste el consumo de ${fila.name} hoy.`, 409);
      if (item.cantidad > Number(fila.asignada)) {
        throw fallo(`${fila.name}: no puedes reportar más de las ${fila.asignada} unidades asignadas.`, 400);
      }
      if (item.cantidad > Number(fila.stock)) {
        throw fallo(`${fila.name}: en inventario solo hay ${fila.stock}.`, 400);
      }

      if (item.cantidad > 0) {
        await query(
          `UPDATE product
           SET id_status = IF(amount - ? <= 0, 2, id_status),
               amount = amount - ?
           WHERE id_product = ? AND amount >= ?`,
          [item.cantidad, item.cantidad, item.id_product, item.cantidad]
        );
        await query(
          'UPDATE dotacion SET cantidad = cantidad - ? WHERE id_barbero = ? AND id_product = ?',
          [item.cantidad, barberoId, item.id_product]
        );
      }
      await query(
        'INSERT INTO consumo_insumo (id_product, id_barbero, cantidad, fecha) VALUES (?, ?, ?, CURDATE())',
        [item.id_product, barberoId, item.cantidad]
      );
      registrados.push({ id_product: item.id_product, name: fila.name, cantidad: item.cantidad });
    }
    await query('COMMIT');
    return registrados;
  } catch (error) {
    await query('ROLLBACK');
    if (error.code === 'ER_DUP_ENTRY') throw fallo('Ya registraste el consumo de ese insumo hoy.', 409);
    throw error;
  }
}

module.exports = { miDotacion, asignacionDe, guardarAsignacion, registrarConsumo };
