const authService = require('../services/auth.service');
const logger = require('../utils/logger');

/**
 * Middleware to validate JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header missing or invalid',
      });
    }

    const token = authHeader.substring(7);

    // Validate token with Identity Provider
    const user = await authService.validateToken(token);

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    logger.warn('Authentication failed', { error: error.message });
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

module.exports = { authenticate };
