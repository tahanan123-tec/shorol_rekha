const axios = require('axios');
const CircuitBreaker = require('opossum');
const config = require('../config/services');
const cacheService = require('./cache.service');
const logger = require('../utils/logger');
const { externalServiceCallDuration, circuitBreakerStateGauge, stockCheckDuration } = require('../utils/metrics');

/**
 * Check stock availability with Stock Service
 */
const checkStockInternal = async (items) => {
  const start = Date.now();
  
  try {
    const response = await axios.post(
      `${config.stockService.url}/api/internal/stock/check`,
      { items },
      {
        timeout: config.stockService.timeout,
        headers: {
          'X-Internal-API-Key': process.env.INTERNAL_API_KEY || 'dev-key',
        },
      }
    );

    const duration = (Date.now() - start) / 1000;
    externalServiceCallDuration.observe(
      { service: 'stock-service', endpoint: '/stock/check', status: 'success' },
      duration
    );

    return response.data;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    externalServiceCallDuration.observe(
      { service: 'stock-service', endpoint: '/stock/check', status: 'error' },
      duration
    );

    logger.error('Stock check failed', {
      error: error.message,
      status: error.response?.status,
    });
    throw error;
  }
};

/**
 * Reserve stock with Stock Service
 */
const reserveStockInternal = async (orderId, items) => {
  const start = Date.now();
  
  try {
    const response = await axios.post(
      `${config.stockService.url}/api/internal/stock/reserve`,
      { order_id: orderId, items },
      {
        timeout: config.stockService.timeout,
        headers: {
          'X-Internal-API-Key': process.env.INTERNAL_API_KEY || 'dev-key',
        },
      }
    );

    const duration = (Date.now() - start) / 1000;
    externalServiceCallDuration.observe(
      { service: 'stock-service', endpoint: '/stock/reserve', status: 'success' },
      duration
    );

    return response.data;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    externalServiceCallDuration.observe(
      { service: 'stock-service', endpoint: '/stock/reserve', status: 'error' },
      duration
    );

    logger.error('Stock reservation failed', {
      error: error.message,
      status: error.response?.status,
      orderId,
    });
    throw error;
  }
};

// Create circuit breakers
const circuitBreakerOptions = {
  timeout: config.circuitBreaker.timeout,
  errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
  resetTimeout: config.circuitBreaker.resetTimeout,
};

const stockCheckBreaker = new CircuitBreaker(checkStockInternal, circuitBreakerOptions);
const stockReserveBreaker = new CircuitBreaker(reserveStockInternal, circuitBreakerOptions);

// Monitor circuit breaker states
stockCheckBreaker.on('open', () => {
  logger.warn('Circuit breaker opened for stock check');
  circuitBreakerStateGauge.set({ service: 'stock-service-check' }, 1);
});

stockCheckBreaker.on('close', () => {
  logger.info('Circuit breaker closed for stock check');
  circuitBreakerStateGauge.set({ service: 'stock-service-check' }, 0);
});

stockReserveBreaker.on('open', () => {
  logger.warn('Circuit breaker opened for stock reserve');
  circuitBreakerStateGauge.set({ service: 'stock-service-reserve' }, 1);
});

stockReserveBreaker.on('close', () => {
  logger.info('Circuit breaker closed for stock reserve');
  circuitBreakerStateGauge.set({ service: 'stock-service-reserve' }, 0);
});

/**
 * Check stock with cache and circuit breaker
 */
const checkStock = async (items) => {
  const end = stockCheckDuration.startTimer();
  
  try {
    // Check cache first for each item
    const cachedResults = await Promise.all(
      items.map(async (item) => {
        const cached = await cacheService.getStock(item.id);
        return { itemId: item.id, cached, requested: item.quantity };
      })
    );

    // Identify items with cache hits
    const allCached = cachedResults.every(r => r.cached !== null);
    
    if (allCached) {
      // All items in cache - fast path
      const available = cachedResults.every(r => r.cached.quantity >= r.requested);
      
      if (!available) {
        const unavailable = cachedResults
          .filter(r => r.cached.quantity < r.requested)
          .map(r => ({ id: r.itemId, available: r.cached.quantity, requested: r.requested }));
        
        logger.info('Stock check failed (cache)', { unavailable });
        return { available: false, unavailable };
      }
      
      logger.info('Stock check passed (cache)', { items: items.length });
      return { available: true };
    }

    // Cache miss - call Stock Service with circuit breaker
    const result = await stockCheckBreaker.fire(items);
    
    // Cache the results
    if (result.data && result.data.items) {
      await Promise.all(
        result.data.items.map(item =>
          cacheService.setStock(item.id, { quantity: item.available_quantity })
        )
      );
    }

    return result.data;
  } catch (error) {
    if (error.message === 'Breaker is open') {
      logger.error('Stock service circuit breaker open');
      throw new Error('Stock service temporarily unavailable');
    }
    throw error;
  } finally {
    end();
  }
};

