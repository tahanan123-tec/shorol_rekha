const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const { rateLimitHitsTotal } = require('../utils/metrics');

/**
 * Rate limiter middleware using Redis
 * Limits login attempts to 3 per minute per student ID
 */
const loginRateLimiter = async (req, res, next) => {
  const { student_id } = req.body;

  if (!student_id) {
    return res.status(400).json({
      success: false,
      error: 'student_id is required',
    });
  }

  const redisClient = getRedisClient();
  const key = `rate_limit:login:${student_id}`;
  const maxAttempts = parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '3', 10);
  const windowSeconds = parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW || '60', 10);

  try {
    // Get current attempt count
    const attempts = await redisClient.get(key);
    const currentAttempts = attempts ? parseInt(attempts, 10) : 0;

    if (currentAttempts >= maxAttempts) {
      const ttl = await redisClient.ttl(key);
      
      rateLimitHitsTotal.inc({ student_id });
      
      logger.warn('Rate limit exceeded', {
        student_id,
        attempts: currentAttempts,
        ttl,
      });

      return res.status(429).json({
        success: false,
        error: 'Too many login attempts. Please try again later.',
        retry_after: ttl,
      });
    }

    // Increment attempt count
    const multi = redisClient.multi();
    multi.incr(key);
    
    // Set expiry only on first attempt
    if (currentAttempts === 0) {
      multi.expire(key, windowSeconds);
    }
    
    await multi.exec();

    // Add rate limit info to response headers
    res.setHeader('X-RateLimit-Limit', maxAttempts);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxAttempts - currentAttempts - 1));
    res.setHeader('X-RateLimit-Reset', Date.now() + (windowSeconds * 1000));

    next();
  } catch (error) {
    logger.error('Rate limiter error', { error: error.message, student_id });
    // Fail open - allow request if Redis is down
    next();
  }
};

/**
 * General API rate limiter
 * Limits requests to 100 per minute per IP
 */
const apiRateLimiter = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const redisClient = getRedisClient();
  const key = `rate_limit:api:${ip}`;
  const maxRequests = parseInt(process.env.API_RATE_LIMIT_MAX || '100', 10);
  const windowSeconds = 60;

  try {
    const requests = await redisClient.get(key);
    const currentRequests = requests ? parseInt(requests, 10) : 0;

    if (currentRequests >= maxRequests) {
      const ttl = await redisClient.ttl(key);
      
      logger.warn('API rate limit exceeded', { ip, requests: currentRequests });

      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retry_after: ttl,
      });
    }

    const multi = redisClient.multi();
    multi.incr(key);
    
    if (currentRequests === 0) {
      multi.expire(key, windowSeconds);
    }
    
    await multi.exec();

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - currentRequests - 1));

    next();
  } catch (error) {
    logger.error('API rate limiter error', { error: error.message, ip });
    next();
  }
};

module.exports = {
  loginRateLimiter,
  apiRateLimiter,
};
