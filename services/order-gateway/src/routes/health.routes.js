const express = require('express');
const { testConnection } = require('../config/database');
const { getRedisClient } = require('../config/redis');
const { register } = require('../utils/metrics');

const router = express.Router();

/**
 * GET /
 * Service information
 */
router.get('/', (req, res) => {
  res.status(200).json({
    service: 'order-gateway',
    version: '1.0.0',
    description: 'Order Gateway - Main API for order management',
    endpoints: {
      health: '/health',
      ready: '/ready',
      metrics: '/metrics',
      orders: '/orders',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health
 * Basic health check
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'order-gateway',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /ready
 * Readiness check with dependency status
 */
router.get('/ready', async (req, res) => {
  const dependencies = {
    database: 'unknown',
    redis: 'unknown',
    identityProvider: 'unknown',
    stockService: 'unknown',
    rabbitmq: 'unknown',
  };

  let isReady = true;

  // Check database
  try {
    await testConnection();
    dependencies.database = 'connected';
  } catch (error) {
    dependencies.database = 'disconnected';
    isReady = false;
  }

  // Check Redis
  try {
    const redisClient = getRedisClient();
    await redisClient.ping();
    dependencies.redis = 'connected';
  } catch (error) {
    dependencies.redis = 'disconnected';
    isReady = false;
  }

  // Note: We don't check external services in readiness probe
  // as they may be temporarily unavailable (circuit breaker handles this)

  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    ready: isReady,
    service: 'order-gateway',
    dependencies,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

module.exports = router;
