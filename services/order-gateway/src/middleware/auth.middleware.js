const authService = require('../services/auth.service');
const logger = require('../utils/logger');

/**
 * Middleware to validate JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Debug logging
    logger.info('Auth middleware called', {
      hasAuthHeader: !!authHeader,
      authHeaderPreview: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
      headers: Object.keys(req.headers),
      path: req.path,
      method: req.method
    });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Auth header missing or invalid', {
        authHeader: authHeader ? authHeader.substring(0, 30) : 'none'
      });
      return res.status(401).json({
        success: false,
        error: 'Authorization header missing or invalid',
      });
    }

    const token = authHeader.substring(7);

    // Validate token with Identity Provider
    logger.info('Validating token with identity provider');
    const user = await authService.validateToken(token);
    logger.info('Token validated successfully', { userId: user.user_id });

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    logger.warn('Authentication failed', { error: error.message, stack: error.stack });
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

module.exports = { authenticate };
