const Redis = require('redis');
const logger = require('../utils/logger');
const promClient = require('prom-client');

// Metrics
const rateLimitCounter = new promClient.Counter({
  name: 'order_rate_limit_exceeded_total',
  help: 'Total number of order rate limit violations',
  labelNames: ['type', 'identifier'],
});

class OrderRateLimiter {
  constructor() {
    this.redisClient = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    
    this.redisClient.on('error', (err) => logger.error('Redis error:', err));
    this.redisClient.connect();

    // In-memory fallback if Redis fails
    this.memoryStore = new Map();
  }

  // Order rate limiter: 10 orders per minute per student
  orderRateLimiter() {
    return async (req, res, next) => {
      const studentId = req.user?.student_id;
      const ip = this.getClientIP(req);

      if (!studentId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      try {
        // Check rate limit per student ID
        const studentKey = `ratelimit:order:student:${studentId}`;
        const studentOrders = await this.getAttempts(studentKey);

        if (studentOrders >= 10) {
          logger.warn(`Order rate limit exceeded for student: ${studentId} from ${ip}`);
          rateLimitCounter.inc({ type: 'order_student', identifier: studentId });
          
          return res.status(429).json({
            success: false,
            error: 'Too many requests',
            message: 'Maximum 10 orders per minute. Please wait before placing another order.',
            retryAfter: 60,
          });
        }

        // Check rate limit per IP (prevent distributed attacks)
        const ipKey = `ratelimit:order:ip:${ip}`;
        const ipOrders = await this.getAttempts(ipKey);

        if (ipOrders >= 50) {
          logger.warn(`Order rate limit exceeded for IP: ${ip}`);
          rateLimitCounter.inc({ type: 'order_ip', identifier: ip });
          
          return res.status(429).json({
            success: false,
            error: 'Too many requests',
            message: 'Too many orders from your IP. Please wait before trying again.',
            retryAfter: 60,
          });
        }

        // Increment counters
        await this.incrementAttempts(studentKey, 60); // 1 minute TTL
        await this.incrementAttempts(ipKey, 60);

        next();
      } catch (error) {
        logger.error('Order rate limiter error:', error);
        // Fail open
        next();
      }
    };
  }

  // Get attempt count
  async getAttempts(key) {
    try {
      const count = await this.redisClient.get(key);
      return count ? parseInt(count) : 0;
    } catch (error) {
      logger.error('Error getting attempts:', error);
      // Fallback to memory store
      return this.memoryStore.get(key) || 0;
    }
  }

  // Increment attempt count
  async incrementAttempts(key, ttl) {
    try {
      const current = await this.redisClient.get(key);
      if (current) {
        await this.redisClient.incr(key);
      } else {
        await this.redisClient.setEx(key, ttl, '1');
      }
    } catch (error) {
      logger.error('Error incrementing attempts:', error);
      // Fallback to memory store
      const current = this.memoryStore.get(key) || 0;
      this.memoryStore.set(key, current + 1);
      setTimeout(() => this.memoryStore.delete(key), ttl * 1000);
    }
  }

  // Get client IP
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }
}

module.exports = new OrderRateLimiter();
