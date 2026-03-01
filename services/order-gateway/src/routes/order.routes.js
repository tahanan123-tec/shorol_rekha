const express = require('express');
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { idempotency } = require('../middleware/idempotency.middleware');
const { validate } = require('../middleware/validator');
const orderRateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// Create order (with idempotency and rate limiting: 10 per minute per student, 50 per minute per IP)
router.post('/order', authenticate, orderRateLimiter.orderRateLimiter(), idempotency, validate('createOrder'), orderController.createOrder);

// Get order status
router.get('/order/status/:id', authenticate, orderController.getOrderStatus);

// Get user orders
router.get('/orders', authenticate, orderController.getUserOrders);

module.exports = router;
