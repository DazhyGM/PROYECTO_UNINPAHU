const express = require('express');
const authenticate = require('../middlewares/authenticate');
const assistantController = require('../controllers/assistantController');

const router = express.Router();

router.post('/entender', authenticate, assistantController.entender);

module.exports = router;
