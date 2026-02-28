const Redis = require('redis');
const logger = require('../utils/logger');
const promClient = require('prom-client');

// Metrics
const rateLimitCounter = new promClient.Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of rate limit violations',
  labelNames: ['type', 'identifier'],
});

const accountLockCounter = new promClient.Counter({
  name: 'account_locks_total',
  help: 'Total number of account locks',
  labelNames: ['reason'],
});

class AdvancedRateLimiter {
  constructor() {
    this.redisClient = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    
    this.redisClient.on('error', (err) => logger.error('Redis error:', err));
    this.redisClient.connect();

    // In-memory fallback if Redis fails
    this.memoryStore = new Map();
  }

  // Login rate limiter: 3 attempts per minute per student ID
  loginRateLimiter() {
    return async (req, res, next) => {
      const studentId = req.body?.student_id || req.body?.studentId;
      const ip = this.getClientIP(req);

      // If no student ID, skip rate limiting and let validator handle it
      if (!studentId) {
        logger.debug('No student_id in body, skipping rate limit check', { 
          body: req.body,
          bodyType: typeof req.body 
        });
        return next();
      }

      try {
        // Check if account is locked
        const isLocked = await this.isAccountLocked(studentId);
        if (isLocked) {
          const lockInfo = await this.getLockInfo(studentId);
          const remainingTime = Math.ceil((lockInfo.lockedUntil - Date.now()) / 1000);
          
          logger.warn(`Login attempt for locked account: ${studentId} from ${ip}`);
          rateLimitCounter.inc({ type: 'account_locked', identifier: studentId });
          
          return res.status(429).json({
            success: false,
            error: 'Account temporarily locked',
            message: `Too many failed login attempts. Account locked for ${remainingTime} more seconds.`,
            retryAfter: remainingTime,
            lockedUntil: new Date(lockInfo.lockedUntil).toISOString(),
          });
        }

        // Check rate limit per student ID
        const studentKey = `ratelimit:login:student:${studentId}`;
        const studentAttempts = await this.getAttempts(studentKey);

        if (studentAttempts >= 3) {
          logger.warn(`Login rate limit exceeded for student: ${studentId} from ${ip}`);
          rateLimitCounter.inc({ type: 'student_id', identifier: studentId });
          
          return res.status(429).json({
            success: false,
            error: 'Too many requests',
            message: 'Maximum 3 login attempts per minute. Please wait before trying again.',
            retryAfter: 60,
          });
        }

        // Check rate limit per IP
        const ipKey = `ratelimit:login:ip:${ip}`;
        const ipAttempts = await this.getAttempts(ipKey);

        if (ipAttempts >= 10) {
          logger.warn(`Login rate limit exceeded for IP: ${ip}`);
          rateLimitCounter.inc({ type: 'ip', identifier: ip });
          
          return res.status(429).json({
            success: false,
            error: 'Too many requests',
            message: 'Too many login attempts from your IP. Please wait before trying again.',
            retryAfter: 60,
          });
        }

        // Increment counters
        await this.incrementAttempts(studentKey, 60); // 1 minute TTL
        await this.incrementAttempts(ipKey, 60);

        // Store attempt info for failure tracking
        req.rateLimitInfo = {
          studentId,
          ip,
          studentAttempts: studentAttempts + 1,
          ipAttempts: ipAttempts + 1,
        };

        next();
      } catch (error) {
        logger.error('Rate limiter error:', error);
        // Fail open - allow request if rate limiter fails
        next();
      }
    };
  }

  // Track failed login attempts and lock account if needed
  async trackFailedLogin(studentId, ip) {
    try {
      const failureKey = `login:failures:${studentId}`;
      const failures = await this.getAttempts(failureKey);
      const newFailures = failures + 1;

      // Increment failure counter (5 minute window)
      await this.incrementAttempts(failureKey, 300);

      logger.warn(`Failed login attempt ${newFailures} for ${studentId} from ${ip}`);

      // Lock account after 5 failed attempts
      if (newFailures >= 5) {
        await this.lockAccount(studentId, 'repeated_failures');
        logger.warn(`Account locked due to repeated failures: ${studentId}`);
        accountLockCounter.inc({ reason: 'repeated_failures' });
        
        return {
          locked: true,
          attempts: newFailures,
          message: 'Account locked due to too many failed login attempts',
        };
      }

      return {
        locked: false,
        attempts: newFailures,
        remainingAttempts: 5 - newFailures,
      };
    } catch (error) {
      logger.error('Error tracking failed login:', error);
      return { locked: false, attempts: 0 };
    }
  }

  // Clear failed login attempts on successful login
  async clearFailedAttempts(studentId) {
    try {
      const failureKey = `login:failures:${studentId}`;
      await this.redisClient.del(failureKey);
      logger.info(`Cleared failed login attempts for ${studentId}`);
    } catch (error) {
      logger.error('Error clearing failed attempts:', error);
    }
  }

  // Lock account
  async lockAccount(studentId, reason) {
    try {
      const lockKey = `account:locked:${studentId}`;
      const lockDuration = 10 * 60; // 10 minutes
      const lockData = {
        lockedAt: Date.now(),
        lockedUntil: Date.now() + (lockDuration * 1000),
        reason,
      };

      await this.redisClient.setEx(lockKey, lockDuration, JSON.stringify(lockData));
      logger.warn(`Account locked: ${studentId} for ${lockDuration}s due to ${reason}`);
    } catch (error) {
      logger.error('Error locking account:', error);
    }
  }

  // Check if account is locked
  async isAccountLocked(studentId) {
    try {
      const lockKey = `account:locked:${studentId}`;
      const lockData = await this.redisClient.get(lockKey);
      return lockData !== null;
    } catch (error) {
      logger.error('Error checking account lock:', error);
      return false;
    }
  }

  // Get lock information
  async getLockInfo(studentId) {
    try {
      const lockKey = `account:locked:${studentId}`;
      const lockData = await this.redisClient.get(lockKey);
      return lockData ? JSON.parse(lockData) : null;
    } catch (error) {
      logger.error('Error getting lock info:', error);
      return null;
    }
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

  // Order rate limiter: 10 orders per minute per student
  orderRateLimiter() {
    return async (req, res, next) => {
      const studentId = req.user?.studentId;
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

  // Get statistics
  async getStats() {
    try {
      const keys = await this.redisClient.keys('ratelimit:*');
      const lockedKeys = await this.redisClient.keys('account:locked:*');
      
      return {
        activeRateLimits: keys.length,
        lockedAccounts: lockedKeys.length,
        memoryStoreSize: this.memoryStore.size,
      };
    } catch (error) {
      logger.error('Error getting stats:', error);
      return {
        activeRateLimits: 0,
        lockedAccounts: 0,
        memoryStoreSize: this.memoryStore.size,
      };
    }
  }
}

module.exports = new AdvancedRateLimiter();
