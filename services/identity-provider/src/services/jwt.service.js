const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const jwtConfig = require('../config/jwt');
const logger = require('../utils/logger');
const { tokenGenerationDuration } = require('../utils/metrics');

/**
 * Generate access token
 * @param {Object} payload - Token payload
 * @returns {string} - JWT token
 */
const generateAccessToken = (payload) => {
  const end = tokenGenerationDuration.startTimer();
  
  try {
    const token = jwt.sign(
      {
        user_id: payload.user_id,
        student_id: payload.student_id,
        email: payload.email,
        type: 'access',
      },
      jwtConfig.privateKey,
      {
        algorithm: jwtConfig.algorithm,
        expiresIn: jwtConfig.accessTokenExpiry,
        issuer: jwtConfig.issuer,
        subject: payload.user_id.toString(),
      }
    );
    
    end();
    return token;
  } catch (error) {
    logger.error('Access token generation failed', { error: error.message });
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @returns {string} - JWT token
 */
const generateRefreshToken = (payload) => {
  try {
    const token = jwt.sign(
      {
        user_id: payload.user_id,
        type: 'refresh',
        jti: crypto.randomBytes(16).toString('hex'),
      },
      jwtConfig.privateKey,
      {
        algorithm: jwtConfig.algorithm,
        expiresIn: jwtConfig.refreshTokenExpiry,
        issuer: jwtConfig.issuer,
        subject: payload.user_id.toString(),
      }
    );
    
    return token;
  } catch (error) {
    logger.error('Refresh token generation failed', { error: error.message });
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Verify and decode token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, jwtConfig.publicKey, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
    });
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      logger.error('Token verification failed', { error: error.message });
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Token decoding failed', { error: error.message });
    return null;
  }
};

/**
 * Hash refresh token for storage
 * @param {string} token - Refresh token
 * @returns {string} - Hashed token
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  hashToken,
};
