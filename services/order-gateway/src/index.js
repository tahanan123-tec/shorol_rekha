require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { connectRedis, closeRedis } = require('./config/redis');
const { testConnection, initializeSchema } = require('./config/database');
const queueService = require('./services/queue.service');
const logger = require('./utils/logger');
const { httpRequestDuration, httpRequestTotal } = require('./utils/metrics');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const wafMiddleware = require('./middleware/waf.middleware');

// Routes
const orderRoutes = require('./routes/order.routes');
const healthRoutes = require('./routes/health.routes');

const app = express();
const PORT = process.env.PORT || 3002;

// Trust proxy (for correct IP in logs) - MUST be before other middleware
app.set('trust proxy', true);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors());
app.use(express.json({ limit: '1mb' })); // Reduced from 10mb for security
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// WAF Protection - Apply to all routes except health checks
app.use((req, res, next) => {
  if (req.path.startsWith('/health') || req.path.startsWith('/ready') || req.path.startsWith('/metrics')) {
    return next();
  }
  wafMiddleware.protect()(req, res, next);
});

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
      userAgent: req.get('user-agent'),
    });
  });
  
  next();
});

// Routes
app.use('/api', orderRoutes);
app.use('/', healthRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      await closeRedis();
      logger.info('Redis connection closed');
      
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
    // Connect to Redis
    logger.info('Connecting to Redis...');
    await connectRedis();
    
    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }
    
    // Initialize database schema
    logger.info('Initializing database schema...');
    await initializeSchema();
    
    // Connect to RabbitMQ
    logger.info('Connecting to RabbitMQ...');
    await queueService.connect();
    
    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`Order Gateway service started`, {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
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
