const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const authenticateToken = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Calificaciones
 *   description: Encuesta de satisfacción ligada a cada cita finalizada
 */

/**
 * @swagger
 * /api/ratings/pending:
 *   get:
 *     summary: Citas finalizadas del cliente que aún no tienen calificación
 *     tags: [Calificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Encuestas pendientes
 */
router.get('/pending', authenticateToken, ratingController.pending);

router.get('/barberos', authenticateToken, ratingController.barberos);

/**
 * @swagger
 * /api/ratings/metrics:
 *   get:
 *     summary: Promedios de calidad para el administrador
 *     tags: [Calificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas de servicio y barbería
 *       403:
 *         description: Solo el administrador puede verlas
 */
router.get('/metrics', authenticateToken, ratingController.metrics);

/**
 * @swagger
 * /api/ratings/quote/{id}:
 *   get:
 *     summary: Datos de la encuesta de una cita
 *     tags: [Calificaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cita lista para calificar o ya calificada
 *       403:
 *         description: La cita no pertenece al cliente
 *       404:
 *         description: Cita no encontrada
 */
router.get('/quote/:id', authenticateToken, ratingController.quote);

/**
 * @swagger
 * /api/ratings:
 *   post:
 *     summary: Guardar la calificación de una cita finalizada
 *     tags: [Calificaciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_quotes:
 *                 type: integer
 *               calificacion_servicio:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               calificacion_barberia:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       201:
 *         description: Calificación registrada
 *       409:
 *         description: La cita ya fue calificada
 */
router.post('/', authenticateToken, ratingController.create);

/**
 * @swagger
 * /api/ratings/cliente:
 *   post:
 *     summary: El barbero califica al cliente de una cita finalizada
 *     tags: [Calificaciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_quotes:
 *                 type: integer
 *               calificacion_cliente:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       201:
 *         description: Calificación del cliente registrada
 *       403:
 *         description: Solo el barbero de la cita puede calificarla
 */
router.post('/cliente', authenticateToken, ratingController.createClientRating);

module.exports = router;
