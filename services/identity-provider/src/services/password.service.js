const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

// Reduced from 12 to 10 for better performance under high load (200+ req/s)
// Still secure but 4x faster
const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    logger.error('Password hashing failed', { error: error.message });
    throw new Error('Failed to hash password');
  }
};

/**
 * Compare a password with its hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if password matches
 */
const comparePassword = async (password, hash) => {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    logger.error('Password comparison failed', { error: error.message });
    throw new Error('Failed to compare password');
  }
};

module.exports = {
  hashPassword,
  comparePassword,
};
