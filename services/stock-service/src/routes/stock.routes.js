const express = require('express');
const stockController = require('../controllers/stock.controller');
const { validateInternalApiKey } = require('../middleware/auth.middleware');

const router = express.Router();

// Admin endpoint (must be before /stock/:itemId to avoid conflict)
router.get('/admin/stock', validateInternalApiKey, stockController.getAdminInventory);

// Public endpoints (read-only)
router.get('/stock/:itemId', stockController.getStock);
router.get('/stock', stockController.getAllStock);

// Internal endpoints (require API key)
router.post('/internal/stock/check', validateInternalApiKey, stockController.checkStock);
router.post('/internal/stock/reserve', validateInternalApiKey, stockController.reserveStock);
router.post('/internal/stock/release', validateInternalApiKey, stockController.releaseStock);

// Stock decrement endpoint
router.post('/stock/decrement', validateInternalApiKey, stockController.decrementStock);

module.exports = router;
