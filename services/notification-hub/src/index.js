require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const helmet = require('helmet');
const cors = require('cors');
const { connectRedis, createPubSubClients, closeRedis } = require('./config/redis');
const queueService = require('./services/queue.service');
const websocketService = require('./services/websocket.service');
const orderConsumer = require('./consumers/orderConsumer');
const stockConsumer = require('./consumers/stockConsumer');
const logger = require('./utils/logger');
const { httpRequestDuration, httpRequestTotal } = require('./utils/metrics');

// Routes
const healthRoutes = require('./routes/health.routes');

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3005;

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
  
  httpServer.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      await websocketService.close();
      logger.info('WebSocket server closed');
      
      await queueService.close();
      logger.info('RabbitMQ connection closed');
      
      await closeRedis();
      logger.info('Redis connections closed');
      
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
const startServer = async () => {
  try {
    // Connect to Redis
    logger.info('Connecting to Redis...');
    await connectRedis();
    
    // Create Redis pub/sub clients for Socket.IO adapter
    logger.info('Creating Redis pub/sub clients...');
    const { pubClient, subClient } = await createPubSubClients();
    
    // Initialize WebSocket server with Redis adapter
    logger.info('Initializing WebSocket server...');
    websocketService.initializeWebSocket(httpServer, pubClient, subClient);
    
    // Connect to RabbitMQ
    logger.info('Connecting to RabbitMQ...');
    await queueService.connect();
    await queueService.setupQueues();
    
    // Start event consumers
    logger.info('Starting event consumers...');
    await orderConsumer.startConsuming();
    await stockConsumer.startConsuming();
    
    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`Notification Hub started`, {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        websocketPath: '/notifications',
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
