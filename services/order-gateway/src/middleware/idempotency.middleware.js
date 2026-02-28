const { v4: uuidv4 } = require('uuid');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const { idempotencyCheckTotal } = require('../utils/metrics');

/**
 * Middleware to handle idempotency
 * Prevents duplicate order submissions
 */
const idempotency = async (req, res, next) => {
  try {
    // Get or generate idempotency key
    let idempotencyKey = req.headers['idempotency-key'];
    
    if (!idempotencyKey) {
      // Generate a new key if not provided
      idempotencyKey = uuidv4();
      logger.warn('Idempotency key not provided, generated new one', { idempotencyKey });
    }

    req.idempotencyKey = idempotencyKey;

    const redisClient = getRedisClient();
    const cacheKey = `idempotency:${idempotencyKey}`;

    // Check if this request was already processed
    const cachedResponse = await redisClient.get(cacheKey);

    if (cachedResponse) {
      idempotencyCheckTotal.inc({ result: 'duplicate' });
      
      logger.info('Duplicate request detected', { idempotencyKey });
      
      const response = JSON.parse(cachedResponse);
      return res.status(response.statusCode || 200).json(response.body);
    }

    idempotencyCheckTotal.inc({ result: 'new' });

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    
    res.json = function (body) {
      // Cache the response for 24 hours
      const responseToCache = {
        statusCode: res.statusCode,
        body,
      };
      
      redisClient.setEx(cacheKey, 86400, JSON.stringify(responseToCache))
        .catch(err => {
          logger.error('Failed to cache idempotency response', { 
            error: err.message, 
            idempotencyKey 
          });
        });

      return originalJson(body);
    };

    next();
  } catch (error) {
    logger.error('Idempotency middleware error', { error: error.message });
    // Fail open - continue without idempotency check
    next();
  }
};

module.exports = { idempotency };
