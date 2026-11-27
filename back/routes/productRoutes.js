const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const insumoController = require('../controllers/insumoController');
const authenticate = require('../middlewares/authenticate');
const upload = require('../middlewares/upload');

const subirImagen = (req, res, next) => {
  upload.single('image')(req, res, (error) => {
    if (!error) return next();
    const mensaje = error.code === 'LIMIT_FILE_SIZE'
      ? 'La imagen no puede superar 5 MB.'
      : (error.message || 'No se pudo subir la imagen.');
    res.status(400).json({ error: mensaje });
  });
};

/**
 * @swagger
 * tags:
 *   name: Productos
 *   description: Endpoints para la gestión de productos
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Obtener todos los productos
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de productos
 */
router.get('/', authenticate, productController.getProducts);
router.get('/asignaciones/mias', authenticate, insumoController.miDotacion);
router.get('/asignaciones/:barberoId', authenticate, insumoController.verAsignacion);
router.put('/asignaciones/:barberoId', authenticate, insumoController.guardarAsignacion);
router.post('/consumo', authenticate, insumoController.registrarConsumo);

/**
 * @swagger
 * /api/products/inactive:
 *   get:
 *     summary: Obtener productos inactivos
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de productos inactivos
 */
router.get('/inactives', authenticate, productController.getInactiveProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Obtener un producto por ID
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Producto obtenido
 */
router.get('/:id', authenticate, productController.getProductById);



/**
 * @swagger
 * /api/products/create:
 *   post:
 *     summary: Registrar un nuevo producto con imagen
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - amount
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               amount:
 *                 type: integer
 *               id_category:
 *                 type: integer
 *               id_status:
 *                 type: integer
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Producto creado
 */
router.post('/create', authenticate, subirImagen, productController.createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Actualizar un producto (puede incluir imagen nueva)
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               amount:
 *                 type: integer
 *               id_category:
 *                 type: integer
 *               id_status:
 *                 type: integer
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Producto actualizado
 */
router.put('/:id', authenticate, subirImagen, productController.updateProduct);

/**
 * @swagger
 * /api/products/status/{id}:
 *   put:
 *     summary: Cambiar estado de un producto
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado del producto actualizado
 */
router.put('/status/:id', authenticate, productController.updateProductStatus);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Eliminar producto (lógica suave)
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Producto marcado como eliminado
 */
router.delete('/:id', authenticate, productController.deleteProduct);




module.exports = router;
