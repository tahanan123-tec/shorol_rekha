const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 100, // Increased from 20 for high load (200+ req/s)
  min: 10,  // Maintain minimum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
});

pool.on('connect', () => {
  logger.info('Database connection established');
});

// Test connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed', { error: error.message });
    return false;
  }
};

// Initialize database schema
const initializeSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Refresh tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked BOOLEAN DEFAULT false
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
    `);

    // Create test user if not exists (for development)
    const existingUser = await client.query(
      'SELECT id FROM users WHERE student_id = $1',
      ['test123']
    );

    if (existingUser.rows.length === 0) {
      // Hash: Test@1234
      const bcrypt = require('bcrypt');
      const testPasswordHash = await bcrypt.hash('Test@1234', 10);
      
      await client.query(
        `INSERT INTO users (student_id, email, password_hash, full_name, is_active)
         VALUES ($1, $2, $3, $4, $5)`,
        ['test123', 'test@example.com', testPasswordHash, 'Test User', true]
      );
      logger.info('Test user created: test123 / Test@1234');
    }

    await client.query('COMMIT');
    logger.info('Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to initialize database schema', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  testConnection,
  initializeSchema,
};
