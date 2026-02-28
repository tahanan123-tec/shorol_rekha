const { pool } = require('../config/database');
const passwordService = require('./password.service');
const jwtService = require('./jwt.service');
const logger = require('../utils/logger');
const { loginAttemptsTotal, activeTokensGauge } = require('../utils/metrics');

/**
 * Register a new user
 */
const register = async ({ student_id, email, password, full_name }) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if student_id or email already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE student_id = $1 OR email = $2',
      [student_id, email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Student ID or email already registered');
    }

    // Hash password
    const password_hash = await passwordService.hashPassword(password);

    // Insert user
    const result = await client.query(
      `INSERT INTO users (student_id, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, student_id, email, full_name, created_at`,
      [student_id, email, password_hash, full_name]
    );

    await client.query('COMMIT');

    const user = result.rows[0];
    logger.info('User registered successfully', { user_id: user.id, student_id });

    return {
      user_id: user.id,
      student_id: user.student_id,
      email: user.email,
      full_name: user.full_name,
      created_at: user.created_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('User registration failed', { error: error.message, student_id });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Login user and generate tokens
 */
const login = async ({ student_id, password }) => {
  try {
    // Find user by student_id
    const result = await pool.query(
      'SELECT id, student_id, email, password_hash, full_name, is_active FROM users WHERE student_id = $1',
      [student_id]
    );

    if (result.rows.length === 0) {
      loginAttemptsTotal.inc({ status: 'failed' });
      logger.warn('Login failed - user not found', { student_id });
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      loginAttemptsTotal.inc({ status: 'failed' });
      logger.warn('Login failed - user inactive', { student_id });
      throw new Error('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await passwordService.comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      loginAttemptsTotal.inc({ status: 'failed' });
      logger.warn('Login failed - invalid password', { student_id });
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokenPayload = {
      user_id: user.id,
      student_id: user.student_id,
      email: user.email,
    };

    const accessToken = jwtService.generateAccessToken(tokenPayload);
    const refreshToken = jwtService.generateRefreshToken(tokenPayload);

    // Store refresh token hash in database
    const tokenHash = jwtService.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    loginAttemptsTotal.inc({ status: 'success' });
    activeTokensGauge.inc();
    
    logger.info('User logged in successfully', { user_id: user.id, student_id });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes in seconds
      user: {
        user_id: user.id,
        student_id: user.student_id,
        email: user.email,
        full_name: user.full_name,
      },
    };
  } catch (error) {
    logger.error('Login failed', { error: error.message, student_id });
    throw error;
  }
};

/**
 * Validate access token
 */
const validateToken = async (token) => {
  try {
    const decoded = jwtService.verifyToken(token);

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    // Verify user still exists and is active
    const result = await pool.query(
      'SELECT id, student_id, email, full_name, is_active FROM users WHERE id = $1',
      [decoded.user_id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      throw new Error('User not found or inactive');
    }

    return {
      valid: true,
      user: {
        user_id: decoded.user_id,
        student_id: decoded.student_id,
        email: decoded.email,
      },
    };
  } catch (error) {
    logger.warn('Token validation failed', { error: error.message });
    throw error;
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  const client = await pool.connect();
  
  try {
    // Verify refresh token
    const decoded = jwtService.verifyToken(refreshToken);

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Check if refresh token exists and is not revoked
    const tokenHash = jwtService.hashToken(refreshToken);
    const tokenResult = await client.query(
      'SELECT id, user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      throw new Error('Refresh token not found');
    }

    const tokenRecord = tokenResult.rows[0];

    if (tokenRecord.revoked) {
      throw new Error('Refresh token has been revoked');
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      throw new Error('Refresh token expired');
    }

    // Get user details
    const userResult = await client.query(
      'SELECT id, student_id, email, is_active FROM users WHERE id = $1',
      [tokenRecord.user_id]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      throw new Error('User not found or inactive');
    }

    const user = userResult.rows[0];

    // Generate new access token
    const tokenPayload = {
      user_id: user.id,
      student_id: user.student_id,
      email: user.email,
    };

    const newAccessToken = jwtService.generateAccessToken(tokenPayload);

    logger.info('Access token refreshed', { user_id: user.id });

    return {
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: 900,
    };
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Revoke refresh token (logout)
 */
const revokeRefreshToken = async (refreshToken) => {
  try {
    const tokenHash = jwtService.hashToken(refreshToken);
    
    const result = await pool.query(
      'UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1 RETURNING id',
      [tokenHash]
    );

    if (result.rows.length > 0) {
      activeTokensGauge.dec();
      logger.info('Refresh token revoked', { token_id: result.rows[0].id });
    }

    return { success: true };
  } catch (error) {
    logger.error('Token revocation failed', { error: error.message });
    throw error;
  }
};

module.exports = {
  register,
  login,
  validateToken,
  refreshAccessToken,
  revokeRefreshToken,
};
