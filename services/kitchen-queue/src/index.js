require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { testConnection } = require('./config/database');
const queueService = require('./services/queue.service');
const orderConsumer = require('./workers/orderConsumer');
const logger = require('./utils/logger');
const { httpRequestDuration, httpRequestTotal } = require('./utils/metrics');

// Routes
const healthRoutes = require('./routes/health.routes');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging and metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );
    
    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });
    
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration.toFixed(3)}s`,
      ip: req.ip,
    });
  });
  
  next();
});

// Routes
app.use('/', healthRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown`);
  
  // Stop accepting new messages
  await orderConsumer.shutdown();
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      await queueService.close();
      logger.info('RabbitMQ connection closed');
      
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Initialize and start server
let server;

const startServer = async () => {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.warn('Database connection failed, continuing without DB');
    }
    
    // Connect to RabbitMQ
    logger.info('Connecting to RabbitMQ...');
    await queueService.connect();
    
    // Start order consumer
    logger.info('Starting order consumer...');
    await orderConsumer.startConsuming();
    
    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`Kitchen Queue service started`, {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        prefetchCount: process.env.WORKER_PREFETCH || 10,
        cookingTime: `${process.env.COOKING_MIN_TIME || 3000}-${process.env.COOKING_MAX_TIME || 7000}ms`,
      });
    });
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;
