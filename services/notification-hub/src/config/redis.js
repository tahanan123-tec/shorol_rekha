const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let redisPubClient = null;
let redisSubClient = null;

/**
 * Connect to Redis for general use
 */
const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection limit exceeded');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });

    redisClient.on('connect', () => {
      logger.info('Redis connection established');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis', { error: error.message });
    throw error;
  }
};

/**
 * Create Redis pub/sub clients for Socket.IO adapter
 */
const createPubSubClients = async () => {
  try {
    // Publisher client
    redisPubClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisPubClient.on('error', (err) => {
      logger.error('Redis pub client error', { error: err.message });
    });

    await redisPubClient.connect();
    logger.info('Redis pub client connected');

    // Subscriber client
    redisSubClient = redisPubClient.duplicate();

    redisSubClient.on('error', (err) => {
      logger.error('Redis sub client error', { error: err.message });
    });

    await redisSubClient.connect();
    logger.info('Redis sub client connected');

    return { pubClient: redisPubClient, subClient: redisSubClient };
  } catch (error) {
    logger.error('Failed to create pub/sub clients', { error: error.message });
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

const closeRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis client closed');
    }
    if (redisPubClient) {
      await redisPubClient.quit();
      logger.info('Redis pub client closed');
    }
    if (redisSubClient) {
      await redisSubClient.quit();
      logger.info('Redis sub client closed');
    }
  } catch (error) {
    logger.error('Error closing Redis connections', { error: error.message });
  }
};

module.exports = {
  connectRedis,
  createPubSubClients,
  getRedisClient,
  closeRedis,
};
