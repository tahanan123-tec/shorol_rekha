const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Service-to-service authentication
// Internal services use special JWT tokens to communicate

const SERVICE_SECRET = process.env.SERVICE_SECRET || 'change-me-in-production-service-secret';

const ALLOWED_SERVICES = [
  'identity-provider',
  'order-gateway',
  'stock-service',
  'kitchen-queue',
  'notification-hub',
  'admin-dashboard',
  'predictive-scaler',
];

class ServiceAuthMiddleware {
  // Generate service token
  generateServiceToken(serviceName) {
    if (!ALLOWED_SERVICES.includes(serviceName)) {
      throw new Error(`Invalid service name: ${serviceName}`);
    }

    return jwt.sign(
      {
        service: serviceName,
        type: 'service',
        iat: Math.floor(Date.now() / 1000),
      },
      SERVICE_SECRET,
      {
        expiresIn: '1h',
        issuer: 'cafeteria-system',
        audience: 'internal-services',
      }
    );
  }

  // Verify service token
  verifyServiceToken(token) {
    try {
      const decoded = jwt.verify(token, SERVICE_SECRET, {
        issuer: 'cafeteria-system',
        audience: 'internal-services',
      });

      if (decoded.type !== 'service') {
        throw new Error('Invalid token type');
      }

      if (!ALLOWED_SERVICES.includes(decoded.service)) {
        throw new Error('Unknown service');
      }

      return decoded;
    } catch (error) {
      logger.error('Service token verification failed:', error.message);
      throw error;
    }
  }

  // Middleware to require service authentication
  requireServiceAuth() {
    return (req, res, next) => {
      const token = req.headers['x-service-token'];

      if (!token) {
        logger.warn('Missing service token');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Service authentication required',
        });
      }

      try {
        const decoded = this.verifyServiceToken(token);
        req.serviceAuth = decoded;
        logger.debug(`Service request from: ${decoded.service}`);
        next();
      } catch (error) {
        logger.warn('Invalid service token:', error.message);
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Invalid service token',
        });
      }
    };
  }

  // Middleware to allow either user auth or service auth
  requireAuthOrServiceAuth(userAuthMiddleware) {
    return (req, res, next) => {
      const serviceToken = req.headers['x-service-token'];
      const userToken = req.headers.authorization;

      // Try service auth first
      if (serviceToken) {
        try {
          const decoded = this.verifyServiceToken(serviceToken);
          req.serviceAuth = decoded;
          return next();
        } catch (error) {
          // Fall through to user auth
        }
      }

      // Try user auth
      if (userToken) {
        return userAuthMiddleware(req, res, next);
      }

      // No valid auth
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    };
  }

  // Check if request is from specific service
  isFromService(serviceName) {
    return (req, res, next) => {
      if (!req.serviceAuth) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Service authentication required',
        });
      }

      if (req.serviceAuth.service !== serviceName) {
        logger.warn(`Unauthorized service access: ${req.serviceAuth.service} tried to access ${serviceName}-only endpoint`);
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Access denied for this service',
        });
      }

      next();
    };
  }
}

module.exports = new ServiceAuthMiddleware();
