const authService = require('../services/auth.service');
const logger = require('../utils/logger');
const advancedRateLimiter = require('../middleware/advancedRateLimiter');

/**
 * POST /auth/register
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
    const { student_id, email, password, full_name } = req.validatedBody;

    const user = await authService.register({
      student_id,
      email,
      password,
      full_name,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user,
    });
  } catch (error) {
    if (error.message.includes('already registered')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

/**
 * POST /auth/login
 * Login user and return tokens
 */
const login = async (req, res, next) => {
  try {
    // Try both validatedBody and body
    const { student_id, password } = req.validatedBody || req.body;
    const ip = req.rateLimitInfo?.ip || 'unknown';
    
    // Debug log
    logger.info('Login attempt', { 
      hasValidatedBody: !!req.validatedBody,
      hasBody: !!req.body,
      student_id,
      bodyKeys: req.body ? Object.keys(req.body) : 'none'
    });

    const result = await authService.login({ student_id, password });

    // Clear failed attempts on successful login
    await advancedRateLimiter.clearFailedAttempts(student_id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    if (error.message === 'Invalid credentials' || error.message === 'Account is inactive') {
      // Track failed login attempt
      const { student_id } = req.validatedBody;
      const ip = req.rateLimitInfo?.ip || 'unknown';
      
      const failureInfo = await advancedRateLimiter.trackFailedLogin(student_id, ip);
      
      if (failureInfo.locked) {
        return res.status(429).json({
          success: false,
          error: 'Account locked',
          message: failureInfo.message,
        });
      }
      
      return res.status(401).json({
        success: false,
        error: error.message,
        remainingAttempts: failureInfo.remainingAttempts,
      });
    }
    next(error);
  }
};

/**
 * GET /auth/validate
 * Validate access token
 */
const validate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header missing or invalid',
      });
    }

    const token = authHeader.substring(7);
    const result = await authService.validateToken(token);

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: result,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
const refresh = async (req, res, next) => {
  try {
    const { refresh_token } = req.validatedBody;

    const result = await authService.refreshAccessToken(refresh_token);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /auth/logout
 * Revoke refresh token
 */
const logout = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    await authService.revokeRefreshToken(refresh_token);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /auth/me
 * Get current user info from token
 */
const me = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header missing or invalid',
      });
    }

    const token = authHeader.substring(7);
    const result = await authService.validateToken(token);

    res.status(200).json({
      success: true,
      data: result.user,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  validate,
  refresh,
  logout,
  me,
};
