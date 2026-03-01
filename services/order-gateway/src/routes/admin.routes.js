const express = require('express');
const orderController = require('../controllers/order.controller');
const logger = require('../utils/logger');

const router = express.Router();

logger.info('[ADMIN ROUTES] Admin routes module loaded');

/**
 * Middleware to validate internal API key for admin routes
 */
const validateInternalApiKey = (req, res, next) => {
  logger.info('[ADMIN ROUTES] Validating internal API key', {
    path: req.path,
    headers: Object.keys(req.headers),
  });
  
  const apiKey = req.headers['x-internal-api-key'];
  const expectedApiKey = process.env.INTERNAL_API_KEY || 'internal-secret-key';

  if (!apiKey || apiKey !== expectedApiKey) {
    logger.warn('[ADMIN ROUTES] API key validation failed', {
      hasApiKey: !!apiKey,
      apiKeyMatch: apiKey === expectedApiKey,
    });
    return res.status(403).json({
      success: false,
      error: 'Invalid or missing internal API key',
    });
  }

  logger.info('[ADMIN ROUTES] API key validation passed');
  next();
};

// All admin routes require internal API key
router.use(validateInternalApiKey);

// Get all orders (Admin only)
router.get('/orders/all', orderController.getAllOrders);

// Update order status (Admin only)
router.put('/orders/:id/status', orderController.updateOrderStatus);

module.exports = router;
