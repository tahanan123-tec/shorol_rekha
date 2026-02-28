const express = require('express');
const { pool, testConnection } = require('../config/database');
const { getRedisClient } = require('../config/redis');
const { register } = require('../utils/metrics');

const router = express.Router();

/**
 * GET /
 * Service information
 */
router.get('/', (req, res) => {
  res.status(200).json({
    service: 'identity-provider',
    version: '1.0.0',
    description: 'Identity Provider - Authentication and authorization service',
    endpoints: {
      health: '/health',
      ready: '/ready',
      metrics: '/metrics',
      auth: '/auth',
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
    service: 'identity-provider',
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

  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    ready: isReady,
    service: 'identity-provider',
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
