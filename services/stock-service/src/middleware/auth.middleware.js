const logger = require('../utils/logger');

/**
 * Middleware to validate internal API key
 * Used for service-to-service communication
 */
const validateInternalApiKey = (req, res, next) => {
  const apiKey = req.headers['x-internal-api-key'];
  const expectedApiKey = process.env.INTERNAL_API_KEY || 'dev-key';

  if (!apiKey) {
    logger.warn('Internal API key missing', { path: req.path });
    return res.status(401).json({
      success: false,
      error: 'Internal API key required',
    });
  }

  if (apiKey !== expectedApiKey) {
    logger.warn('Invalid internal API key', { path: req.path });
    return res.status(403).json({
      success: false,
      error: 'Invalid API key',
    });
  }

  next();
};

module.exports = { validateInternalApiKey };
