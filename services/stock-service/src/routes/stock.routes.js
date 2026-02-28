const express = require('express');
const stockController = require('../controllers/stock.controller');
const { validateInternalApiKey } = require('../middleware/auth.middleware');

const router = express.Router();

// Public endpoints (read-only)
router.get('/stock/:itemId', stockController.getStock);
router.get('/stock', stockController.getAllStock);

// Internal endpoints (require API key)
router.post('/internal/stock/check', validateInternalApiKey, stockController.checkStock);
router.post('/internal/stock/reserve', validateInternalApiKey, stockController.reserveStock);

// Stock decrement endpoint
router.post('/stock/decrement', validateInternalApiKey, stockController.decrementStock);

module.exports = router;
