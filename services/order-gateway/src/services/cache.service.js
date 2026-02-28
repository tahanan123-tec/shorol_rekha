const { getRedisClient } = require('../config/redis');
const config = require('../config/services');
const logger = require('../utils/logger');
const { cacheHitTotal, cacheMissTotal } = require('../utils/metrics');

/**
 * Get cached data
 */
const get = async (key, cacheType = 'general') => {
  try {
    const redisClient = getRedisClient();
    const value = await redisClient.get(key);

    if (value) {
      cacheHitTotal.inc({ cache_type: cacheType });
      logger.debug('Cache hit', { key, cacheType });
      return JSON.parse(value);
    }

    cacheMissTotal.inc({ cache_type: cacheType });
    logger.debug('Cache miss', { key, cacheType });
    return null;
  } catch (error) {
    logger.error('Cache get error', { error: error.message, key });
    return null;
  }
};

/**
 * Set cached data with TTL
 */
const set = async (key, value, ttl, cacheType = 'general') => {
  try {
    const redisClient = getRedisClient();
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    logger.debug('Cache set', { key, ttl, cacheType });
    return true;
  } catch (error) {
    logger.error('Cache set error', { error: error.message, key });
    return false;
  }
};

/**
 * Delete cached data
 */
const del = async (key) => {
  try {
    const redisClient = getRedisClient();
    await redisClient.del(key);
    logger.debug('Cache deleted', { key });
    return true;
  } catch (error) {
    logger.error('Cache delete error', { error: error.message, key });
    return false;
  }
};

/**
 * Get stock from cache
 */
const getStock = async (itemId) => {
  const key = `stock:${itemId}`;
  return await get(key, 'stock');
};

/**
 * Set stock in cache
 */
const setStock = async (itemId, stockData) => {
  const key = `stock:${itemId}`;
  return await set(key, stockData, config.cache.ttl.stock, 'stock');
};

/**
 * Get order from cache
 */
const getOrder = async (orderId) => {
  const key = `order:${orderId}`;
  return await get(key, 'order');
};

/**
 * Set order in cache
 */
const setOrder = async (orderId, orderData) => {
  const key = `order:${orderId}`;
  return await set(key, orderData, config.cache.ttl.order, 'order');
};

/**
 * Invalidate stock cache for multiple items
 */
const invalidateStock = async (itemIds) => {
  try {
    const redisClient = getRedisClient();
    const keys = itemIds.map(id => `stock:${id}`);
    
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info('Stock cache invalidated', { itemIds });
    }
    
    return true;
  } catch (error) {
    logger.error('Stock cache invalidation error', { error: error.message, itemIds });
    return false;
  }
};

module.exports = {
  get,
  set,
  del,
  getStock,
  setStock,
  getOrder,
  setOrder,
  invalidateStock,
};
