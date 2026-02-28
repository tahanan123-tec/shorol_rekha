const axios = require('axios');
const CircuitBreaker = require('opossum');
const config = require('../config/services');
const logger = require('../utils/logger');
const { externalServiceCallDuration, circuitBreakerStateGauge } = require('../utils/metrics');

/**
 * Validate JWT token with Identity Provider
 */
const validateTokenInternal = async (token) => {
  const start = Date.now();
  
  try {
    const response = await axios.get(
      `${config.identityProvider.url}/auth/validate`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: config.identityProvider.timeout,
      }
    );

    const duration = (Date.now() - start) / 1000;
    externalServiceCallDuration.observe(
      { service: 'identity-provider', endpoint: '/auth/validate', status: 'success' },
      duration
    );

    if (response.data.success && response.data.data.valid) {
      return response.data.data.user;
    }

    throw new Error('Token validation failed');
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    externalServiceCallDuration.observe(
      { service: 'identity-provider', endpoint: '/auth/validate', status: 'error' },
      duration
    );

    logger.error('Token validation failed', {
      error: error.message,
      status: error.response?.status,
    });
    throw error;
  }
};

// Create circuit breaker for token validation
const circuitBreakerOptions = {
  timeout: config.circuitBreaker.timeout,
  errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
  resetTimeout: config.circuitBreaker.resetTimeout,
};

const tokenValidationBreaker = new CircuitBreaker(validateTokenInternal, circuitBreakerOptions);

// Monitor circuit breaker state
tokenValidationBreaker.on('open', () => {
  logger.warn('Circuit breaker opened for token validation');
  circuitBreakerStateGauge.set({ service: 'identity-provider' }, 1);
});

tokenValidationBreaker.on('halfOpen', () => {
  logger.info('Circuit breaker half-open for token validation');
  circuitBreakerStateGauge.set({ service: 'identity-provider' }, 2);
});

tokenValidationBreaker.on('close', () => {
  logger.info('Circuit breaker closed for token validation');
  circuitBreakerStateGauge.set({ service: 'identity-provider' }, 0);
});

/**
 * Validate token with circuit breaker
 */
const validateToken = async (token) => {
  try {
    return await tokenValidationBreaker.fire(token);
  } catch (error) {
    if (error.message === 'Breaker is open') {
      throw new Error('Identity service temporarily unavailable');
    }
    throw error;
  }
};

module.exports = {
  validateToken,
};