/**
 * Reserve stock with circuit breaker and retry
 */
const reserveStock = async (orderId, items, retryCount = 0) => {
  try {
    const result = await stockReserveBreaker.fire(orderId, items);
    
    // Invalidate cache for reserved items
    const itemIds = items.map(item => item.id);
    await cacheService.invalidateStock(itemIds);
    
    return result.data;
  } catch (error) {
    if (error.message === 'Breaker is open') {
      throw new Error('Stock service temporarily unavailable');
    }

    // Retry logic for retryable errors
    const isRetryable = config.retry.retryableStatusCodes.includes(error.response?.status);
    
    if (isRetryable && retryCount < config.retry.maxRetries) {
      const delay = config.retry.retryDelay * Math.pow(2, retryCount); // Exponential backoff
      
      logger.warn('Retrying stock reservation', { 
        orderId, 
        attempt: retryCount + 1, 
        delay 
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return reserveStock(orderId, items, retryCount + 1);
    }

    throw error;
  }
};

/**
 * Get item prices from Stock Service
 */
const getItemPricesInternal = async (itemIds) => {
  const start = Date.now();
  
  try {
    // Fetch menu items to get prices
    const response = await axios.get(
      `${config.stockService.url}/api/menu`,
      {
        timeout: config.stockService.timeout,
        headers: {
          'X-Internal-API-Key': process.env.INTERNAL_API_KEY || 'dev-key',
        },
      }
    );

    const duration = (Date.now() - start) / 1000;
    externalServiceCallDuration.observe(
      { service: 'stock-service', endpoint: '/menu', status: 'success' },
      duration
    );

    // Extract prices for requested items
    const priceMap = {};
    if (response.data.success && response.data.data?.items) {
      response.data.data.items.forEach(item => {
        if (itemIds.includes(String(item.id))) {
          priceMap[String(item.id)] = parseFloat(item.price);
        }
      });
    }

    return priceMap;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    externalServiceCallDuration.observe(
      { service: 'stock-service', endpoint: '/menu', status: 'error' },
      duration
    );

    logger.error('Failed to fetch item prices', {
      error: error.message,
      status: error.response?.status,
    });
    throw error;
  }
};

/**
 * Get item prices with circuit breaker
 */
const getItemPrices = async (itemIds) => {
  try {
    return await getItemPricesInternal(itemIds);
  } catch (error) {
    logger.error('Get item prices failed', { error: error.message });
    // Return empty map on failure - caller will use fallback
    return {};
  }
};

/**
 * Get menu items from Stock Service
 */
const getMenuItems = async () => {
  try {
    const response = await axios.get(
      `${config.stockService.url}/api/menu`,
      {
        timeout: config.stockService.timeout,
        headers: {
          'X-Internal-API-Key': process.env.INTERNAL_API_KEY || 'dev-key',
        },
      }
    );

    if (response.data.success && response.data.data?.items) {
      return response.data.data.items;
    }
    
    return [];
  } catch (error) {
    logger.error('Failed to fetch menu items', {
      error: error.message,
      status: error.response?.status,
    });
    throw error;
  }
};

/**
 * Release reserved stock (compensating transaction)
 */
const releaseStock = async (orderId, items) => {
  const start = Date.now();
  
  try {
    const response = await axios.post(
      `${config.stockService.url}/api/internal/stock/release`,
      { order_id: orderId, items },
      {
        timeout: config.stockService.timeout,
        headers: {
          'X-Internal-API-Key': process.env.INTERNAL_API_KEY || 'dev-key',
        },
      }
    );

    const duration = (Date.now() - start) / 1000;
    externalServiceCallDuration.observe(
      { service: 'stock-service', endpoint: '/stock/release', status: 'success' },
      duration
    );

    logger.info('Stock released successfully', { orderId, items: items.length });
    return response.data;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    externalServiceCallDuration.observe(
      { service: 'stock-service', endpoint: '/stock/release', status: 'error' },
      duration
    );

    logger.error('Stock release failed', {
      error: error.message,
      status: error.response?.status,
      orderId,
    });
    
    // Don't throw - this is a compensating transaction
    return { success: false, error: error.message };
  }
};

module.exports = {
  checkStock,
  reserveStock,
  releaseStock,
  getItemPrices,
  getMenuItems,
};
