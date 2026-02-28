const express = require('express');
const { testConnection } = require('../config/database');
const queueService = require('../services/queue.service');
const config = require('../config/rabbitmq');
const { register, queueDepthGauge } = require('../utils/metrics');

const router = express.Router();

/**
 * GET /
 * Service information
 */
router.get('/', (req, res) => {
  res.status(200).json({
    service: 'kitchen-queue',
    version: '1.0.0',
    description: 'Kitchen Queue Service - Processes orders from RabbitMQ',
    endpoints: {
      health: '/health',
      ready: '/ready',
      metrics: '/metrics',
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
    service: 'kitchen-queue',
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

  // Check RabbitMQ (passive check)
  try {
    const channel = queueService.getChannel();
    if (channel) {
      dependencies.rabbitmq = 'connected';
      
      // Update queue depth metrics
      const orderCreatedDepth = await queueService.getQueueDepth(config.queues.orderCreated);
      const deadLetterDepth = await queueService.getQueueDepth(config.queues.deadLetter);
      
      queueDepthGauge.set({ queue: 'order.created' }, orderCreatedDepth);
      queueDepthGauge.set({ queue: 'dead_letter' }, deadLetterDepth);
    } else {
      dependencies.rabbitmq = 'disconnected';
      isReady = false;
    }
  } catch (error) {
    dependencies.rabbitmq = 'disconnected';
    isReady = false;
  }

  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    ready: isReady,
    service: 'kitchen-queue',
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
    // Update queue depth before returning metrics
    try {
      const orderCreatedDepth = await queueService.getQueueDepth(config.queues.orderCreated);
      const deadLetterDepth = await queueService.getQueueDepth(config.queues.deadLetter);
      
      queueDepthGauge.set({ queue: 'order.created' }, orderCreatedDepth);
      queueDepthGauge.set({ queue: 'dead_letter' }, deadLetterDepth);
    } catch (error) {
      // Ignore queue depth errors
    }

    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

module.exports = router;
