const db = require('../config/db');  

// 🔹 Crear producto
exports.createProduct = (productData) => {
    const { name, price, description, amount, id_category, image, comprobante } = productData;
    const query = 'INSERT INTO product (name, price, description, amount, id_category, image, comprobante) VALUES (?, ?, ?, ?, ?, ?, ?)';
    return new Promise((resolve, reject) => {
        db.query(query, [name, price, description, amount, id_category, image, comprobante || null], (err, result) => {
            if (err) return reject(err);
            resolve({ id: result.insertId, name, price, description, amount, id_category, image, comprobante: comprobante || null });
        });
    });
};


// 🔹 Obtener todos los productos
exports.getAllProducts = () => {
    const query = 'SELECT * FROM product WHERE id_status != 3'; // Solo productos activos y bloqueados
    return new Promise((resolve, reject) => {
        db.query(query, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

// 🔹 Obtener producto por ID
exports.getProductById = (id) => {
    const query = 'SELECT * FROM product WHERE id_product = ?';
    return new Promise((resolve, reject) => {
        db.query(query, [id], (err, results) => {
            if (err) return reject(err);
            if (results.length === 0) return reject(new Error('Producto no encontrado'));
            resolve(results[0]);
        });
    });
};

// 🔹 Actualizar producto
exports.updateProduct = (id_product, productData) => {
    const { name, price, description, amount, id_category, image, comprobante } = productData;
    const query = `
        UPDATE product 
        SET name = ?, price = ?, description = ?, amount = ?, id_category = ?, image = ?, comprobante = ?
        WHERE id_product = ?
    `;
    return new Promise((resolve, reject) => {
        db.query(query, [name, price, description, amount, id_category, image, comprobante || null, id_product], (err, result) => {
            if (err) return reject(err);
            resolve({ id_product, name, price, description, amount, id_category, image, comprobante: comprobante || null });
        });
    });
};


// 🔹 Actualizar estado del producto
exports.updateProductStatus = (id_product, id_status) => {
    const query = 'UPDATE product SET id_status = ? WHERE id_product = ?';
    return new Promise((resolve, reject) => {
        db.query(query, [id_status, id_product], (err, result) => {
            if (err) return reject(err);
            if (result.affectedRows === 0) return reject(new Error('Producto no encontrado'));
            resolve(result);
        });
    });
};  

// 🔹 Obtener productos por estado
exports.getInactiveProducts = () => {
  const query = 'SELECT * FROM product WHERE id_status = 3';
  return new Promise((resolve, reject) => {
    db.query(query, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });   
};



