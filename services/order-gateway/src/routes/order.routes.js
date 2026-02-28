const express = require('express');
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { idempotency } = require('../middleware/idempotency.middleware');
const { validate } = require('../middleware/validator');
const orderRateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create order (with idempotency and rate limiting: 10 per minute per student, 50 per minute per IP)
router.post('/order', orderRateLimiter.orderRateLimiter(), idempotency, validate('createOrder'), orderController.createOrder);

// Get order status
router.get('/order/status/:id', orderController.getOrderStatus);

// Get user orders
router.get('/orders', orderController.getUserOrders);

module.exports = router;
