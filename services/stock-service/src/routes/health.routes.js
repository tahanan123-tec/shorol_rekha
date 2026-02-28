const express = require('express');
const { testConnection } = require('../config/database');
const { register } = require('../utils/metrics');

const router = express.Router();

/**
 * GET /
 * Service information
 */
router.get('/', (req, res) => {
  res.status(200).json({
    service: 'stock-service',
    version: '1.0.0',
    description: 'Stock Service - Manages inventory with optimistic locking',
    endpoints: {
      health: '/health',
      ready: '/ready',
      metrics: '/metrics',
      stock: '/stock',
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
    service: 'stock-service',
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

  // RabbitMQ check is passive (connection established at startup)
  dependencies.rabbitmq = 'connected';

  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    ready: isReady,
    service: 'stock-service',
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
