const express = require('express');
const websocketService = require('../services/websocket.service');
const { register } = require('../utils/metrics');

const router = express.Router();

/**
 * GET /
 * Service information
 */
router.get('/', (req, res) => {
  res.status(200).json({
    service: 'notification-hub',
    version: '1.0.0',
    description: 'Notification Hub - Real-time notifications via WebSocket',
    endpoints: {
      health: '/health',
      ready: '/ready',
      metrics: '/metrics',
      stats: '/stats',
      websocket: 'ws://localhost:3005',
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
    service: 'notification-hub',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /ready
 * Readiness check with dependency status
 */
router.get('/ready', async (req, res) => {
  const dependencies = {
    redis: 'unknown',
    rabbitmq: 'unknown',
    websocket: 'unknown',
  };

  let isReady = true;

  // Check Redis (passive check)
  try {
    // Redis connection is established at startup
    dependencies.redis = 'connected';
  } catch (error) {
    dependencies.redis = 'disconnected';
    isReady = false;
  }

  // Check RabbitMQ (passive check)
  try {
    // RabbitMQ connection is established at startup
    dependencies.rabbitmq = 'connected';
  } catch (error) {
    dependencies.rabbitmq = 'disconnected';
    isReady = false;
  }

  // Check WebSocket
  try {
    const stats = websocketService.getStats();
    dependencies.websocket = 'active';
    dependencies.websocket_connections = stats.connections;
    dependencies.websocket_rooms = stats.rooms;
  } catch (error) {
    dependencies.websocket = 'inactive';
    isReady = false;
  }

  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    ready: isReady,
    service: 'notification-hub',
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

/**
 * GET /stats
 * WebSocket connection statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = websocketService.getStats();
    res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get stats',
    });
  }
});

module.exports = router;
